import axios from 'axios';
import { API_BASE } from '../api/config';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

let lastBackendErrorTime = 0;
let backendUnreachableStart = 0;
let consecutiveErrors = 0;

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('telegram_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    consecutiveErrors = 0;
    backendUnreachableStart = 0;
    return response;
  },
  (error) => {
    if (!error.response) {
      const now = Date.now();
      if (!backendUnreachableStart) {
        backendUnreachableStart = now;
      }
      consecutiveErrors++;
      if (consecutiveErrors >= 5 && (now - backendUnreachableStart >= 10000) && (now - lastBackendErrorTime > 30000)) {
        lastBackendErrorTime = now;
        consecutiveErrors = 0;
        backendUnreachableStart = 0;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('app:vpn-warning'));
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;
