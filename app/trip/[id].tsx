import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../../hooks/useData';
import { useAuth } from '../../hooks/useAuth';
import { deleteTrip } from '../../lib/firestore';
import { Colors } from '../../constants/colors';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trips } = useData();
  const { userProfile } = useAuth();
  const router = useRouter();
  const trip = trips.find(t => t.id === id);

  if (!trip) {
    return (
      <View style={styles.notFound}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.gray300} />
        <Text style={styles.notFoundText}>Sefer bulunamadı</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleDelete = () => {
    Alert.alert(
      'Sefer Sil',
      'Bu sefer kaydını silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTrip(userProfile!.companyId, trip.id);
              router.back();
            } catch {
              Alert.alert('Hata', 'Sefer silinemedi');
            }
          },
        },
      ]
    );
  };

  const InfoRow = ({ icon, label, value }: { icon: any; label: string; value: string }) => (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Ionicons name={icon} size={16} color={Colors.textLight} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );

  return (
    <>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sefer Detayı</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Route Card */}
        <View style={styles.routeCard}>
          <View style={styles.routePoint}>
            <View style={[styles.dot, styles.dotOrigin]} />
            <View>
              <Text style={styles.routeLabel}>Kalkış</Text>
              <Text style={styles.routeCity}>{trip.origin}</Text>
            </View>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routePoint}>
            <View style={[styles.dot, styles.dotDest]} />
            <View>
              <Text style={styles.routeLabel}>Varış</Text>
              <Text style={styles.routeCity}>{trip.destination}</Text>
            </View>
          </View>
          <View style={styles.distanceRow}>
            <View style={styles.distanceBadge}>
              <Ionicons name="navigate" size={18} color={Colors.trip} />
              <Text style={styles.distanceText}>{trip.distance.toLocaleString('tr-TR')} km</Text>
            </View>
            <View style={[
              styles.statusBadge,
              trip.status === 'tamamlandı' ? styles.badgeSuccess :
                trip.status === 'devam ediyor' ? styles.badgeWarning : styles.badgeDanger
            ]}>
              <Text style={[
                styles.statusText,
                trip.status === 'tamamlandı' ? styles.textSuccess :
                  trip.status === 'devam ediyor' ? styles.textWarning : styles.textDanger
              ]}>
                {trip.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sefer Bilgileri</Text>
          <InfoRow icon="calendar-outline" label="Tarih" value={trip.date} />
          <InfoRow icon="car-outline" label="Plaka" value={trip.vehiclePlate} />
          <InfoRow icon="person-outline" label="Sürücü" value={trip.driverName} />
          <InfoRow icon="speedometer-outline" label="Başlangıç KM" value={`${trip.startKm.toLocaleString('tr-TR')} km`} />
          <InfoRow icon="speedometer" label="Bitiş KM" value={`${trip.endKm.toLocaleString('tr-TR')} km`} />
        </View>

        {(trip.loadType || trip.loadWeight || trip.revenue) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Yük & Gelir</Text>
            {trip.loadType && <InfoRow icon="cube-outline" label="Yük Türü" value={trip.loadType} />}
            {trip.loadWeight && <InfoRow icon="scale-outline" label="Ağırlık" value={`${trip.loadWeight} ton`} />}
            {trip.revenue && (
              <InfoRow icon="cash-outline" label="Gelir" value={`₺${trip.revenue.toLocaleString('tr-TR')}`} />
            )}
          </View>
        )}

        {trip.notes && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notlar</Text>
            <Text style={styles.notes}>{trip.notes}</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backBtn: { padding: 4 },
  deleteBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.white },
  container: { flex: 1, backgroundColor: Colors.background },
  routeCard: {
    backgroundColor: Colors.white,
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotOrigin: { backgroundColor: Colors.primary },
  dotDest: { backgroundColor: Colors.danger },
  routeLabel: { fontSize: 11, color: Colors.textLight, fontWeight: '500' },
  routeCity: { fontSize: 20, fontWeight: '700', color: Colors.text },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: Colors.gray200,
    marginLeft: 5,
    marginVertical: 6,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.tripLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  distanceText: { fontSize: 16, fontWeight: '800', color: Colors.trip },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, marginLeft: 'auto' },
  badgeSuccess: { backgroundColor: Colors.successLight },
  badgeWarning: { backgroundColor: Colors.warningLight },
  badgeDanger: { backgroundColor: Colors.dangerLight },
  statusText: { fontSize: 12, fontWeight: '700' },
  textSuccess: { color: Colors.success },
  textWarning: { color: Colors.warning },
  textDanger: { color: Colors.danger },
  card: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray50,
  },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 13, color: Colors.textLight },
  infoValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
  notes: { fontSize: 14, color: Colors.gray600, lineHeight: 20 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFoundText: { fontSize: 16, color: Colors.textLight },
  backLink: { marginTop: 8 },
  backLinkText: { color: Colors.primary, fontWeight: '600' },
});
