// frontend/src/screens/TransactionsScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, RefreshControl,
  Modal, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTransactions, deleteTransaction } from '../api/transactions';
import { generateReceipt } from '../api/receipts';
import PasskeyModal from '../components/PasskeyModal';
import { COLORS } from '../styles/colors';

type StatusFilter = 'ALL' | 'COMPLETED' | 'PENDING' | 'FAILED';
type TypeFilter   = 'ALL' | 'STK_PUSH' | 'B2C' | 'B2B' | 'C2B' | 'DEPOSIT' | 'REVERSAL';

const statusColor = (s: string) => {
  if (s === 'COMPLETED') return '#059669';
  if (s === 'FAILED')    return COLORS.error;
  if (s === 'PENDING')   return '#D97706';
  return COLORS.textMuted;
};

const typeIcon = (t: string) => {
  if (t === 'B2C')      return 'arrow-up-outline';
  if (t === 'B2B')      return 'business-outline';
  if (t === 'C2B')      return 'arrow-down-outline';
  if (t === 'STK_PUSH') return 'phone-portrait-outline';
  if (t === 'DEPOSIT')  return 'wallet-outline';
  if (t === 'REVERSAL') return 'refresh-outline';
  return 'swap-horizontal-outline';
};

const TransactionsScreen = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filtered, setFiltered]         = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [typeFilter, setTypeFilter]     = useState<TypeFilter>('ALL');
  const [selected, setSelected]         = useState<any>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [passkeyVisible, setPasskeyVisible] = useState(false);
  const [passkeyError, setPasskeyError]     = useState<string | null>(null);
  const [deletingId, setDeletingId]         = useState<number | null>(null);
  const [generating, setGenerating]         = useState<number | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      const data: any = await getTransactions();
      const list = Array.isArray(data) ? data : data.results || [];
      setTransactions(list);
      setFiltered(list);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchTransactions(); }, []);

  useEffect(() => {
    let result = [...transactions];
    if (statusFilter !== 'ALL') result = result.filter((t) => t.status === statusFilter);
    if (typeFilter !== 'ALL')   result = result.filter((t) => t.transaction_type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) =>
        t.transaction_type?.toLowerCase().includes(q) ||
        t.recipient?.toLowerCase().includes(q) ||
        t.phone_number?.includes(q) ||
        t.mpesa_receipt_number?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [search, statusFilter, typeFilter, transactions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTransactions();
    setRefreshing(false);
  };

  const openDetail = (tx: any) => { setSelected(tx); setDetailVisible(true); };

  const confirmDelete = (id: number) => {
    setDeletingId(id);
    setPasskeyError(null);
    setPasskeyVisible(true);
  };

  const handleDelete = async (passkey: string) => {
    if (!deletingId) return;
    try {
      await deleteTransaction(deletingId, passkey);
      setTransactions((prev) => prev.filter((t) => t.id !== deletingId));
      setDetailVisible(false);
      setPasskeyVisible(false);
      Alert.alert('Deleted', 'Transaction removed successfully.');
    } catch (e: any) {
      setPasskeyError(e?.response?.data?.error || 'Invalid passkey or failed to delete.');
    }
  };

  const handleGenerateReceipt = async (id: number) => {
    setGenerating(id);
    try {
      await generateReceipt(id);
      Alert.alert('✅ Receipt Generated', 'Receipt has been created and is available in Receipts.');
    } catch {
      Alert.alert('Error', 'Failed to generate receipt.');
    } finally {
      setGenerating(null);
    }
  };

  const formatKes = (v: number) =>
    `KES ${v.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const STATUS_FILTERS: StatusFilter[] = ['ALL', 'COMPLETED', 'PENDING', 'FAILED'];
  const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
    { key: 'ALL',      label: 'All'       },
    { key: 'STK_PUSH', label: 'STK Push'  },
    { key: 'B2C',      label: 'B2C'       },
    { key: 'B2B',      label: 'B2B'       },
    { key: 'C2B',      label: 'C2B'       },
    { key: 'DEPOSIT',  label: 'Deposit'   },
    { key: 'REVERSAL', label: 'Reversal'  },
  ];

  const totalKes = filtered.reduce((s, t) => s + parseFloat(t.amount_kes || '0'), 0);
  const completed = filtered.filter((t) => t.status === 'COMPLETED').length;

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Transactions</Text>
          <Text style={styles.headerSub}>{filtered.length} records · {formatKes(totalKes)}</Text>
        </View>
        <View style={styles.headerStats}>
          <View style={styles.headerStatBadge}>
            <Text style={styles.headerStatText}>{completed} completed</Text>
          </View>
        </View>
      </View>

      {/* ── Search ── */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search transactions..."
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Status Filters ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}
            onPress={() => setStatusFilter(f)}
          >
            {f !== 'ALL' && <View style={[styles.filterDot, { backgroundColor: statusColor(f) }]} />}
            <Text style={[styles.filterChipText, statusFilter === f && styles.filterChipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
        <View style={styles.filterDivider} />
        {TYPE_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, typeFilter === f.key && styles.filterChipActive]}
            onPress={() => setTypeFilter(f.key)}
          >
            <Text style={[styles.filterChipText, typeFilter === f.key && styles.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── List ── */}
      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="swap-horizontal-outline" size={48} color={COLORS.border} />
            <Text style={styles.emptyText}>No transactions found</Text>
            <Text style={styles.emptyHint}>Try adjusting your filters or search.</Text>
          </View>
        ) : (
          filtered.map((tx: any) => (
            <TouchableOpacity key={tx.id} style={styles.txCard} onPress={() => openDetail(tx)} activeOpacity={0.8}>
              <View style={[styles.txIconBox, { backgroundColor: statusColor(tx.status) + '15' }]}>
                <Ionicons name={typeIcon(tx.transaction_type) as any} size={20} color={statusColor(tx.status)} />
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txType}>{tx.transaction_type}</Text>
                <Text style={styles.txRecipient} numberOfLines={1}>
                  {tx.recipient || tx.phone_number || tx.mpesa_receipt_number || '—'}
                </Text>
                <Text style={styles.txDate}>
                  {new Date(tx.created_at).toLocaleString('en-KE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={styles.txRight}>
                <Text style={styles.txAmount}>{formatKes(parseFloat(tx.amount_kes || '0'))}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor(tx.status) + '15' }]}>
                  <Text style={[styles.statusText, { color: statusColor(tx.status) }]}>{tx.status}</Text>
                </View>
                <View style={styles.txActions}>
                  <TouchableOpacity
                    style={styles.receiptBtn}
                    onPress={() => handleGenerateReceipt(tx.id)}
                    disabled={generating === tx.id}
                  >
                    {generating === tx.id
                      ? <ActivityIndicator size="small" color={COLORS.primary} />
                      : <Ionicons name="receipt-outline" size={16} color={COLORS.primary} />}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(tx.id)}>
                    <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Detail Modal ── */}
      <Modal visible={detailVisible} animationType="slide" transparent onRequestClose={() => setDetailVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            {selected && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Transaction Detail</Text>
                  <TouchableOpacity onPress={() => setDetailVisible(false)}>
                    <Ionicons name="close" size={24} color={COLORS.text} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.detailStatus, { backgroundColor: statusColor(selected.status) + '15' }]}>
                  <Ionicons name={typeIcon(selected.transaction_type) as any} size={28} color={statusColor(selected.status)} />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={[styles.detailType, { color: statusColor(selected.status) }]}>{selected.transaction_type}</Text>
                    <Text style={[styles.detailStatusText, { color: statusColor(selected.status) }]}>{selected.status}</Text>
                  </View>
                </View>

                <Text style={styles.detailAmount}>{formatKes(parseFloat(selected.amount_kes || '0'))}</Text>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {[
                    { label: 'Transaction ID',    value: `#${selected.id}`                                 },
                    { label: 'M-Pesa Receipt',    value: selected.mpesa_receipt_number || 'N/A'            },
                    { label: 'Recipient',         value: selected.recipient || selected.phone_number || '—' },
                    { label: 'Description',       value: selected.description || '—'                       },
                    { label: 'Amount (USD)',       value: selected.amount_usd ? `$${selected.amount_usd}` : '—' },
                    { label: 'Date',              value: new Date(selected.created_at).toLocaleString('en-KE') },
                  ].map((row) => (
                    <View key={row.label} style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{row.label}</Text>
                      <Text style={styles.detailValue}>{row.value}</Text>
                    </View>
                  ))}

                  <View style={styles.detailBtns}>
                    <TouchableOpacity
                      style={styles.detailReceiptBtn}
                      onPress={() => { handleGenerateReceipt(selected.id); setDetailVisible(false); }}
                    >
                      <Ionicons name="receipt-outline" size={16} color="#fff" />
                      <Text style={styles.detailReceiptText}>Generate Receipt</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.detailDeleteBtn}
                      onPress={() => { setDetailVisible(false); confirmDelete(selected.id); }}
                    >
                      <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                      <Text style={styles.detailDeleteText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ height: 24 }} />
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Passkey Modal ── */}
      <PasskeyModal
        visible={passkeyVisible}
        onConfirm={handleDelete}
        onCancel={() => { setPasskeyVisible(false); setPasskeyError(null); }}
        error={passkeyError}
        title="Confirm Delete"
        subtitle="Enter your passkey to permanently delete this transaction."
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: COLORS.background },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  loadingText:   { marginTop: 12, fontSize: 14, color: COLORS.textMuted },
  header: {
    backgroundColor: COLORS.secondary,
    paddingTop: Platform.OS === 'web' ? 20 : 50,
    paddingBottom: 20, paddingHorizontal: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle:     { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub:       { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  headerStats:     {},
  headerStatBadge: { backgroundColor: COLORS.primary + '30', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  headerStatText:  { fontSize: 12, color: '#fff', fontWeight: '600' },
  searchRow:    { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput:  { flex: 1, fontSize: 14, color: COLORS.text },
  filterScroll: { maxHeight: 44 },
  filterContent:{ paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: '#fff',
  },
  filterChipActive:    { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  filterDot:           { width: 7, height: 7, borderRadius: 4 },
  filterChipText:      { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  filterChipTextActive:{ color: COLORS.primary },
  filterDivider:       { width: 1, backgroundColor: COLORS.border, marginHorizontal: 4 },
  list: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  emptyBox:  { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 15, fontWeight: '600', color: COLORS.textMuted, marginTop: 12 },
  emptyHint: { fontSize: 12, color: COLORS.textMuted, marginTop: 6 },
  txCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  txIconBox:   { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txInfo:      { flex: 1 },
  txType:      { fontSize: 13, fontWeight: '700', color: COLORS.text },
  txRecipient: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  txDate:      { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  txRight:     { alignItems: 'flex-end' },
  txAmount:    { fontSize: 13, fontWeight: '700', color: COLORS.text },
  statusBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 3 },
  statusText:  { fontSize: 10, fontWeight: '700' },
  txActions:   { flexDirection: 'row', gap: 6, marginTop: 4 },
  receiptBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: COLORS.primary + '12', alignItems: 'center', justifyContent: 'center',
  },
  deleteBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: COLORS.error + '12', alignItems: 'center', justifyContent: 'center',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '85%',
  },
  modalHandle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 16 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:   { fontSize: 18, fontWeight: '800', color: COLORS.text },
  detailStatus: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 16, marginBottom: 8 },
  detailType:   { fontSize: 15, fontWeight: '800' },
  detailStatusText: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  detailAmount: { fontSize: 28, fontWeight: '800', color: COLORS.secondary, textAlign: 'center', marginBottom: 16 },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  detailLabel:  { fontSize: 13, color: COLORS.textMuted },
  detailValue:  { fontSize: 13, fontWeight: '600', color: COLORS.text, maxWidth: '55%', textAlign: 'right' },
  detailBtns:   { flexDirection: 'row', gap: 12, marginTop: 20 },
  detailReceiptBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14,
  },
  detailReceiptText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  detailDeleteBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14,
    borderWidth: 1.5, borderColor: COLORS.error + '40',
  },
  detailDeleteText: { color: COLORS.error, fontWeight: '700', fontSize: 14 },
});

export default TransactionsScreen;