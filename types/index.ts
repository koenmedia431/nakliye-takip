export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'driver';
  companyId: string;
  // Sürücü bilgileri (admin tarafından atanır)
  vehiclePlate?: string;      // Atanan plaka
  vehicleId?: string;         // Atanan araç ID
  fuelRate?: number;          // Yakıt hakedişi lt/100km
  region?: string;            // Bölge
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
  region?: string;
  date: string;           // YYYY-MM-DD
  startTime?: string;     // HH:mm
  endTime?: string;       // HH:mm
  departureKm: number;    // Çıkış km
  returnKm: number;       // Dönüş km
  totalKm: number;        // Toplam km (returnKm - departureKm)
  fuelLiters?: number;    // Yakıt (lt/100km * totalKm hesaplı)
  fuelRate?: number;      // Hakedis oranı lt/100km
  notes?: string;
  createdAt: Date;
}

export interface FuelEntry {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  driverUid: string;
  driverName: string;
  companyId: string;
  date: string;
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
  avgConsumption: number;
}
