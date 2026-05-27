export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'driver';
  companyId: string;
  vehicleIds?: string[];
  createdAt: Date;
}

export interface Company {
  id: string;
  name: string;
  adminUid: string;
  createdAt: Date;
}

export interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  type: 'kamyon' | 'tır' | 'kamyonet' | 'van' | 'minibüs' | 'diğer';
  fuelType: 'dizel' | 'benzin' | 'lpg' | 'elektrik';
  currentKm: number;
  driverUid?: string;
  companyId: string;
  active: boolean;
  createdAt: Date;
}

export interface Trip {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  driverUid: string;
  driverName: string;
  companyId: string;
  origin: string;
  destination: string;
  date: string; // ISO date string
  startKm: number;
  endKm: number;
  distance: number;
  loadType?: string;
  loadWeight?: number;
  notes?: string;
  status: 'tamamlandı' | 'devam ediyor' | 'iptal';
  revenue?: number;
  createdAt: Date;
}

export interface FuelEntry {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  driverUid: string;
  driverName: string;
  companyId: string;
  date: string; // ISO date string
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  currentKm: number;
  station?: string;
  notes?: string;
  createdAt: Date;
}

export interface MonthlyStats {
  month: string;
  totalKm: number;
  totalFuelLiters: number;
  totalFuelCost: number;
  tripCount: number;
  avgConsumption: number; // lt/100km
}
