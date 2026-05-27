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
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return month;
  }, []);

  const monthlyTrips = useMemo(
    () => trips.filter((t: Trip) => t.date && t.date.startsWith(thisMonth)),
    [trips, thisMonth]
  );

  const monthlyFuel = useMemo(
    () => fuelEntries.filter((f: FuelEntry) => f.date && f.date.startsWith(thisMonth)),
    [fuelEntries, thisMonth]
  );

  const totalKm = useMemo(
    () => monthlyTrips.reduce((sum: number, t: Trip) => sum + (t.distance || 0), 0),
    [monthlyTrips]
  );

  const totalFuelCost = useMemo(
    () => monthlyFuel.reduce((sum: number, f: FuelEntry) => sum + (f.totalCost || 0), 0),
    [monthlyFuel]
  );

  const totalLiters = useMemo(
    () => monthlyFuel.reduce((sum: number, f: FuelEntry) => sum + (f.liters || 0), 0),
    [monthlyFuel]
  );

  const avgConsumption = useMemo(() => {
    if (totalKm === 0 || totalLiters === 0) return 0;
    return (totalLiters / totalKm) * 100;
  }, [totalKm, totalLiters]);

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
          <Text style={styles.greeting}>Merhaba, {userProfile?.displayName?.split(' ')[0] || 'Kullanıcı'} 👋</Text>
          <Text style={styles.subGreeting}>{monthName} ayı özeti</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={Colors.gray500} />
        </TouchableOpacity>
      </View>

      {/* Stats Grid */}
      <Text style={styles.sectionTitle}>Bu Ay</Text>
      <View style={styles.statsGrid}>
        <StatCard
          title="Toplam KM"
          value={`${totalKm.toLocaleString('tr-TR')} km`}
          subtitle={`${monthlyTrips.length} sefer`}
          icon="navigate-circle"
          color={Colors.trip}
          bgColor={Colors.tripLight}
        />
        <StatCard
          title="Yakıt Gideri"
          value={`₺${totalFuelCost.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          subtitle={`${totalLiters.toFixed(1)} litre`}
          icon="flame"
          color={Colors.fuel}
          bgColor={Colors.fuelLight}
        />
      </View>
      <View style={styles.statsGrid}>
        <StatCard
          title="Ort. Tüketim"
          value={avgConsumption > 0 ? `${avgConsumption.toFixed(1)} lt/100` : '—'}
          subtitle="100 km başına"
          icon="speedometer"
          color={Colors.success}
          bgColor={Colors.successLight}
        />
        <StatCard
          title="Aktif Araç"
          value={`${vehicles.filter(v => v.active).length}`}
          subtitle={`${vehicles.length} toplam`}
          icon="car"
          color={Colors.vehicle}
          bgColor={Colors.vehicleLight}
        />
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
          <Text style={styles.seeAll}>Tümü</Text>
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
          >
            <View style={styles.tripLeft}>
              <View style={styles.tripIconBox}>
                <Ionicons name="navigate" size={18} color={Colors.trip} />
              </View>
              <View>
                <Text style={styles.tripRoute}>
                  {trip.origin} → {trip.destination}
                </Text>
                <Text style={styles.tripMeta}>
                  {trip.vehiclePlate} • {trip.date}
                </Text>
              </View>
            </View>
            <View style={styles.tripRight}>
              <Text style={styles.tripKm}>{trip.distance.toLocaleString('tr-TR')} km</Text>
              <View style={[
                styles.tripStatusBadge,
                trip.status === 'tamamlandı' ? styles.badgeSuccess :
                  trip.status === 'devam ediyor' ? styles.badgeWarning : styles.badgeDanger
              ]}>
                <Text style={[
                  styles.tripStatusText,
                  trip.status === 'tamamlandı' ? styles.textSuccess :
                    trip.status === 'devam ediyor' ? styles.textWarning : styles.textDanger
                ]}>
                  {trip.status}
                </Text>
              </View>
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
  logoutBtn: {
    padding: 8,
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
  tripIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.tripLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripRoute: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  tripMeta: {
    fontSize: 12,
    color: Colors.textLight,
  },
  tripRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  tripKm: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.trip,
  },
  tripStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeSuccess: { backgroundColor: Colors.successLight },
  badgeWarning: { backgroundColor: Colors.warningLight },
  badgeDanger: { backgroundColor: Colors.dangerLight },
  tripStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  textSuccess: { color: Colors.success },
  textWarning: { color: Colors.warning },
  textDanger: { color: Colors.danger },
});
