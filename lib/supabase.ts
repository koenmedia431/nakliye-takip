import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// Herkese açık (publishable) anahtar; veri güvenliği veritabanındaki RLS kurallarıyla sağlanır
const SUPABASE_URL = 'https://qkyifdfcvfbngdguhqci.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_oZg-5tDOsuDMbttscJxPng_vMp5pQaH';

const isSSR = Platform.OS === 'web' && typeof window === 'undefined';

// Web'de statik çıktı (SSR) sırasında depolama yok
const storage = {
  getItem: (key: string) => (isSSR ? null : AsyncStorage.getItem(key)),
  setItem: (key: string, value: string) => (isSSR ? undefined : AsyncStorage.setItem(key, value)),
  removeItem: (key: string) => (isSSR ? undefined : AsyncStorage.removeItem(key)),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Uygulama ön plandayken oturum token'ını yenile
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', state => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
