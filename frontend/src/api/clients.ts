// frontend/src/api/clients.ts
import { api } from './auth';


export interface Client {
  id: number;
  name: string;
  phone_number: string | null;
  till_number: string | null;
  paybill_number: string | null;
  account_number: string | null;
  client_type: 'PHONE' | 'TILL' | 'PAYBILL';
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CreateClientPayload {
  name: string;
  phone_number?: string;
  till_number?: string;
  paybill_number?: string;
  account_number?: string;
  client_type: 'PHONE' | 'TILL' | 'PAYBILL';
  notes?: string;
}

// 📜 Fetch all clients (handles both paginated and array responses)
export const getClients = async (params?: { search?: string; type?: string }): Promise<Client[]> => {
  const response = await api.get<Client[] | { results: Client[] }>('/clients/', {
    params,
  });
  return Array.isArray(response.data)
    ? response.data
    : response.data.results ?? [];
};

// 🔎 Fetch single client
export const getClient = async (id: number): Promise<Client> => {
  const response = await api.get<Client>(`/clients/${id}/`);
  return response.data;
};

// ➕ Create client
export const createClient = async (payload: CreateClientPayload): Promise<Client> => {
  const response = await api.post<Client>('/clients/', payload);
  return response.data;
};

// ✏️ Update client
export const updateClient = async (
  id: number,
  payload: Partial<CreateClientPayload>
): Promise<Client> => {
  const response = await api.put<Client>(`/clients/${id}/`, payload);
  return response.data;
};

// ❌ Delete client with passkey
export const deleteClient = async (id: number, passkey: string): Promise<void> => {
  await api.delete(`/clients/${id}/`, { data: { passkey } });
};

// 🖨️ Get client print URL
export const getClientPrintUrl = (id: number): string => {
  const base = api.defaults.baseURL || '';
  return `${base}/clients/${id}/print/`;
};
