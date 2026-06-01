// frontend/src/api/receipts.ts
import { api } from './auth';
import { Transaction } from './transactions';

export interface Receipt {
  id: number;
  receipt_number: string;
  admin_name: string;
  created_at: string;
  pdf_file?: string | null;
  pdf_url?: string | null;
  transaction?: Transaction; // optional, depending on backend response
}

// 📜 Fetch all receipts (handles both paginated and array responses)
export const getReceipts = async (): Promise<Receipt[]> => {
  const response = await api.get<Receipt[] | { results: Receipt[] }>('/receipts/');
  return Array.isArray(response.data)
    ? response.data
    : response.data.results ?? [];
};

// 🔎 Fetch single receipt
export const getReceipt = async (id: number): Promise<Receipt> => {
  const response = await api.get<Receipt>(`/receipts/${id}/`);
  return response.data;
};

// 🧾 Generate receipt for a transaction
export const generateReceipt = async (transactionId: number): Promise<Receipt> => {
  const response = await api.post<Receipt>(`/receipts/generate/${transactionId}/`);
  return response.data;
};

// 📄 Download receipt PDF as Blob
export const downloadReceiptPDF = async (id: number): Promise<Blob> => {
  const response = await api.get(`/receipts/${id}/pdf/`, {
    responseType: 'blob',
  });
  return response.data;
};

// 🔗 Get direct download URL for receipt
export const getReceiptDownloadUrl = (id: number): string => {
  const base = api.defaults.baseURL || '';
  return `${base}/receipts/${id}/download/`;
};
