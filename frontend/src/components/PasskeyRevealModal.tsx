// frontend/src/components/PasskeyRevealModal.tsx
import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../styles/colors';

interface Props {
  visible: boolean;
  passkey: string;
  onAcknowledge: () => void;
}

const PasskeyRevealModal: React.FC<Props> = ({ visible, passkey, onAcknowledge }) => {
  const [revealed, setRevealed]   = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleAcknowledge = () => {
    if (!confirmed) {
      Alert.alert(
        'Have you saved your passkey?',
        'This passkey will never be shown again. Make sure you have written it down before continuing.',
        [
          { text: 'Go Back', style: 'cancel' },
          { text: 'Yes, I have saved it', onPress: onAcknowledge },
        ]
      );
      return;
    }
    onAcknowledge();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View style={styles.card}>

          {/* Icon */}
          <View style={styles.iconBox}>
            <Ionicons name="shield-checkmark" size={36} color={COLORS.primary} />
          </View>

          <Text style={styles.title}>Your Transaction Passkey</Text>
          <Text style={styles.subtitle}>
            This passkey is required to authorise every M-Pesa transaction and balance top-up.
            It will only be shown <Text style={styles.bold}>once</Text>.
          </Text>

          {/* Passkey reveal */}
          <View style={styles.passkeyBox}>
            <View style={styles.passkeyRow}>
              {revealed ? (
                passkey.split('').map((digit, i) => (
                  <View key={i} style={styles.digitBox}>
                    <Text style={styles.digit}>{digit}</Text>
                  </View>
                ))
              ) : (
                passkey.split('').map((_, i) => (
                  <View key={i} style={styles.digitBox}>
                    <Text style={styles.digitHidden}>•</Text>
                  </View>
                ))
              )}
            </View>
            <TouchableOpacity
              style={styles.revealBtn}
              onPress={() => setRevealed((v) => !v)}
            >
              <Ionicons
                name={revealed ? 'eye-off-outline' : 'eye-outline'}
                size={16}
                color={COLORS.primary}
              />
              <Text style={styles.revealText}>
                {revealed ? 'Hide passkey' : 'Tap to reveal'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Warning */}
          <View style={styles.warningBox}>
            <Ionicons name="warning-outline" size={16} color="#D97706" />
            <Text style={styles.warningText}>
              Write this down or store it securely. You will need it for every transaction.
              It cannot be recovered if lost — only regenerated from Settings.
            </Text>
          </View>

          {/* Confirm checkbox */}
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setConfirmed((v) => !v)}
          >
            <View style={[styles.checkbox, confirmed && styles.checkboxChecked]}>
              {confirmed && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={styles.checkLabel}>
              I have saved my passkey securely
            </Text>
          </TouchableOpacity>

          {/* CTA */}
          <TouchableOpacity
            style={[styles.btn, !confirmed && styles.btnDisabled]}
            onPress={handleAcknowledge}
            disabled={!confirmed}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
            <Text style={styles.btnText}>Continue to Dashboard</Text>
          </TouchableOpacity>

          <Text style={styles.footer}>
            You can regenerate your passkey anytime in Settings → Security
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  iconBox: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  title:    { fontSize: 20, fontWeight: '800', color: COLORS.text, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  bold:     { fontWeight: '700', color: COLORS.text },

  passkeyBox: {
    width: '100%', backgroundColor: COLORS.secondary + '08',
    borderRadius: 16, padding: 20, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.secondary + '20',
    marginBottom: 16,
  },
  passkeyRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  digitBox: {
    width: 44, height: 52, borderRadius: 12,
    backgroundColor: COLORS.secondary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  digit:       { fontSize: 24, fontWeight: '900', color: COLORS.accent },
  digitHidden: { fontSize: 28, fontWeight: '900', color: 'rgba(255,255,255,0.5)' },
  revealBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  revealText:  { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  warningBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12,
    marginBottom: 20, width: '100%',
  },
  warningText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 18 },

  checkRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', marginBottom: 20 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkLabel:      { flex: 1, fontSize: 13, color: COLORS.text, fontWeight: '500' },

  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 14,
    paddingVertical: 15, width: '100%', marginBottom: 12,
  },
  btnDisabled: { opacity: 0.4 },
  btnText:     { color: '#fff', fontSize: 15, fontWeight: '700' },
  footer:      { fontSize: 11, color: COLORS.textMuted, textAlign: 'center' },
});

export default PasskeyRevealModal;