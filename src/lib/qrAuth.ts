import { API_BASE } from '../api/config';
import { requestGoogleIdToken } from './googleSignIn';

export function getQRToken() {
  return sessionStorage.getItem('qr_customer_token');
}

export function getQRCustomerId() {
  return sessionStorage.getItem('qr_customer_id');
}

export function getQRUser() {
  try {
    const u = sessionStorage.getItem('qr_customer_user');
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
}

export function isQRAuthenticated() {
  return !!sessionStorage.getItem('qr_customer_token');
}

export function storeQRLogin(token: string, customerId: string | number, user?: Record<string, unknown>) {
  sessionStorage.setItem('qr_customer_token', token);
  sessionStorage.setItem('qr_customer_id', String(customerId));
  if (user) {
    sessionStorage.setItem('qr_customer_user', JSON.stringify(user));
  }
}

export function clearQRLogin() {
  sessionStorage.removeItem('qr_customer_token');
  sessionStorage.removeItem('qr_customer_id');
  sessionStorage.removeItem('qr_customer_user');
}

export function qrAuthHeaders() {
  const token = getQRToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function qrSignInWithGoogle(slug: string): Promise<{
  token: string;
  customer_id: number;
  user: { id: string; name: string; email: string; photo_url: string };
}> {
  const accessToken = await requestGoogleIdToken();
  const resp = await fetch(`${API_BASE}/public/qr-menu/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: accessToken, shop_slug: slug }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Google sign-in failed' }));
    throw new Error(err.detail || 'Google sign-in failed');
  }
  return resp.json();
}

export async function qrExchangeTelegramToken(slug: string, telegramToken: string, chatId?: number | null): Promise<{
  token: string;
  customer_id: number;
  user: { id: string; name: string; photo_url: string };
}> {
  const resp = await fetch(`${API_BASE}/public/qr-menu/auth/telegram-exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: telegramToken, shop_slug: slug, chat_id: chatId || null }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Telegram sign-in failed' }));
    throw new Error(err.detail || 'Telegram sign-in failed');
  }
  return resp.json();
}
