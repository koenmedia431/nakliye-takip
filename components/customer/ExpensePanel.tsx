import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { CustomerTransaction } from '../../types';
import { calcTotals, formatMoney, formatDate, sortTx, todayStr } from '../../lib/accounting';
import { KIND_STYLE } from './kindStyle';

interface Props {
  txs: CustomerTransaction[];
  onEditTx: (tx: CustomerTransaction) => void;
  onAddExpense: () => void;
}

// Bizim iç sayfamız: bu müşteri için yapılan masraflar ve kârlılık
export default function ExpensePanel({ txs, onEditTx, onAddExpense }: Props) {
  const [onlyThisMonth, setOnlyThisMonth] = useState(false);
  const month = todayStr().slice(0, 7);

  const scoped = useMemo(
    () => (onlyThisMonth ? txs.filter(t => t.date.startsWith(month)) : txs),
    [txs, onlyThisMonth, month]
  );
  const totals = useMemo(() => calcTotals(scoped), [scoped]);
  const expenses = useMemo(() => sortTx(scoped.filter(t => t.kind === 'masraf')).reverse(), [scoped]);
  const margin = totals.borc > 0 ? (totals.profit / totals.borc) * 100 : 0;

  const renderItem = ({ item }: { item: CustomerTransaction }) => (
    <TouchableOpacity style={styles.row} onPress={() => onEditTx(item)}>
      <View style={[styles.icon, { backgroundColor: KIND_STYLE.masraf.bg }]}>
        <Ionicons name={KIND_STYLE.masraf.icon} size={16} color={KIND_STYLE.masraf.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
        <Text style={styles.date}>{formatDate(item.date)}</Text>
      </View>
      <Text style={styles.amount}>{formatMoney(item.amount)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.filterRow}>
        {[false, true].map(v => (
          <TouchableOpacity
            key={String(v)}
            style={[styles.chip, onlyThisMonth === v && styles.chipActive]}
            onPress={() => setOnlyThisMonth(v)}
          >
            <Text style={[styles.chipText, onlyThisMonth === v && styles.chipTextActive]}>
              {v ? 'Bu Ay' : 'Tümü'}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={styles.privateTag}>
          <Ionicons name="lock-closed" size={11} color={Colors.gray500} />
          <Text style={styles.privateText}>Sadece size özel</Text>
        </View>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={t => t.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.summary}>
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>İş / fatura toplamı</Text>
              <Text style={styles.sumValue}>{formatMoney(totals.borc)}</Text>
            </View>
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>Masraf toplamı</Text>
              <Text style={[styles.sumValue, { color: Colors.fuel }]}>− {formatMoney(totals.masraf)}</Text>
            </View>
            <View style={[styles.sumRow, styles.profitRow]}>
              <Text style={styles.profitLabel}>Kâr</Text>
              <Text style={[styles.profitValue, { color: totals.profit >= 0 ? Colors.success : Colors.danger }]}>
                {formatMoney(totals.profit)}
                {totals.borc > 0 ? `  (%${margin.toFixed(0)})` : ''}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            Masraf kaydı yok.{'\n'}Sohbete "yakıt 2500" veya "otoban 450 masraf" yazabilirsiniz.
          </Text>
        }
      />

      <View style={styles.actions}>
        <TouchableOpacity style={styles.addBtn} onPress={onAddExpense}>
          <Ionicons name="add" size={18} color={Colors.white} />
          <Text style={styles.addText}>Masraf Ekle</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingTop: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  chipActive: { backgroundColor: Colors.fuel, borderColor: Colors.fuel },
  chipText: { fontSize: 12, fontWeight: '600', color: Colors.gray600 },
  chipTextActive: { color: Colors.white },
  privateTag: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 },
  privateText: { fontSize: 11, color: Colors.gray500 },
  list: { padding: 16, paddingBottom: 8 },
  summary: { backgroundColor: Colors.white, borderRadius: 12, padding: 14, marginBottom: 12 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  sumLabel: { fontSize: 13, color: Colors.gray600 },
  sumValue: { fontSize: 13, fontWeight: '700', color: Colors.text },
  profitRow: { borderTopWidth: 1, borderTopColor: Colors.gray100, marginTop: 6, paddingTop: 10 },
  profitLabel: { fontSize: 15, fontWeight: '700', color: Colors.text },
  profitValue: { fontSize: 15, fontWeight: '800' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  desc: { fontSize: 14, fontWeight: '600', color: Colors.text },
  date: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '800', color: Colors.fuel },
  empty: { textAlign: 'center', color: Colors.textLight, paddingVertical: 32, lineHeight: 20 },
  actions: { padding: 12, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.gray100 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.fuel,
    borderRadius: 12,
    paddingVertical: 13,
  },
  addText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
});
