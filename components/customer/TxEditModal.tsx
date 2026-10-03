import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { CustomerTransaction, CustomerTxKind } from '../../types';
import { addCustomerTx, updateCustomerTx, deleteCustomerTx } from '../../lib/db';
import {
  KIND_LABELS,
  formatDate,
  parseDateInput,
  parseAmountInput,
  todayStr,
} from '../../lib/accounting';
import { KIND_STYLE } from './kindStyle';

interface Props {
  visible: boolean;
  companyId: string;
  customerId: string;
  tx?: CustomerTransaction | null;      // varsa düzenleme
  initialKind?: CustomerTxKind;         // yeni kayıt için
  onClose: () => void;
}

const KINDS: CustomerTxKind[] = ['borc', 'tahsilat', 'masraf'];

export default function TxEditModal({ visible, companyId, customerId, tx, initialKind, onClose }: Props) {
  const [kind, setKind] = useState<CustomerTxKind>('borc');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setKind(tx?.kind ?? initialKind ?? 'borc');
    setAmount(tx ? String(tx.amount).replace('.', ',') : '');
    setDescription(tx?.description ?? '');
    setDate(formatDate(tx?.date ?? todayStr()));
  }, [visible, tx, initialKind]);

  const handleSave = async () => {
    const value = parseAmountInput(amount);
    if (isNaN(value) || value <= 0) {
      Alert.alert('Hata', 'Geçerli bir tutar girin');
      return;
    }
    const isoDate = parseDateInput(date);
    if (!isoDate) {
      Alert.alert('Hata', 'Tarihi GG.AA.YYYY biçiminde girin');
      return;
    }
    const data = {
      kind,
      amount: Math.round(value * 100) / 100,
      description: description.trim() || KIND_LABELS[kind],
      date: isoDate,
    };
    setSaving(true);
    try {
      if (tx) await updateCustomerTx(companyId, tx.id, data);
      else await addCustomerTx(companyId, { ...data, customerId });
      onClose();
    } catch {
      Alert.alert('Hata', 'Kayıt kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!tx) return;
    Alert.alert('Kaydı Sil', `"${tx.description}" silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCustomerTx(companyId, tx.id);
            onClose();
          } catch {
            Alert.alert('Hata', 'Silinemedi');
          }
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior="padding">
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{tx ? 'Kaydı Düzenle' : 'Yeni Kayıt'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.gray500} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Tür</Text>
            <View style={styles.kindRow}>
              {KINDS.map(k => {
                const active = kind === k;
                return (
                  <TouchableOpacity
                    key={k}
                    style={[styles.kindChip, active && { backgroundColor: KIND_STYLE[k].color, borderColor: KIND_STYLE[k].color }]}
                    onPress={() => setKind(k)}
                  >
                    <Ionicons name={KIND_STYLE[k].icon} size={14} color={active ? Colors.white : KIND_STYLE[k].color} />
                    <Text style={[styles.kindText, active && { color: Colors.white }]}>{KIND_LABELS[k]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.hint}>
              {kind === 'masraf'
                ? 'Masraflar sadece sizin sayfanızda görünür, ekstreye girmez.'
                : kind === 'borc'
                  ? 'Müşterinin borcuna eklenir, ekstrede görünür.'
                  : 'Müşterinin borcundan düşülür, ekstrede görünür.'}
            </Text>

            <Text style={styles.label}>Tutar (₺)</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0,00"
              placeholderTextColor={Colors.gray300}
            />

            <Text style={styles.label}>Açıklama</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="Örn: İzmir seferi"
              placeholderTextColor={Colors.gray300}
            />

            <Text style={styles.label}>Tarih</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="GG.AA.YYYY"
              keyboardType="numbers-and-punctuation"
              placeholderTextColor={Colors.gray300}
            />

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveText}>Kaydet</Text>}
            </TouchableOpacity>
            {tx && (
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                <Text style={styles.deleteText}>Kaydı Sil</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  card: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text },
  label: { fontSize: 13, fontWeight: '600', color: Colors.gray700, marginBottom: 6, marginTop: 14 },
  kindRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  kindChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    backgroundColor: Colors.gray50,
  },
  kindText: { fontSize: 13, fontWeight: '600', color: Colors.gray600 },
  hint: { fontSize: 12, color: Colors.textLight, marginTop: 8 },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: 12,
    backgroundColor: Colors.gray50,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
  },
  saveBtn: {
    backgroundColor: Colors.customer,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 24,
  },
  saveText: { fontSize: 16, fontWeight: '700', color: Colors.white },
  deleteBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    marginBottom: 8,
  },
  deleteText: { fontSize: 14, fontWeight: '600', color: Colors.danger },
});
