// frontend/src/components/ClientSelectModal.tsx
import React, { useState, useMemo } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../styles/colors';
import { Client } from '../api/clients';



interface Props {
  visible: boolean;
  clients: Client[];
  onSelect: (client: Client) => void;
  onClose: () => void;
}

type FilterType = 'all' | 'phone' | 'till' | 'paybill';

const FILTERS: { key: FilterType; label: string; icon: string }[] = [
  { key: 'all',     label: 'All',     icon: 'people-outline'     },
  { key: 'phone',   label: 'Phone',   icon: 'call-outline'       },
  { key: 'till',    label: 'Till',    icon: 'storefront-outline' },
  { key: 'paybill', label: 'Paybill', icon: 'business-outline'   },
];

const avatarColors = ['#1A237E', '#7C3AED', '#0EA5E9', '#059669', '#D97706', '#DC2626'];
const getAvatarColor = (name: string) =>
  avatarColors[name.charCodeAt(0) % avatarColors.length];

const ClientSelectModal: React.FC<Props> = ({ visible, clients, onSelect, onClose }) => {
  const [search, setSearch]           = useState('');
  const [filter, setFilter]           = useState<FilterType>('all');
  const [highlighted, setHighlighted] = useState<number | null>(null);

  const filtered = useMemo(() => {
    let list = [...clients];
    if (filter === 'phone')   list = list.filter((c) => !!c.phone_number);
    if (filter === 'till')    list = list.filter((c) => !!c.till_number);
    if (filter === 'paybill') list = list.filter((c) => !!c.paybill_number);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone_number?.includes(q) ||
        c.till_number?.includes(q) ||
        c.paybill_number?.includes(q)
      );
    }
    return list;
  }, [clients, filter, search]);

  const handleSelect = (client: Client) => {
    setHighlighted(client.id);
    setTimeout(() => {
      setHighlighted(null);
      setSearch('');
      setFilter('all');
      onSelect(client);
    }, 150);
  };

  const handleClose = () => {
    setSearch('');
    setFilter('all');
    onClose();
  };

  const ClientTag = ({ icon, value, color }: { icon: string; value: string; color: string }) => (
    <View style={[styles.tag, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon as any} size={10} color={color} />
      <Text style={[styles.tagText, { color }]}>{value}</Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        {/* Dismiss area */}
        <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={handleClose} />

        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconBox}>
                <Ionicons name="people" size={20} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Select Client</Text>
                <Text style={styles.headerSub}>{clients.length} clients in directory</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <Ionicons name="close" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchWrapper}>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search by name, phone, till or paybill..."
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

          {/* Filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContent}
          >
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
                onPress={() => setFilter(f.key)}
              >
                <Ionicons
                  name={f.icon as any}
                  size={13}
                  color={filter === f.key ? COLORS.primary : COLORS.textMuted}
                />
                <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                  {f.label}
                </Text>
                {filter === f.key && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{filtered.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Client list */}
          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {filtered.length === 0 ? (
              <View style={styles.emptyBox}>
                <View style={styles.emptyIconBox}>
                  <Ionicons name="people-outline" size={36} color={COLORS.border} />
                </View>
                <Text style={styles.emptyTitle}>
                  {search ? 'No clients found' : 'No clients in this category'}
                </Text>
                <Text style={styles.emptySub}>
                  {search
                    ? `No results for "${search}"`
                    : 'Try a different filter or add clients first.'}
                </Text>
              </View>
            ) : (
              filtered.map((client) => {
                const isHighlighted = highlighted === client.id;
                const color = getAvatarColor(client.name);
                const hasTags = client.phone_number || client.till_number || client.paybill_number;

                return (
                  <TouchableOpacity
                    key={client.id}
                    style={[styles.clientRow, isHighlighted && styles.clientRowActive]}
                    onPress={() => handleSelect(client)}
                    activeOpacity={0.75}
                  >
                    {/* Avatar */}
                    <View style={[styles.avatar, { backgroundColor: color }]}>
                      <Text style={styles.avatarText}>{client.name[0].toUpperCase()}</Text>
                    </View>

                    {/* Info */}
                    <View style={styles.clientInfo}>
                      <Text style={styles.clientName}>{client.name}</Text>

                      {hasTags && (
                        <View style={styles.tagsRow}>
                          {client.phone_number && (
                            <ClientTag icon="call-outline" value={client.phone_number} color={COLORS.primary} />
                          )}
                          {client.till_number && (
                            <ClientTag icon="storefront-outline" value={`Till: ${client.till_number}`} color="#7C3AED" />
                          )}
                          {client.paybill_number && (
                            <ClientTag icon="business-outline" value={`Paybill: ${client.paybill_number}`} color="#0EA5E9" />
                          )}
                        </View>
                      )}

                      {client.notes && (
                        <Text style={styles.clientNotes} numberOfLines={1}>{client.notes}</Text>
                      )}
                    </View>

                    {/* Chevron */}
                    <View style={[styles.chevronBox, isHighlighted && { backgroundColor: COLORS.primary }]}>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={isHighlighted ? '#fff' : COLORS.textMuted}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}

            <View style={{ height: 32 }} />
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.52)',
    justifyContent: 'flex-end',
  },
  dismissArea: { flex: 1 },

  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 20,
  },

  handle: {
    width: 44, height: 5, borderRadius: 3,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginTop: 12, marginBottom: 4,
  },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconBox: {
    width: 42, height: 42, borderRadius: 13,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  headerSub:   { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },

  // Search
  searchWrapper: { paddingHorizontal: 16, paddingBottom: 10 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },

  // Filters
  filterScroll:  { maxHeight: 42 },
  filterContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  filterChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  filterText:       { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  filterTextActive: { color: COLORS.primary },
  filterBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1,
  },
  filterBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },

  divider: { height: 1, backgroundColor: '#F3F4F6', marginTop: 10, marginBottom: 4 },

  // List
  list: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },

  // Client row
  clientRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  clientRowActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '06',
  },

  // Avatar
  avatar: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#fff' },

  // Info
  clientInfo:  { flex: 1 },
  clientName:  { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 5 },
  tagsRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7,
  },
  tagText:     { fontSize: 10, fontWeight: '600' },
  clientNotes: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },

  // Chevron
  chevronBox: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 8,
  },

  // Empty
  emptyBox:    { alignItems: 'center', paddingVertical: 48 },
  emptyIconBox: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  emptyTitle:  { fontSize: 15, fontWeight: '700', color: COLORS.textMuted },
  emptySub:    { fontSize: 12, color: COLORS.textMuted, marginTop: 5, textAlign: 'center' },

  // Footer
  footer: {
    paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  cancelBtn: {
    backgroundColor: '#F3F4F6', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.textMuted },
});

export default ClientSelectModal;