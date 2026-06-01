// frontend/src/components/PasskeyModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../styles/colors';

interface PasskeyModalProps {
  visible: boolean;
  onConfirm: (passkey: string) => void;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
  isLoading?: boolean;
  error?: string | null;
}

const PasskeyModal: React.FC<PasskeyModalProps> = ({
  visible,
  onConfirm,
  onCancel,
  title = 'Confirm Action',
  subtitle = 'Enter your 4-digit passkey to proceed.',
  isLoading = false,
  error = null,
}) => {
  const [passkey, setPasskey] = useState('');
  const [secureEntry, setSecureEntry] = useState(true);
  const inputRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setPasskey('');
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [visible]);

  useEffect(() => {
    if (error) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
      setPasskey('');
    }
  }, [error]);

  const handleConfirm = () => {
    if (passkey.trim().length < 4) return;
    Keyboard.dismiss();
    onConfirm(passkey.trim());
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}
        >
          <View style={styles.iconRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-closed" size={26} color={COLORS.secondary} />
            </View>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              style={[styles.input, error ? styles.inputError : null]}
              placeholder="Enter passkey"
              placeholderTextColor={COLORS.textLight}
              value={passkey}
              onChangeText={setPasskey}
              secureTextEntry={secureEntry}
              keyboardType="number-pad"
              maxLength={10}
              onSubmitEditing={handleConfirm}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setSecureEntry((s) => !s)}
            >
              <Ionicons
                name={secureEntry ? 'eye-off' : 'eye'}
                size={20}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={14} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              disabled={isLoading}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                (!passkey.trim() || isLoading) && styles.confirmBtnDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!passkey.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.confirmText}>Confirm</Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.58)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 28,
    width: '88%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 14,
  },
  iconRow: { marginBottom: 14 },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  // ✅ Fixed: title style key was missing
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 19,
  },
  inputWrapper: {
    width: '100%',
    position: 'relative',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    backgroundColor: COLORS.inputBackground,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 20,
    color: COLORS.textPrimary,
    letterSpacing: 8,
    textAlign: 'center',
  },
  inputError: { borderColor: COLORS.error },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    alignSelf: 'flex-start',
    gap: 4,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    fontWeight: '500',
    marginLeft: 4,
  },
  actions: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.45 },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
}); // ✅ Fixed: was missing closing }

export default PasskeyModal;