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

// ===================== MÜŞTERİ CARİ =====================
export interface Customer {
  id: string;
  companyId: string;
  name: string;
  phone?: string;
  email?: string;
  taxNo?: string;         // Vergi no / TC
  address?: string;
  notes?: string;
  createdAt: Date;
}

// borc: müşteriye kesilen iş/fatura (ekstrede borç)
// tahsilat: müşteriden alınan ödeme (ekstrede alacak)
// masraf: bu müşteri için bizim yaptığımız gider (sadece iç kullanım, ekstrede görünmez)
export type CustomerTxKind = 'borc' | 'tahsilat' | 'masraf';

export interface CustomerTransaction {
  id: string;
  companyId: string;
  customerId: string;
  kind: CustomerTxKind;
  amount: number;
  description: string;
  date: string;           // YYYY-MM-DD
  messageId?: string;     // Sohbetten geldiyse kaynak mesaj
  createdAt: Date;
}

export interface CustomerMessage {
  id: string;
  companyId: string;
  customerId: string;
  text: string;
  txIds: string[];        // Bu mesajdan oluşturulan kayıtlar
  createdAt: Date;
}
