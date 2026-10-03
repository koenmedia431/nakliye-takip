// Yönetici ilk girişinde çağrılır: şirketin tüm Firestore verilerini
// (kullanıcılar, araçlar, seferler, yakıt, müşteri cari) Supabase'e kopyalar.
// Firestore belge kimlikleri korunur ve upsert yapılır; tekrar çalıştırmak güvenlidir.
import {
  handler,
  verifyFirebaseToken,
  admin,
  getDoc,
  listCollection,
  queryUsersByCompany,
  ensureCompany,
  upsertMigratedUser,
  HttpError,
  str,
  num,
  ts,
} from '../_shared/firebase.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.117.2';

async function upsertChunks(sb: SupabaseClient, table: string, rows: Record<string, unknown>[]) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await sb.from(table).upsert(rows.slice(i, i + 500));
    if (error) throw new HttpError(500, `${table} aktarılamadı: ${error.message}`);
  }
}

Deno.serve(
  handler(async body => {
    const { uid, email } = await verifyFirebaseToken(body.idToken);
    const idToken = body.idToken as string;
    const sb = admin();

    const me = await getDoc(idToken, `users/${uid}`);
    if (me?.data.role !== 'admin' || !me.data.companyId) throw new HttpError(403, 'Sadece yönetici aktarabilir');
    const cid = String(me.data.companyId);
    await ensureCompany(sb, idToken, cid);
    await upsertMigratedUser(sb, uid, email, me.data);

    // Kullanıcılar
    const userMap: Record<string, string> = {};
    const users = await queryUsersByCompany(idToken, cid);
    for (const u of users) {
      const userEmail = str(u.data.email)?.toLowerCase();
      if (!userEmail) continue;
      userMap[u.id] = await upsertMigratedUser(sb, u.id, userEmail, u.data);
    }
    const mapUid = (v: unknown) => (typeof v === 'string' && userMap[v]) || null;

    // Müşteri koleksiyonlarının Firestore kuralı yayınlanmamış olabilir (opsiyonel)
    const [vehicles, trips, fuel, customers, customerTx, customerMessages] = await Promise.all([
      listCollection(idToken, `companies/${cid}/vehicles`),
      listCollection(idToken, `companies/${cid}/trips`),
      listCollection(idToken, `companies/${cid}/fuel`),
      listCollection(idToken, `companies/${cid}/customers`, true),
      listCollection(idToken, `companies/${cid}/customerTx`, true),
      listCollection(idToken, `companies/${cid}/customerMessages`, true),
    ]);

    await upsertChunks(sb, 'vehicles', vehicles.map(({ id, data: d }) => ({
      id,
      company_id: cid,
      plate: str(d.plate) ?? '',
      brand: str(d.brand) ?? '',
      model: str(d.model) ?? '',
      year: num(d.year) === null ? null : Math.trunc(num(d.year)!),
      type: str(d.type) ?? 'diğer',
      fuel_type: str(d.fuelType) ?? 'dizel',
      current_km: num(d.currentKm) ?? 0,
      driver_uid: mapUid(d.driverUid),
      active: d.active !== false,
      created_at: ts(d.createdAt),
    })));

    await upsertChunks(sb, 'trips', trips.map(({ id, data: d }) => ({
      id,
      company_id: cid,
      vehicle_id: str(d.vehicleId),
      vehicle_plate: str(d.vehiclePlate) ?? '',
      driver_uid: mapUid(d.driverUid),
      driver_name: str(d.driverName) ?? '',
      region: str(d.region),
      date: str(d.date) ?? ts(d.createdAt).slice(0, 10),
      start_time: str(d.startTime),
      end_time: str(d.endTime),
      departure_km: num(d.departureKm) ?? 0,
      return_km: num(d.returnKm) ?? 0,
      total_km: num(d.totalKm) ?? 0,
      fuel_liters: num(d.fuelLiters),
      fuel_rate: num(d.fuelRate),
      notes: str(d.notes),
      created_at: ts(d.createdAt),
    })));

    await upsertChunks(sb, 'fuel_entries', fuel.map(({ id, data: d }) => ({
      id,
      company_id: cid,
      vehicle_id: str(d.vehicleId),
      vehicle_plate: str(d.vehiclePlate) ?? '',
      driver_uid: mapUid(d.driverUid),
      driver_name: str(d.driverName) ?? '',
      date: str(d.date) ?? ts(d.createdAt).slice(0, 10),
      liters: num(d.liters) ?? 0,
      price_per_liter: num(d.pricePerLiter) ?? 0,
      total_cost: num(d.totalCost) ?? 0,
      current_km: num(d.currentKm) ?? 0,
      station: str(d.station),
      notes: str(d.notes),
      created_at: ts(d.createdAt),
    })));

    await upsertChunks(sb, 'customers', customers.map(({ id, data: d }) => ({
      id,
      company_id: cid,
      name: str(d.name) ?? 'Müşteri',
      phone: str(d.phone),
      email: str(d.email),
      tax_no: str(d.taxNo),
      address: str(d.address),
      notes: str(d.notes),
      created_at: ts(d.createdAt),
    })));

    const customerIds = new Set(customers.map(c => c.id));
    const validTx = customerTx.filter(t => customerIds.has(String(t.data.customerId)));
    await upsertChunks(sb, 'customer_tx', validTx.map(({ id, data: d }) => ({
      id,
      company_id: cid,
      customer_id: String(d.customerId),
      kind: ['borc', 'tahsilat', 'masraf'].includes(String(d.kind)) ? String(d.kind) : 'borc',
      amount: Math.abs(num(d.amount) ?? 0),
      description: str(d.description) ?? '',
      date: str(d.date) ?? ts(d.createdAt).slice(0, 10),
      message_id: str(d.messageId),
      created_at: ts(d.createdAt),
    })));

    const validMsgs = customerMessages.filter(m => customerIds.has(String(m.data.customerId)));
    await upsertChunks(sb, 'customer_messages', validMsgs.map(({ id, data: d }) => ({
      id,
      company_id: cid,
      customer_id: String(d.customerId),
      text: str(d.text) ?? '',
      tx_ids: Array.isArray(d.txIds) ? d.txIds.map(String) : [],
      created_at: ts(d.createdAt),
    })));

    await sb.from('companies').update({ firebase_imported_at: new Date().toISOString() }).eq('id', cid);

    return {
      ok: true,
      counts: {
        users: users.length,
        vehicles: vehicles.length,
        trips: trips.length,
        fuel: fuel.length,
        customers: customers.length,
        customerTx: validTx.length,
        customerMessages: validMsgs.length,
      },
    };
  })
);
