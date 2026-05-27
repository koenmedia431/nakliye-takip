import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../../hooks/useData';
import { Colors } from '../../constants/colors';
import { Trip, FuelEntry } from '../../types';

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { vehicles, trips, fuelEntries } = useData();
  const router = useRouter();

  const vehicle = vehicles.find(v => v.id === id);
  const vehicleTrips = useMemo(() => trips.filter((t: Trip) => t.vehicleId === id), [trips, id]);
  const vehicleFuel = useMemo(() => fuelEntries.filter((f: FuelEntry) => f.vehicleId === id), [fuelEntries, id]);

  const totalKm = useMemo(() => vehicleTrips.reduce((s, t) => s + t.distance, 0), [vehicleTrips]);
  const totalFuelCost = useMemo(() => vehicleFuel.reduce((s, f) => s + f.totalCost, 0), [vehicleFuel]);
  const totalLiters = useMemo(() => vehicleFuel.reduce((s, f) => s + f.liters, 0), [vehicleFuel]);
  const avgConsumption = useMemo(() => {
    if (totalKm === 0 || totalLiters === 0) return 0;
    return (totalLiters / totalKm) * 100;
  }, [totalKm, totalLiters]);

  if (!vehicle) {
    return (
      <View style={styles.notFound}>
        <Text>Araç bulunamadı</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: Colors.primary }}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <View style={[styles.headerBar, !vehicle.active && styles.headerBarInactive]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerPlate}>{vehicle.plate}</Text>
          <Text style={styles.headerSub}>{vehicle.brand} {vehicle.model}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalKm.toLocaleString('tr-TR')}</Text>
            <Text style={styles.statLabel}>Toplam KM</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: Colors.fuel }]}>
              ₺{totalFuelCost.toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>Yakıt Gideri</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: Colors.success }]}>
              {avgConsumption > 0 ? `${avgConsumption.toFixed(1)}` : '—'}
            </Text>
            <Text style={styles.statLabel}>lt/100km</Text>
          </View>
        </View>

        {/* Vehicle Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Araç Bilgileri</Text>
          {[
            { label: 'Tür', value: vehicle.type },
            { label: 'Yakıt', value: vehicle.fuelType },
            { label: 'Yıl', value: String(vehicle.year) },
            { label: 'Güncel KM', value: `${vehicle.currentKm.toLocaleString('tr-TR')} km` },
            { label: 'Durum', value: vehicle.active ? 'Aktif ✅' : 'Pasif ⛔' },
          ].map(({ label, value }) => (
            <View key={label} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={styles.infoValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Recent Trips */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Son Seferler ({vehicleTrips.length})</Text>
          {vehicleTrips.slice(0, 5).map((t: Trip) => (
            <TouchableOpacity key={t.id} style={styles.tripRow} onPress={() => router.push(`/trip/${t.id}`)}>
              <View>
                <Text style={styles.tripRoute}>{t.origin} → {t.destination}</Text>
                <Text style={styles.tripMeta}>{t.date}</Text>
              </View>
              <Text style={styles.tripKm}>{t.distance.toLocaleString('tr-TR')} km</Text>
            </TouchableOpacity>
          ))}
          {vehicleTrips.length === 0 && (
            <Text style={styles.emptyText}>Bu araç için sefer kaydı yok</Text>
          )}
        </View>

        {/* Recent Fuel */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Son Yakıt Alımları ({vehicleFuel.length})</Text>
          {vehicleFuel.slice(0, 5).map((f: FuelEntry) => (
            <View key={f.id} style={styles.fuelRow}>
              <View>
                <Text style={styles.tripRoute}>{f.liters} lt{f.station ? ` — ${f.station}` : ''}</Text>
                <Text style={styles.tripMeta}>{f.date}</Text>
              </View>
              <Text style={styles.fuelCost}>₺{f.totalCost.toFixed(2)}</Text>
            </View>
          ))}
          {vehicleFuel.length === 0 && (
            <Text style={styles.emptyText}>Bu araç için yakıt kaydı yok</Text>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.vehicle,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerBarInactive: { backgroundColor: Colors.gray500 },
  backBtn: { padding: 4, width: 40 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerPlate: { fontSize: 22, fontWeight: '800', color: Colors.white },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  container: { flex: 1, backgroundColor: Colors.background },
  statsGrid: {
    flexDirection: 'row',
    margin: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: { fontSize: 20, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.textLight, marginTop: 4, textAlign: 'center' },
  card: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray50,
  },
  infoLabel: { fontSize: 13, color: Colors.textLight },
  infoValue: { fontSize: 13, fontWeight: '600', color: Colors.text, textTransform: 'capitalize' },
  tripRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray50,
  },
  fuelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray50,
  },
  tripRoute: { fontSize: 13, fontWeight: '600', color: Colors.text },
  tripMeta: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  tripKm: { fontSize: 13, fontWeight: '700', color: Colors.trip },
  fuelCost: { fontSize: 13, fontWeight: '700', color: Colors.fuel },
  emptyText: { fontSize: 13, color: Colors.textLight, textAlign: 'center', paddingVertical: 12 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
});
