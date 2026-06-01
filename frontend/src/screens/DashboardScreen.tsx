// frontend/src/screens/DashboardScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getBalance } from '../api/balance';
import { getTransactions } from '../api/transactions';
import { COLORS } from '../styles/colors';

const USD_TO_KES = 150;

const DashboardScreen = ({ navigation }: any) => {
  const { user, logout } = useAuth();

  const [balance, setBalance]           = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [bal, txs] = await Promise.all([getBalance(), getTransactions()]);
      setBalance(bal);
      setTransactions(Array.isArray(txs) ? txs.slice(0, 5) : (txs as any)?.results?.slice(0, 5) || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const formatKes = (v: number) =>
    `KES ${v.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatUsd = (v: number) =>
    `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const amountKes = parseFloat(balance?.amount_kes || '0');
  const amountUsd = amountKes / USD_TO_KES;

  const statusColor = (s: string) => {
    if (s === 'COMPLETED') return COLORS.success;
    if (s === 'FAILED')    return COLORS.error;
    return '#D97706';
  };

  const QUICK_ACTIONS = [
    { label: 'Balance',      icon: 'wallet-outline',          color: '#1A237E', screen: 'Balance'      },
    { label: 'Transactions', icon: 'swap-horizontal-outline', color: COLORS.primary, screen: 'Transactions' },
    { label: 'Clients',      icon: 'people-outline',          color: '#7C3AED', screen: 'Clients'      },
    { label: 'Receipts',     icon: 'receipt-outline',         color: '#D97706', screen: 'Receipts'     },
    { label: 'M-Pesa',       icon: 'phone-portrait-outline',  color: COLORS.primary, screen: 'M-Pesa'  },
    { label: 'Settings',     icon: 'settings-outline',        color: '#6B7280', screen: 'Settings'     },
  ];

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.adminName}>{user?.full_name || user?.username || 'Admin'} 👋</Text>
            <Text style={styles.headerDate}>
              {now.toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </Text>
          </View>
          <TouchableOpacity style={styles.avatarBtn} onPress={() => navigation?.navigate?.('Settings')}>
            <Text style={styles.avatarText}>{(user?.username?.[0] || 'A').toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Balance Card ── */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <View>
              <Text style={styles.balanceLabel}>Total Balance</Text>
              <Text style={styles.balanceSubLabel}>Riziki Admin Wallet</Text>
            </View>
            <TouchableOpacity onPress={() => setBalanceVisible((v) => !v)} style={styles.eyeBtn}>
              <Ionicons
                name={balanceVisible ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color="rgba(255,255,255,0.8)"
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.balanceKes}>
            {balanceVisible ? formatKes(amountKes) : 'KES ••••••'}
          </Text>
          <Text style={styles.balanceUsd}>
            {balanceVisible ? `≈ ${formatUsd(amountUsd)}` : '$ ••••'}
          </Text>

          <View style={styles.balanceFooter}>
            <View style={styles.rateTag}>
              <Ionicons name="trending-up-outline" size={12} color={COLORS.accent} />
              <Text style={styles.rateText}>1 USD = KES {USD_TO_KES}</Text>
            </View>
            <TouchableOpacity
              style={styles.topUpBtn}
              onPress={() => navigation?.navigate?.('Balance')}
            >
              <Ionicons name="add-circle-outline" size={14} color="#fff" />
              <Text style={styles.topUpText}>Top Up</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          {[
            { label: 'Transactions', value: transactions.length.toString(), icon: 'swap-horizontal-outline', color: COLORS.primary },
            { label: 'Completed',    value: transactions.filter((t) => t.status === 'COMPLETED').length.toString(), icon: 'checkmark-circle-outline', color: COLORS.success },
            { label: 'Pending',      value: transactions.filter((t) => t.status === 'PENDING').length.toString(), icon: 'time-outline', color: '#D97706' },
          ].map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: stat.color + '15' }]}>
                <Ionicons name={stat.icon as any} size={18} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={styles.actionCard}
                onPress={() => navigation?.navigate?.(action.screen)}
                activeOpacity={0.75}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color + '15' }]}>
                  <Ionicons name={action.icon as any} size={24} color={action.color} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Recent Transactions ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => navigation?.navigate?.('Transactions')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {transactions.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="swap-horizontal-outline" size={40} color={COLORS.border} />
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptyHint}>Your recent M-Pesa activity will appear here.</Text>
            </View>
          ) : (
            transactions.map((tx: any) => (
              <View key={tx.id} style={styles.txRow}>
                <View style={[styles.txIcon, { backgroundColor: statusColor(tx.status) + '15' }]}>
                  <Ionicons name="swap-horizontal-outline" size={18} color={statusColor(tx.status)} />
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txType}>{tx.transaction_type}</Text>
                  <Text style={styles.txRecipient} numberOfLines={1}>
                    {tx.recipient || tx.phone_number || tx.mpesa_receipt_number || '—'}
                  </Text>
                  <Text style={styles.txDate}>
                    {new Date(tx.created_at).toLocaleString('en-KE', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                </View>
                <View style={styles.txRight}>
                  <Text style={styles.txAmount}>
                    {formatKes(parseFloat(tx.amount_kes || '0'))}
                  </Text>
                  <View style={[styles.txStatusBadge, { backgroundColor: statusColor(tx.status) + '15' }]}>
                    <Text style={[styles.txStatus, { color: statusColor(tx.status) }]}>
                      {tx.status}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: COLORS.background },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  loadingText:   { marginTop: 12, fontSize: 14, color: COLORS.textMuted },

  // Header
  header: {
    backgroundColor: COLORS.secondary,
    paddingTop: Platform.OS === 'web' ? 20 : 50,
    paddingBottom: 24, paddingHorizontal: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  headerLeft:  {},
  greeting:    { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 2 },
  adminName:   { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerDate:  { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  avatarBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#fff' },

  // Balance card
  balanceCard: {
    backgroundColor: COLORS.secondary,
    marginHorizontal: 16, marginTop: -1,
    borderRadius: 20, padding: 24, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    ...(Platform.OS !== 'web' ? {
      shadowColor: COLORS.secondary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35, shadowRadius: 16, elevation: 10,
    } : {}),
  },
  balanceHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  balanceLabel:    { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  balanceSubLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  eyeBtn:          { padding: 4 },
  balanceKes:      { fontSize: 34, fontWeight: '800', color: COLORS.accent, letterSpacing: -0.5 },
  balanceUsd:      { fontSize: 16, color: 'rgba(255,255,255,0.6)', marginTop: 4, marginBottom: 20 },
  balanceFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rateTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  rateText:  { fontSize: 11, color: COLORS.accent, fontWeight: '600' },
  topUpBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
  },
  topUpText: { fontSize: 12, color: '#fff', fontWeight: '700' },

  // Stats
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 8 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '500', marginTop: 2, textAlign: 'center' },

  // Section
  section:       { paddingHorizontal: 16, marginTop: 8, marginBottom: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:  { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  seeAll:        { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  // Actions grid
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: {
    width: '30%', backgroundColor: '#fff', borderRadius: 14,
    padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  actionIcon:  { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 11, fontWeight: '600', color: COLORS.text, textAlign: 'center' },

  // Transactions
  txRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  txIcon:      { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txInfo:      { flex: 1 },
  txType:      { fontSize: 13, fontWeight: '700', color: COLORS.text },
  txRecipient: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  txDate:      { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  txRight:     { alignItems: 'flex-end' },
  txAmount:    { fontSize: 13, fontWeight: '700', color: COLORS.text },
  txStatusBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 },
  txStatus:    { fontSize: 10, fontWeight: '700' },

  // Empty
  emptyBox:  { alignItems: 'center', paddingVertical: 36 },
  emptyText: { fontSize: 15, fontWeight: '600', color: COLORS.textMuted, marginTop: 12 },
  emptyHint: { fontSize: 12, color: COLORS.textMuted, marginTop: 6, textAlign: 'center' },
});

export default DashboardScreen;