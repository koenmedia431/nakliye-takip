import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Share, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Customer, CustomerTransaction, CustomerTxKind } from '../../types';
import {
  buildStatement,
  statementToText,
  formatMoney,
  formatDate,
  balanceLabel,
  toDateStr,
  todayStr,
  StatementRow,
} from '../../lib/accounting';
import { KIND_STYLE } from './kindStyle';

type Period = 'all' | 'thisMonth' | 'lastMonth' | 'last3';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'thisMonth', label: 'Bu Ay' },
  { key: 'lastMonth', label: 'Geçen Ay' },
  { key: 'last3', label: 'Son 3 Ay' },
];

function periodRange(p: Period): { from?: string; to?: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (p) {
    case 'thisMonth':
      return { from: toDateStr(new Date(y, m, 1)), to: todayStr() };
    case 'lastMonth':
      return { from: toDateStr(new Date(y, m - 1, 1)), to: toDateStr(new Date(y, m, 0)) };
    case 'last3':
      return { from: toDateStr(new Date(y, m - 2, 1)), to: todayStr() };
    default:
      return {};
  }
}

interface Props {
  customer: Customer;
  companyName?: string;
  txs: CustomerTransaction[];
  onEditTx: (tx: CustomerTransaction) => void;
  onAddTx: (kind: CustomerTxKind) => void;
}

export default function StatementPanel({ customer, companyName, txs, onEditTx, onAddTx }: Props) {
  const [period, setPeriod] = useState<Period>('all');
  const range = useMemo(() => periodRange(period), [period]);
  const statement = useMemo(() => buildStatement(txs, range.from, range.to), [txs, range]);

  const share = async () => {
    const message = statementToText(statement, {
      companyName,
      customerName: customer.name,
      from: range.from,
      to: range.to,
    });
    try {
      await Share.share({ message, title: `${customer.name} - Hesap Ekstresi` });
    } catch {
      Alert.alert('Hata', 'Paylaşılamadı');
    }
  };

  const renderRow = ({ item }: { item: StatementRow }) => {
    const { tx, balance } = item;
    const ks = KIND_STYLE[tx.kind];
    return (
      <TouchableOpacity style={styles.row} onPress={() => onEditTx(tx)}>
        <View style={[styles.icon, { backgroundColor: ks.bg }]}>
          <Ionicons name={ks.icon} size={16} color={ks.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.desc} numberOfLines={2}>{tx.description}</Text>
          <Text style={styles.date}>{formatDate(tx.date)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.amount, { color: ks.color }]}>
            {tx.kind === 'borc' ? '+' : '−'}{formatMoney(tx.amount)}
          </Text>
          <Text style={styles.runBalance}>Bakiye {formatMoney(balance)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.periodRow}>
        {PERIODS.map(p => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodChip, period === p.key && styles.periodChipActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={statement.rows}
        keyExtractor={r => r.tx.id}
        renderItem={renderRow}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          range.from ? (
            <View style={styles.opening}>
              <Text style={styles.openingLabel}>Devreden bakiye ({formatDate(range.from)} öncesi)</Text>
              <Text style={styles.openingValue}>{formatMoney(statement.opening)}</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={<Text style={styles.empty}>Bu dönemde iş veya tahsilat kaydı yok.</Text>}
        ListFooterComponent={
          <View style={styles.totals}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Toplam iş / fatura</Text>
              <Text style={[styles.totalValue, { color: Colors.danger }]}>{formatMoney(statement.totalBorc)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Toplam tahsilat</Text>
              <Text style={[styles.totalValue, { color: Colors.success }]}>{formatMoney(statement.totalTahsilat)}</Text>
            </View>
            <View style={[styles.totalRow, styles.closingRow]}>
              <Text style={styles.closingLabel}>Güncel bakiye</Text>
              <Text style={styles.closingValue}>
                {formatMoney(Math.abs(statement.closing))} ({balanceLabel(statement.closing)})
              </Text>
            </View>
            <Text style={styles.note}>Masraflar ekstreye dahil edilmez.</Text>
          </View>
        }
      />

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.danger }]} onPress={() => onAddTx('borc')}>
          <Ionicons name="add" size={18} color={Colors.white} />
          <Text style={styles.actionText}>İş</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.success }]} onPress={() => onAddTx('tahsilat')}>
          <Ionicons name="add" size={18} color={Colors.white} />
          <Text style={styles.actionText}>Tahsilat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.shareBtn]} onPress={share}>
          <Ionicons name="share-social" size={18} color={Colors.white} />
          <Text style={styles.actionText}>Ekstre Gönder</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  periodRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingTop: 12 },
  periodChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  periodChipActive: { backgroundColor: Colors.customer, borderColor: Colors.customer },
  periodText: { fontSize: 12, fontWeight: '600', color: Colors.gray600 },
  periodTextActive: { color: Colors.white },
  list: { padding: 16, paddingBottom: 8 },
  opening: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.gray50,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  openingLabel: { fontSize: 12, color: Colors.textLight, flex: 1 },
  openingValue: { fontSize: 13, fontWeight: '700', color: Colors.text },
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
  amount: { fontSize: 14, fontWeight: '800' },
  runBalance: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  empty: { textAlign: 'center', color: Colors.textLight, paddingVertical: 32 },
  totals: { backgroundColor: Colors.white, borderRadius: 12, padding: 14, marginTop: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel: { fontSize: 13, color: Colors.gray600 },
  totalValue: { fontSize: 13, fontWeight: '700' },
  closingRow: { borderTopWidth: 1, borderTopColor: Colors.gray100, marginTop: 6, paddingTop: 10 },
  closingLabel: { fontSize: 14, fontWeight: '700', color: Colors.text },
  closingValue: { fontSize: 14, fontWeight: '800', color: Colors.text },
  note: { fontSize: 11, color: Colors.gray400, marginTop: 8, fontStyle: 'italic' },
  actions: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  shareBtn: { flex: 1, backgroundColor: Colors.customer },
  actionText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
});
