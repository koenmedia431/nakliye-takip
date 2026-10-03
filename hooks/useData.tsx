import React, { createContext, useContext, useEffect, useState } from 'react';
import { Vehicle, Trip, FuelEntry, Customer, CustomerTransaction } from '../types';
import {
  subscribeVehicles,
  subscribeTrips,
  subscribeFuelEntries,
  subscribeCustomers,
  subscribeAllCustomerTx,
} from '../lib/firestore';
import { useAuth } from './useAuth';

interface DataContextType {
  vehicles: Vehicle[];
  trips: Trip[];
  fuelEntries: FuelEntry[];
  customers: Customer[];
  customerTx: CustomerTransaction[];
  loadingData: boolean;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { userProfile } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerTx, setCustomerTx] = useState<CustomerTransaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!userProfile?.companyId) {
      setLoadingData(false);
      return;
    }
    const companyId = userProfile.companyId;
    setLoadingData(true);

    const unsubV = subscribeVehicles(companyId, (data) => setVehicles(data));
    const unsubT = subscribeTrips(companyId, (data) => {
      // Eğer sürücü ise sadece kendi seferlerini göster
      if (userProfile.role === 'driver') {
        setTrips(data.filter(t => t.driverUid === userProfile.uid));
      } else {
        setTrips(data);
      }
    });
    const unsubF = subscribeFuelEntries(companyId, (data) => {
      if (userProfile.role === 'driver') {
        setFuelEntries(data.filter(f => f.driverUid === userProfile.uid));
      } else {
        setFuelEntries(data);
      }
    });

    // Müşteri cari hesapları sadece yöneticiye açık
    let unsubC = () => {};
    let unsubCT = () => {};
    if (userProfile.role === 'admin') {
      unsubC = subscribeCustomers(companyId, setCustomers);
      unsubCT = subscribeAllCustomerTx(companyId, setCustomerTx);
    } else {
      setCustomers([]);
      setCustomerTx([]);
    }

    setLoadingData(false);

    return () => {
      unsubV();
      unsubT();
      unsubF();
      unsubC();
      unsubCT();
    };
  }, [userProfile]);

  return (
    <DataContext.Provider value={{ vehicles, trips, fuelEntries, customers, customerTx, loadingData }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
