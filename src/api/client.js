import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';

const client = axios.create({
  baseURL: 'https://api.telegramecommerce.shop',
});

let lastBackendErrorTime = 0;

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token || localStorage.getItem('telegram_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
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

    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      if (url.includes('/auth/login') || url.includes('/auth/staff-login')) {
        return Promise.reject(error);
      }
      const hasTelegramToken = !!localStorage.getItem('telegram_token');
      const hasFirebaseToken = !!useAuthStore.getState().token;
      if (hasTelegramToken && !hasFirebaseToken) {
        localStorage.removeItem('telegram_token');
        localStorage.removeItem('telegram_user');
      } else {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default client;
