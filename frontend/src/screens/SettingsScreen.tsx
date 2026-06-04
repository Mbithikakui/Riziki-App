// frontend/src/screens/SettingsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Platform, Modal, KeyboardTypeOptions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

// Standard profile and password API locations
import { 
  getProfile, updateProfile, changePassword 
} from '../api/auth';

// Correct path location context for passkey operations
import { 
  changePasskey, regeneratePasskey 
} from '../api/auth_passkey';

import { COLORS } from '../styles/colors';

type Section = 'profile' | 'security' | 'mpesa' | 'about';

interface SectionCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (text: string) => void;
  secure?: boolean;
  showToggle?: boolean;
  toggleKey?: string;
  keyboardType?: KeyboardTypeOptions;
  editable?: boolean;
  placeholder?: string;
  onTogglePress?: (key: string) => void;
  isPasswordVisible?: boolean;
}

// ── EXTRACTED OUTSIDE COMPONENTS TO PREVENT FOCUS LOSS BUG ──

const SectionCard = ({ title, subtitle, children }: SectionCardProps) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>{title}</Text>
    {subtitle && <Text style={styles.cardSub}>{subtitle}</Text>}
    {children}
  </View>
);

const InputField = ({
  label, value, onChange, secure = false, showToggle = false,
  toggleKey = '', keyboardType = 'default', editable = true, placeholder = '',
  onTogglePress, isPasswordVisible
}: InputFieldProps) => (
  <View style={styles.fieldGroup}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.inputRow}>
      <TextInput
        style={[styles.input, !editable && styles.inputDisabled]}
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        editable={editable}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        autoCapitalize="none"
        blurOnSubmit={false}
      />
      {showToggle && onTogglePress && (
        <TouchableOpacity
          style={styles.eyeBtn}
          onPress={() => onTogglePress(toggleKey)}
        >
          <Ionicons
            name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
            size={18}
            color={COLORS.textMuted}
          />
        </TouchableOpacity>
      )}
    </View>
  </View>
);

// ────────────────────────────────────────────────────────────

const SettingsScreen = () => {
  const { logout, user } = useAuth();

  const [activeSection, setActiveSection] = useState<Section>('profile');
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile data state
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    full_name: '',
  });

  // Security password change state
  const [passwords, setPasswords] = useState({
    old_password: '', new_password: '', confirm_password: '',
  });
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({
    old: false, new: false, confirm: false,
  });

  // Security passkey change form state
  const [passkeyForm, setPasskeyForm] = useState({
    current_passkey: '', new_passkey: '', confirm_passkey: '',
  });
  const [showPasskeys, setShowPasskeys] = useState<Record<string, boolean>>({
    current: false, new: false, confirm: false,
  });

  // Regenerate passkey modal display state
  const [regenPassword, setRegenPassword]   = useState('');
  const [regenVisible, setRegenVisible]     = useState(false);
  const [regenResult, setRegenResult]       = useState<string | null>(null);
  const [regenRevealed, setRegenRevealed]   = useState(false);

  // Production Enforcement Environment Block Flag
  const mpesaEnv = 'production';

  useEffect(() => {
    getProfile()
      .then((data) => setProfile({
        username:  data.username  || '',
        email:     data.email     || '',
        full_name: data.full_name || '',
      }))
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, []);

  const handleUpdateProfile = async () => {
    setSaving(true);
    try {
      await updateProfile({ email: profile.email, full_name: profile.full_name });
      Alert.alert('✅ Success', 'Profile updated successfully.');
    } catch {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwords.old_password || !passwords.new_password || !passwords.confirm_password) {
      Alert.alert('Error', 'All password fields are required.'); return;
    }
    if (passwords.new_password !== passwords.confirm_password) {
      Alert.alert('Error', 'New passwords do not match.'); return;
    }
    if (passwords.new_password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters.'); return;
    }
    setSaving(true);
    try {
      await changePassword(
        passwords.old_password,
        passwords.new_password,
        passwords.confirm_password,
      );
      setPasswords({ old_password: '', new_password: '', confirm_password: '' });
      Alert.alert('✅ Success', 'Password changed successfully.');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePasskey = async () => {
    if (!passkeyForm.current_passkey || !passkeyForm.new_passkey || !passkeyForm.confirm_passkey) {
      Alert.alert('Error', 'All passkey fields are required.'); return;
    }
    if (passkeyForm.new_passkey !== passkeyForm.confirm_passkey) {
      Alert.alert('Error', 'New passkeys do not match.'); return;
    }
    if (!passkeyForm.new_passkey.match(/^\d{4,10}$/)) {
      Alert.alert('Error', 'Passkey must be 4–10 digits only.'); return;
    }
    setSaving(true);
    try {
      await changePasskey(
        passkeyForm.current_passkey,
        passkeyForm.new_passkey,
        passkeyForm.confirm_passkey
      );
      setPasskeyForm({ current_passkey: '', new_passkey: '', confirm_passkey: '' });
      Alert.alert('✅ Success', 'Transaction passkey updated successfully.');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to update passkey.');
    } finally {
      setSaving(false);
    }
  };

  const handleRegeneratePasskey = async () => {
    if (!regenPassword) { Alert.alert('Error', 'Password confirmation is required.'); return; }
    setSaving(true);
    try {
      const result = await regeneratePasskey(regenPassword);
      setRegenResult(result.transaction_passkey);
      setRegenPassword('');
      setRegenRevealed(false);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to regenerate passkey.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVisibility = (key: string) => {
    if (key in showPasswords) {
      setShowPasswords((p) => ({ ...p, [key]: !p[key] }));
    } else {
      setShowPasskeys((p) => ({ ...p, [key]: !p[key] }));
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to sign out of Riziki Admin?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  const TABS: { key: Section; label: string; icon: string }[] = [
    { key: 'profile',  label: 'Profile',  icon: 'person-outline'           },
    { key: 'security', label: 'Security', icon: 'shield-checkmark-outline'  },
    { key: 'mpesa',    label: 'M-Pesa',   icon: 'phone-portrait-outline'    },
    { key: 'about',    label: 'About',    icon: 'information-circle-outline' },
  ];

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSub}>@{user?.username || 'Admin'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeSection === tab.key && styles.tabActive]}
            onPress={() => setActiveSection(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={18}
              color={activeSection === tab.key ? COLORS.primary : COLORS.textMuted}
            />
            <Text style={[styles.tabLabel, activeSection === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

        {/* ── Profile Section ── */}
        {activeSection === 'profile' && (
          <>
            <View style={styles.avatarSection}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(user?.username?.[0] || 'A').toUpperCase()}
                </Text>
              </View>
              <Text style={styles.avatarName}>{user?.full_name || user?.username || 'Admin'}</Text>
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={12} color={COLORS.primary} />
                <Text style={styles.adminBadgeText}>Administrator</Text>
              </View>
            </View>

            <SectionCard title="Personal Information">
              {profileLoading ? (
                <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
              ) : (
                <>
                  <InputField
                    label="Username"
                    value={profile.username}
                    onChange={() => {}}
                    editable={false}
                    placeholder="Username"
                  />
                  <InputField
                    label="Full Name"
                    value={profile.full_name}
                    onChange={(v: string) => setProfile({ ...profile, full_name: v })}
                    placeholder="Enter full name"
                  />
                  <InputField
                    label="Email Address"
                    value={profile.email}
                    onChange={(v: string) => setProfile({ ...profile, email: v })}
                    keyboardType="email-address"
                    placeholder="Enter email"
                  />
                  <TouchableOpacity style={styles.primaryBtn} onPress={handleUpdateProfile} disabled={saving}>
                    {saving
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.primaryBtnText}>Save Changes</Text>}
                  </TouchableOpacity>
                </>
              )}
            </SectionCard>
          </>
        )}

        {/* ── Security Section ── */}
        {activeSection === 'security' && (
          <>
            <SectionCard title="Change Password">
              <InputField label="Current Password" value={passwords.old_password}
                onChange={(v: string) => setPasswords({ ...passwords, old_password: v })}
                secure={!showPasswords.old} showToggle toggleKey="old"
                onTogglePress={handleToggleVisibility} isPasswordVisible={showPasswords.old}
                placeholder="Enter current password" />
              
              <InputField label="New Password" value={passwords.new_password}
                onChange={(v: string) => setPasswords({ ...passwords, new_password: v })}
                secure={!showPasswords.new} showToggle toggleKey="new"
                onTogglePress={handleToggleVisibility} isPasswordVisible={showPasswords.new}
                placeholder="Min. 8 characters" />
              
              <InputField label="Confirm New Password" value={passwords.confirm_password}
                onChange={(v: string) => setPasswords({ ...passwords, confirm_password: v })}
                secure={!showPasswords.confirm} showToggle toggleKey="confirm"
                onTogglePress={handleToggleVisibility} isPasswordVisible={showPasswords.confirm}
                placeholder="Repeat new password" />

              <TouchableOpacity style={styles.primaryBtn} onPress={handleChangePassword} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryBtnText}>Update Password</Text>}
              </TouchableOpacity>
            </SectionCard>

            <SectionCard title="Change Transaction Passkey" subtitle="Your security passkey is required to authorize every M-Pesa transaction operation context.">
              <InputField label="Current Passkey" value={passkeyForm.current_passkey}
                onChange={(v: string) => setPasskeyForm({ ...passkeyForm, current_passkey: v })}
                secure={!showPasskeys.current} showToggle toggleKey="current"
                onTogglePress={handleToggleVisibility} isPasswordVisible={showPasskeys.current}
                keyboardType="number-pad" placeholder="Enter current passkey" />
              
              <InputField label="New Passkey" value={passkeyForm.new_passkey}
                onChange={(v: string) => setPasskeyForm({ ...passkeyForm, new_passkey: v })}
                secure={!showPasskeys.new} showToggle toggleKey="new"
                onTogglePress={handleToggleVisibility} isPasswordVisible={showPasskeys.new}
                keyboardType="number-pad" placeholder="4–10 digits" />
              
              <InputField label="Confirm New Passkey" value={passkeyForm.confirm_passkey}
                onChange={(v: string) => setPasskeyForm({ ...passkeyForm, confirm_passkey: v })}
                secure={!showPasskeys.confirm} showToggle toggleKey="confirm"
                onTogglePress={handleToggleVisibility} isPasswordVisible={showPasskeys.confirm}
                keyboardType="number-pad" placeholder="Repeat new passkey" />

              <TouchableOpacity style={styles.primaryBtn} onPress={handleChangePasskey} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryBtnText}>Update Passkey</Text>}
              </TouchableOpacity>
            </SectionCard>

            <SectionCard title="Regenerate Passkey" subtitle="Lost your transaction code? Securely reset a brand new randomly assigned security authorization token.">
              <TouchableOpacity 
                style={[styles.primaryBtn, { backgroundColor: COLORS.secondary }]} 
                onPress={() => { setRegenResult(null); setRegenVisible(true); }}
              >
                <Text style={styles.primaryBtnText}>Regenerate New Passkey</Text>
              </TouchableOpacity>
            </SectionCard>
          </>
        )}

        {/* ── M-Pesa Section ── */}
        {activeSection === 'mpesa' && (
          <>
            <SectionCard title="Environment">
              <View style={styles.envRow}>
                <View>
                  <Text style={styles.envLabel}>Transaction Mode</Text>
                  <Text style={styles.envSub}>Operational parameters for financial integrations</Text>
                </View>
              </View>
              <View style={[styles.envBadge, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={14}
                  color="#059669"
                />
                <Text style={[styles.envBadgeText, { color: '#059669' }]}>
                  Production — Live Transactions Active
                </Text>
              </View>
            </SectionCard>

            <SectionCard title="API Configuration">
              {[
                { label: 'Shortcode / Till', value: 'Live Corporate Shortcode',             icon: 'business-outline'    },
                { label: 'Initiator Name',   value: 'Authorized Operator ID',             icon: 'person-outline'      },
                { label: 'Callback URL',     value: 'https://riziki-backend-7of1.onrender.com/api/mpesa/callback/', icon: 'link-outline' },
                { label: 'Consumer Key',     value: '••••••••••••••••••••••••••••••••',   icon: 'key-outline'         },
                { label: 'Consumer Secret',  value: '••••••••••••••••••••••••••••••••',   icon: 'lock-closed-outline' },
              ].map((item) => (
                <View key={item.label} style={styles.configRow}>
                  <View style={styles.configIcon}>
                    <Ionicons name={item.icon as any} size={16} color={COLORS.secondary} />
                  </View>
                  <View style={styles.configInfo}>
                    <Text style={styles.configLabel}>{item.label}</Text>
                    <Text style={styles.configValue}>{item.value}</Text>
                  </View>
                </View>
              ))}
              <View style={styles.infoBox}>
                <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.primary} />
                <Text style={[styles.infoText, { color: COLORS.primary }]}>
                  API infrastructure metrics are managed directly via environment variables inside Render dashboard structures.
                </Text>
              </View>
            </SectionCard>
          </>
        )}

        {/* ── About Section ── */}
        {activeSection === 'about' && (
          <>
            <View style={styles.aboutHeader}>
              <View style={styles.aboutLogo}>
                <Text style={styles.aboutLogoText}>R</Text>
              </View>
              <Text style={styles.aboutAppName}>Riziki Admin</Text>
              <Text style={styles.aboutVersion}>Version 1.0.0</Text>
            </View>

            <SectionCard title="Application Details">
              {[
                { label: 'App Name',       value: 'Riziki Admin'            },
                { label: 'Version',        value: '1.0.0'                   },
                { label: 'Build',          value: 'Production Ready'        },
                { label: 'Platform',       value: Platform.OS === 'web' ? 'Web' : Platform.OS === 'android' ? 'Android' : 'iOS' },
                { label: 'Backend',        value: 'Django REST Framework'   },
                { label: 'Database',       value: 'PostgreSQL'              },
                { label: 'M-Pesa API',     value: 'Daraja 2.0'              },
                { label: 'USD → KES Rate', value: '1 USD = KES 150'        },
              ].map((row) => (
                <View key={row.label} style={styles.aboutRow}>
                  <Text style={styles.aboutLabel}>{row.label}</Text>
                  <Text style={styles.aboutValue}>{row.value}</Text>
                </View>
              ))}
            </SectionCard>

            <TouchableOpacity style={styles.logoutFullBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
              <Text style={styles.logoutFullText}>Sign Out of Riziki Admin</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── REGENERATE PASSKEY INTERACTION DIALOG MODAL ── */}
      <Modal visible={regenVisible} transparent animationType="fade" onRequestClose={() => setRegenVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Regenerate Passkey</Text>
              <TouchableOpacity onPress={() => setRegenVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {!regenResult ? (
              <>
                <Text style={styles.modalDescription}>
                  Please confirm your administrator account password to securely issue a new random transaction passkey token code.
                </Text>
                <TextInput
                  style={styles.input}
                  value={regenPassword}
                  onChangeText={setRegenPassword}
                  secureTextEntry
                  placeholder="Enter admin password"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="none"
                  blurOnSubmit={false}
                />
                <TouchableOpacity 
                  style={[styles.primaryBtn, { marginTop: 16 }]} 
                  onPress={handleRegeneratePasskey} 
                  disabled={saving}
                >
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryBtnText}>Confirm Password</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.resultContainer}>
                <Text style={styles.modalDescription}>
                  A new passkey has been generated. Ensure you save it securely—it won't be displayed again.
                </Text>
                <View style={styles.passkeyRevealBox}>
                  <Text style={styles.passkeyText}>
                    {regenRevealed ? regenResult : '••••••'}
                  </Text>
                  <TouchableOpacity onPress={() => setRegenRevealed(!regenRevealed)}>
                    <Ionicons name={regenRevealed ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity 
                  style={[styles.primaryBtn, { marginTop: 20, backgroundColor: COLORS.secondary }]} 
                  onPress={() => { setRegenVisible(false); setRegenResult(null); }}
                >
                  <Text style={styles.primaryBtnText}>Done & Saved</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.secondary,
    paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
  },
  logoutText: { fontSize: 13, color: COLORS.error, fontWeight: '600' },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 },
  tabActive:      { borderBottomWidth: 3, borderBottomColor: COLORS.primary },
  tabLabel:       { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  tabLabelActive: { color: COLORS.primary },
  body: { flex: 1, padding: 16 },
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.secondary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12, borderWidth: 3, borderColor: COLORS.primary,
  },
  avatarText:  { fontSize: 32, fontWeight: '800', color: '#fff' },
  avatarName:  { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  adminBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  adminBadgeText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardTitle:     { fontSize: 15, fontWeight: '700', color: COLORS.secondary, marginBottom: 16 },
  cardSub:       { fontSize: 12, color: COLORS.textMuted, marginTop: -12, marginBottom: 16, lineHeight: 18 },
  fieldGroup:    { marginBottom: 14 },
  fieldLabel:    { fontSize: 12, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  inputRow:      { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1, backgroundColor: COLORS.background,
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, color: COLORS.text,
  },
  inputDisabled: { backgroundColor: '#F0F0F0', color: COLORS.textMuted },
  eyeBtn:        { position: 'absolute', right: 12 },
  primaryBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 10, padding: 12, marginTop: 12,
  },
  infoText:  { flex: 1, fontSize: 12, color: COLORS.primary, lineHeight: 18 },
  envRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  envLabel:  { fontSize: 14, fontWeight: '600', color: COLORS.text },
  envSub:    { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  envBadge:  { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, padding: 10 },
  envBadgeText: { fontSize: 12, fontWeight: '600' },
  configRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  configIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: COLORS.secondary + '10',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  configInfo:  { flex: 1 },
  configLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  configValue: { fontSize: 13, color: COLORS.text, fontWeight: '600', marginTop: 1 },
  aboutHeader: { alignItems: 'center', paddingVertical: 28 },
  aboutLogo: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  aboutLogoText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  aboutAppName:  { fontSize: 20, fontWeight: '800', color: COLORS.text },
  aboutVersion:  { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
  aboutRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  aboutLabel: { fontSize: 13, color: COLORS.textMuted },
  aboutValue: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  logoutFullBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: COLORS.error + '40', marginTop: 4,
  },
  logoutFullText: { fontSize: 15, fontWeight: '700', color: COLORS.error },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.secondary },
  modalDescription: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18, marginBottom: 16 },
  resultContainer: { alignItems: 'stretch' },
  passkeyRevealBox: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.primary,
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, marginTop: 6
  },
  passkeyText: { fontSize: 18, fontWeight: '800', color: COLORS.text, letterSpacing: 2 }
});

export default SettingsScreen;