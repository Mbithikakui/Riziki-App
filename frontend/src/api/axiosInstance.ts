// frontend/src/api/axiosInstance.ts
import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import { Storage } from '../utils/storage';

// Detect environment production state dynamically
const isProduction = process.env.NODE_ENV === 'production';

// Swaps to Render online endpoint automatically during production compiling 
const BASE_URL = isProduction
  ? 'https://riziki-backend-7of1.onrender.com/api'
  : 'http://localhost:8000/api';

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---------- REQUEST INTERCEPTOR ----------
// Attach access token to every request
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await Storage.getItem('access_token');
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Clean up endpoint paths to make sure we don't accidentally send /api/api/mpesa/
    if (config.url && config.url.startsWith('/api/')) {
      config.url = config.url.replace('/api/', '/');
    }
    if (config.url && config.url.startsWith('/payments/')) {
      config.url = config.url.replace('/payments/', '/mpesa/');
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ---------- RESPONSE INTERCEPTOR ----------
// Auto-refresh on 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string | null) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Avoid retrying the refresh endpoint itself
      if (originalRequest.url?.includes('/auth/refresh/')) {
        await Storage.multiRemove(['access_token', 'refresh_token']);
        // Redirect to login — handled by AuthContext
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue all requests while refreshing
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await Storage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post(`${BASE_URL}/auth/refresh/`, {
          refresh: refreshToken,
        });

        const newAccessToken = response.data.access;
        await Storage.setItem('access_token', newAccessToken);

        processQueue(null, newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        }

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await Storage.multiRemove(['access_token', 'refresh_token']);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;