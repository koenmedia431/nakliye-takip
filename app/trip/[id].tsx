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
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
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

        {/* Plaka + Tarih Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.plateBadge}>
              <Ionicons name="car" size={16} color={Colors.primary} />
              <Text style={styles.plateText}>{trip.vehiclePlate}</Text>
            </View>
            <Text style={styles.dateText}>{trip.date}</Text>
          </View>

          {/* KM gösterge */}
          <View style={styles.kmDisplay}>
            <View style={styles.kmCol}>
              <Text style={styles.kmColLabel}>Çıkış KM</Text>
              <Text style={styles.kmColValue}>{trip.departureKm.toLocaleString('tr-TR')}</Text>
            </View>
            <View style={styles.kmSeparator}>
              <Ionicons name="arrow-forward" size={24} color={Colors.gray300} />
            </View>
            <View style={styles.kmCol}>
              <Text style={styles.kmColLabel}>Dönüş KM</Text>
              <Text style={styles.kmColValue}>{trip.returnKm.toLocaleString('tr-TR')}</Text>
            </View>
          </View>

          <View style={styles.totalRow}>
            <View style={styles.totalBadge}>
              <Ionicons name="speedometer" size={18} color={Colors.trip} />
              <Text style={styles.totalKmLabel}>Toplam KM</Text>
              <Text style={styles.totalKmValue}>{trip.totalKm.toLocaleString('tr-TR')} km</Text>
            </View>
            {trip.fuelLiters ? (
              <View style={[styles.totalBadge, styles.fuelBadge]}>
                <Ionicons name="flame" size={18} color={Colors.fuel} />
                <Text style={[styles.totalKmLabel, { color: Colors.fuel }]}>Yakıt Hakedişi</Text>
                <Text style={[styles.totalKmValue, { color: Colors.fuel }]}>{trip.fuelLiters.toFixed(1)} lt</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Sefer Bilgileri */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sefer Bilgileri</Text>
          <InfoRow icon="calendar-outline" label="Tarih" value={trip.date} />
          <InfoRow icon="car-outline" label="Plaka" value={trip.vehiclePlate} />
          <InfoRow icon="person-outline" label="Sürücü" value={trip.driverName} />
          {trip.region ? (
            <InfoRow icon="location-outline" label="Bölge" value={trip.region} />
          ) : null}
          {trip.startTime ? (
            <InfoRow icon="time-outline" label="Başlangıç Saati" value={trip.startTime} />
          ) : null}
          {trip.endTime ? (
            <InfoRow icon="time-outline" label="Bitiş Saati" value={trip.endTime} />
          ) : null}
          {trip.fuelRate ? (
            <InfoRow icon="flame-outline" label="Hakedis Oranı" value={`${trip.fuelRate} lt/100km`} />
          ) : null}
        </View>

        {trip.notes ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notlar</Text>
            <Text style={styles.notes}>{trip.notes}</Text>
          </View>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
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

  heroCard: {
    backgroundColor: Colors.white,
    margin: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  plateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  plateText: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 1,
  },
  dateText: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '500',
  },
  kmDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  kmCol: {
    flex: 1,
    alignItems: 'center',
  },
  kmColLabel: {
    fontSize: 11,
    color: Colors.textLight,
    fontWeight: '500',
    marginBottom: 4,
  },
  kmColValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  kmSeparator: {
    paddingHorizontal: 8,
  },
  totalRow: {
    flexDirection: 'row',
    gap: 10,
  },
  totalBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.tripLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  fuelBadge: {
    backgroundColor: Colors.fuelLight,
  },
  totalKmLabel: {
    fontSize: 11,
    color: Colors.trip,
    fontWeight: '600',
    flex: 1,
  },
  totalKmValue: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.trip,
  },

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
