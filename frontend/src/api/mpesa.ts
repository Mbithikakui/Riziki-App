// frontend/src/api/mpesa.ts
import { api } from './auth';

export interface MpesaConfig {
  id: number;
  consumer_key: string;
  consumer_secret: string;
  shortcode: string;
  passkey: string;
  environment: 'sandbox' | 'production' | string;
  callback_url: string;
  updated_at: string;
}

export interface STKPushPayload {
  phone_number: string;
  amount: string | number;
  account_reference: string;
  transaction_desc: string;
  passkey: string; // STK retains original structure or custom setup
}

export interface B2CPayload {
  phone_number: string;
  amount: string | number;
  command_id: string;
  remarks: string;
  occassion?: string;
  admin_passkey: string;
}

export interface B2BPayload {
  party_b: string;
  amount: string | number;
  command_id: string;
  account_reference: string;
  remarks: string;
  admin_passkey: string;
}

export interface ScheduledPayment {
  id: number;
  payment_type: string;
  phone_number: string;
  party_b: string;
  amount_kes: string;
  description: string;
  scheduled_at: string;
  status: string;
  created_at: string;
  executed_at: string | null;
}

// 🔎 Config
export const getMpesaConfig = async (): Promise<MpesaConfig> => {
  const response = await api.get<MpesaConfig>('/payments/config/');
  return response.data;
};

export const updateMpesaConfig = async (data: Partial<MpesaConfig>): Promise<MpesaConfig> => {
  const response = await api.put('/payments/config/', data);
  return response.data;
};

// 📲 Transactions
export const initiateSTKPush = async (payload: STKPushPayload) => {
  const response = await api.post('/payments/stk-push/', payload);
  return response.data;
};

export const initiateB2C = async (payload: B2CPayload) => {
  const response = await api.post('/payments/b2c/', payload);
  return response.data;
};

export const initiateB2B = async (payload: B2BPayload) => {
  const response = await api.post('/payments/b2b/', payload);
  return response.data;
};

// 📥 C2B
export const registerC2BURL = async (payload: {
  confirmation_url: string;
  validation_url: string;
  response_type: string;
  admin_passkey: string;
}) => {
  const response = await api.post('/payments/c2b/register/', payload);
  return response.data;
};

export const simulateC2B = async (payload: {
  amount: string | number;
  msisdn: string;
  bill_ref_number?: string;
  admin_passkey: string;
}) => {
  const response = await api.post('/payments/c2b/simulate/', payload);
  return response.data;
};

// 📊 Queries
export const queryTransactionStatus = async (payload: {
  transaction_id: string;
  admin_passkey: string;
}) => {
  const response = await api.post('/payments/status/', payload);
  return response.data;
};

export const queryAccountBalance = async () => {
  const response = await api.get('/payments/balance/');
  return response.data;
};

export const reverseTransaction = async (payload: {
  transaction_id: string;
  amount: string | number;
  remarks: string;
  admin_passkey: string;
}) => {
  const response = await api.post('/payments/reversal/', payload);
  return response.data;
};

// 📅 Scheduled Payments
export const getScheduledPayments = async (): Promise<ScheduledPayment[]> => {
  const response = await api.get('/payments/scheduled/');
  return response.data;
};

export const createScheduledPayment = async (payload: {
  payment_type: string;
  phone_number?: string;
  party_b?: string;
  amount_kes: string;
  description: string;
  scheduled_at: string;
  admin_passkey: string;
}): Promise<ScheduledPayment> => {
  const response = await api.post('/payments/scheduled/', payload);
  return response.data;
};

export const cancelScheduledPayment = async (id: number): Promise<void> => {
  await api.delete(`/payments/scheduled/${id}/`);
};

// ── 🔗 EXPORT ALIASES TO MATCH FRONTEND EXPECTATIONS ──
export const stkPush = initiateSTKPush;
export const b2cPayment = initiateB2C;
export const b2bPayment = initiateB2B;
export const checkTransactionStatus = queryTransactionStatus;