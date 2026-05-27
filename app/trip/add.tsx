import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { addTrip } from '../../lib/firestore';
import { Colors } from '../../constants/colors';
import { Vehicle } from '../../types';

export default function AddTripScreen() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const { vehicles } = useData();

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [startKm, setStartKm] = useState('');
  const [endKm, setEndKm] = useState('');
  const [loadType, setLoadType] = useState('');
  const [loadWeight, setLoadWeight] = useState('');
  const [revenue, setRevenue] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'tamamlandı' | 'devam ediyor'>('tamamlandı');
  const [loading, setLoading] = useState(false);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);

  const activeVehicles = vehicles.filter(v => v.active);

  const handleSave = async () => {
    if (!origin.trim() || !destination.trim() || !selectedVehicle || !startKm || !endKm) {
      Alert.alert('Hata', 'Kalkış, varış, araç, başlangıç ve bitiş km zorunludur');
      return;
    }
    const sKm = parseInt(startKm);
    const eKm = parseInt(endKm);
    if (isNaN(sKm) || isNaN(eKm) || eKm <= sKm) {
      Alert.alert('Hata', 'Bitiş km, başlangıç km\'den büyük olmalıdır');
      return;
    }
    setLoading(true);
    try {
      await addTrip(userProfile!.companyId, {
        vehicleId: selectedVehicle.id,
        vehiclePlate: selectedVehicle.plate,
        driverUid: userProfile!.uid,
        driverName: userProfile!.displayName,
        origin: origin.trim(),
        destination: destination.trim(),
        date,
        startKm: sKm,
        endKm: eKm,
        distance: eKm - sKm,
        loadType: loadType.trim() || undefined,
        loadWeight: loadWeight ? parseFloat(loadWeight) : undefined,
        revenue: revenue ? parseFloat(revenue) : undefined,
        notes: notes.trim() || undefined,
        status,
      });
      Alert.alert('Başarılı', 'Sefer kaydedildi', [{ text: 'Tamam', onPress: () => router.back() }]);
    } catch (e) {
      Alert.alert('Hata', 'Sefer kaydedilemedi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sefer Ekle</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rota Bilgileri</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kalkış Yeri *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="location-outline" size={18} color={Colors.gray400} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Örn: İstanbul"
                value={origin}
                onChangeText={setOrigin}
                placeholderTextColor={Colors.gray300}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Varış Yeri *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="location" size={18} color={Colors.danger} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Örn: Ankara"
                value={destination}
                onChangeText={setDestination}
                placeholderTextColor={Colors.gray300}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tarih *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="calendar-outline" size={18} color={Colors.gray400} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={date}
                onChangeText={setDate}
                placeholderTextColor={Colors.gray300}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Araç Seçimi *</Text>
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
              {activeVehicles.length === 0 ? (
                <Text style={styles.noVehicle}>Aktif araç bulunamadı. Önce araç ekleyin.</Text>
              ) : (
                activeVehicles.map(v => (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.vehicleItem, selectedVehicle?.id === v.id && styles.vehicleItemSelected]}
                    onPress={() => { setSelectedVehicle(v); setStartKm(String(v.currentKm)); setShowVehiclePicker(false); }}
                  >
                    <Text style={[styles.vehicleItemText, selectedVehicle?.id === v.id && styles.vehicleItemTextSelected]}>
                      {v.plate} — {v.brand} {v.model}
                    </Text>
                    <Text style={styles.vehicleItemKm}>{v.currentKm.toLocaleString('tr-TR')} km</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kilometre</Text>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Başlangıç KM *</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  value={startKm}
                  onChangeText={setStartKm}
                  keyboardType="numeric"
                  placeholderTextColor={Colors.gray300}
                />
              </View>
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Bitiş KM *</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  value={endKm}
                  onChangeText={setEndKm}
                  keyboardType="numeric"
                  placeholderTextColor={Colors.gray300}
                />
              </View>
            </View>
          </View>
          {startKm && endKm && parseInt(endKm) > parseInt(startKm) && (
            <View style={styles.distanceBadge}>
              <Ionicons name="navigate" size={16} color={Colors.trip} />
              <Text style={styles.distanceText}>
                Mesafe: {(parseInt(endKm) - parseInt(startKm)).toLocaleString('tr-TR')} km
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ek Bilgiler</Text>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Yük Türü</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Örn: Tekstil"
                  value={loadType}
                  onChangeText={setLoadType}
                  placeholderTextColor={Colors.gray300}
                />
              </View>
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Ağırlık (ton)</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  value={loadWeight}
                  onChangeText={setLoadWeight}
                  keyboardType="decimal-pad"
                  placeholderTextColor={Colors.gray300}
                />
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gelir (₺)</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="cash-outline" size={18} color={Colors.gray400} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="0"
                value={revenue}
                onChangeText={setRevenue}
                keyboardType="decimal-pad"
                placeholderTextColor={Colors.gray300}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Durum</Text>
            <View style={styles.statusRow}>
              {(['tamamlandı', 'devam ediyor'] as const).map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.statusBtn, status === s && styles.statusBtnActive]}
                  onPress={() => setStatus(s)}
                >
                  <Text style={[styles.statusBtnText, status === s && styles.statusBtnTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notlar</Text>
            <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Sefer hakkında notlar..."
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                placeholderTextColor={Colors.gray300}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
              <Text style={styles.saveBtnText}>Sefer Kaydet</Text>
            </>
          )}
        </TouchableOpacity>

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
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.white },
  container: { flex: 1, backgroundColor: Colors.background },
  section: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  row: { flexDirection: 'row', gap: 12 },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.gray700, marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: 12,
    backgroundColor: Colors.gray50,
    paddingHorizontal: 12,
  },
  icon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: 14, color: Colors.text },
  textAreaWrapper: { alignItems: 'flex-start', paddingTop: 4 },
  textArea: { height: 80, paddingTop: 8 },
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
  vehicleList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  vehicleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    backgroundColor: Colors.white,
  },
  vehicleItemSelected: { backgroundColor: Colors.primaryLight },
  vehicleItemText: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  vehicleItemTextSelected: { color: Colors.primary, fontWeight: '700' },
  vehicleItemKm: { fontSize: 12, color: Colors.textLight },
  noVehicle: { padding: 14, fontSize: 14, color: Colors.textLight, textAlign: 'center' },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.tripLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  distanceText: { fontSize: 14, fontWeight: '700', color: Colors.trip },
  statusRow: { flexDirection: 'row', gap: 10 },
  statusBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    alignItems: 'center',
  },
  statusBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  statusBtnText: { fontSize: 13, fontWeight: '600', color: Colors.gray500 },
  statusBtnTextActive: { color: Colors.white },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 14,
    paddingVertical: 16,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
});
