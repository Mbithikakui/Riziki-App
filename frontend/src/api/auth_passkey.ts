// frontend/src/api/auth_passkey.ts
// Passkey-specific API helpers — imported wherever passkey actions are needed
import { api } from './auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const changePasskey = async (
  current_passkey: string,
  new_passkey: string,
  confirm_passkey: string,
) => {
  const res = await api.post('/auth/change-passkey/', {
    current_passkey,
    new_passkey,
    confirm_passkey,
  });
  // Update locally stored passkey
  await AsyncStorage.setItem('transaction_passkey', new_passkey);
  return res.data;
};

export const regeneratePasskey = async (password: string) => {
  const res = await api.post('/auth/regenerate-passkey/', { password });
  if (res.data.transaction_passkey) {
    await AsyncStorage.setItem('transaction_passkey', res.data.transaction_passkey);
  }
  return res.data;
};

export const getLocalPasskey = async (): Promise<string | null> =>
  AsyncStorage.getItem('transaction_passkey');