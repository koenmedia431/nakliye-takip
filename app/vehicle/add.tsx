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
import { addVehicle } from '../../lib/firestore';
import { Colors } from '../../constants/colors';
import { Vehicle } from '../../types';

const VEHICLE_TYPES: Vehicle['type'][] = ['kamyon', 'tır', 'kamyonet', 'van', 'minibüs', 'diğer'];
const FUEL_TYPES: Vehicle['fuelType'][] = ['dizel', 'benzin', 'lpg', 'elektrik'];

export default function AddVehicleScreen() {
  const router = useRouter();
  const { userProfile } = useAuth();

  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [type, setType] = useState<Vehicle['type']>('kamyon');
  const [fuelType, setFuelType] = useState<Vehicle['fuelType']>('dizel');
  const [currentKm, setCurrentKm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!plate.trim() || !brand.trim() || !model.trim() || !currentKm) {
      Alert.alert('Hata', 'Plaka, marka, model ve km zorunludur');
      return;
    }
    const km = parseInt(currentKm);
    const yr = parseInt(year);
    if (isNaN(km) || km < 0 || isNaN(yr)) {
      Alert.alert('Hata', 'Geçerli değerler girin');
      return;
    }
    setLoading(true);
    try {
      await addVehicle(userProfile!.companyId, {
        plate: plate.trim().toUpperCase(),
        brand: brand.trim(),
        model: model.trim(),
        year: yr,
        type,
        fuelType,
        currentKm: km,
        active: true,
      });
      Alert.alert('Başarılı', 'Araç eklendi', [{ text: 'Tamam', onPress: () => router.back() }]);
    } catch {
      Alert.alert('Hata', 'Araç eklenemedi');
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
        <Text style={styles.headerTitle}>Araç Ekle</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Araç Bilgileri</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Plaka *</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="34 ABC 123"
                value={plate}
                onChangeText={setPlate}
                autoCapitalize="characters"
                placeholderTextColor={Colors.gray300}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 2 }]}>
              <Text style={styles.label}>Marka *</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Ford, Renault..."
                  value={brand}
                  onChangeText={setBrand}
                  placeholderTextColor={Colors.gray300}
                />
              </View>
            </View>
            <View style={[styles.inputGroup, { flex: 2 }]}>
              <Text style={styles.label}>Model *</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Cargo, Kangoo..."
                  value={model}
                  onChangeText={setModel}
                  placeholderTextColor={Colors.gray300}
                />
              </View>
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Yıl</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="2020"
                  value={year}
                  onChangeText={setYear}
                  keyboardType="numeric"
                  placeholderTextColor={Colors.gray300}
                />
              </View>
            </View>
          </View>

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
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Araç Türü</Text>
          <View style={styles.chipGroup}>
            {VEHICLE_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.chip, type === t && styles.chipActive]}
                onPress={() => setType(t)}
              >
                <Text style={[styles.chipText, type === t && styles.chipTextActive]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yakıt Türü</Text>
          <View style={styles.chipGroup}>
            {FUEL_TYPES.map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.chip, fuelType === f && styles.chipFuelActive]}
                onPress={() => setFuelType(f)}
              >
                <Text style={[styles.chipText, fuelType === f && styles.chipTextActive]}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
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
              <Ionicons name="car" size={20} color={Colors.white} />
              <Text style={styles.saveBtnText}>Aracı Kaydet</Text>
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
    backgroundColor: Colors.vehicle,
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
  row: { flexDirection: 'row', gap: 10 },
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
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    backgroundColor: Colors.gray50,
  },
  chipActive: { backgroundColor: Colors.vehicle, borderColor: Colors.vehicle },
  chipFuelActive: { backgroundColor: Colors.fuel, borderColor: Colors.fuel },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.gray500, textTransform: 'capitalize' },
  chipTextActive: { color: Colors.white },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.vehicle,
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 14,
    paddingVertical: 16,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
});
