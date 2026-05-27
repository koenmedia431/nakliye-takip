import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import EmptyState from '../../components/EmptyState';
import { Colors } from '../../constants/colors';
import { Trip } from '../../types';

export default function TripsScreen() {
  const { trips } = useData();
  const { userProfile } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return trips;
    const q = search.toLowerCase();
    return trips.filter((t: Trip) =>
      t.vehiclePlate.toLowerCase().includes(q) ||
      t.driverName.toLowerCase().includes(q) ||
      (t.region || '').toLowerCase().includes(q) ||
      t.date.includes(q)
    );
  }, [trips, search]);

  const renderTrip = ({ item }: { item: Trip }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/trip/${item.id}`)}
      activeOpacity={0.85}
    >
      {/* Kart başlığı: Plaka + Tarih */}
      <View style={styles.cardTop}>
        <View style={styles.plateBadge}>
          <Ionicons name="car-outline" size={14} color={Colors.primary} />
          <Text style={styles.plateText}>{item.vehiclePlate}</Text>
        </View>
        <View style={styles.topRight}>
          {item.region ? (
            <View style={styles.regionBadge}>
              <Ionicons name="location-outline" size={12} color={Colors.gray500} />
              <Text style={styles.regionText}>{item.region}</Text>
            </View>
          ) : null}
          <Text style={styles.dateText}>{item.date}</Text>
        </View>
      </View>

      {/* KM Satırı */}
      <View style={styles.kmRow}>
        <View style={styles.kmBlock}>
          <Text style={styles.kmLabel}>Çıkış KM</Text>
          <Text style={styles.kmValue}>{item.departureKm.toLocaleString('tr-TR')}</Text>
        </View>
        <View style={styles.kmArrow}>
          <Ionicons name="arrow-forward" size={18} color={Colors.gray300} />
        </View>
        <View style={styles.kmBlock}>
          <Text style={styles.kmLabel}>Dönüş KM</Text>
          <Text style={styles.kmValue}>{item.returnKm.toLocaleString('tr-TR')}</Text>
        </View>
        <View style={styles.kmTotal}>
          <Text style={styles.kmTotalLabel}>Toplam</Text>
          <Text style={styles.kmTotalValue}>{item.totalKm.toLocaleString('tr-TR')} km</Text>
        </View>
      </View>

      {/* Alt satır: Saat aralığı + Yakıt + Sürücü */}
      <View style={styles.cardBottom}>
        {item.startTime && item.endTime ? (
          <View style={styles.timeChip}>
            <Ionicons name="time-outline" size={13} color={Colors.gray500} />
            <Text style={styles.timeText}>{item.startTime} – {item.endTime}</Text>
          </View>
        ) : item.startTime ? (
          <View style={styles.timeChip}>
            <Ionicons name="time-outline" size={13} color={Colors.gray500} />
            <Text style={styles.timeText}>{item.startTime}</Text>
          </View>
        ) : null}

        {item.fuelLiters ? (
          <View style={styles.fuelChip}>
            <Ionicons name="flame-outline" size={13} color={Colors.fuel} />
            <Text style={styles.fuelText}>{item.fuelLiters.toFixed(1)} lt</Text>
          </View>
        ) : null}

        {userProfile?.role === 'admin' && (
          <View style={styles.driverChip}>
            <Ionicons name="person-outline" size={13} color={Colors.gray400} />
            <Text style={styles.driverText}>{item.driverName}</Text>
          </View>
        )}

        {item.notes ? (
          <View style={styles.noteChip}>
            <Ionicons name="document-text-outline" size={13} color={Colors.gray400} />
            <Text style={styles.noteText} numberOfLines={1}>{item.notes}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search + Add */}
      <View style={styles.topBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={Colors.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Plaka, sürücü veya tarih ara..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={Colors.gray300}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={Colors.gray400} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/trip/add')}>
          <Ionicons name="add" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Count */}
      <Text style={styles.countText}>{filtered.length} sefer</Text>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderTrip}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="navigate-outline"
            title="Sefer Bulunamadı"
            description="Henüz sefer kaydı yok. Sağ üstteki + butonuna tıklayarak sefer ekleyin."
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 14,
    color: Colors.text,
  },
  addBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    paddingHorizontal: 16,
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 8,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  emptyContainer: { flex: 1, paddingHorizontal: 16 },

  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  plateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  plateText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  topRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  regionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  regionText: {
    fontSize: 11,
    color: Colors.gray500,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 12,
    color: Colors.textLight,
  },

  kmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  kmBlock: {
    alignItems: 'center',
    flex: 1,
  },
  kmLabel: {
    fontSize: 10,
    color: Colors.textLight,
    fontWeight: '500',
    marginBottom: 2,
  },
  kmValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  kmArrow: {
    paddingHorizontal: 8,
  },
  kmTotal: {
    alignItems: 'center',
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: Colors.gray200,
    flex: 1,
  },
  kmTotalLabel: {
    fontSize: 10,
    color: Colors.trip,
    fontWeight: '600',
    marginBottom: 2,
  },
  kmTotalValue: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.trip,
  },

  cardBottom: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.gray100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timeText: {
    fontSize: 12,
    color: Colors.gray600,
    fontWeight: '500',
  },
  fuelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.fuelLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  fuelText: {
    fontSize: 12,
    color: Colors.fuel,
    fontWeight: '700',
  },
  driverChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.gray100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  driverText: {
    fontSize: 12,
    color: Colors.gray600,
  },
  noteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  noteText: {
    fontSize: 12,
    color: Colors.gray400,
    fontStyle: 'italic',
    flex: 1,
  },
});
