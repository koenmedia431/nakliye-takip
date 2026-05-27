import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../../hooks/useData';
import { useAuth } from '../../hooks/useAuth';
import { updateVehicle, deleteVehicle } from '../../lib/firestore';
import EmptyState from '../../components/EmptyState';
import { Colors } from '../../constants/colors';
import { Vehicle } from '../../types';

const VEHICLE_TYPE_ICONS: Record<string, any> = {
  kamyon: 'bus',
  tır: 'train',
  kamyonet: 'car',
  van: 'car-sport',
  'minibüs': 'bus',
  diğer: 'cube',
};

export default function VehiclesScreen() {
  const { vehicles } = useData();
  const { userProfile } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return vehicles.filter((v: Vehicle) => {
      return (
        !search ||
        v.plate.toLowerCase().includes(search.toLowerCase()) ||
        v.brand.toLowerCase().includes(search.toLowerCase()) ||
        v.model.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [vehicles, search]);

  const handleToggleActive = async (vehicle: Vehicle) => {
    try {
      await updateVehicle(userProfile!.companyId, vehicle.id, { active: !vehicle.active });
    } catch {
      Alert.alert('Hata', 'Güncelleme başarısız');
    }
  };

  const handleDelete = (vehicle: Vehicle) => {
    Alert.alert(
      'Araç Sil',
      `${vehicle.plate} plakalı aracı silmek istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteVehicle(userProfile!.companyId, vehicle.id);
            } catch {
              Alert.alert('Hata', 'Araç silinemedi');
            }
          },
        },
      ]
    );
  };

  const renderVehicle = ({ item }: { item: Vehicle }) => (
    <TouchableOpacity
      style={[styles.card, !item.active && styles.cardInactive]}
      onPress={() => router.push(`/vehicle/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.vehicleIcon, { backgroundColor: item.active ? Colors.vehicleLight : Colors.gray100 }]}>
          <Ionicons
            name={(VEHICLE_TYPE_ICONS[item.type] || 'car') as any}
            size={22}
            color={item.active ? Colors.vehicle : Colors.gray400}
          />
        </View>
        <View style={styles.vehicleInfo}>
          <View style={styles.plateRow}>
            <Text style={styles.plate}>{item.plate}</Text>
            {!item.active && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveBadgeText}>Pasif</Text>
              </View>
            )}
          </View>
          <Text style={styles.brand}>{item.brand} {item.model} {item.year}</Text>
          <Text style={styles.vehicleType}>{item.type} • {item.fuelType}</Text>
        </View>
        {userProfile?.role === 'admin' && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleToggleActive(item)}
            >
              <Ionicons
                name={item.active ? 'pause-circle-outline' : 'play-circle-outline'}
                size={22}
                color={item.active ? Colors.warning : Colors.success}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
              <Ionicons name="trash-outline" size={20} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.kmRow}>
        <View style={styles.kmItem}>
          <Ionicons name="speedometer-outline" size={14} color={Colors.textLight} />
          <Text style={styles.kmLabel}>Güncel KM</Text>
          <Text style={styles.kmValue}>{item.currentKm.toLocaleString('tr-TR')} km</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={Colors.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Plaka veya marka ara..."
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
        {userProfile?.role === 'admin' && (
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/vehicle/add')}>
            <Ionicons name="add" size={22} color={Colors.white} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statsRow}>
        <Text style={styles.statItem}>
          <Text style={styles.statValue}>{vehicles.filter(v => v.active).length}</Text> aktif
        </Text>
        <Text style={styles.statDivider}>•</Text>
        <Text style={styles.statItem}>
          <Text style={styles.statValue}>{vehicles.filter(v => !v.active).length}</Text> pasif
        </Text>
        <Text style={styles.statDivider}>•</Text>
        <Text style={styles.statItem}>
          <Text style={styles.statValue}>{vehicles.length}</Text> toplam araç
        </Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderVehicle}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="car-outline"
            title="Araç Bulunamadı"
            description="Henüz araç eklenmemiş. Sağ üstteki + butonuna tıklayarak araç ekleyin."
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
    backgroundColor: Colors.vehicle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  statItem: { fontSize: 12, color: Colors.textLight },
  statValue: { fontWeight: '700', color: Colors.text },
  statDivider: { color: Colors.gray300 },
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
  cardInactive: { opacity: 0.6 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  vehicleIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleInfo: { flex: 1 },
  plateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  plate: { fontSize: 17, fontWeight: '800', color: Colors.text },
  inactiveBadge: {
    backgroundColor: Colors.gray100,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  inactiveBadgeText: { fontSize: 11, color: Colors.gray500, fontWeight: '600' },
  brand: { fontSize: 13, color: Colors.gray600, marginBottom: 2 },
  vehicleType: { fontSize: 12, color: Colors.textLight, textTransform: 'capitalize' },
  actions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 6 },
  kmRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  kmItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kmLabel: { fontSize: 12, color: Colors.textLight },
  kmValue: { fontSize: 14, fontWeight: '700', color: Colors.vehicle, marginLeft: 4 },
});
