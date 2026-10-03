// Firebase -> Supabase geçişi için ortak yardımcılar.
// Firebase Admin anahtarı gerekmez: kullanıcının kendi Firebase ID token'ı
// doğrulanır ve Firestore REST API'si o kullanıcının yetkisiyle okunur
// (Firestore güvenlik kuralları aynen geçerli olur).
import { createRemoteJWKSet, jwtVerify } from 'npm:jose@5.9.6';
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2.117.2';

export const FIREBASE_PROJECT_ID = 'expo-go-c23ab';
const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface FirebaseIdentity {
  uid: string;
  email: string;
}

export async function verifyFirebaseToken(idToken: unknown): Promise<FirebaseIdentity> {
  if (typeof idToken !== 'string' || !idToken) throw new HttpError(400, 'idToken gerekli');
  try {
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });
    const uid = payload.sub;
    const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : '';
    if (!uid || !email) throw new Error('eksik claim');
    return { uid, email };
  } catch {
    throw new HttpError(401, 'Firebase oturumu doğrulanamadı');
  }
}

export function admin(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ---------- Firestore REST ----------
type FsValue = Record<string, unknown>;

function decode(v: FsValue): unknown {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('referenceValue' in v) return v.referenceValue;
  if ('mapValue' in v) return decodeFields((v.mapValue as { fields?: Record<string, FsValue> }).fields);
  if ('arrayValue' in v) return ((v.arrayValue as { values?: FsValue[] }).values ?? []).map(decode);
  return null;
}

function decodeFields(fields?: Record<string, FsValue>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields ?? {})) out[k] = decode(v);
  return out;
}

export interface FsDoc {
  id: string;
  data: Record<string, unknown>;
}

function toDoc(d: { name: string; fields?: Record<string, FsValue> }): FsDoc {
  return { id: d.name.split('/').pop()!, data: decodeFields(d.fields) };
}

export async function getDoc(idToken: string, path: string): Promise<FsDoc | null> {
  const res = await fetch(`${FIRESTORE}/${path}`, { headers: { Authorization: `Bearer ${idToken}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new HttpError(502, `Firestore okunamadı (${path}): ${res.status}`);
  return toDoc(await res.json());
}

// optional: Firestore kuralı tanımlı olmayan (hiç kullanılmamış) koleksiyonlar
// 403 döner; bunlar boş kabul edilir.
export async function listCollection(idToken: string, path: string, optional = false): Promise<FsDoc[]> {
  const docs: FsDoc[] = [];
  let pageToken = '';
  do {
    const url = `${FIRESTORE}/${path}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
    if (optional && res.status === 403) return [];
    if (!res.ok) throw new HttpError(502, `Firestore okunamadı (${path}): ${res.status}`);
    const body = await res.json();
    (body.documents ?? []).forEach((d: { name: string; fields?: Record<string, FsValue> }) => docs.push(toDoc(d)));
    pageToken = body.nextPageToken ?? '';
  } while (pageToken);
  return docs;
}

export async function queryUsersByCompany(idToken: string, companyId: string): Promise<FsDoc[]> {
  const res = await fetch(`${FIRESTORE}:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'users' }],
        where: {
          fieldFilter: { field: { fieldPath: 'companyId' }, op: 'EQUAL', value: { stringValue: companyId } },
        },
      },
    }),
  });
  if (!res.ok) throw new HttpError(502, `Firestore kullanıcıları okunamadı: ${res.status}`);
  const rows: { document?: { name: string; fields?: Record<string, FsValue> } }[] = await res.json();
  return rows.filter(r => r.document).map(r => toDoc(r.document!));
}

// ---------- Dönüşüm yardımcıları ----------
export const str = (v: unknown): string | null => (v === undefined || v === null || v === '' ? null : String(v));
export const num = (v: unknown): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
export const ts = (v: unknown): string => (typeof v === 'string' && !isNaN(Date.parse(v)) ? v : new Date().toISOString());

// Şirket Supabase'de yoksa Firestore'daki adıyla oluşturur
export async function ensureCompany(sb: SupabaseClient, idToken: string, companyId: string): Promise<void> {
  const { data } = await sb.from('companies').select('id').eq('id', companyId).maybeSingle();
  if (data) return;
  const doc = await getDoc(idToken, `companies/${companyId}`);
  const { error } = await sb.from('companies').upsert({
    id: companyId,
    name: str(doc?.data.name) ?? 'Şirket',
    created_at: ts(doc?.data.createdAt),
  });
  if (error) throw new HttpError(500, `Şirket oluşturulamadı: ${error.message}`);
}

async function findAuthUserIdByEmail(sb: SupabaseClient, email: string): Promise<string | null> {
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new HttpError(500, error.message);
    const hit = data.users.find(u => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

// Firebase kullanıcısına karşılık gelen Supabase hesabını bulur ya da oluşturur,
// profilini Firestore'daki (yetkili) bilgilerle yazar. Supabase kullanıcı id'sini döner.
export async function upsertMigratedUser(
  sb: SupabaseClient,
  fbUid: string,
  email: string,
  profile: Record<string, unknown> | null,
  password?: string
): Promise<string> {
  const displayName = str(profile?.displayName) ?? '';
  let userId: string | null = null;

  const { data: existing } = await sb.from('profiles').select('id').eq('firebase_uid', fbUid).maybeSingle();
  if (existing) userId = existing.id;

  if (!userId) {
    const { data, error } = await sb.auth.admin.createUser({
      email,
      password: password ?? crypto.randomUUID() + crypto.randomUUID(),
      email_confirm: true,
      user_metadata: { skip_profile: 'true', display_name: displayName },
    });
    if (data?.user) userId = data.user.id;
    else {
      userId = await findAuthUserIdByEmail(sb, email);
      if (!userId) throw new HttpError(500, `Hesap oluşturulamadı: ${error?.message}`);
    }
  }

  if (password) {
    const { error } = await sb.auth.admin.updateUserById(userId, { password, email_confirm: true });
    if (error) throw new HttpError(500, `Şifre güncellenemedi: ${error.message}`);
  }

  const role = profile?.role === 'admin' ? 'admin' : 'driver';
  const { error } = await sb.from('profiles').upsert({
    id: userId,
    email,
    display_name: displayName,
    role,
    company_id: str(profile?.companyId),
    vehicle_plate: str(profile?.vehiclePlate),
    vehicle_id: str(profile?.vehicleId),
    fuel_rate: num(profile?.fuelRate),
    region: str(profile?.region),
    firebase_uid: fbUid,
    created_at: ts(profile?.createdAt),
  });
  if (error) throw new HttpError(500, `Profil yazılamadı: ${error.message}`);

  if (role === 'admin' && profile?.companyId) {
    await sb.from('companies').update({ admin_uid: userId }).eq('id', String(profile.companyId)).is('admin_uid', null);
  }
  return userId;
}

export function handler(fn: (body: Record<string, unknown>) => Promise<unknown>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') return json({ error: 'Yalnızca POST' }, 405);
    try {
      const body = await req.json().catch(() => ({}));
      return json(await fn(body));
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      console.error(e);
      return json({ error: 'Beklenmeyen hata' }, 500);
    }
  };
}
