// Supabase veri katmanı. Eski lib/firestore.ts ile aynı fonksiyon adlarını
// ve imzalarını korur; veritabanı snake_case, uygulama camelCase kullanır.
import { supabase } from './supabase';
import {
  Company,
  Vehicle,
  Trip,
  FuelEntry,
  User,
  Customer,
  CustomerTransaction,
  CustomerMessage,
} from '../types';

type Row = Record<string, unknown>;

const toCamelKey = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
const toSnakeKey = (k: string) => k.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`);

function fromRow<T>(row: Row): T {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    out[toCamelKey(k)] = k === 'created_at' && typeof v === 'string' ? new Date(v) : v;
  }
  return out as T;
}

// Yazılamayan alanlar atılır. Güncellemede undefined = alanı temizle (null).
function toRow(data: object, mode: 'insert' | 'update'): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(data)) {
    if (k === 'id' || k === 'uid' || k === 'createdAt') continue;
    if (v === undefined) {
      if (mode === 'update') out[toSnakeKey(k)] = null;
      continue;
    }
    out[toSnakeKey(k)] = v;
  }
  return out;
}

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

const profileToUser = (row: Row): User => {
  const u = fromRow<User & { id: string }>(row);
  const { id, ...rest } = u;
  return { ...rest, uid: id } as User;
};

// Tablo değiştikçe (realtime) listeyi yeniden çeker
function subscribeQuery<T>(
  table: string,
  filter: { column: string; value: string },
  fetcher: () => Promise<T[]>,
  callback: (rows: T[]) => void
): () => void {
  let active = true;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const load = () => {
    fetcher()
      .then(rows => active && callback(rows))
      .catch(e => console.warn(`${table} yüklenemedi:`, e.message));
  };
  load();
  const channel = supabase
    .channel(`${table}:${filter.value}:${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter: `${filter.column}=eq.${filter.value}` },
      () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(load, 150);
      }
    )
    .subscribe();
  return () => {
    active = false;
    if (timer) clearTimeout(timer);
    supabase.removeChannel(channel);
  };
}

// ===================== COMPANY =====================
export async function getCompany(companyId: string): Promise<Company | null> {
  const { data, error } = await supabase.from('companies').select('*').eq('id', companyId).maybeSingle();
  fail(error);
  return data ? fromRow(data) : null;
}

// ===================== USERS =====================
export async function getUserProfile(uid: string): Promise<User | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
  fail(error);
  return data ? profileToUser(data) : null;
}

export async function getCompanyUsers(companyId: string): Promise<User[]> {
  const { data, error } = await supabase.from('profiles').select('*').eq('company_id', companyId);
  fail(error);
  return (data ?? []).map(profileToUser);
}

export async function updateUserProfile(uid: string, data: Partial<User>): Promise<void> {
  const { error } = await supabase.from('profiles').update(toRow(data, 'update')).eq('id', uid);
  fail(error);
}

export function subscribeCompanyUsers(companyId: string, callback: (users: User[]) => void): () => void {
  return subscribeQuery('profiles', { column: 'company_id', value: companyId }, () => getCompanyUsers(companyId), callback);
}

// ===================== VEHICLES =====================
export async function addVehicle(
  companyId: string,
  data: Omit<Vehicle, 'id' | 'companyId' | 'createdAt'>
): Promise<string> {
  const { data: row, error } = await supabase
    .from('vehicles')
    .insert({ ...toRow(data, 'insert'), company_id: companyId })
    .select('id')
    .single();
  fail(error);
  return row!.id;
}

export async function updateVehicle(companyId: string, vehicleId: string, data: Partial<Vehicle>): Promise<void> {
  const { error } = await supabase
    .from('vehicles')
    .update(toRow(data, 'update'))
    .eq('id', vehicleId)
    .eq('company_id', companyId);
  fail(error);
}

export async function deleteVehicle(companyId: string, vehicleId: string): Promise<void> {
  const { error } = await supabase.from('vehicles').delete().eq('id', vehicleId).eq('company_id', companyId);
  fail(error);
}

export async function getVehicles(companyId: string): Promise<Vehicle[]> {
  const { data, error } = await supabase.from('vehicles').select('*').eq('company_id', companyId).order('plate');
  fail(error);
  return (data ?? []).map(r => fromRow<Vehicle>(r));
}

export function subscribeVehicles(companyId: string, callback: (vehicles: Vehicle[]) => void): () => void {
  return subscribeQuery('vehicles', { column: 'company_id', value: companyId }, () => getVehicles(companyId), callback);
}

// ===================== TRIPS =====================
export async function addTrip(companyId: string, data: Omit<Trip, 'id' | 'companyId' | 'createdAt'>): Promise<string> {
  const { data: row, error } = await supabase
    .from('trips')
    .insert({ ...toRow(data, 'insert'), company_id: companyId })
    .select('id')
    .single();
  fail(error);
  // Araç km güncelle
  if (data.vehicleId) await updateVehicle(companyId, data.vehicleId, { currentKm: data.returnKm });
  return row!.id;
}

export async function updateTrip(companyId: string, tripId: string, data: Partial<Trip>): Promise<void> {
  const { error } = await supabase.from('trips').update(toRow(data, 'update')).eq('id', tripId).eq('company_id', companyId);
  fail(error);
}

export async function deleteTrip(companyId: string, tripId: string): Promise<void> {
  const { error } = await supabase.from('trips').delete().eq('id', tripId).eq('company_id', companyId);
  fail(error);
}

export async function getTrips(companyId: string, vehicleId?: string): Promise<Trip[]> {
  let q = supabase.from('trips').select('*').eq('company_id', companyId);
  if (vehicleId) q = q.eq('vehicle_id', vehicleId);
  const { data, error } = await q.order('date', { ascending: false }).order('created_at', { ascending: false });
  fail(error);
  return (data ?? []).map(r => fromRow<Trip>(r));
}

export function subscribeTrips(companyId: string, callback: (trips: Trip[]) => void): () => void {
  return subscribeQuery('trips', { column: 'company_id', value: companyId }, () => getTrips(companyId), callback);
}

// ===================== FUEL =====================
export async function addFuelEntry(
  companyId: string,
  data: Omit<FuelEntry, 'id' | 'companyId' | 'createdAt'>
): Promise<string> {
  const { data: row, error } = await supabase
    .from('fuel_entries')
    .insert({ ...toRow(data, 'insert'), company_id: companyId })
    .select('id')
    .single();
  fail(error);
  // Araç km güncelle
  await updateVehicle(companyId, data.vehicleId, { currentKm: data.currentKm });
  return row!.id;
}

export async function updateFuelEntry(companyId: string, fuelId: string, data: Partial<FuelEntry>): Promise<void> {
  const { error } = await supabase
    .from('fuel_entries')
    .update(toRow(data, 'update'))
    .eq('id', fuelId)
    .eq('company_id', companyId);
  fail(error);
}

export async function deleteFuelEntry(companyId: string, fuelId: string): Promise<void> {
  const { error } = await supabase.from('fuel_entries').delete().eq('id', fuelId).eq('company_id', companyId);
  fail(error);
}

export async function getFuelEntries(companyId: string, vehicleId?: string): Promise<FuelEntry[]> {
  let q = supabase.from('fuel_entries').select('*').eq('company_id', companyId);
  if (vehicleId) q = q.eq('vehicle_id', vehicleId);
  const { data, error } = await q.order('date', { ascending: false }).order('created_at', { ascending: false });
  fail(error);
  return (data ?? []).map(r => fromRow<FuelEntry>(r));
}

export function subscribeFuelEntries(companyId: string, callback: (entries: FuelEntry[]) => void): () => void {
  return subscribeQuery('fuel_entries', { column: 'company_id', value: companyId }, () => getFuelEntries(companyId), callback);
}

// ===================== CUSTOMERS =====================
export async function addCustomer(
  companyId: string,
  data: Omit<Customer, 'id' | 'companyId' | 'createdAt'>
): Promise<string> {
  const { data: row, error } = await supabase
    .from('customers')
    .insert({ ...toRow(data, 'insert'), company_id: companyId })
    .select('id')
    .single();
  fail(error);
  return row!.id;
}

export async function updateCustomer(companyId: string, customerId: string, data: Partial<Customer>): Promise<void> {
  const { error } = await supabase
    .from('customers')
    .update(toRow(data, 'update'))
    .eq('id', customerId)
    .eq('company_id', companyId);
  fail(error);
}

// Hareketler ve sohbet mesajları veritabanında cascade ile silinir
export async function deleteCustomer(companyId: string, customerId: string): Promise<void> {
  const { error } = await supabase.from('customers').delete().eq('id', customerId).eq('company_id', companyId);
  fail(error);
}

async function getCustomers(companyId: string): Promise<Customer[]> {
  const { data, error } = await supabase.from('customers').select('*').eq('company_id', companyId).order('name');
  fail(error);
  return (data ?? []).map(r => fromRow<Customer>(r));
}

export function subscribeCustomers(companyId: string, callback: (customers: Customer[]) => void): () => void {
  return subscribeQuery('customers', { column: 'company_id', value: companyId }, () => getCustomers(companyId), callback);
}

// ===================== CUSTOMER TRANSACTIONS =====================
const txFromRow = (r: Row) => {
  const tx = fromRow<CustomerTransaction>(r);
  return { ...tx, amount: Number(tx.amount) };
};

async function getAllCustomerTx(companyId: string): Promise<CustomerTransaction[]> {
  const { data, error } = await supabase.from('customer_tx').select('*').eq('company_id', companyId);
  fail(error);
  return (data ?? []).map(txFromRow);
}

export function subscribeAllCustomerTx(companyId: string, callback: (txs: CustomerTransaction[]) => void): () => void {
  return subscribeQuery('customer_tx', { column: 'company_id', value: companyId }, () => getAllCustomerTx(companyId), callback);
}

export async function addCustomerTx(
  companyId: string,
  data: Omit<CustomerTransaction, 'id' | 'companyId' | 'createdAt'>
): Promise<string> {
  const { data: row, error } = await supabase
    .from('customer_tx')
    .insert({ ...toRow(data, 'insert'), company_id: companyId })
    .select('id')
    .single();
  fail(error);
  return row!.id;
}

export async function updateCustomerTx(companyId: string, txId: string, data: Partial<CustomerTransaction>): Promise<void> {
  const { error } = await supabase
    .from('customer_tx')
    .update(toRow(data, 'update'))
    .eq('id', txId)
    .eq('company_id', companyId);
  fail(error);
}

export async function deleteCustomerTx(companyId: string, txId: string): Promise<void> {
  const { error } = await supabase.from('customer_tx').delete().eq('id', txId).eq('company_id', companyId);
  fail(error);
}

// ===================== CUSTOMER CHAT =====================
async function getCustomerMessages(customerId: string): Promise<CustomerMessage[]> {
  const { data, error } = await supabase
    .from('customer_messages')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at');
  fail(error);
  return (data ?? []).map(r => fromRow<CustomerMessage>(r));
}

export function subscribeCustomerMessages(
  companyId: string,
  customerId: string,
  callback: (messages: CustomerMessage[]) => void
): () => void {
  return subscribeQuery(
    'customer_messages',
    { column: 'customer_id', value: customerId },
    () => getCustomerMessages(customerId),
    callback
  );
}

// Sohbet mesajını ve mesajdan çıkan kayıtları tek işlemde yazar
export async function addCustomerMessage(
  companyId: string,
  customerId: string,
  text: string,
  entries: Omit<CustomerTransaction, 'id' | 'companyId' | 'customerId' | 'createdAt' | 'messageId'>[]
): Promise<string> {
  const { data, error } = await supabase.rpc('add_customer_message', {
    p_customer_id: customerId,
    p_text: text,
    p_entries: entries,
  });
  fail(error);
  return data as string;
}

export async function deleteCustomerMessage(
  companyId: string,
  message: CustomerMessage,
  withTransactions: boolean
): Promise<void> {
  if (withTransactions && message.txIds.length > 0) {
    const { error } = await supabase.from('customer_tx').delete().in('id', message.txIds).eq('company_id', companyId);
    fail(error);
  }
  const { error } = await supabase.from('customer_messages').delete().eq('id', message.id).eq('company_id', companyId);
  fail(error);
}

export function toMillis(value: unknown): number {
  if (!value) return Date.now();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') return Date.parse(value) || 0;
  return 0;
}
