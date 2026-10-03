import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../../hooks/useData';
import EmptyState from '../../components/EmptyState';
import { Colors } from '../../constants/colors';
import { Customer, CustomerTransaction } from '../../types';
import { calcTotals, formatMoney, balanceLabel, CustomerTotals } from '../../lib/accounting';

export default function CustomersScreen() {
  const router = useRouter();
  const { customers, customerTx } = useData();
  const [search, setSearch] = useState('');

  const totalsById = useMemo(() => {
    const grouped: Record<string, CustomerTransaction[]> = {};
    customerTx.forEach(tx => {
      (grouped[tx.customerId] ||= []).push(tx);
    });
    const result: Record<string, CustomerTotals> = {};
    customers.forEach(c => {
      result[c.id] = calcTotals(grouped[c.id] || []);
    });
    return result;
  }, [customers, customerTx]);

  const overall = useMemo(() => {
    let receivable = 0;
    let expense = 0;
    Object.values(totalsById).forEach(t => {
      if (t.balance > 0) receivable += t.balance;
      expense += t.masraf;
    });
    return { receivable, expense };
  }, [totalsById]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR');
    if (!q) return customers;
    return customers.filter(
      c =>
        c.name.toLocaleLowerCase('tr-TR').includes(q) ||
        (c.phone || '').includes(q)
    );
  }, [customers, search]);

  const renderCustomer = ({ item }: { item: Customer }) => {
    const t = totalsById[item.id];
    const balance = t?.balance ?? 0;
    const color = balance > 0.005 ? Colors.danger : balance < -0.005 ? Colors.success : Colors.gray400;
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => router.push(`/customer/${item.id}`)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toLocaleUpperCase('tr-TR')}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.sub} numberOfLines={1}>
            {item.phone || 'Telefon yok'} • Masraf {formatMoney(t?.masraf ?? 0)}
          </Text>
        </View>
        <View style={styles.balanceBox}>
          <Text style={[styles.balance, { color }]}>{formatMoney(Math.abs(balance))}</Text>
          <Text style={[styles.balanceLabel, { color }]}>{balanceLabel(balance)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={Colors.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Müşteri ara..."
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
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/customer/add')}>
          <Ionicons name="person-add" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Toplam Alacak</Text>
          <Text style={[styles.summaryValue, { color: Colors.danger }]}>
            {formatMoney(overall.receivable)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Toplam Masraf</Text>
          <Text style={[styles.summaryValue, { color: Colors.fuel }]}>
            {formatMoney(overall.expense)}
          </Text>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderCustomer}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title={search ? 'Sonuç Yok' : 'Henüz Müşteri Yok'}
            description={
              search
                ? 'Aramanızla eşleşen müşteri bulunamadı.'
                : 'Sağ üstteki butonla ilk müşterinizi ekleyin.'
            }
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
    backgroundColor: Colors.customer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 8 },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  summaryLabel: { fontSize: 11, color: Colors.textLight, fontWeight: '600' },
  summaryValue: { fontSize: 16, fontWeight: '800', marginTop: 4 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  emptyContainer: { flex: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.customerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: Colors.customer },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: Colors.text },
  sub: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  balanceBox: { alignItems: 'flex-end' },
  balance: { fontSize: 15, fontWeight: '800' },
  balanceLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
});
