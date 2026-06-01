// frontend/src/api/auth.ts
import axios from 'axios';
import { Storage } from '../utils/storage';

const BASE_URL = 'http://localhost:8000/api';

const api = axios.create({ baseURL: BASE_URL });

// 🔑 Request interceptor: inject access token on every request
api.interceptors.request.use(async (config) => {
  const token = await Storage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 🔄 Response interceptor: automatically refresh access token on a 401 Unauthorized error
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refresh = await Storage.getItem('refresh_token');
        if (!refresh) throw new Error('No refresh token found');
        
        const res = await axios.post(`${BASE_URL}/auth/refresh/`, { refresh });
        const newAccess = res.data.access;
        
        await Storage.setItem('access_token', newAccess);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        
        return api(originalRequest);
      } catch {
        // If refreshing fails, safely wipe active security records
        await Storage.multiRemove(['access_token', 'refresh_token', 'user_data', 'transaction_passkey']);
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

// 📌 Type Definitions
export interface UserData {
  id: number;
  username: string;
  full_name: string;
  email: string;
  is_staff: boolean;
  passkey_assigned: boolean;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: UserData;
  onboarding: {
    transaction_passkey: string;
    message: string;
  } | null;
}

export interface LoginPayload {
  username: string;
  password: string;
}

// 🔐 Authentication API Functions
export const login = async (payload: LoginPayload): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>('/auth/login/', payload);
  
  // Persist tokens and session data immediately after successful login
  await Storage.setItem('access_token', response.data.access);
  await Storage.setItem('refresh_token', response.data.refresh);
  await Storage.setItem('user_data', JSON.stringify(response.data.user));

  // If onboarding passkey payload is explicitly provided, store it locally for immediate view
  if (response.data.onboarding?.transaction_passkey) {
    await Storage.setItem('transaction_passkey', response.data.onboarding.transaction_passkey);
  }

  return response.data;
};

export const logout = async (): Promise<void> => {
  try {
    const refreshToken = await Storage.getItem('refresh_token');
    if (refreshToken) {
      await api.post('/auth/logout/', { refresh: refreshToken }).catch(() => {});
    }
  } finally {
    // Ensure all internal session records are completely purged
    await Storage.multiRemove(['access_token', 'refresh_token', 'user_data', 'transaction_passkey']);
  }
};

export const isAuthenticated = async (): Promise<boolean> => {
  const token = await Storage.getItem('access_token');
  return !!token;
};

export const getProfile = async (): Promise<UserData> => {
  const response = await api.get('/auth/profile/');
  return response.data;
};

export const updateProfile = async (data: { full_name?: string; email?: string }) => {
  const response = await api.put('/auth/profile/', data);
  return response.data;
};

export const changePassword = async (
  old_password: string,
  new_password: string,
  confirm_password: string
) => {
  const response = await api.post('/auth/change-password/', {
    old_password,
    new_password,
    confirm_password,
  });
  return response.data;
};

// ── Transaction Passkey Actions ───────────────────────────────────────────────

/**
 * Validate user's structural transaction passkey against secure backend storage hashes.
 */
export const validatePasskey = async (passkey: string): Promise<boolean> => {
  const response = await api.post('/auth/validate-passkey/', { passkey });
  return response.data.valid;
};

/**
 * Modify transaction passkey. Requires current passkey for authorization context.
 */
export const changePasskey = async (
  current_passkey: string,
  new_passkey: string,
  confirm_passkey: string
) => {
  const response = await api.post('/auth/change-passkey/', {
    current_passkey,
    new_passkey,
    confirm_passkey,
  });
  return response.data;
};

/**
 * Request a fresh cryptographically random system transaction passkey string.
 * Requires user password confirmation to verify identity bounds.
 */
export const regeneratePasskey = async (password: string) => {
  const response = await api.post('/auth/regenerate-passkey/', { password });
  
  if (response.data.transaction_passkey) {
    await Storage.setItem('transaction_passkey', response.data.transaction_passkey);
  }
  return response.data;
};

/**
 * Retrieve localized client storage cache copy of transaction passkey.
 * Intended for single reveal workflows.
 */
export const getLocalPasskey = async (): Promise<string | null> => {
  return Storage.getItem('transaction_passkey');
};

export { api };