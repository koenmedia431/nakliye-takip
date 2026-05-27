import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { subscribeCompanyUsers, updateUserProfile } from '../../lib/firestore';
import { Colors } from '../../constants/colors';
import { User, Vehicle } from '../../types';

export default function DriversScreen() {
  const { userProfile } = useAuth();
  const { vehicles } = useData();
  const [drivers, setDrivers] = useState<User[]>([]);
  const [editingDriver, setEditingDriver] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [fuelRate, setFuelRate] = useState('');
  const [region, setRegion] = useState('');
  const [saving, setSaving] = useState(false);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);

  useEffect(() => {
    if (!userProfile?.companyId) return;
    const unsub = subscribeCompanyUsers(userProfile.companyId, (users) => {
      setDrivers(users.filter(u => u.role === 'driver'));
    });
    return unsub;
  }, [userProfile]);

  const openEdit = (driver: User) => {
    setEditingDriver(driver);
    setSelectedVehicleId(driver.vehicleId || '');
    setFuelRate(driver.fuelRate ? String(driver.fuelRate) : '');
    setRegion(driver.region || '');
    setShowVehiclePicker(false);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editingDriver) return;
    setSaving(true);
    try {
      const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
      await updateUserProfile(editingDriver.uid, {
        vehicleId: selectedVehicleId || undefined,
        vehiclePlate: selectedVehicle?.plate || undefined,
        fuelRate: fuelRate ? parseFloat(fuelRate) : undefined,
        region: region.trim() || undefined,
      });
      setShowModal(false);
    } catch (e) {
      Alert.alert('Hata', 'Güncelleme başarısız');
    } finally {
      setSaving(false);
    }
  };

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  const renderDriver = ({ item }: { item: User }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.driverInfo}>
          <Text style={styles.driverName}>{item.displayName}</Text>
          <Text style={styles.driverEmail}>{item.email}</Text>
        </View>
        {userProfile?.role === 'admin' && (
          <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
            <Ionicons name="settings-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Ionicons name="car-outline" size={14} color={Colors.textLight} />
          <Text style={styles.infoLabel}>Plaka</Text>
          <Text style={[styles.infoValue, !item.vehiclePlate && styles.unassigned]}>
            {item.vehiclePlate || 'Atanmadı'}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="location-outline" size={14} color={Colors.textLight} />
          <Text style={styles.infoLabel}>Bölge</Text>
          <Text style={[styles.infoValue, !item.region && styles.unassigned]}>
            {item.region || 'Atanmadı'}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="flame-outline" size={14} color={Colors.textLight} />
          <Text style={styles.infoLabel}>Yakıt Hakedişi</Text>
          <Text style={[styles.infoValue, !item.fuelRate && styles.unassigned]}>
            {item.fuelRate ? `${item.fuelRate} lt/100km` : 'Atanmadı'}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={drivers}
        keyExtractor={item => item.uid}
        renderItem={renderDriver}
        contentContainerStyle={drivers.length === 0 ? styles.emptyContainer : styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {userProfile?.role === 'admin' ? 'Sürücü Yönetimi' : 'Ekip'}
            </Text>
            <Text style={styles.headerSub}>{drivers.length} sürücü</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={Colors.gray300} />
            <Text style={styles.emptyTitle}>Henüz Sürücü Yok</Text>
            <Text style={styles.emptyDesc}>
              Sürücüler kayıt olduktan sonra burada görünecek.{'\n'}
              Admin onay ve atama yapabilir.
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sürücü Ataması</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={Colors.gray500} />
              </TouchableOpacity>
            </View>

            {editingDriver && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.driverBadge}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {editingDriver.displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.driverName}>{editingDriver.displayName}</Text>
                    <Text style={styles.driverEmail}>{editingDriver.email}</Text>
                  </View>
                </View>

                {/* Araç Seçimi */}
                <Text style={styles.fieldLabel}>Araç / Plaka</Text>
                <TouchableOpacity
                  style={styles.pickerBtn}
                  onPress={() => setShowVehiclePicker(!showVehiclePicker)}
                >
                  <Ionicons name="car-outline" size={18} color={Colors.gray400} />
                  <Text style={selectedVehicle ? styles.pickerSelected : styles.pickerPlaceholder}>
                    {selectedVehicle ? `${selectedVehicle.plate} — ${selectedVehicle.brand} ${selectedVehicle.model}` : 'Araç seçin...'}
                  </Text>
                  <Ionicons name={showVehiclePicker ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.gray400} />
                </TouchableOpacity>

                {showVehiclePicker && (
                  <View style={styles.vehicleList}>
                    <TouchableOpacity
                      style={styles.vehicleItem}
                      onPress={() => { setSelectedVehicleId(''); setShowVehiclePicker(false); }}
                    >
                      <Text style={styles.vehicleItemText}>— Araç Yok —</Text>
                    </TouchableOpacity>
                    {vehicles.filter(v => v.active).map(v => (
                      <TouchableOpacity
                        key={v.id}
                        style={[styles.vehicleItem, selectedVehicleId === v.id && styles.vehicleItemSelected]}
                        onPress={() => { setSelectedVehicleId(v.id); setShowVehiclePicker(false); }}
                      >
                        <Text style={[styles.vehicleItemText, selectedVehicleId === v.id && styles.vehicleItemTextSelected]}>
                          {v.plate} — {v.brand} {v.model}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Bölge */}
                <Text style={styles.fieldLabel}>Bölge</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="location-outline" size={18} color={Colors.gray400} />
                  <TextInput
                    style={styles.input}
                    placeholder="Örn: İstanbul Anadolu, Ankara..."
                    value={region}
                    onChangeText={setRegion}
                    placeholderTextColor={Colors.gray300}
                  />
                </View>

                {/* Yakıt Hakedişi */}
                <Text style={styles.fieldLabel}>Yakıt Hakedişi (lt/100km)</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="flame-outline" size={18} color={Colors.fuel} />
                  <TextInput
                    style={styles.input}
                    placeholder="Örn: 15.5"
                    value={fuelRate}
                    onChangeText={setFuelRate}
                    keyboardType="decimal-pad"
                    placeholderTextColor={Colors.gray300}
                  />
                </View>
                {Boolean(fuelRate) && (
                  <View style={styles.fuelInfo}>
                    <Ionicons name="information-circle" size={14} color={Colors.primary} />
                    <Text style={styles.fuelInfoText}>
                      100 km'de {fuelRate} lt hakediş hesaplanacak
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <Text style={styles.saveBtnText}>Kaydet</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  emptyContainer: { flex: 1, paddingHorizontal: 16 },
  header: { paddingTop: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  headerSub: { fontSize: 13, color: Colors.textLight, marginTop: 2 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: Colors.white },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  driverEmail: { fontSize: 12, color: Colors.textLight, marginTop: 1 },
  editBtn: { padding: 8 },
  cardDivider: { height: 1, backgroundColor: Colors.gray100, marginVertical: 12 },
  infoRow: { flexDirection: 'row', gap: 8 },
  infoItem: { flex: 1, gap: 2 },
  infoLabel: { fontSize: 10, color: Colors.textLight, fontWeight: '500' },
  infoValue: { fontSize: 12, fontWeight: '700', color: Colors.text },
  unassigned: { color: Colors.gray300, fontWeight: '400', fontStyle: 'italic' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.gray700 },
  emptyDesc: { fontSize: 13, color: Colors.textLight, textAlign: 'center', lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  driverBadge: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, padding: 14, backgroundColor: Colors.gray50, borderRadius: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.gray700, marginBottom: 8, marginTop: 16 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: 12,
    backgroundColor: Colors.gray50,
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 14, color: Colors.text },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: 12,
    backgroundColor: Colors.gray50,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  pickerPlaceholder: { flex: 1, fontSize: 14, color: Colors.gray300 },
  pickerSelected: { flex: 1, fontSize: 14, color: Colors.text, fontWeight: '600' },
  vehicleList: { marginTop: 6, borderWidth: 1, borderColor: Colors.gray200, borderRadius: 12, overflow: 'hidden' },
  vehicleItem: {
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.gray100,
    backgroundColor: Colors.white,
  },
  vehicleItemSelected: { backgroundColor: Colors.primaryLight },
  vehicleItemText: { fontSize: 14, color: Colors.text },
  vehicleItemTextSelected: { color: Colors.primary, fontWeight: '700' },
  fuelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  fuelInfoText: { fontSize: 12, color: Colors.primary, flex: 1 },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
});
