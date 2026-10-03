import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
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

// ===================== COMPANY =====================
export async function createCompany(adminUid: string, companyName: string): Promise<string> {
  const ref = await addDoc(collection(db, 'companies'), {
    name: companyName,
    adminUid,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function getCompany(companyId: string): Promise<Company | null> {
  const snap = await getDoc(doc(db, 'companies', companyId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Company;
}

// ===================== USERS =====================
export async function createUserProfile(
  uid: string,
  data: Omit<User, 'uid' | 'createdAt'>
): Promise<void> {
  await setDoc(doc(db, 'users', uid), {
    ...data,
    createdAt: Timestamp.now(),
  });
}

export async function getUserProfile(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() } as User;
}

export async function getCompanyUsers(companyId: string): Promise<User[]> {
  const q = query(collection(db, 'users'), where('companyId', '==', companyId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() } as User));
}

export async function updateUserProfile(uid: string, data: Partial<User>): Promise<void> {
  await updateDoc(doc(db, 'users', uid), data);
}

export function subscribeCompanyUsers(
  companyId: string,
  callback: (users: User[]) => void
): () => void {
  const q = query(collection(db, 'users'), where('companyId', '==', companyId));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ uid: d.id, ...d.data() } as User)));
  });
}

// ===================== VEHICLES =====================
export async function addVehicle(
  companyId: string,
  data: Omit<Vehicle, 'id' | 'companyId' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'companies', companyId, 'vehicles'), {
    ...data,
    companyId,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateVehicle(
  companyId: string,
  vehicleId: string,
  data: Partial<Vehicle>
): Promise<void> {
  await updateDoc(doc(db, 'companies', companyId, 'vehicles', vehicleId), data);
}

export async function deleteVehicle(companyId: string, vehicleId: string): Promise<void> {
  await deleteDoc(doc(db, 'companies', companyId, 'vehicles', vehicleId));
}

export function subscribeVehicles(
  companyId: string,
  callback: (vehicles: Vehicle[]) => void
): () => void {
  const q = query(
    collection(db, 'companies', companyId, 'vehicles'),
    orderBy('plate')
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle)));
  });
}

export async function getVehicles(companyId: string): Promise<Vehicle[]> {
  const q = query(
    collection(db, 'companies', companyId, 'vehicles'),
    orderBy('plate')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle));
}

// ===================== TRIPS =====================
export async function addTrip(
  companyId: string,
  data: Omit<Trip, 'id' | 'companyId' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'companies', companyId, 'trips'), {
    ...data,
    companyId,
    createdAt: Timestamp.now(),
  });
  // Araç km güncelle
  if (data.vehicleId) {
    await updateDoc(doc(db, 'companies', companyId, 'vehicles', data.vehicleId), {
      currentKm: data.returnKm,
    });
  }
  return ref.id;
}

export async function updateTrip(
  companyId: string,
  tripId: string,
  data: Partial<Trip>
): Promise<void> {
  await updateDoc(doc(db, 'companies', companyId, 'trips', tripId), data);
}

export async function deleteTrip(companyId: string, tripId: string): Promise<void> {
  await deleteDoc(doc(db, 'companies', companyId, 'trips', tripId));
}

export function subscribeTrips(
  companyId: string,
  callback: (trips: Trip[]) => void
): () => void {
  const q = query(
    collection(db, 'companies', companyId, 'trips'),
    orderBy('date', 'desc')
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Trip)));
  });
}

export async function getTrips(companyId: string, vehicleId?: string): Promise<Trip[]> {
  let q = vehicleId
    ? query(
        collection(db, 'companies', companyId, 'trips'),
        where('vehicleId', '==', vehicleId),
        orderBy('date', 'desc')
      )
    : query(collection(db, 'companies', companyId, 'trips'), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Trip));
}

// ===================== FUEL =====================
export async function addFuelEntry(
  companyId: string,
  data: Omit<FuelEntry, 'id' | 'companyId' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'companies', companyId, 'fuel'), {
    ...data,
    companyId,
    createdAt: Timestamp.now(),
  });
  // Araç km güncelle
  await updateDoc(doc(db, 'companies', companyId, 'vehicles', data.vehicleId), {
    currentKm: data.currentKm,
  });
  return ref.id;
}

export async function updateFuelEntry(
  companyId: string,
  fuelId: string,
  data: Partial<FuelEntry>
): Promise<void> {
  await updateDoc(doc(db, 'companies', companyId, 'fuel', fuelId), data);
}

export async function deleteFuelEntry(companyId: string, fuelId: string): Promise<void> {
  await deleteDoc(doc(db, 'companies', companyId, 'fuel', fuelId));
}

export function subscribeFuelEntries(
  companyId: string,
  callback: (entries: FuelEntry[]) => void
): () => void {
  const q = query(
    collection(db, 'companies', companyId, 'fuel'),
    orderBy('date', 'desc')
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as FuelEntry)));
  });
}

export async function getFuelEntries(companyId: string, vehicleId?: string): Promise<FuelEntry[]> {
  let q = vehicleId
    ? query(
        collection(db, 'companies', companyId, 'fuel'),
        where('vehicleId', '==', vehicleId),
        orderBy('date', 'desc')
      )
    : query(collection(db, 'companies', companyId, 'fuel'), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FuelEntry));
}

// ===================== CUSTOMERS =====================
export async function addCustomer(
  companyId: string,
  data: Omit<Customer, 'id' | 'companyId' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'companies', companyId, 'customers'), {
    ...data,
    companyId,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateCustomer(
  companyId: string,
  customerId: string,
  data: Partial<Customer>
): Promise<void> {
  await updateDoc(doc(db, 'companies', companyId, 'customers', customerId), data);
}

// Müşteriyi tüm hareketleri ve sohbet mesajlarıyla birlikte siler
export async function deleteCustomer(companyId: string, customerId: string): Promise<void> {
  const [txSnap, msgSnap] = await Promise.all([
    getDocs(query(collection(db, 'companies', companyId, 'customerTx'), where('customerId', '==', customerId))),
    getDocs(query(collection(db, 'companies', companyId, 'customerMessages'), where('customerId', '==', customerId))),
  ]);
  const refs = [...txSnap.docs, ...msgSnap.docs].map(d => d.ref);
  // Firestore batch limiti 500 işlem
  for (let i = 0; i < refs.length; i += 450) {
    const batch = writeBatch(db);
    refs.slice(i, i + 450).forEach(r => batch.delete(r));
    await batch.commit();
  }
  await deleteDoc(doc(db, 'companies', companyId, 'customers', customerId));
}

export function subscribeCustomers(
  companyId: string,
  callback: (customers: Customer[]) => void
): () => void {
  const q = query(collection(db, 'companies', companyId, 'customers'), orderBy('name'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
  });
}

// ===================== CUSTOMER TRANSACTIONS =====================
// Tüm müşterilerin hareketleri (liste ekranındaki bakiyeler için)
export function subscribeAllCustomerTx(
  companyId: string,
  callback: (txs: CustomerTransaction[]) => void
): () => void {
  return onSnapshot(collection(db, 'companies', companyId, 'customerTx'), snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomerTransaction)));
  });
}

export async function addCustomerTx(
  companyId: string,
  data: Omit<CustomerTransaction, 'id' | 'companyId' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'companies', companyId, 'customerTx'), {
    ...data,
    companyId,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateCustomerTx(
  companyId: string,
  txId: string,
  data: Partial<CustomerTransaction>
): Promise<void> {
  await updateDoc(doc(db, 'companies', companyId, 'customerTx', txId), data);
}

export async function deleteCustomerTx(companyId: string, txId: string): Promise<void> {
  await deleteDoc(doc(db, 'companies', companyId, 'customerTx', txId));
}

// ===================== CUSTOMER CHAT =====================
export function subscribeCustomerMessages(
  companyId: string,
  customerId: string,
  callback: (messages: CustomerMessage[]) => void
): () => void {
  // orderBy kullanılmıyor: composite index gerektirmesin diye istemcide sıralanıyor
  const q = query(
    collection(db, 'companies', companyId, 'customerMessages'),
    where('customerId', '==', customerId)
  );
  return onSnapshot(q, snap => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomerMessage));
    list.sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt));
    callback(list);
  });
}

// Sohbet mesajını ve mesajdan çıkan kayıtları tek seferde yazar
export async function addCustomerMessage(
  companyId: string,
  customerId: string,
  text: string,
  entries: Omit<CustomerTransaction, 'id' | 'companyId' | 'customerId' | 'createdAt' | 'messageId'>[]
): Promise<string> {
  const batch = writeBatch(db);
  const now = Timestamp.now();
  const msgRef = doc(collection(db, 'companies', companyId, 'customerMessages'));
  const txIds: string[] = [];
  entries.forEach(e => {
    const txRef = doc(collection(db, 'companies', companyId, 'customerTx'));
    txIds.push(txRef.id);
    batch.set(txRef, {
      ...e,
      companyId,
      customerId,
      messageId: msgRef.id,
      createdAt: now,
    });
  });
  batch.set(msgRef, { companyId, customerId, text, txIds, createdAt: now });
  await batch.commit();
  return msgRef.id;
}

export async function deleteCustomerMessage(
  companyId: string,
  message: CustomerMessage,
  withTransactions: boolean
): Promise<void> {
  const batch = writeBatch(db);
  if (withTransactions) {
    message.txIds.forEach(id => batch.delete(doc(db, 'companies', companyId, 'customerTx', id)));
  }
  batch.delete(doc(db, 'companies', companyId, 'customerMessages', message.id));
  await batch.commit();
}

export function toMillis(value: unknown): number {
  if (!value) return Date.now(); // bekleyen yazımlar
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return 0;
}
