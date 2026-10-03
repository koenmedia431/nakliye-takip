import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { CustomerMessage, CustomerTransaction } from '../../types';
import {
  subscribeCustomerMessages,
  addCustomerMessage,
  deleteCustomerMessage,
  toMillis,
} from '../../lib/db';
import { parseChatMessage, formatMoney, formatDate, KIND_LABELS } from '../../lib/accounting';
import { KIND_STYLE } from './kindStyle';

interface Props {
  companyId: string;
  customerId: string;
  txs: CustomerTransaction[];
  onEditTx: (tx: CustomerTransaction) => void;
}

const EXAMPLES = [
  'İzmir seferi 12.500 TL',
  'Ahmet bey 5 bin ödedi',
  'Dün otoban 450, yakıt 3.200',
  '15.09 Ankara nakliye 18000, hamaliye 750',
];

function formatTime(value: unknown): string {
  const d = new Date(toMillis(value));
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function ChatPanel({ companyId, customerId, txs, onEditTx }: Props) {
  const [messages, setMessages] = useState<CustomerMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<CustomerMessage>>(null);

  useEffect(() => subscribeCustomerMessages(companyId, customerId, setMessages), [companyId, customerId]);

  const txById = useMemo(() => {
    const map: Record<string, CustomerTransaction> = {};
    txs.forEach(t => (map[t.id] = t));
    return map;
  }, [txs]);

  // Yazarken neyin anlaşıldığını göster
  const preview = useMemo(() => (text.trim() ? parseChatMessage(text) : []), [text]);

  const send = async () => {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    try {
      const entries = parseChatMessage(value).map(({ guessed, ...e }) => e);
      await addCustomerMessage(companyId, customerId, value, entries);
      setText('');
    } catch {
      Alert.alert('Hata', 'Mesaj kaydedilemedi');
    } finally {
      setSending(false);
    }
  };

  const onLongPressMessage = (msg: CustomerMessage) => {
    const buttons: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sadece mesajı sil', onPress: () => deleteCustomerMessage(companyId, msg, false) },
    ];
    if (msg.txIds.some(id => txById[id])) {
      buttons.push({
        text: 'Mesajı ve kayıtları sil',
        style: 'destructive',
        onPress: () => deleteCustomerMessage(companyId, msg, true),
      });
    }
    Alert.alert('Mesaj', 'Ne yapmak istersiniz?', buttons);
  };

  const renderTxLine = (tx: CustomerTransaction) => {
    const ks = KIND_STYLE[tx.kind];
    return (
      <TouchableOpacity key={tx.id} style={styles.txLine} onPress={() => onEditTx(tx)}>
        <View style={[styles.txIcon, { backgroundColor: ks.bg }]}>
          <Ionicons name={ks.icon} size={14} color={ks.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
          <Text style={styles.txMeta}>
            {KIND_LABELS[tx.kind]} • {formatDate(tx.date)}
          </Text>
        </View>
        <Text style={[styles.txAmount, { color: ks.color }]}>{formatMoney(tx.amount)}</Text>
        <Ionicons name="create-outline" size={16} color={Colors.gray400} />
      </TouchableOpacity>
    );
  };

  const renderMessage = ({ item }: { item: CustomerMessage }) => {
    const created = item.txIds.map(id => txById[id]).filter(Boolean);
    const removed = item.txIds.length - created.length;
    return (
      <View style={styles.msgBlock}>
        <TouchableOpacity
          style={styles.userBubble}
          onLongPress={() => onLongPressMessage(item)}
          activeOpacity={0.8}
        >
          <Text style={styles.userText}>{item.text}</Text>
          <Text style={styles.userTime}>{formatTime(item.createdAt)}</Text>
        </TouchableOpacity>
        <View style={styles.botBubble}>
          {item.txIds.length === 0 ? (
            <View style={styles.noteRow}>
              <Ionicons name="bookmark-outline" size={14} color={Colors.gray500} />
              <Text style={styles.noteText}>Tutar bulunamadı, not olarak kaydedildi.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.botTitle}>
                <Ionicons name="checkmark-circle" size={13} color={Colors.customer} /> {item.txIds.length} kayıt eklendi
              </Text>
              {created.map(renderTxLine)}
              {removed > 0 && <Text style={styles.removed}>{removed} kayıt silinmiş</Text>}
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.help}>
            <Ionicons name="chatbubbles-outline" size={40} color={Colors.customer} />
            <Text style={styles.helpTitle}>Ne olduğunu yazın, listeye ekleyeyim</Text>
            <Text style={styles.helpText}>
              Sefer / fatura / navlun → müşteri borcuna{'\n'}
              Ödedi / havale / eft / tahsil → tahsilata{'\n'}
              Yakıt / otoban / hamaliye / masraf → masraf sayfanıza{'\n'}
              "dün", "15.09", "3 eylül" gibi tarihleri de anlarım.
            </Text>
            {EXAMPLES.map(e => (
              <TouchableOpacity key={e} style={styles.example} onPress={() => setText(e)}>
                <Text style={styles.exampleText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        }
      />

      {preview.length > 0 && (
        <View style={styles.previewBar}>
          {preview.map((p, i) => (
            <View key={i} style={[styles.previewChip, { backgroundColor: KIND_STYLE[p.kind].bg }]}>
              <Ionicons name={KIND_STYLE[p.kind].icon} size={12} color={KIND_STYLE[p.kind].color} />
              <Text style={[styles.previewText, { color: KIND_STYLE[p.kind].color }]} numberOfLines={1}>
                {KIND_LABELS[p.kind]}{p.guessed ? '?' : ''} {formatMoney(p.amount)} • {p.description}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Örn: Bursa seferi 9.000 TL"
          placeholderTextColor={Colors.gray400}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.5 }]}
          onPress={send}
          disabled={!text.trim() || sending}
        >
          {sending ? <ActivityIndicator color={Colors.white} size="small" /> : <Ionicons name="send" size={18} color={Colors.white} />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 8, flexGrow: 1 },
  msgBlock: { marginBottom: 14 },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    backgroundColor: Colors.customer,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userText: { color: Colors.white, fontSize: 14, lineHeight: 20 },
  userTime: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  botBubble: {
    alignSelf: 'flex-start',
    width: '90%',
    marginTop: 6,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  botTitle: { fontSize: 12, fontWeight: '700', color: Colors.customer, marginBottom: 6 },
  txLine: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  txIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  txDesc: { fontSize: 13, fontWeight: '600', color: Colors.text },
  txMeta: { fontSize: 11, color: Colors.textLight },
  txAmount: { fontSize: 13, fontWeight: '800' },
  removed: { fontSize: 11, color: Colors.gray400, fontStyle: 'italic', marginTop: 4 },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noteText: { fontSize: 12, color: Colors.gray500 },
  help: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 24, gap: 8 },
  helpTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  helpText: { fontSize: 12, color: Colors.textLight, textAlign: 'center', lineHeight: 19, marginBottom: 8 },
  example: {
    backgroundColor: Colors.customerLight,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  exampleText: { fontSize: 13, color: Colors.customer, fontWeight: '600' },
  previewBar: { paddingHorizontal: 12, paddingTop: 6, gap: 4, backgroundColor: Colors.background },
  previewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  previewText: { flex: 1, fontSize: 12, fontWeight: '600' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 10,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 42,
    backgroundColor: Colors.gray50,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 21,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 14,
    color: Colors.text,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.customer,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
