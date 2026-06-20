import axios from 'axios';
import { useToastStore } from '../store/toastStore';

const API_BASE = 'https://api.telegramecommerce.shop';

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
        useToastStore.getState().addToast(
          'လိုင်းမကောင်းရင် VPN လေးချိတ်ပေးပါနော်',
          'error',
        );
      }
    }
    return Promise.reject(error);
  },
);

export default api;
