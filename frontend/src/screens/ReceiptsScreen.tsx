// frontend/src/screens/ReceiptsScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform, Alert, Linking // 👈 Added Linking here
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getReceipts, getReceiptDownloadUrl } from '../api/receipts'; // 👈 Removed generateReceipt
import { COLORS } from '../styles/colors';

const ReceiptsScreen = () => {
  const [receipts, setReceipts]     = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [opening, setOpening]       = useState<number | null>(null);

  const fetchReceipts = useCallback(async () => {
    try {
      const data: any = await getReceipts();
      setReceipts(Array.isArray(data) ? data : data?.results || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchReceipts(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReceipts();
    setRefreshing(false);
  };

  const handleOpen = async (receipt: any) => {
    setOpening(receipt.id);
    try {
      const url = receipt.pdf_url || getReceiptDownloadUrl(receipt.id);
      
      // ── Functional Link Handler ──
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', "Don't know how to open this URL: " + url);
      }
    } catch {
      Alert.alert('Error', 'Could not open receipt. Please try again.');
    } finally {
      setOpening(null);
    }
  };

  const formatKes = (v: number) =>
    `KES ${v.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const totalAmount = receipts.reduce((s, r) => s + parseFloat(r.amount || '0'), 0);

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading receipts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Receipts</Text>
          <Text style={styles.headerSub}>{receipts.length} receipts · {formatKes(totalAmount)}</Text>
        </View>
        <View style={styles.headerBadge}>
          <Ionicons name="receipt-outline" size={16} color={COLORS.accent} />
          <Text style={styles.headerBadgeText}>PDF</Text>
        </View>
      </View>

      {/* ── Summary cards ── */}
      {receipts.length > 0 && (
        <View style={styles.summaryRow}>
          {[
            { label: 'Total Receipts', value: receipts.length.toString(),     icon: 'receipt-outline',    color: COLORS.primary },
            { label: 'Total Amount',   value: formatKes(totalAmount),         icon: 'cash-outline',       color: '#7C3AED'      },
          ].map((s) => (
            <View key={s.label} style={styles.summaryCard}>
              <View style={[styles.summaryIcon, { backgroundColor: s.color + '15' }]}>
                <Ionicons name={s.icon as any} size={18} color={s.color} />
              </View>
              <Text style={styles.summaryValue} numberOfLines={1}>{s.value}</Text>
              <Text style={styles.summaryLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {receipts.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="receipt-outline" size={48} color={COLORS.border} />
            </View>
            <Text style={styles.emptyTitle}>No receipts yet</Text>
            <Text style={styles.emptyHint}>
              Generate receipts from the Transactions screen by tapping the receipt icon on any completed transaction.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.listHeader}>All Receipts</Text>
            {receipts.map((receipt: any) => (
              <View key={receipt.id} style={styles.receiptCard}>
                {/* Left accent */}
                <View style={[styles.receiptAccent, { backgroundColor: COLORS.accent }]} />

                <View style={styles.receiptIconBox}>
                  <Ionicons name="receipt-outline" size={22} color={COLORS.accent} />
                </View>

                <View style={styles.receiptInfo}>
                  <View style={styles.receiptTopRow}>
                    <Text style={styles.receiptId}>
                      Receipt #{String(receipt.id).padStart(6, '0')}
                    </Text>
                    <Text style={styles.receiptType}>{receipt.transaction_type || 'PAYMENT'}</Text>
                  </View>
                  <Text style={styles.receiptAmount}>{formatKes(parseFloat(receipt.amount || '0'))}</Text>
                  {receipt.phone_number && (
                    <View style={styles.receiptMetaRow}>
                      <Ionicons name="call-outline" size={11} color={COLORS.textMuted} />
                      <Text style={styles.receiptMeta}>{receipt.phone_number}</Text>
                    </View>
                  )}
                  {receipt.description && (
                    <Text style={styles.receiptDesc} numberOfLines={1}>{receipt.description}</Text>
                  )}
                  <View style={styles.receiptMetaRow}>
                    <Ionicons name="time-outline" size={11} color={COLORS.textMuted} />
                    <Text style={styles.receiptMeta}>
                      {new Date(receipt.timestamp || receipt.created_at).toLocaleString('en-KE', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.openBtn}
                  onPress={() => handleOpen(receipt)}
                  disabled={opening === receipt.id}
                >
                  {opening === receipt.id
                    ? <ActivityIndicator size="small" color="#fff" />
                    : (
                      <>
                        <Ionicons name="open-outline" size={16} color="#fff" />
                        <Text style={styles.openBtnText}>Open</Text>
                      </>
                    )}
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
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
  headerTitle:      { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub:        { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.accent + '25',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
  },
  headerBadgeText: { fontSize: 12, color: COLORS.accent, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  summaryCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  summaryIcon:  { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  summaryValue: { fontSize: 14, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  summaryLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '500', marginTop: 2, textAlign: 'center' },
  list:        { flex: 1, padding: 16 },
  listHeader:  { fontSize: 14, fontWeight: '700', color: COLORS.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyBox:    { alignItems: 'center', paddingVertical: 64, paddingHorizontal: 32 },
  emptyIconBox: {
    width: 88, height: 88, borderRadius: 28,
    backgroundColor: COLORS.border + '40',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textMuted, marginBottom: 8 },
  emptyHint:  { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
  receiptCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    overflow: 'hidden',
  },
  receiptAccent:  { width: 4, height: '100%', position: 'absolute', left: 0, top: 0, borderRadius: 4 },
  receiptIconBox: {
    width: 44, height: 44, borderRadius: 13,
    backgroundColor: COLORS.accent + '15',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12, marginLeft: 8,
  },
  receiptInfo:    { flex: 1 },
  receiptTopRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  receiptId:      { fontSize: 13, fontWeight: '700', color: COLORS.secondary },
  receiptType:    { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, backgroundColor: COLORS.background, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  receiptAmount:  { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  receiptMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  receiptMeta:    { fontSize: 11, color: COLORS.textMuted },
  receiptDesc:    { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  openBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 10, marginLeft: 8,
  },
  openBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});

export default ReceiptsScreen;