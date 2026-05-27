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
} from 'firebase/firestore';
import { db } from './firebase';
import { Company, Vehicle, Trip, FuelEntry, User } from '../types';

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
  await updateDoc(doc(db, 'companies', companyId, 'vehicles', data.vehicleId), {
    currentKm: data.endKm,
  });
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
