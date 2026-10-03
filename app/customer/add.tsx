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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { addCustomer, updateCustomer } from '../../lib/db';
import { Colors } from '../../constants/colors';

// ?id=... verilirse düzenleme modunda açılır
export default function AddCustomerScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { userProfile } = useAuth();
  const { customers } = useData();
  const existing = id ? customers.find(c => c.id === id) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [taxNo, setTaxNo] = useState(existing?.taxNo ?? '');
  const [address, setAddress] = useState(existing?.address ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Hata', 'Müşteri adı zorunludur');
      return;
    }
    setLoading(true);
    // Firestore undefined kabul etmediği için boş alanlar '' olarak yazılır
    const data = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      taxNo: taxNo.trim(),
      address: address.trim(),
      notes: notes.trim(),
    };
    try {
      if (existing) {
        await updateCustomer(userProfile!.companyId, existing.id, data);
        router.back();
      } else {
        const newId = await addCustomer(userProfile!.companyId, data);
        router.replace(`/customer/${newId}`);
      }
    } catch {
      Alert.alert('Hata', 'Müşteri kaydedilemedi');
    } finally {
      setLoading(false);
    }
  };

  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    icon: keyof typeof Ionicons.glyphMap,
    extra?: Partial<React.ComponentProps<typeof TextInput>>
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <Ionicons name={icon} size={18} color={Colors.gray400} style={styles.icon} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholderTextColor={Colors.gray300}
          {...extra}
        />
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{existing ? 'Müşteriyi Düzenle' : 'Müşteri Ekle'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Müşteri Bilgileri</Text>
          {field('Ad / Firma *', name, setName, 'business-outline', { placeholder: 'ABC Lojistik Ltd.' })}
          {field('Telefon', phone, setPhone, 'call-outline', { placeholder: '05xx xxx xx xx', keyboardType: 'phone-pad' })}
          {field('E-posta', email, setEmail, 'mail-outline', {
            placeholder: 'ornek@firma.com',
            keyboardType: 'email-address',
            autoCapitalize: 'none',
          })}
          {field('Vergi No / TC', taxNo, setTaxNo, 'card-outline', { placeholder: 'Opsiyonel', keyboardType: 'numeric' })}
          {field('Adres', address, setAddress, 'location-outline', { placeholder: 'Opsiyonel', multiline: true })}
          {field('Not', notes, setNotes, 'document-text-outline', { placeholder: 'Opsiyonel', multiline: true })}
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
              <Ionicons name="checkmark" size={20} color={Colors.white} />
              <Text style={styles.saveBtnText}>Kaydet</Text>
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
    backgroundColor: Colors.customer,
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
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.customer,
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 14,
    paddingVertical: 16,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
});
