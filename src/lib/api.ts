import axios from 'axios';
import { API_BASE } from '../api/config';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

let lastBackendErrorTime = 0;

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('telegram_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      const now = Date.now();
      if (now - lastBackendErrorTime > 15000) {
        lastBackendErrorTime = now;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('app:vpn-warning'));
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;
