import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, RefreshControl, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getBalance, addBalance } from '../api/balance';
import PasskeyModal from '../components/PasskeyModal';
import { COLORS } from '../styles/colors';

const USD_TO_KES = 150;

const BalanceScreen = () => {
  const [balance, setBalance]           = useState<any>(null);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [amountUsd, setAmountUsd]       = useState('');
  const [passkeyVisible, setPasskeyVisible] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyError, setPasskeyError]     = useState<string | null>(null);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [history, setHistory]           = useState<any[]>([]);

  const fetchBalance = useCallback(async () => {
    try {
      const data: any = await getBalance();
      setBalance(data);
      if (data?.history) setHistory(data.history);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchBalance(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBalance();
    setRefreshing(false);
  };

  const amountKes = parseFloat(balance?.amount_kes || '0');
  const amountUsdDisplay = amountKes / USD_TO_KES;

  const preview = amountUsd && !isNaN(parseFloat(amountUsd))
    ? parseFloat(amountUsd) * USD_TO_KES
    : null;

  const formatKes = (v: number) =>
    `KES ${v.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatUsd = (v: number) =>
    `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleTopUp = () => {
    if (!amountUsd.trim() || isNaN(parseFloat(amountUsd)) || parseFloat(amountUsd) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid USD amount greater than 0.');
      return;
    }
    setPasskeyError(null);
    setPasskeyVisible(true);
  };

  const handleConfirmTopUp = async (passkey: string) => {
    if (!passkey.trim()) {
      setPasskeyError('Transaction passkey is required.');
      return;
    }

    setPasskeyLoading(true);
    setPasskeyError(null);
    try {
      const result: any = await addBalance({ 
        amount_usd: amountUsd, 
        passkey: passkey.trim() 
      });
      
      setBalance(result.balance ?? result);
      if (result?.history) setHistory(result.history);
      setPasskeyVisible(false);
      setAmountUsd('');
      Alert.alert('✅ Balance Updated', `Successfully added ${formatKes(parseFloat(amountUsd) * USD_TO_KES)} to your wallet.`);
    } catch (e: any) {
      const msg = e?.response?.data?.error || 'Failed to add balance. Please check your passkey.';
      setPasskeyError(msg);
    } finally {
      setPasskeyLoading(false);
    }
  };

  // Dynamically build the exact ranges to keep the codebase clean
  const QUICK_AMOUNTS = [
    10, 50, 100, 250, 500,
    ...Array.from({ length: (10000 - 1000) / 500 + 1 }, (_, i) => 1000 + i * 500),
    ...Array.from({ length: (50000 - 15000) / 5000 + 1 }, (_, i) => 15000 + i * 5000)
  ];

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading balance...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Balance</Text>
          <Text style={styles.headerSub}>Manage your wallet</Text>
        </View>

        {/* ── Balance Card ── */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceCardHeader}>
            <View>
              <Text style={styles.balanceCardLabel}>Total Balance</Text>
              <Text style={styles.balanceCardSub}>Riziki Admin Wallet</Text>
            </View>
            <TouchableOpacity onPress={() => setBalanceVisible((v) => !v)} style={styles.eyeBtn}>
              <Ionicons
                name={balanceVisible ? 'eye-outline' : 'eye-off-outline'}
                size={22}
                color="rgba(255,255,255,0.8)"
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.balanceKes}>
            {balanceVisible ? formatKes(amountKes) : 'KES ••••••'}
          </Text>
          <Text style={styles.balanceUsd}>
            {balanceVisible ? `≈ ${formatUsd(amountUsdDisplay)}` : '$ ••••'}
          </Text>

          <View style={styles.balanceMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="trending-up-outline" size={14} color={COLORS.accent} />
              <Text style={styles.metaText}>1 USD = KES {USD_TO_KES}</Text>
            </View>
            {balance?.updated_at && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.5)" />
                <Text style={styles.metaTextMuted}>
                  {new Date(balance.updated_at).toLocaleString('en-KE', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          {[
            { label: 'KES Balance', value: balanceVisible ? formatKes(amountKes) : '••••', icon: 'cash-outline',  color: COLORS.primary  },
            { label: 'USD Value',   value: balanceVisible ? formatUsd(amountUsdDisplay) : '••••', icon: 'globe-outline', color: '#7C3AED' },
          ].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: s.color + '15' }]}>
                <Ionicons name={s.icon as any} size={20} color={s.color} />
              </View>
              <Text style={styles.statValue} numberOfLines={1}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Top Up Card ── */}
        <View style={styles.topUpCard}>
          <View style={styles.topUpHeader}>
            <View style={styles.topUpTitleRow}>
              <View style={styles.topUpIconBox}>
                <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.topUpTitle}>Top Up Balance</Text>
            </View>
            <Text style={styles.topUpSub}>Enter amount in USD to add to your wallet</Text>
          </View>

          {/* Quick amounts */}
          <Text style={styles.quickLabel}>Quick amounts (USD)</Text>
          <View style={styles.quickGrid}>
            {QUICK_AMOUNTS.map((amt) => (
              <TouchableOpacity
                key={amt}
                style={[styles.quickBtn, amountUsd === String(amt) && styles.quickBtnActive]}
                onPress={() => setAmountUsd(String(amt))}
              >
                <Text style={[styles.quickBtnText, amountUsd === String(amt) && styles.quickBtnTextActive]}>
                  {amt >= 1000 ? `$${amt / 1000}k` : `$${amt}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom amount input */}
          <Text style={styles.fieldLabel}>Custom Amount (USD)</Text>
          <View style={styles.inputRow}>
            <View style={styles.currencyTag}>
              <Text style={styles.currencyText}>$</Text>
            </View>
            <TextInput
              style={styles.amountInput}
              value={amountUsd}
              onChangeText={(v) => setAmountUsd(v.replace(/[^0-9.]/g, ''))}
              placeholder="0.00"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="decimal-pad"
            />
            {amountUsd.length > 0 && (
              <TouchableOpacity onPress={() => setAmountUsd('')} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Preview */}
          {preview !== null && (
            <View style={styles.previewBox}>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>You are adding</Text>
                <Text style={styles.previewKes}>{formatKes(preview)}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>USD Amount</Text>
                <Text style={styles.previewUsd}>{formatUsd(parseFloat(amountUsd))}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>New balance will be</Text>
                <Text style={styles.previewNew}>{formatKes(amountKes + preview)}</Text>
              </View>
              <View style={styles.previewDivider} />
              <View style={styles.rateRow}>
                <Ionicons name="information-circle-outline" size={13} color={COLORS.textMuted} />
                <Text style={styles.rateText}>Fixed rate: 1 USD = KES {USD_TO_KES}</Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.topUpBtn, (!amountUsd || parseFloat(amountUsd) <= 0) && styles.topUpBtnDisabled]}
            onPress={handleTopUp}
            disabled={!amountUsd || parseFloat(amountUsd) <= 0}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.topUpBtnText}>
              {preview ? `Add ${formatKes(preview)}` : 'Add to Balance'}
            </Text>
          </TouchableOpacity>

          {/* Passkey format hint */}
          <View style={styles.secureNote}>
            <Ionicons name="lock-closed-outline" size={13} color={COLORS.textMuted} />
            <Text style={styles.secureText}>Your transaction passkey (RZK####) is required to confirm</Text>
          </View>
        </View>

        {/* ── How it works ── */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>How Balance Works</Text>
          {[
            { icon: 'cash-outline',            text: 'Enter an amount in USD'                                        },
            { icon: 'swap-horizontal-outline',  text: 'Converted at 1 USD = KES 150'                                 },
            { icon: 'lock-closed-outline',      text: 'Enter your RZK#### transaction passkey'        },
            { icon: 'checkmark-circle-outline', text: 'Balance updated instantly'                                     },
          ].map((step, i) => (
            <View key={i} style={styles.infoRow}>
              <View style={styles.stepCircle}>
                <Text style={styles.stepNum}>{i + 1}</Text>
              </View>
              <Ionicons name={step.icon as any} size={16} color={COLORS.primary} style={{ marginRight: 8 }} />
              <Text style={styles.infoText}>{step.text}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <PasskeyModal
        visible={passkeyVisible}
        onConfirm={handleConfirmTopUp}
        onCancel={() => { setPasskeyVisible(false); setPasskeyError(null); }}
        isLoading={passkeyLoading}
        error={passkeyError}
        title="Confirm Top-up"
        subtitle={`Enter your RZK#### transaction passkey to add ${preview ? formatKes(preview) : ''} to your balance.`}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen:         { flex: 1, backgroundColor: COLORS.background },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  loadingText:   { marginTop: 12, fontSize: 14, color: COLORS.textMuted },

  // Header
  header: {
    backgroundColor: COLORS.secondary,
    paddingTop: Platform.OS === 'web' ? 20 : 50,
    paddingBottom: 20, paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  // Balance card
  balanceCard: {
    backgroundColor: COLORS.secondary,
    marginHorizontal: 16, marginTop: 16,
    borderRadius: 20, padding: 24, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  balanceCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  balanceCardLabel:  { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  balanceCardSub:    { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  eyeBtn:            { padding: 4 },
  balanceKes:        { fontSize: 34, fontWeight: '800', color: COLORS.accent, letterSpacing: -0.5 },
  balanceUsd:        { fontSize: 16, color: 'rgba(255,255,255,0.6)', marginTop: 4, marginBottom: 20 },
  balanceMeta:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaItem:          { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:          { fontSize: 11, color: COLORS.accent, fontWeight: '600' },
  metaTextMuted:     { fontSize: 11, color: 'rgba(255,255,255,0.4)' },

  // Stats
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statIcon:  { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 14, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  statLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '500', marginTop: 2, textAlign: 'center' },

  // Top Up card
  topUpCard: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  topUpHeader:   { marginBottom: 20 },
  topUpTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  topUpIconBox: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  topUpTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  topUpSub:   { fontSize: 13, color: COLORS.textMuted, marginLeft: 42 },

  // Quick amounts
  quickLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginBottom: 8 },
  quickGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  quickBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    minWidth: 70, alignItems: 'center'
  },
  quickBtnActive:    { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  quickBtnText:      { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  quickBtnTextActive:{ color: COLORS.primary },

  // Input
  fieldLabel: { fontSize: 12, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  inputRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  currencyTag: {
    backgroundColor: COLORS.secondary, paddingHorizontal: 16, paddingVertical: 13,
    borderTopLeftRadius: 10, borderBottomLeftRadius: 10,
    borderWidth: 1.5, borderColor: COLORS.secondary,
  },
  currencyText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  amountInput: {
    flex: 1, backgroundColor: COLORS.background,
    borderWidth: 1.5, borderColor: COLORS.border, borderLeftWidth: 0,
    borderTopRightRadius: 10, borderBottomRightRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 18, fontWeight: '700', color: COLORS.text,
  },
  clearBtn: { position: 'absolute', right: 12 },

  // Preview
  previewBox: {
    backgroundColor: COLORS.primary + '08',
    borderRadius: 14, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.primary + '20',
  },
  previewRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  previewLabel:  { fontSize: 13, color: COLORS.textMuted },
  previewKes:    { fontSize: 16, fontWeight: '800', color: COLORS.secondary },
  previewUsd:    { fontSize: 14, fontWeight: '600', color: COLORS.text },
  previewNew:    { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  previewDivider:{ height: 1, backgroundColor: COLORS.primary + '20', marginVertical: 8 },
  rateRow:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rateText:      { fontSize: 11, color: COLORS.textMuted },

  // Buttons
  topUpBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14,
    paddingVertical: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  topUpBtnDisabled: { opacity: 0.45 },
  topUpBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  secureNote: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, marginTop: 10,
  },
  secureText: { fontSize: 12, color: COLORS.textMuted },

  // Info card
  infoCard: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 20, padding: 20, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: COLORS.secondary, marginBottom: 14 },
  infoRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stepCircle: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  stepNum:   { fontSize: 11, fontWeight: '800', color: '#fff' },
  infoText:  { fontSize: 13, color: COLORS.text, flex: 1 },
});

export default BalanceScreen;