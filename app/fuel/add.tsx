import React, { useState, useMemo } from 'react';
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
import { addFuelEntry } from '../../lib/firestore';
import { Colors } from '../../constants/colors';
import { Vehicle } from '../../types';

export default function AddFuelScreen() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const { vehicles } = useData();

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [liters, setLiters] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState('');
  const [currentKm, setCurrentKm] = useState('');
  const [station, setStation] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const activeVehicles = vehicles.filter(v => v.active);

  const totalCost = useMemo(() => {
    const lv = parseFloat(liters);
    const pv = parseFloat(pricePerLiter);
    if (isNaN(lv) || isNaN(pv)) return '';
    return (lv * pv).toFixed(2);
  }, [liters, pricePerLiter]);

  const handleSave = async () => {
    if (!selectedVehicle || !liters || !pricePerLiter || !currentKm) {
      Alert.alert('Hata', 'Araç, litre, fiyat ve km bilgisi zorunludur');
      return;
    }
    const l = parseFloat(liters);
    const p = parseFloat(pricePerLiter);
    const km = parseInt(currentKm);
    if (isNaN(l) || l <= 0 || isNaN(p) || p <= 0 || isNaN(km) || km <= 0) {
      Alert.alert('Hata', 'Geçerli değerler girin');
      return;
    }
    setLoading(true);
    try {
      await addFuelEntry(userProfile!.companyId, {
        vehicleId: selectedVehicle.id,
        vehiclePlate: selectedVehicle.plate,
        driverUid: userProfile!.uid,
        driverName: userProfile!.displayName,
        date,
        liters: l,
        pricePerLiter: p,
        totalCost: l * p,
        currentKm: km,
        station: station.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      Alert.alert('Başarılı', 'Yakıt alımı kaydedildi', [{ text: 'Tamam', onPress: () => router.back() }]);
    } catch {
      Alert.alert('Hata', 'Kayıt yapılamadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yakıt Ekle</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

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
              {activeVehicles.map(v => (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.vehicleItem, selectedVehicle?.id === v.id && styles.vehicleItemSelected]}
                  onPress={() => { setSelectedVehicle(v); setCurrentKm(String(v.currentKm)); setShowVehiclePicker(false); }}
                >
                  <Text style={[styles.vehicleItemText, selectedVehicle?.id === v.id && styles.vehicleItemTextSelected]}>
                    {v.plate} — {v.brand} {v.model}
                  </Text>
                  <Text style={styles.vehicleItemKm}>{v.currentKm.toLocaleString('tr-TR')} km</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yakıt Bilgileri</Text>

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

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Litre *</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  value={liters}
                  onChangeText={setLiters}
                  keyboardType="decimal-pad"
                  placeholderTextColor={Colors.gray300}
                />
              </View>
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Litre Fiyatı (₺) *</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  value={pricePerLiter}
                  onChangeText={setPricePerLiter}
                  keyboardType="decimal-pad"
                  placeholderTextColor={Colors.gray300}
                />
              </View>
            </View>
          </View>

          {Boolean(totalCost) && (
            <View style={styles.totalCostBadge}>
              <Ionicons name="cash" size={16} color={Colors.success} />
              <Text style={styles.totalCostText}>Toplam: ₺{totalCost}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Güncel KM *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="speedometer-outline" size={18} color={Colors.gray400} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="0"
                value={currentKm}
                onChangeText={setCurrentKm}
                keyboardType="numeric"
                placeholderTextColor={Colors.gray300}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>İstasyon</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="business-outline" size={18} color={Colors.gray400} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Opet, BP, Shell..."
                value={station}
                onChangeText={setStation}
                placeholderTextColor={Colors.gray300}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notlar</Text>
            <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ek notlar..."
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
              <Ionicons name="flame" size={20} color={Colors.white} />
              <Text style={styles.saveBtnText}>Yakıt Kaydını Kaydet</Text>
            </>
          )}
        </TouchableOpacity>

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
    backgroundColor: Colors.fuel,
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
  vehicleItemSelected: { backgroundColor: Colors.fuelLight },
  vehicleItemText: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  vehicleItemTextSelected: { color: Colors.fuel, fontWeight: '700' },
  vehicleItemKm: { fontSize: 12, color: Colors.textLight },
  totalCostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.successLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
  },
  totalCostText: { fontSize: 15, fontWeight: '700', color: Colors.success },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.fuel,
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 14,
    paddingVertical: 16,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
});
