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
import { FuelEntry } from '../../types';

export default function FuelScreen() {
  const { fuelEntries } = useData();
  const router = useRouter();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return fuelEntries.filter((f: FuelEntry) => {
      return (
        !search ||
        f.vehiclePlate.toLowerCase().includes(search.toLowerCase()) ||
        f.driverName.toLowerCase().includes(search.toLowerCase()) ||
        (f.station && f.station.toLowerCase().includes(search.toLowerCase()))
      );
    });
  }, [fuelEntries, search]);

  const totalCost = useMemo(
    () => filtered.reduce((sum, f) => sum + f.totalCost, 0),
    [filtered]
  );

  const totalLiters = useMemo(
    () => filtered.reduce((sum, f) => sum + f.liters, 0),
    [filtered]
  );

  const renderEntry = ({ item }: { item: FuelEntry }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.fuelIconBox}>
          <Ionicons name="flame" size={20} color={Colors.fuel} />
        </View>
        <View style={styles.cardHeaderInfo}>
          <Text style={styles.plate}>{item.vehiclePlate}</Text>
          <Text style={styles.meta}>{item.driverName} • {item.date}</Text>
        </View>
        <View style={styles.costBlock}>
          <Text style={styles.totalCost}>₺{item.totalCost.toFixed(2)}</Text>
          <Text style={styles.liters}>{item.liters} lt</Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Litre Fiyatı</Text>
          <Text style={styles.detailValue}>₺{item.pricePerLiter.toFixed(2)}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>KM</Text>
          <Text style={styles.detailValue}>{item.currentKm.toLocaleString('tr-TR')}</Text>
        </View>
        {item.station && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>İstasyon</Text>
            <Text style={styles.detailValue}>{item.station}</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search & Add */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={Colors.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Plaka, sürücü veya istasyon ara..."
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
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/fuel/add')}>
          <Ionicons name="add" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      {filtered.length > 0 && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>₺{totalCost.toFixed(2)}</Text>
            <Text style={styles.summaryLabel}>Toplam Gider</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalLiters.toFixed(1)} lt</Text>
            <Text style={styles.summaryLabel}>Toplam Litre</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{filtered.length}</Text>
            <Text style={styles.summaryLabel}>Kayıt</Text>
          </View>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderEntry}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="flame-outline"
            title="Yakıt Kaydı Yok"
            description="Henüz yakıt alımı kaydedilmemiş. + butonuna tıklayarak kayıt ekleyin."
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 14, color: Colors.text },
  addBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: Colors.fuel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 16, fontWeight: '700', color: Colors.fuel },
  summaryLabel: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  summaryDivider: { width: 1, height: 32, backgroundColor: Colors.gray200 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  emptyContainer: { flex: 1, paddingHorizontal: 16 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    marginBottom: 10,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fuelIconBox: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: Colors.fuelLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderInfo: { flex: 1 },
  plate: { fontSize: 15, fontWeight: '700', color: Colors.text },
  meta: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  costBlock: { alignItems: 'flex-end' },
  totalCost: { fontSize: 17, fontWeight: '800', color: Colors.fuel },
  liters: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  cardDivider: { height: 1, backgroundColor: Colors.gray100, marginVertical: 12 },
  cardDetails: { flexDirection: 'row', gap: 20 },
  detailItem: {},
  detailLabel: { fontSize: 11, color: Colors.textLight, marginBottom: 2 },
  detailValue: { fontSize: 13, fontWeight: '600', color: Colors.text },
});
