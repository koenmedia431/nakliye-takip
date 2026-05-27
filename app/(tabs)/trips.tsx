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
import { useData } from '../../hooks/useData';
import EmptyState from '../../components/EmptyState';
import { Colors } from '../../constants/colors';
import { Trip } from '../../types';

const STATUS_FILTERS = ['Tümü', 'tamamlandı', 'devam ediyor', 'iptal'];

export default function TripsScreen() {
  const { trips } = useData();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tümü');

  const filtered = useMemo(() => {
    return trips.filter((t: Trip) => {
      const matchSearch =
        !search ||
        t.origin.toLowerCase().includes(search.toLowerCase()) ||
        t.destination.toLowerCase().includes(search.toLowerCase()) ||
        t.vehiclePlate.toLowerCase().includes(search.toLowerCase()) ||
        t.driverName.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'Tümü' || t.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [trips, search, statusFilter]);

  const renderTrip = ({ item }: { item: Trip }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/trip/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.routeRow}>
          <View style={styles.locationDot} />
          <Text style={styles.routeText}>{item.origin}</Text>
        </View>
        <View style={[styles.routeConnector]} />
        <View style={styles.routeRow}>
          <View style={[styles.locationDot, styles.destDot]} />
          <Text style={styles.routeText}>{item.destination}</Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="car-outline" size={14} color={Colors.textLight} />
          <Text style={styles.metaText}>{item.vehiclePlate}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="person-outline" size={14} color={Colors.textLight} />
          <Text style={styles.metaText}>{item.driverName}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={14} color={Colors.textLight} />
          <Text style={styles.metaText}>{item.date}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.kmBadge}>
          <Ionicons name="speedometer-outline" size={14} color={Colors.trip} />
          <Text style={styles.kmText}>{item.distance.toLocaleString('tr-TR')} km</Text>
        </View>
        {item.revenue ? (
          <Text style={styles.revenue}>₺{item.revenue.toLocaleString('tr-TR')}</Text>
        ) : null}
        <View style={[
          styles.statusBadge,
          item.status === 'tamamlandı' ? styles.badgeSuccess :
            item.status === 'devam ediyor' ? styles.badgeWarning : styles.badgeDanger
        ]}>
          <Text style={[
            styles.statusText,
            item.status === 'tamamlandı' ? styles.textSuccess :
              item.status === 'devam ediyor' ? styles.textWarning : styles.textDanger
          ]}>
            {item.status}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={Colors.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rota, plaka veya sürücü ara..."
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
          <Ionicons name="add" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}
            onPress={() => setStatusFilter(f)}
          >
            <Text style={[styles.filterText, statusFilter === f && styles.filterTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchRow: {
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray500,
  },
  filterTextActive: {
    color: Colors.white,
  },
  countText: {
    paddingHorizontal: 16,
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
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
  cardHeader: {
    marginBottom: 12,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  destDot: {
    backgroundColor: Colors.danger,
  },
  routeConnector: {
    width: 2,
    height: 14,
    backgroundColor: Colors.gray200,
    marginLeft: 4,
    marginVertical: 2,
  },
  routeText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.gray100,
    marginBottom: 12,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.tripLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  kmText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.trip,
  },
  revenue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.success,
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  badgeSuccess: { backgroundColor: Colors.successLight },
  badgeWarning: { backgroundColor: Colors.warningLight },
  badgeDanger: { backgroundColor: Colors.dangerLight },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textSuccess: { color: Colors.success },
  textWarning: { color: Colors.warning },
  textDanger: { color: Colors.danger },
});
