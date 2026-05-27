import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import StatCard from '../../components/StatCard';
import { Colors } from '../../constants/colors';
import { Trip, FuelEntry } from '../../types';

export default function DashboardScreen() {
  const { userProfile, logout } = useAuth();
  const { trips, fuelEntries, vehicles, loadingData } = useData();
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);

  const thisMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const monthlyTrips = useMemo(
    () => trips.filter((t: Trip) => t.date && t.date.startsWith(thisMonth)),
    [trips, thisMonth]
  );

  const monthlyFuel = useMemo(
    () => fuelEntries.filter((f: FuelEntry) => f.date && f.date.startsWith(thisMonth)),
    [fuelEntries, thisMonth]
  );

  // Aylık toplam km (seferlerden)
  const totalKm = useMemo(
    () => monthlyTrips.reduce((sum: number, t: Trip) => sum + (t.totalKm || 0), 0),
    [monthlyTrips]
  );

  // Yakıt hakedişi (seferlerden hesaplı)
  const totalFuelLitersFromTrips = useMemo(
    () => monthlyTrips.reduce((sum: number, t: Trip) => sum + (t.fuelLiters || 0), 0),
    [monthlyTrips]
  );

  // Gerçek yakıt alımı (yakıt kayıtlarından)
  const totalFuelCost = useMemo(
    () => monthlyFuel.reduce((sum: number, f: FuelEntry) => sum + (f.totalCost || 0), 0),
    [monthlyFuel]
  );

  const totalLitersActual = useMemo(
    () => monthlyFuel.reduce((sum: number, f: FuelEntry) => sum + (f.liters || 0), 0),
    [monthlyFuel]
  );

  const recentTrips = useMemo(() => trips.slice(0, 5), [trips]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const monthName = useMemo(() => {
    const months = [
      'Ocak','Şubat','Mart','Nisan','Mayıs','Haziran',
      'Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'
    ];
    return months[new Date().getMonth()];
  }, []);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      {/* Greeting */}
      <View style={styles.greetingRow}>
        <View>
          <Text style={styles.greeting}>
            Merhaba, {userProfile?.displayName?.split(' ')[0] || 'Kullanıcı'} 👋
          </Text>
          <Text style={styles.subGreeting}>{monthName} ayı özeti</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={Colors.gray500} />
        </TouchableOpacity>
      </View>

      {/* Sürücü bilgi kartı */}
      {userProfile?.role === 'driver' && userProfile.vehiclePlate && (
        <View style={styles.driverInfoCard}>
          <View style={styles.driverInfoItem}>
            <Ionicons name="car" size={18} color={Colors.primary} />
            <View>
              <Text style={styles.driverInfoLabel}>Atanmış Araç</Text>
              <Text style={styles.driverInfoValue}>{userProfile.vehiclePlate}</Text>
            </View>
          </View>
          {userProfile.region ? (
            <View style={styles.driverInfoItem}>
              <Ionicons name="location" size={18} color={Colors.success} />
              <View>
                <Text style={styles.driverInfoLabel}>Bölge</Text>
                <Text style={styles.driverInfoValue}>{userProfile.region}</Text>
              </View>
            </View>
          ) : null}
          {userProfile.fuelRate ? (
            <View style={styles.driverInfoItem}>
              <Ionicons name="flame" size={18} color={Colors.fuel} />
              <View>
                <Text style={styles.driverInfoLabel}>Hakedis Oranı</Text>
                <Text style={styles.driverInfoValue}>{userProfile.fuelRate} lt/100km</Text>
              </View>
            </View>
          ) : null}
        </View>
      )}

      {/* Stats Grid */}
      <Text style={styles.sectionTitle}>Bu Ay — {monthName}</Text>
      <View style={styles.statsGrid}>
        <StatCard
          title="Aylık KM"
          value={`${totalKm.toLocaleString('tr-TR')} km`}
          subtitle={`${monthlyTrips.length} sefer`}
          icon="navigate-circle"
          color={Colors.trip}
          bgColor={Colors.tripLight}
        />
        <StatCard
          title="Yakıt Hakedişi"
          value={`${totalFuelLitersFromTrips.toFixed(1)} lt`}
          subtitle={`${monthlyTrips.length} seferden`}
          icon="flame"
          color={Colors.fuel}
          bgColor={Colors.fuelLight}
        />
      </View>
      <View style={styles.statsGrid}>
        <StatCard
          title="Yakıt Gideri"
          value={`₺${totalFuelCost.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          subtitle={`${totalLitersActual.toFixed(1)} litre alındı`}
          icon="cash"
          color={Colors.success}
          bgColor={Colors.successLight}
        />
        {userProfile?.role === 'admin' ? (
          <StatCard
            title="Aktif Araç"
            value={`${vehicles.filter(v => v.active).length}`}
            subtitle={`${vehicles.length} toplam`}
            icon="car"
            color={Colors.vehicle}
            bgColor={Colors.vehicleLight}
          />
        ) : (
          <StatCard
            title="Bu Ay Sefer"
            value={`${monthlyTrips.length}`}
            subtitle={`${totalKm.toLocaleString('tr-TR')} km`}
            icon="navigate"
            color={Colors.primary}
            bgColor={Colors.primaryLight}
          />
        )}
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: Colors.trip }]}
          onPress={() => router.push('/trip/add')}
        >
          <View style={[styles.actionIcon, { backgroundColor: Colors.tripLight }]}>
            <Ionicons name="add-circle" size={24} color={Colors.trip} />
          </View>
          <Text style={styles.actionLabel}>Sefer Ekle</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: Colors.fuel }]}
          onPress={() => router.push('/fuel/add')}
        >
          <View style={[styles.actionIcon, { backgroundColor: Colors.fuelLight }]}>
            <Ionicons name="add-circle" size={24} color={Colors.fuel} />
          </View>
          <Text style={styles.actionLabel}>Yakıt Ekle</Text>
        </TouchableOpacity>
        {userProfile?.role === 'admin' && (
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: Colors.vehicle }]}
            onPress={() => router.push('/vehicle/add')}
          >
            <View style={[styles.actionIcon, { backgroundColor: Colors.vehicleLight }]}>
              <Ionicons name="add-circle" size={24} color={Colors.vehicle} />
            </View>
            <Text style={styles.actionLabel}>Araç Ekle</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Recent Trips */}
      <View style={styles.recentHeader}>
        <Text style={styles.sectionTitle}>Son Seferler</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/trips')}>
          <Text style={styles.seeAll}>Tümü →</Text>
        </TouchableOpacity>
      </View>

      {recentTrips.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="navigate-outline" size={28} color={Colors.gray300} />
          <Text style={styles.emptyText}>Henüz sefer kaydı yok</Text>
        </View>
      ) : (
        recentTrips.map((trip: Trip) => (
          <TouchableOpacity
            key={trip.id}
            style={styles.tripCard}
            onPress={() => router.push(`/trip/${trip.id}`)}
            activeOpacity={0.85}
          >
            <View style={styles.tripLeft}>
              <View style={styles.plateBadge}>
                <Text style={styles.plateBadgeText}>{trip.vehiclePlate}</Text>
              </View>
              <View>
                <Text style={styles.tripKmLine}>
                  {trip.departureKm.toLocaleString('tr-TR')} → {trip.returnKm.toLocaleString('tr-TR')} km
                </Text>
                <Text style={styles.tripMeta}>
                  {trip.date}
                  {trip.startTime ? ` • ${trip.startTime}` : ''}
                  {trip.endTime ? ` – ${trip.endTime}` : ''}
                </Text>
              </View>
            </View>
            <View style={styles.tripRight}>
              <Text style={styles.tripTotalKm}>{trip.totalKm.toLocaleString('tr-TR')} km</Text>
              {trip.fuelLiters ? (
                <Text style={styles.tripFuelLiters}>{trip.fuelLiters.toFixed(1)} lt</Text>
              ) : null}
            </View>
          </TouchableOpacity>
        ))
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  subGreeting: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 2,
  },
  logoutBtn: { padding: 8 },
  driverInfoCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  driverInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  driverInfoLabel: {
    fontSize: 10,
    color: Colors.textLight,
    fontWeight: '500',
  },
  driverInfoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 20,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  actionBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray700,
    textAlign: 'center',
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  tripCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  tripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  plateBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },
  plateBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  tripKmLine: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  tripMeta: {
    fontSize: 11,
    color: Colors.textLight,
  },
  tripRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  tripTotalKm: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.trip,
  },
  tripFuelLiters: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.fuel,
  },
});
