import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { getCompany, deleteCustomer } from '../../lib/db';
import { calcTotals, formatMoney, balanceLabel } from '../../lib/accounting';
import { Colors } from '../../constants/colors';
import { CustomerTransaction, CustomerTxKind } from '../../types';
import ChatPanel from '../../components/customer/ChatPanel';
import StatementPanel from '../../components/customer/StatementPanel';
import ExpensePanel from '../../components/customer/ExpensePanel';
import TxEditModal from '../../components/customer/TxEditModal';

type Tab = 'chat' | 'statement' | 'expense';

const TABS: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'chat', label: 'Sohbet', icon: 'chatbubbles-outline' },
  { key: 'statement', label: 'Ekstre', icon: 'document-text-outline' },
  { key: 'expense', label: 'Masraflar', icon: 'receipt-outline' },
];

export default function CustomerDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userProfile } = useAuth();
  const { customers, customerTx } = useData();
  const companyId = userProfile?.companyId ?? '';
  const customer = customers.find(c => c.id === id);

  const [tab, setTab] = useState<Tab>('chat');
  const [companyName, setCompanyName] = useState<string>();
  const [modal, setModal] = useState<{ tx?: CustomerTransaction; kind?: CustomerTxKind } | null>(null);

  useEffect(() => {
    if (companyId) getCompany(companyId).then(c => setCompanyName(c?.name)).catch(() => {});
  }, [companyId]);

  const txs = useMemo(() => customerTx.filter(t => t.customerId === id), [customerTx, id]);
  const totals = useMemo(() => calcTotals(txs), [txs]);

  if (!customer) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: Colors.textLight }}>Müşteri bulunamadı</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: Colors.customer, fontWeight: '700' }}>Geri dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const openMenu = () => {
    Alert.alert(customer.name, undefined, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Bilgileri düzenle', onPress: () => router.push(`/customer/add?id=${customer.id}`) },
      {
        text: 'Müşteriyi sil',
        style: 'destructive',
        onPress: () =>
          Alert.alert(
            'Müşteriyi Sil',
            'Müşteri ve tüm hesap hareketleri, masrafları ve sohbet geçmişi kalıcı olarak silinecek.',
            [
              { text: 'Vazgeç', style: 'cancel' },
              {
                text: 'Sil',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await deleteCustomer(companyId, customer.id);
                    router.back();
                  } catch {
                    Alert.alert('Hata', 'Müşteri silinemedi');
                  }
                },
              },
            ]
          ),
      },
    ]);
  };

  const balanceColor =
    totals.balance > 0.005 ? '#FECACA' : totals.balance < -0.005 ? '#BBF7D0' : Colors.white;

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{customer.name}</Text>
            {customer.phone ? <Text style={styles.headerSub}>{customer.phone}</Text> : null}
          </View>
          <TouchableOpacity onPress={openMenu} style={styles.iconBtn}>
            <Ionicons name="ellipsis-vertical" size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Bakiye</Text>
            <Text style={[styles.statValue, { color: balanceColor }]}>{formatMoney(Math.abs(totals.balance))}</Text>
            <Text style={styles.statHint}>{balanceLabel(totals.balance)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Masraf</Text>
            <Text style={styles.statValue}>{formatMoney(totals.masraf)}</Text>
            <Text style={styles.statHint}>bizim gider</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Kâr</Text>
            <Text style={styles.statValue}>{formatMoney(totals.profit)}</Text>
            <Text style={styles.statHint}>iş − masraf</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabs}>
        {TABS.map(t => {
          const active = tab === t.key;
          return (
            <TouchableOpacity key={t.key} style={[styles.tab, active && styles.tabActive]} onPress={() => setTab(t.key)}>
              <Ionicons name={t.icon} size={16} color={active ? Colors.customer : Colors.gray400} />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ flex: 1 }}>
        {tab === 'chat' && (
          <ChatPanel
            companyId={companyId}
            customerId={customer.id}
            txs={txs}
            onEditTx={tx => setModal({ tx })}
          />
        )}
        {tab === 'statement' && (
          <StatementPanel
            customer={customer}
            companyName={companyName}
            txs={txs}
            onEditTx={tx => setModal({ tx })}
            onAddTx={kind => setModal({ kind })}
          />
        )}
        {tab === 'expense' && (
          <ExpensePanel
            txs={txs}
            onEditTx={tx => setModal({ tx })}
            onAddExpense={() => setModal({ kind: 'masraf' })}
          />
        )}
      </View>

      <TxEditModal
        visible={modal !== null}
        companyId={companyId}
        customerId={customer.id}
        tx={modal?.tx}
        initialKind={modal?.kind}
        onClose={() => setModal(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerBar: {
    backgroundColor: Colors.customer,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.white },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  statsRow: {
    flexDirection: 'row',
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingVertical: 10,
  },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  statValue: { fontSize: 14, fontWeight: '800', color: Colors.white, marginTop: 2 },
  statHint: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: Colors.customer },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.gray400 },
  tabTextActive: { color: Colors.customer },
});
