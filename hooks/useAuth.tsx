import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { auth as firebaseAuth } from '../lib/firebase';
import { supabase } from '../lib/supabase';
import { getUserProfile, getCompany } from '../lib/db';
import { User } from '../types';

interface AuthContextType {
  session: Session | null;
  userProfile: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
    companyName: string
  ) => Promise<void>;
  registerAsDriver: (
    email: string,
    password: string,
    displayName: string,
    companyId: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// Ekranlar Firebase dönemindeki hata kodlarını kontrol ediyor; aynı kodlarla fırlatılır
class AuthError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

function mapAuthError(error: { code?: string; message: string }): AuthError {
  switch (error.code) {
    case 'invalid_credentials':
      return new AuthError('auth/invalid-credential', 'Email veya şifre hatalı');
    case 'user_already_exists':
    case 'email_exists':
      return new AuthError('auth/email-already-in-use', 'Bu email adresi zaten kullanımda');
    case 'email_address_invalid':
    case 'validation_failed':
      return new AuthError('auth/invalid-email', 'Geçersiz email adresi');
    case 'weak_password':
      return new AuthError('auth/weak-password', 'Şifre çok zayıf');
    case 'email_not_confirmed':
      return new AuthError('auth/email-not-confirmed', 'E-posta adresiniz henüz doğrulanmadı. Gelen kutunuzdaki bağlantıya tıklayın.');
    default:
      return new AuthError(error.code ?? 'auth/unknown', error.message);
  }
}

async function firebaseIdToken(email: string, password: string): Promise<string | null> {
  try {
    const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
    return await cred.user.getIdToken();
  } catch {
    return null;
  }
}

// Supabase'de hesabı olmayan eski (Firebase) kullanıcıyı taşır.
// Başarılıysa true döner; şifre Firebase'de de yanlışsa false.
async function migrateFromFirebase(email: string, password: string): Promise<boolean> {
  const idToken = await firebaseIdToken(email, password);
  if (!idToken) return false;
  try {
    const { error } = await supabase.functions.invoke('migrate-user', { body: { idToken, password } });
    if (error) throw new AuthError('auth/migration-failed', 'Hesap taşınamadı, lütfen tekrar deneyin');
    return true;
  } finally {
    firebaseSignOut(firebaseAuth).catch(() => {});
  }
}

// Eski Firebase yöneticisinin şirket verileri henüz aktarılmadıysa aktarır.
// Başarısız olursa bir sonraki girişte yeniden denenir.
async function importCompanyIfNeeded(profile: User | null, email: string, password: string): Promise<void> {
  if (profile?.role !== 'admin' || !profile.firebaseUid) return;
  const company = await getCompany(profile.companyId);
  if (!company || company.firebaseImportedAt) return;
  const idToken = await firebaseIdToken(email, password);
  if (!idToken) return;
  try {
    const { error } = await supabase.functions.invoke('import-company', { body: { idToken } });
    if (error) throw error;
  } catch (e) {
    console.warn('Şirket verileri aktarılamadı:', (e as Error).message);
    Alert.alert(
      'Veri aktarımı tamamlanamadı',
      'Eski verileriniz aktarılırken bir sorun oluştu. Çıkış yapıp tekrar giriş yaptığınızda yeniden denenecek.'
    );
  } finally {
    firebaseSignOut(firebaseAuth).catch(() => {});
  }
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (s: Session | null) => {
    try {
      setUserProfile(s ? await getUserProfile(s.user.id) : null);
    } catch (e) {
      console.warn('Profil yüklenemedi:', (e as Error).message);
      setUserProfile(null);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      // Supabase istemcisi callback içinde beklenirse kilitlenebilir; sonraya bırak
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        setTimeout(() => loadProfile(s), 0);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    let { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error?.code === 'invalid_credentials' && (await migrateFromFirebase(email, password))) {
      ({ data, error } = await supabase.auth.signInWithPassword({ email, password }));
    }
    if (error || !data.user) throw mapAuthError(error ?? { message: 'Giriş yapılamadı' });
    const userId = data.user.id;
    setSession(data.session);
    await importCompanyIfNeeded(await getUserProfile(userId), email, password);
    setUserProfile(await getUserProfile(userId));
  };

  const signUp = async (email: string, password: string, metadata: Record<string, string>) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: metadata } });
    if (error) throw mapAuthError(error);
    if (!data.session) {
      throw new AuthError(
        'auth/email-not-confirmed',
        'Hesabınız oluşturuldu. E-postanıza gelen bağlantıyla doğrulayıp giriş yapın.'
      );
    }
    setSession(data.session);
    await loadProfile(data.session);
  };

  const register = (email: string, password: string, displayName: string, companyName: string) =>
    signUp(email, password, { display_name: displayName, company_name: companyName });

  const registerAsDriver = (email: string, password: string, displayName: string, companyId: string) =>
    signUp(email, password, { display_name: displayName, company_id: companyId });

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserProfile(null);
  };

  const refreshProfile = () => loadProfile(session);

  return (
    <AuthContext.Provider
      value={{
        session,
        userProfile,
        loading,
        login,
        register,
        registerAsDriver,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
