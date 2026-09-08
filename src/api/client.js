import axios from 'axios';
import { API_BASE } from './config';
import { useAuthStore } from '../store/authStore';

const client = axios.create({
  baseURL: API_BASE,
});

let lastBackendErrorTime = 0;
let backendUnreachableStart = 0;
let consecutiveErrors = 0;

client.interceptors.request.use((config) => {
  if (config.headers.Authorization) return config;
  const token = useAuthStore.getState().token || localStorage.getItem('telegram_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
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

    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      if (url.includes('/auth/login') || url.includes('/auth/staff-login')) {
        return Promise.reject(error);
      }

      const isMainDomain = () => {
        if (typeof window === 'undefined') return true;
        const host = window.location.hostname;
        const mainDomains = ['telegramecommerce.shop', 'localhost', '127.0.0.1'];
        return mainDomains.some(d => host === d || host.endsWith(`.${d}`));
      };

      const isAdminPath = (() => {
        if (typeof window === 'undefined') return false;
        if (!isMainDomain()) return false;
        
        const hash = window.location.hash.replace(/^#/, '');
        if (hash.startsWith('/auth/google/proxy')) return false;

        const p = new URLSearchParams(window.location.search).get('p');
        if (p) return false;

        const pathname = window.location.pathname.replace(/^\//, '');
        const firstSegment = pathname.split('/')[0];
        const ADMIN_PATHS = new Set([
          'dashboard', 'orders', 'products', 'customers', 'broadcast', 'commands',
          'payments', 'profit', 'subscription', 'settings', 'chats', 'customization',
          'bot-customization', 'superadmin', 'send-message', 'subscribers', 'faqs', 'qr-menu', 'staff-accounts', 'newsfeed'
        ]);
        
        return pathname === '' || ADMIN_PATHS.has(firstSegment);
      })();

      const hasTelegramToken = !!localStorage.getItem('telegram_token');
      const hasFirebaseToken = !!useAuthStore.getState().token;
      if (hasTelegramToken && !hasFirebaseToken) {
        localStorage.removeItem('telegram_token');
        localStorage.removeItem('telegram_user');
      } else {
        useAuthStore.getState().logout();
        if (isAdminPath) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default client;
