// Firebase'de hesabı olan kullanıcı ilk kez giriş yaptığında çağrılır:
// Firebase oturumunu doğrular, aynı e-posta ve şifreyle Supabase hesabını
// açar (veya şifresini eşitler) ve profilini Firestore'dan taşır.
import {
  handler,
  verifyFirebaseToken,
  admin,
  getDoc,
  ensureCompany,
  upsertMigratedUser,
  HttpError,
} from '../_shared/firebase.ts';

Deno.serve(
  handler(async body => {
    const { uid, email } = await verifyFirebaseToken(body.idToken);
    const password = body.password;
    if (typeof password !== 'string' || password.length < 6) throw new HttpError(400, 'Geçersiz şifre');

    const idToken = body.idToken as string;
    const sb = admin();
    const profileDoc = await getDoc(idToken, `users/${uid}`);
    const profile = profileDoc?.data ?? null;
    if (profile?.companyId) await ensureCompany(sb, idToken, String(profile.companyId));

    const userId = await upsertMigratedUser(sb, uid, email, profile, password);

    // Yönetici ise ve şirket verileri henüz aktarılmadıysa istemciye bildir
    let needsImport = false;
    if (profile?.role === 'admin' && profile.companyId) {
      const { data } = await sb
        .from('companies')
        .select('firebase_imported_at')
        .eq('id', String(profile.companyId))
        .maybeSingle();
      needsImport = !data?.firebase_imported_at;
    }
    return { ok: true, userId, needsImport };
  })
);
