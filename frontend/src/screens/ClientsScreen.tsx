// frontend/src/screens/ClientsScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, RefreshControl,
  Platform, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getClients, createClient, deleteClient, updateClient, Client, CreateClientPayload } from '../api/clients'; 
import { COLORS } from '../styles/colors';

const EMPTY_FORM: CreateClientPayload = {
  name: '', 
  phone_number: '', 
  till_number: '',
  paybill_number: '', 
  account_number: '', 
  notes: '',
  client_type: 'PHONE', 
};

type FilterType = 'all' | 'phone' | 'till' | 'paybill';

const ClientsScreen = ({ navigation }: any) => {
  const [clients, setClients]         = useState<Client[]>([]);
  const [filtered, setFiltered]       = useState<Client[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [search, setSearch]           = useState('');
  const [filterType, setFilterType]   = useState<FilterType>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editMode, setEditMode]       = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [form, setForm]               = useState<CreateClientPayload>(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);

  const fetchClients = useCallback(async () => {
    try {
      const data = await getClients();
      const list = Array.isArray(data) ? data : (data as any)?.results || [];
      setClients(list);
      setFiltered(list);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchClients(); }, []);

  useEffect(() => {
    let result = [...clients];
    if (filterType === 'phone')   result = result.filter((c) => !!c.phone_number);
    if (filterType === 'till')    result = result.filter((c) => !!c.till_number);
    if (filterType === 'paybill') result = result.filter((c) => !!c.paybill_number);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone_number?.includes(q) ||
        c.till_number?.includes(q) ||
        c.paybill_number?.includes(q)
      );
    }
    setFiltered(result);
  }, [search, filterType, clients]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchClients();
    setRefreshing(false);
  };

  const openAddModal = () => {
    setEditMode(false);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEditModal = (client: Client) => {
    setEditMode(true);
    setSelectedClient(client);
    setForm({
      name:           client.name           || '',
      phone_number:   client.phone_number   || '',
      till_number:    client.till_number    || '',
      paybill_number: client.paybill_number || '',
      account_number: client.account_number || '',
      notes:          client.notes          || '',
      client_type:    client.client_type    || 'PHONE',
    });
    setDetailVisible(false);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { 
      Alert.alert('Error', 'Client name is required.'); 
      return; 
    }
    setSaving(true);

    let inferredType: 'PHONE' | 'TILL' | 'PAYBILL' = 'PHONE';
    if (form.paybill_number?.trim()) {
      inferredType = 'PAYBILL';
    } else if (form.till_number?.trim()) {
      inferredType = 'TILL';
    }

    const payload: CreateClientPayload = {
      name: form.name.trim(),
      client_type: inferredType,
      phone_number: form.phone_number?.trim() || undefined,
      till_number: form.till_number?.trim() || undefined,
      paybill_number: form.paybill_number?.trim() || undefined,
      account_number: form.account_number?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
    };

    try {
      if (editMode && selectedClient) {
        const updated = await updateClient(selectedClient.id, payload);
        setClients((prev) => prev.map((c) => (c.id === selectedClient.id ? updated : c)));
        Alert.alert('✅ Updated', 'Client updated successfully.');
      } else {
        const newClient = await createClient(payload);
        setClients((prev) => [newClient, ...prev]);
        Alert.alert('✅ Added', 'Client added successfully.');
      }
      setModalVisible(false);
      setForm(EMPTY_FORM);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Submission Failed', 'Failed to save context configuration details.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (client: Client) => {
    Alert.alert(
      'Delete Client',
      `Are you sure you want to delete "${client.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await deleteClient(client.id, 'passkey'); 
              setClients((prev) => prev.filter((c) => c.id !== client.id));
              setDetailVisible(false);
              Alert.alert('Deleted', 'Client removed successfully.');
            } catch {
              Alert.alert('Error', 'Failed to delete client.');
            }
          },
        },
      ]
    );
  };

  // NEW: Wire-up handler to push existing client profiles into M-Pesa core engine
  const handleInitiateTransaction = (client: Client, targetDefaultTab: 'STK' | 'B2C' | 'B2B') => {
    setDetailVisible(false);
    navigation.navigate('Mpesa', {
      selectedClient: client,
      initialTab: targetDefaultTab
    });
  };

  const openDetail = (client: Client) => {
    setSelectedClient(client);
    setDetailVisible(true);
  };

  const FILTERS: { key: FilterType; label: string; icon: string }[] = [
    { key: 'all',     label: 'All',     icon: 'people-outline'          },
    { key: 'phone',   label: 'Phone',   icon: 'call-outline'             },
    { key: 'till',    label: 'Till',    icon: 'storefront-outline'       },
    { key: 'paybill', label: 'Paybill', icon: 'business-outline'         },
  ];

  const FORM_FIELDS = [
    { key: 'name',           label: 'Full Name *',    placeholder: 'e.g. John Doe',     keyboard: 'default'      },
    { key: 'phone_number',   label: 'Phone Number',   placeholder: 'e.g. 0712345678',     keyboard: 'phone-pad'    },
    { key: 'till_number',    label: 'Till Number',    placeholder: 'e.g. 123456',         keyboard: 'number-pad'   },
    { key: 'paybill_number', label: 'Paybill Number', placeholder: 'e.g. 522522',         keyboard: 'number-pad'   },
    { key: 'account_number', label: 'Account Number', placeholder: 'e.g. Account ref',    keyboard: 'default'      },
    { key: 'notes',          label: 'Notes',          placeholder: 'Optional notes...',  keyboard: 'default'      },
  ];

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading clients...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Clients</Text>
          <Text style={styles.headerSub}>{clients.length} registered clients</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Ionicons name="person-add-outline" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Add Client</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search ── */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, phone, till..."
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Filter Tabs ── */}
      <View style={styles.filterBar}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, filterType === f.key && styles.filterTabActive]}
            onPress={() => setFilterType(f.key)}
          >
            <Ionicons name={f.icon as any} size={14} color={filterType === f.key ? COLORS.primary : COLORS.textMuted} />
            <Text style={[styles.filterLabel, filterType === f.key && styles.filterLabelActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Client List ── */}
      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="people-outline" size={48} color={COLORS.border || '#ccc'} />
            <Text style={styles.emptyText}>
              {search ? 'No clients match your search.' : 'No clients yet.'}
            </Text>
          </View>
        ) : (
          filtered.map((client) => (
            <TouchableOpacity key={client.id} style={styles.clientCard} onPress={() => openDetail(client)} activeOpacity={0.8}>
              <View style={styles.clientAvatar}>
                <Text style={styles.clientAvatarText}>{client.name[0].toUpperCase()}</Text>
              </View>
              <View style={styles.clientInfo}>
                <Text style={styles.clientName}>{client.name}</Text>
                <View style={styles.clientTags}>
                  {client.phone_number && (
                    <View style={styles.tag}>
                      <Ionicons name="call-outline" size={10} color={COLORS.primary} />
                      <Text style={styles.tagText}>{client.phone_number}</Text>
                    </View>
                  )}
                  {client.till_number && (
                    <View style={[styles.tag, { backgroundColor: '#7C3AED15' }]}>
                      <Ionicons name="storefront-outline" size={10} color="#7C3AED" />
                      <Text style={[styles.tagText, { color: '#7C3AED' }]}>{client.till_number}</Text>
                    </View>
                  )}
                  {client.paybill_number && (
                    <View style={[styles.tag, { backgroundColor: '#D9770615' }]}>
                      <Ionicons name="business-outline" size={10} color="#D97706" />
                      <Text style={[styles.tagText, { color: '#D97706' }]}>{client.paybill_number}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.clientActionsRow}>
                <TouchableOpacity 
                  style={styles.payBtnIcon} 
                  onPress={() => {
                    const fallbackTab = client.phone_number ? 'STK' : client.till_number ? 'B2B' : 'B2B';
                    handleInitiateTransaction(client, fallbackTab);
                  }}
                >
                  <Ionicons name="logo-bitcoin" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Add / Edit Modal ── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editMode ? 'Edit Client' : 'Add New Client'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {FORM_FIELDS.map((field) => (
                <View key={field.key} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={(form as any)[field.key]}
                    onChangeText={(v) => setForm({ ...form, [field.key]: v })}
                    placeholder={field.placeholder}
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType={field.keyboard as any}
                    multiline={field.key === 'notes'}
                    numberOfLines={field.key === 'notes' ? 3 : 1}
                  />
                </View>
              ))}
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>{editMode ? 'Save Changes' : 'Add Client'}</Text>}
                </TouchableOpacity>
              </View>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Client Detail Modal ── */}
      <Modal visible={detailVisible} animationType="slide" transparent onRequestClose={() => setDetailVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            {selectedClient && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Client Details</Text>
                  <TouchableOpacity onPress={() => setDetailVisible(false)}>
                    <Ionicons name="close" size={24} color="#000" />
                  </TouchableOpacity>
                </View>

                <View style={styles.detailAvatar}>
                  <Text style={styles.detailAvatarText}>{selectedClient.name[0].toUpperCase()}</Text>
                </View>
                <Text style={styles.detailName}>{selectedClient.name}</Text>

                {/* Quick Transaction Action Drawer Inside Detail View */}
                <Text style={[styles.detailLabel, {textAlign: 'center', marginBottom: 8, textTransform: 'uppercase'}]}>Quick M-Pesa Actions</Text>
                <View style={styles.quickPayContainer}>
                  {selectedClient.phone_number && (
                    <>
                      <TouchableOpacity style={[styles.quickPayActionBtn, {backgroundColor: COLORS.primary}]} onPress={() => handleInitiateTransaction(selectedClient, 'STK')}>
                        <Ionicons name="phone-portrait-outline" size={14} color="#fff" />
                        <Text style={styles.quickPayActionLabel}>STK Push</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.quickPayActionBtn, {backgroundColor: '#7C3AED'}]} onPress={() => handleInitiateTransaction(selectedClient, 'B2C')}>
                        <Ionicons name="arrow-up-outline" size={14} color="#fff" />
                        <Text style={styles.quickPayActionLabel}>B2C Pay</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {(selectedClient.till_number || selectedClient.paybill_number) && (
                    <TouchableOpacity style={[styles.quickPayActionBtn, {backgroundColor: '#0EA5E9', flex: 2}]} onPress={() => handleInitiateTransaction(selectedClient, 'B2B')}>
                      <Ionicons name="business-outline" size={14} color="#fff" />
                      <Text style={styles.quickPayActionLabel}>B2B Merchant Transfer</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.detailGrid}>
                  {[
                    { label: 'Phone',   value: selectedClient.phone_number,   icon: 'call-outline'       },
                    { label: 'Till',    value: selectedClient.till_number,    icon: 'storefront-outline' },
                    { label: 'Paybill', value: selectedClient.paybill_number, icon: 'business-outline'   },
                    { label: 'Account', value: selectedClient.account_number, icon: 'card-outline'       },
                    { label: 'Notes',   value: selectedClient.notes,          icon: 'document-text-outline' },
                  ].filter((r) => r.value).map((row) => (
                    <View key={row.label} style={styles.detailRow}>
                      <View style={styles.detailIcon}>
                        <Ionicons name={row.icon as any} size={16} color={COLORS.secondary} />
                      </View>
                      <View>
                        <Text style={styles.detailLabel}>{row.label}</Text>
                        <Text style={styles.detailValue}>{row.value}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.detailBtns}>
                  <TouchableOpacity style={styles.detailEditBtn} onPress={() => openEditModal(selectedClient)}>
                    <Ionicons name="create-outline" size={16} color="#fff" />
                    <Text style={styles.detailEditText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.detailDeleteBtn} onPress={() => handleDelete(selectedClient)}>
                    <Ionicons name="trash-outline" size={16} color={COLORS.error || '#ef4444'} />
                    <Text style={styles.detailDeleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  searchRow: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.border || '#e5e7eb',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#000' },
  filterBar: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  filterTab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.border || '#e5e7eb',
    backgroundColor: '#fff',
  },
  filterTabActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  filterLabel:      { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  filterLabelActive: { color: COLORS.primary },
  list: { flex: 1, paddingHorizontal: 16 },
  clientCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  clientAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.secondary,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  clientAvatarText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  clientInfo:       { flex: 1 },
  clientName:       { fontSize: 15, fontWeight: '700', color: '#000', marginBottom: 4 },
  clientTags:       { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: COLORS.primary + '12',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
  },
  tagText:      { fontSize: 10, fontWeight: '600', color: COLORS.primary },
  clientActionsRow: { justifyContent: 'center', alignItems: 'center', paddingLeft: 8 },
  payBtnIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center',
  },
  emptyBox:    { alignItems: 'center', paddingVertical: 60 },
  emptyText:   { fontSize: 15, fontWeight: '600', color: COLORS.textMuted, marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '90%',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border || '#e5e7eb', alignSelf: 'center', marginBottom: 16,
  },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle:   { fontSize: 18, fontWeight: '800', color: '#000' },
  fieldGroup:   { marginBottom: 14 },
  fieldLabel:   { fontSize: 12, fontWeight: '600', color: '#000', marginBottom: 6 },
  fieldInput: {
    backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border || '#e5e7eb',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, color: '#000',
  },
  modalBtns:    { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn:    { flex: 1, borderWidth: 1.5, borderColor: COLORS.border || '#e5e7eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText:{ fontWeight: '600', color: COLORS.textMuted },
  saveBtn:      { flex: 1, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
  detailAvatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.secondary,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 10,
    borderWidth: 3, borderColor: COLORS.primary,
  },
  detailAvatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  detailName:  { fontSize: 20, fontWeight: '800', color: '#000', textAlign: 'center', marginBottom: 16 },
  quickPayContainer: { flexDirection: 'row', gap: 8, marginBottom: 20, width: '100%' },
  quickPayActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: 10 },
  quickPayActionLabel: { color: '#fff', fontSize: 11, fontWeight: '700' },
  detailGrid:  { marginBottom: 20 },
  detailRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border || '#e5e7eb',
  },
  detailIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: COLORS.secondary + '12',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  detailLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#000', marginTop: 1 },
  detailBtns:  { flexDirection: 'row', gap: 12 },
  detailEditBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14,
  },
  detailEditText:   { color: '#fff', fontWeight: '700', fontSize: 14 },
  detailDeleteBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14,
    borderWidth: 1.5, borderColor: (COLORS.error || '#ef4444') + '40',
  },
  detailDeleteText: { color: COLORS.error || '#ef4444', fontWeight: '700', fontSize: 14 },
});

export default ClientsScreen;