// frontend/src/screens/MpesaScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { stkPush, b2cPayment, b2bPayment, reverseTransaction, checkTransactionStatus, getMpesaConfig } from '../api/mpesa';
import PasskeyModal from '../components/PasskeyModal';
import ClientSelectModal from '../components/ClientSelectModal';
import { getClients, Client } from '../api/clients';
import { COLORS } from '../styles/colors';

type Tab     = 'STK' | 'B2C' | 'B2B' | 'REVERSAL' | 'STATUS';
type B2BType = 'PAYBILL' | 'BUYGOODS';

const TABS: { key: Tab; label: string; icon: string; color: string }[] = [
  { key: 'STK',      label: 'STK Push', icon: 'phone-portrait-outline', color: COLORS.primary },
  { key: 'B2C',      label: 'B2C',      icon: 'arrow-up-outline',       color: '#7C3AED'      },
  { key: 'B2B',      label: 'B2B',      icon: 'business-outline',       color: '#0EA5E9'      },
  { key: 'REVERSAL', label: 'Reversal', icon: 'refresh-outline',        color: '#D97706'      },
  { key: 'STATUS',   label: 'Status',   icon: 'search-outline',         color: '#059669'      },
];

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboard?: any;
  multiline?: boolean;
  disabled?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({
  label, value, onChange, placeholder = '',
  keyboard = 'default', multiline = false, disabled = false,
}) => (
  <View style={styles.fieldGroup}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      style={[styles.fieldInput, multiline && { height: 80, textAlignVertical: 'top' }]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textMuted}
      keyboardType={keyboard}
      autoCapitalize="none"
      multiline={multiline}
      editable={!disabled}
      blurOnSubmit={false}
      returnKeyType="next"
    />
  </View>
);

const MpesaScreen = () => {
  const route      = useRoute<any>();
  const navigation = useNavigation<any>();

  const routeClient = route.params?.selectedClient || null;
  const initialTab  = route.params?.initialTab     || 'STK';

  const [tab, setTab]         = useState<Tab>(initialTab);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<any>(null);

  // Dynamic Environment Tracking Variable
  const [isProduction, setIsProduction] = useState(false);

  const [passkeyVisible, setPasskeyVisible] = useState(false);
  const [passkeyError, setPasskeyError]     = useState<string | null>(null);
  const [pendingAction, setPendingAction]   = useState<((p: string) => Promise<void>) | null>(null);

  const [clients, setClients]                         = useState<Client[]>([]);
  const [clientSelectVisible, setClientSelectVisible] = useState(false);
  const [b2bType, setB2bType]                         = useState<B2BType>('PAYBILL');
  const [activeClient, setActiveClient]               = useState<Client | null>(routeClient);

  // Form states
  const [stk, setStk]   = useState({ phone: '', amount: '', reference: 'RizikiApp', description: 'Payment' });
  const [b2c, setB2c]   = useState({ phone: '', amount: '', remarks: 'Business Payment' });
  const [b2b, setB2b]   = useState({ shortcode: '', amount: '', accountRef: '', remarks: 'B2B Transfer' });
  const [rev, setRev]   = useState({ transaction_id: '', amount: '', remarks: 'Reversal' });
  const [stat, setStat] = useState({ transaction_id: '' });

  useEffect(() => {
    // 1. Fetch live clients
    getClients().then(setClients).catch((error) => console.error("Failed to fetch clients", error));

    // 2. Query dynamic backend server parameters to match configurations
    getMpesaConfig()
      .then((config) => {
        setIsProduction(config.environment === 'production');
      })
      .catch((error) => {
        console.error("Failed to read mpesa live runtime variable parameters:", error);
        setIsProduction(false); // Fallback boundary safety safe state
      });
  }, []);

  const populateFormInputs = useCallback((client: Client, targetTab: Tab) => {
    setStk((p) => ({ ...p, phone: client.phone_number || '' }));
    setB2c((p) => ({ ...p, phone: client.phone_number || '' }));
    if (targetTab === 'B2B') {
      if (b2bType === 'PAYBILL') {
        setB2b((p) => ({ ...p, shortcode: client.paybill_number || '', accountRef: client.account_number || '' }));
      } else {
        setB2b((p) => ({ ...p, shortcode: client.till_number || '3302715', accountRef: '' }));
      }
    }
  }, [b2bType]);

  useEffect(() => {
    if (route.params?.selectedClient) {
      const client = route.params.selectedClient;
      setActiveClient(client);
      if (route.params.initialTab) setTab(route.params.initialTab);
      populateFormInputs(client, route.params.initialTab || tab);
    }
  }, [route.params, populateFormInputs, tab]);

  useEffect(() => {
    if (activeClient) populateFormInputs(activeClient, tab);
  }, [b2bType, tab, activeClient, populateFormInputs]);

  const handleClientSelect = (client: Client) => {
    setActiveClient(client);
    setClientSelectVisible(false);
    
    if (client.till_number && !client.paybill_number) {
      setB2bType('BUYGOODS');
    } else if (client.paybill_number && !client.till_number) {
      setB2bType('PAYBILL');
    } else if (client.paybill_number && client.till_number) {
      setB2bType('PAYBILL');
      Alert.alert("Dual Registry", `${client.name} has both Paybill and Till numbers. Use the toggle switch to alternate variants.`);
    }

    populateFormInputs(client, tab);
  };

  const handleClearClientContext = () => {
    setActiveClient(null);
    setStk({ phone: '', amount: '', reference: 'RizikiApp', description: 'Payment' });
    setB2c({ phone: '', amount: '', remarks: 'Business Payment' });
    setB2b({ shortcode: '', amount: '', accountRef: '', remarks: 'B2B Transfer' });
    navigation.setParams({ selectedClient: undefined, initialTab: undefined });
  };

  const formatPhone = (p: string) => {
    if (p.startsWith('0')) return '254' + p.slice(1);
    if (p.startsWith('+')) return p.slice(1);
    return p;
  };

  const promptPasskey = (action: (passkey: string) => Promise<void>) => {
    setPendingAction(() => action);
    setPasskeyError(null);
    setPasskeyVisible(true);
  };

  const handlePasskeyConfirm = async (passkey: string) => {
    if (!pendingAction) return;
    setLoading(true);
    setPasskeyError(null);
    try {
      await pendingAction(passkey);
      setPasskeyVisible(false);
    } catch (e: any) {
      const msg = e?.response?.data?.error || 'Invalid passkey or request failed.';
      setPasskeyError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSTK = () => {
    if (!stk.phone || !stk.amount) { Alert.alert('Missing Fields', 'Phone number and amount are required.'); return; }
    promptPasskey(async (passkey) => {
      const res = await stkPush({ 
        phone_number: formatPhone(stk.phone), 
        amount: stk.amount, 
        account_reference: stk.reference, 
        transaction_desc: stk.description, 
        passkey 
      });
      setResult({ tab: 'STK', data: res });
      Alert.alert('✅ STK Push Sent', 'Check phone for payment prompt.');
    });
  };

  const handleB2C = () => {
    if (!b2c.phone || !b2c.amount) { Alert.alert('Missing Fields', 'Phone number and amount are required.'); return; }
    promptPasskey(async (passkey) => {
      const res = await b2cPayment({ 
        phone_number: formatPhone(b2c.phone), 
        amount: b2c.amount, 
        command_id: 'BusinessPayment',
        remarks: b2c.remarks, 
        admin_passkey: passkey 
      });
      setResult({ tab: 'B2C', data: res });
      Alert.alert('✅ B2C Initiated', 'Payment request sent successfully.');
    });
  };

  const handleB2B = () => {
    if (!b2b.shortcode || !b2b.amount) { Alert.alert('Missing Fields', 'Receiver Shortcode/Till and amount are required.'); return; }
    if (b2bType === 'PAYBILL' && !b2b.accountRef) { Alert.alert('Missing Field', 'Account Reference is required for Paybill payments.'); return; }

    promptPasskey(async (passkey) => {
      const commandId = b2bType === 'PAYBILL' ? 'BusinessPayBill' : 'BusinessBuyGoods';
      const res = await b2bPayment({ 
        party_b: b2b.shortcode, 
        amount: b2b.amount, 
        command_id: commandId,
        account_reference: b2bType === 'PAYBILL' ? b2b.accountRef : 'BuyGoodsTransfer',
        remarks: b2b.remarks, 
        admin_passkey: passkey 
      });
      setResult({ tab: 'B2B', data: res });
      Alert.alert(`✅ B2B Transaction Processed`, 'Transfer complete.');
    });
  };

  const handleReversal = () => {
    if (!rev.transaction_id || !rev.amount) { Alert.alert('Missing Fields', 'Transaction ID and amount are required.'); return; }
    promptPasskey(async (passkey) => {
      const res = await reverseTransaction({ 
        transaction_id: rev.transaction_id, 
        amount: rev.amount, 
        remarks: rev.remarks, 
        admin_passkey: passkey,
        receiver_identifier_type: '11' 
      });
      setResult({ tab: 'REVERSAL', data: res });
      Alert.alert('✅ Reversal Initiated', 'Transaction reversal request sent.');
    });
  };

  const handleStatus = () => {
    if (!stat.transaction_id) { Alert.alert('Missing Field', 'Transaction ID is required.'); return; }
    promptPasskey(async (passkey) => {
      const res = await checkTransactionStatus({ 
        transaction_id: stat.transaction_id, 
        admin_passkey: passkey 
      });
      setResult({ tab: 'STATUS', data: res });
    });
  };

  const currentTab = TABS.find((t) => t.key === tab)!;

  return (
    <View style={styles.screen}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>M-Pesa</Text>
        <Text style={styles.headerSub}>Daraja API Transactions</Text>
      </View>

      {/* ── Tab Bar ── */}
      <View style={styles.tabScrollContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, tab === t.key && [styles.tabBtnActive, { borderColor: t.color }]]}
              onPress={() => { setTab(t.key); setResult(null); }}
            >
              <Ionicons name={t.icon as any} size={16} color={tab === t.key ? t.color : COLORS.textMuted} />
              <Text style={[styles.tabLabel, tab === t.key && { color: t.color }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ClientSelectModal 
        visible={clientSelectVisible} 
        clients={clients} 
        onSelect={handleClientSelect} 
        onClose={() => setClientSelectVisible(false)} 
      />

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

        {activeClient ? (
          <View style={styles.contextHeaderBadge}>
            <View style={styles.contextHeaderLeft}>
              <View style={styles.contextAvatarContainer}>
                <Text style={styles.contextAvatarText}>{activeClient.name[0].toUpperCase()}</Text>
              </View>
              <View>
                <Text style={styles.contextProfileTitle}>Linked Client: {activeClient.name}</Text>
                <Text style={styles.contextProfileSub}>Auto-populating known credentials securely</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.contextClearBtn} onPress={handleClearClientContext}>
              <Ionicons name="close-circle" size={20} color="#dc2626" />
              <Text style={styles.contextClearText}>Unlink</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.unlinkedSelectButton} onPress={() => setClientSelectVisible(true)}>
            <Ionicons name="people-outline" size={16} color={COLORS.primary} />
            <Text style={styles.linkClientText}>Select a client for the transaction</Text>
          </TouchableOpacity>
        )}

        {/* ── Tab indicator ── */}
        <View style={[styles.tabIndicator, { backgroundColor: currentTab.color + '12' }]}>
          <View style={[styles.tabIndicatorIcon, { backgroundColor: currentTab.color + '20' }]}>
            <Ionicons name={currentTab.icon as any} size={18} color={currentTab.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.tabIndicatorTitle, { color: currentTab.color }]}>{currentTab.label}</Text>
            <Text style={styles.tabIndicatorSub}>
              {tab === 'STK'      && 'Send M-Pesa prompt to customer phone'}
              {tab === 'B2C'      && 'Send money from business to phone number'}
              {tab === 'B2B'      && 'Transfer funds directly to another Business Paybill or Till'}
              {tab === 'REVERSAL' && 'Reverse a completed M-Pesa transaction'}
              {tab === 'STATUS'   && 'Check the status of a transaction'}
            </Text>
          </View>
        </View>

        {/* ── STK Push ── */}
        {tab === 'STK' && (
          <View style={styles.card}>
            <InputField label="Phone Number *"     value={stk.phone}       onChange={(v: string) => setStk({...stk, phone: v})}       placeholder="e.g. 0712345678"    keyboard="phone-pad" disabled={loading} />
            <InputField label="Amount (KES) *"     value={stk.amount}      onChange={(v: string) => setStk({...stk, amount: v})}      placeholder="e.g. 500"           keyboard="numeric" disabled={loading} />
            <InputField label="Account Reference"  value={stk.reference}   onChange={(v: string) => setStk({...stk, reference: v})}   placeholder="e.g. Invoice #001" disabled={loading} />
            <InputField label="Description"        value={stk.description} onChange={(v: string) => setStk({...stk, description: v})} placeholder="e.g. Payment for services" disabled={loading} />
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: COLORS.primary }]} onPress={handleSTK} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <><Ionicons name="phone-portrait-outline" size={18} color="#fff" /><Text style={styles.submitBtnText}>Send STK Push</Text></>}
            </TouchableOpacity>
          </View>
        )}

        {/* ── B2C ── */}
        {tab === 'B2C' && (
          <View style={styles.card}>
            <InputField label="Phone Number *" value={b2c.phone}   onChange={(v: string) => setB2c({...b2c, phone: v})}   placeholder="e.g. 0712345678" keyboard="phone-pad" disabled={loading} />
            <InputField label="Amount (KES) *" value={b2c.amount}  onChange={(v: string) => setB2c({...b2c, amount: v})}  placeholder="e.g. 1000"        keyboard="numeric" disabled={loading} />
            <InputField label="Remarks"        value={b2c.remarks} onChange={(v: string) => setB2c({...b2c, remarks: v})} placeholder="e.g. Salary payment" disabled={loading} />
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#7C3AED' }]} onPress={handleB2C} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <><Ionicons name="arrow-up-outline" size={18} color="#fff" /><Text style={styles.submitBtnText}>Send B2C Payment</Text></>}
            </TouchableOpacity>
          </View>
        )}

        {/* ── B2B ── */}
        {tab === 'B2B' && (
          <View style={styles.card}>
            <View style={styles.b2bToggleContainer}>
              <TouchableOpacity 
                style={[styles.b2bToggleBtn, b2bType === 'PAYBILL' && styles.b2bToggleBtnActive]} 
                onPress={() => setB2bType('PAYBILL')}
              >
                <Ionicons name="receipt-outline" size={14} color={b2bType === 'PAYBILL' ? '#fff' : COLORS.textMuted} />
                <Text style={[styles.b2bToggleLabel, b2bType === 'PAYBILL' && { color: '#fff' }]}>Paybill</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.b2bToggleBtn, b2bType === 'BUYGOODS' && styles.b2bToggleBtnActive]} 
                onPress={() => setB2bType('BUYGOODS')}
              >
                <Ionicons name="cart-outline" size={14} color={b2bType === 'BUYGOODS' ? '#fff' : COLORS.textMuted} />
                <Text style={[styles.b2bToggleLabel, b2bType === 'BUYGOODS' && { color: '#fff' }]}>Buy Goods (Till)</Text>
              </TouchableOpacity>
            </View>

            <InputField 
              label={b2bType === 'PAYBILL' ? "Business Paybill Number *" : "Merchant Till Number *"} 
              value={b2b.shortcode} 
              onChange={(v: string) => setB2b({...b2b, shortcode: v})} 
              placeholder={b2bType === 'PAYBILL' ? "e.g. 222222" : "e.g. 1234567"} 
              keyboard="numeric" 
              disabled={loading}
            />
            
            <InputField label="Amount (KES) *" value={b2b.amount} onChange={(v: string) => setB2b({...b2b, amount: v})} placeholder="e.g. 5000" keyboard="numeric" disabled={loading} />
            
            {b2bType === 'PAYBILL' && (
              <InputField 
                label="Account Number / Reference *" 
                value={b2b.accountRef} 
                onChange={(v: string) => setB2b({...b2b, accountRef: v})} 
                placeholder="e.g. CR-99214" 
                disabled={loading}
              />
            )}

            <InputField label="Remarks" value={b2b.remarks} onChange={(v: string) => setB2b({...b2b, remarks: v})} placeholder="e.g. Stock purchase" disabled={loading} />
            
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#0EA5E9' }]} onPress={handleB2B} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <><Ionicons name="business-outline" size={18} color="#fff" /><Text style={styles.submitBtnText}>Send B2B Transfer</Text></>}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Reversal ── */}
        {tab === 'REVERSAL' && (
          <View style={styles.card}>
            <View style={styles.warningBox}>
              <Ionicons name="warning-outline" size={16} color="#D97706" />
              <Text style={styles.warningText}>Reversal requests are final and cannot be undone once processed by Safaricom.</Text>
            </View>
            <InputField label="M-Pesa Transaction ID *" value={rev.transaction_id} onChange={(v: string) => setRev({...rev, transaction_id: v})} placeholder="e.g. QBC12345KL" disabled={loading} />
            <InputField label="Amount (KES) *"          value={rev.amount}         onChange={(v: string) => setRev({...rev, amount: v})}         placeholder="e.g. 1000"        keyboard="numeric" disabled={loading} />
            <InputField label="Remarks"                 value={rev.remarks}         onChange={(v: string) => setRev({...rev, remarks: v})}         placeholder="e.g. Wrong recipient" disabled={loading} />
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#D97706' }]} onPress={handleReversal} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <><Ionicons name="refresh-outline" size={18} color="#fff" /><Text style={styles.submitBtnText}>Request Reversal</Text></>}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Status ── */}
        {tab === 'STATUS' && (
          <View style={styles.card}>
            <InputField label="M-Pesa Transaction ID *" value={stat.transaction_id} onChange={(v: string) => setStat({...stat, transaction_id: v})} placeholder="e.g. QBC12345KL" disabled={loading} />
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#059669' }]} onPress={handleStatus} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <><Ionicons name="search-outline" size={18} color="#fff" /><Text style={styles.submitBtnText}>Check Status</Text></>}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Result Logs ── */}
        {result && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.primary} />
              <Text style={styles.resultTitle}>Response</Text>
              <TouchableOpacity onPress={() => setResult(null)} style={{ marginLeft: 'auto' }}>
                <Ionicons name="close" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Text style={styles.resultJson}>{JSON.stringify(result.data, null, 2)}</Text>
            </ScrollView>
          </View>
        )}

        {/* ── Dynamic Integrated Environment Status Card ── */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Environment Management</Text>
          {isProduction ? (
            <View style={styles.infoEnvBadgeProd}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#065f46" />
              <Text style={styles.infoEnvTextProd}>Production Live Mode — Real-time money transactions active</Text>
            </View>
          ) : (
            <View style={styles.infoEnvBadge}>
              <Ionicons name="flask-outline" size={14} color="#D97706" />
              <Text style={styles.infoEnvText}>Sandbox Mode Active — No real money is moved</Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <PasskeyModal
        visible={passkeyVisible}
        onConfirm={handlePasskeyConfirm}
        onCancel={() => { setPasskeyVisible(false); setPasskeyError(null); }}
        isLoading={loading}
        error={passkeyError}
        title="Confirm Transaction"
        subtitle="Enter your passkey to authorise this M-Pesa transaction."
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.secondary,
    paddingTop: Platform.OS === 'web' ? 20 : 50,
    paddingBottom: 20, paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  tabScrollContainer: { maxHeight: 52, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabScroll:   { flex: 1 },
  tabContent:  { paddingHorizontal: 16, gap: 8, paddingVertical: 8, alignItems: 'center' },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  tabBtnActive: { backgroundColor: '#fff' },
  tabLabel:     { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  body:         { flex: 1, padding: 16 },
  
  contextHeaderBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0',
    padding: 12, borderRadius: 12, marginBottom: 14,
  },
  contextHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  contextAvatarContainer: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },
  contextAvatarText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  contextProfileTitle: { fontSize: 13, fontWeight: '700', color: '#065f46' },
  contextProfileSub: { fontSize: 11, color: '#047857', marginTop: 1 },
  contextClearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 8 },
  contextClearText: { fontSize: 12, fontWeight: '700', color: '#b91c1c' },
  unlinkedSelectButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: COLORS.primary,
    padding: 14, borderRadius: 12, marginBottom: 14, backgroundColor: '#fff'
  },
  linkClientText: {
    color: COLORS.primary, fontSize: 14, fontWeight: '700'
  },

  tabIndicator: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, marginBottom: 16 },
  tabIndicatorIcon:  { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tabIndicatorTitle: { fontSize: 15, fontWeight: '800' },
  tabIndicatorSub:   { fontSize: 12, color: COLORS.textMuted, marginTop: 2, lineHeight: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  b2bToggleContainer: { flexDirection: 'row', backgroundColor: COLORS.background, borderRadius: 10, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  b2bToggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 8 },
  b2bToggleBtnActive: { backgroundColor: '#0EA5E9' },
  b2bToggleLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  fieldGroup:  { marginBottom: 14 },
  fieldLabel:  { fontSize: 12, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  fieldInput: {
    backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: COLORS.text,
  },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 15, marginTop: 4 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  warningBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12, marginBottom: 16 },
  warningText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 18 },
  resultCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: COLORS.primary },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  resultTitle:  { fontSize: 14, fontWeight: '700', color: COLORS.text },
  resultJson: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 11, color: COLORS.secondary, backgroundColor: COLORS.background, padding: 12, borderRadius: 8 },
  
  infoCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  infoTitle:     { fontSize: 13, fontWeight: '700', color: COLORS.secondary, marginBottom: 10 },
  infoEnvBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', borderRadius: 8, padding: 10, marginBottom: 8 },
  infoEnvText:  { fontSize: 12, color: '#D97706', fontWeight: '600' },
  infoEnvBadgeProd: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: '#d1fae5', 
    borderRadius: 8, 
    padding: 10, 
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0'
  },
  infoEnvTextProd: { 
    fontSize: 12, 
    color: '#065f46', 
    fontWeight: '700' 
  },
});

export default MpesaScreen;