// frontend/src/api/balance.ts
import { api } from './auth';

export interface Balance {
  id: number;
  amount_usd: string;   // always string for consistency with backend decimal
  amount_kes: number;   // numeric type for KES balance
  updated_at: string;
  created_at: string;
}

export interface BalanceHistoryItem {
  id: number;
  type: 'CREDIT' | 'DEBIT';
  amount_usd: string;
  amount_kes: number;
  description: string;
  created_by?: number | null; // optional, since not always returned
  created_at: string;
}

// 🔎 Fetch current balance
export const getBalance = async (): Promise<Balance> => {
  const response = await api.get<Balance>('/balance/');
  return response.data;
};

// ➕ Add to balance
export const addBalance = async (
  payload: { amount_usd: string; passkey: string }
): Promise<{ message: string; balance: Balance }> => {
  const response = await api.post('/balance/', payload);
  return response.data;
};

// 📜 Fetch balance history
export const getBalanceHistory = async (): Promise<BalanceHistoryItem[]> => {
  const response = await api.get<BalanceHistoryItem[]>('/balance/history/');
  return response.data;
};
