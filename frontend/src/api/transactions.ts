// frontend/src/api/transactions.ts
import { api } from './auth';

export interface Transaction {
  id: number;
  mpesa_receipt_number: string | null;
  checkout_request_id: string | null;
  merchant_request_id: string | null;
  phone_number: string | null;
  recipient_name: string | null;
  amount_kes: string; // keep as string for decimal safety
  amount_usd: string; // unify to string for consistency
  type: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REVERSED' | 'CANCELLED';
  description: string | null;
  initiated_by?: number | null; // optional field
  created_at: string;
  updated_at: string;
}

export interface TransactionFilters {
  type?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
}

// 📜 Fetch transactions (handles both paginated and array responses)
export const getTransactions = async (
  filters?: TransactionFilters
): Promise<Transaction[]> => {
  const response = await api.get<{ results?: Transaction[] } | Transaction[]>('/transactions/', {
    params: filters,
  });
  return Array.isArray(response.data)
    ? response.data
    : response.data.results ?? [];
};

// 🔎 Fetch single transaction
export const getTransaction = async (id: number): Promise<Transaction> => {
  const response = await api.get<Transaction>(`/transactions/${id}/`);
  return response.data;
};

// ❌ Delete transaction with passkey
export const deleteTransaction = async (id: number, passkey: string): Promise<void> => {
  await api.delete(`/transactions/${id}/`, { data: { passkey } });
};

// 📄 Export transactions as PDF
export const exportTransactionsPDF = async (): Promise<Blob> => {
  const response = await api.get('/transactions/export/pdf/', {
    responseType: 'blob',
  });
  return response.data;
};

// 🔄 Poll transaction status
export const pollTransaction = async (id: number): Promise<Transaction> => {
  const response = await api.get<Transaction>(`/transactions/poll/${id}/`);
  return response.data;
};
