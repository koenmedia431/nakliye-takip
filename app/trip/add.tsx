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
import { addTrip } from '../../lib/firestore';
import { Colors } from '../../constants/colors';
import { Vehicle } from '../../types';

export default function AddTripScreen() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const { vehicles } = useData();

  // Araç seçimi – sürücü için atanmış araç, admin için picker
  const assignedVehicle = useMemo(
    () => vehicles.find(v => v.id === userProfile?.vehicleId) || null,
    [vehicles, userProfile]
  );
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(assignedVehicle);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [departureKm, setDepartureKm] = useState(
    assignedVehicle ? String(assignedVehicle.currentKm) : ''
  );
  const [returnKm, setReturnKm] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const activeVehicles = vehicles.filter(v => v.active);

  // Hesaplamalar
  const depKmNum = parseInt(departureKm) || 0;
  const retKmNum = parseInt(returnKm) || 0;
  const totalKm = retKmNum > depKmNum ? retKmNum - depKmNum : 0;
  const fuelRate = userProfile?.fuelRate || 0;
  const fuelLiters = fuelRate > 0 && totalKm > 0 ? (fuelRate * totalKm) / 100 : 0;

  const handleVehicleSelect = (v: Vehicle) => {
    setSelectedVehicle(v);
    setDepartureKm(String(v.currentKm));
    setShowVehiclePicker(false);
  };

  const handleSave = async () => {
    if (!selectedVehicle) {
      Alert.alert('Hata', 'Lütfen bir araç seçin veya plaka ataması yapılmış olmalı');
      return;
    }
    if (!departureKm || !returnKm) {
      Alert.alert('Hata', 'Çıkış ve dönüş km zorunludur');
      return;
    }
    if (retKmNum <= depKmNum) {
      Alert.alert('Hata', 'Dönüş km, çıkış km\'den büyük olmalıdır');
      return;
    }

    setLoading(true);
    try {
      await addTrip(userProfile!.companyId, {
        vehicleId: selectedVehicle.id,
        vehiclePlate: selectedVehicle.plate,
        driverUid: userProfile!.uid,
        driverName: userProfile!.displayName,
        region: userProfile?.region || undefined,
        date,
        startTime: startTime.trim() || undefined,
        endTime: endTime.trim() || undefined,
        departureKm: depKmNum,
        returnKm: retKmNum,
        totalKm,
        fuelLiters: fuelLiters > 0 ? parseFloat(fuelLiters.toFixed(2)) : undefined,
        fuelRate: fuelRate > 0 ? fuelRate : undefined,
        notes: notes.trim() || undefined,
      });
      Alert.alert('Başarılı', 'Sefer kaydedildi', [{ text: 'Tamam', onPress: () => router.back() }]);
    } catch (e) {
      Alert.alert('Hata', 'Sefer kaydedilemedi');
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
        <Text style={styles.headerTitle}>Sefer Ekle</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Araç / Plaka */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Araç / Plaka</Text>

          {userProfile?.vehiclePlate && !showVehiclePicker ? (
            // Sürücüye atanmış plaka
            <View style={styles.assignedVehicleBox}>
              <View style={styles.assignedVehicleLeft}>
                <Ionicons name="car" size={20} color={Colors.primary} />
                <View>
                  <Text style={styles.assignedPlate}>{userProfile.vehiclePlate}</Text>
                  {selectedVehicle && (
                    <Text style={styles.assignedModel}>{selectedVehicle.brand} {selectedVehicle.model}</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowVehiclePicker(true)}>
                <Text style={styles.changePlateText}>Değiştir</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => setShowVehiclePicker(!showVehiclePicker)}
              >
                <Ionicons name="car-outline" size={18} color={Colors.gray400} />
                <Text style={selectedVehicle ? styles.pickerSelected : styles.pickerPlaceholder}>
                  {selectedVehicle
                    ? `${selectedVehicle.plate} — ${selectedVehicle.brand} ${selectedVehicle.model}`
                    : 'Araç seçin...'}
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
                        onPress={() => handleVehicleSelect(v)}
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
            </>
          )}
        </View>

        {/* Tarih ve Saat */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tarih ve Saat</Text>

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
              <Text style={styles.label}>Başlangıç Saati</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="time-outline" size={18} color={Colors.gray400} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="08:00"
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholderTextColor={Colors.gray300}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Bitiş Saati</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="time-outline" size={18} color={Colors.gray400} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="17:00"
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholderTextColor={Colors.gray300}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Kilometre */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kilometre</Text>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Çıkış KM *</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  value={departureKm}
                  onChangeText={setDepartureKm}
                  keyboardType="numeric"
                  placeholderTextColor={Colors.gray300}
                />
              </View>
            </View>
            <View style={styles.arrowBox}>
              <Ionicons name="arrow-forward" size={20} color={Colors.gray300} />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Dönüş KM *</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  value={returnKm}
                  onChangeText={setReturnKm}
                  keyboardType="numeric"
                  placeholderTextColor={Colors.gray300}
                />
              </View>
            </View>
          </View>

          {totalKm > 0 && (
            <View style={styles.resultRow}>
              <View style={styles.resultBadge}>
                <Ionicons name="speedometer-outline" size={15} color={Colors.trip} />
                <Text style={styles.resultLabel}>Toplam KM</Text>
                <Text style={styles.resultValue}>{totalKm.toLocaleString('tr-TR')} km</Text>
              </View>
              {fuelLiters > 0 && (
                <View style={[styles.resultBadge, styles.fuelBadge]}>
                  <Ionicons name="flame-outline" size={15} color={Colors.fuel} />
                  <Text style={[styles.resultLabel, { color: Colors.fuel }]}>Yakıt Hakedişi</Text>
                  <Text style={[styles.resultValue, { color: Colors.fuel }]}>{fuelLiters.toFixed(1)} lt</Text>
                </View>
              )}
            </View>
          )}

          {fuelRate > 0 && (
            <View style={styles.fuelRateInfo}>
              <Ionicons name="information-circle-outline" size={14} color={Colors.gray400} />
              <Text style={styles.fuelRateText}>
                Hakedis oranı: {fuelRate} lt/100km
              </Text>
            </View>
          )}
        </View>

        {/* Notlar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notlar</Text>
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

        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
              <Text style={styles.saveBtnText}>Sefer Kaydet</Text>
            </View>
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
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
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
  arrowBox: {
    paddingBottom: 14,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
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
  assignedVehicleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  assignedVehicleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  assignedPlate: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 1,
  },
  assignedModel: {
    fontSize: 12,
    color: Colors.gray500,
    marginTop: 2,
  },
  changePlateText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  resultRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  resultBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.tripLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  fuelBadge: {
    backgroundColor: Colors.fuelLight,
  },
  resultLabel: {
    fontSize: 11,
    color: Colors.trip,
    fontWeight: '600',
    flex: 1,
  },
  resultValue: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.trip,
  },
  fuelRateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  fuelRateText: {
    fontSize: 12,
    color: Colors.gray400,
  },
  saveBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 14,
    paddingVertical: 16,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
});
