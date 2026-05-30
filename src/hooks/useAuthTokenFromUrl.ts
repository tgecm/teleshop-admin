import { useEffect } from 'react';
import { readAuthTokenFromUrl, clearAuthParamsFromUrl, isMainDomain } from '../utils/authProxy';
import { useTelegramAuth } from '../context/TelegramAuthContext';

/**
 * Checks URL for auth_token/auth_status/auth_user params
 * from the Google Auth Proxy redirect. If found, saves tokens
 * to localStorage and updates TelegramAuthContext.
 *
 * Must be called inside TelegramAuthProvider.
 */
export function useAuthTokenFromUrl() {
  const { loginWithTelegramToken } = useTelegramAuth();

  useEffect(() => {
    const { token, status, user } = readAuthTokenFromUrl();

    if (status !== 'success' || !token || !user) {
      if (status) {
        clearAuthParamsFromUrl();
      }
      return;
    }

    const userRecord = user as Record<string, unknown>;
    const telegramUser = {
      id: String(userRecord.id || ''),
      name: String(userRecord.name || ''),
      photo_url: String(userRecord.photo_url || ''),
    };

    localStorage.setItem('telegram_token', token);
    localStorage.setItem('telegram_user', JSON.stringify(telegramUser));
    localStorage.setItem('google_token', token);
    localStorage.setItem('google_user', JSON.stringify(userRecord));

    loginWithTelegramToken(token, telegramUser);

    clearAuthParamsFromUrl();
  }, [loginWithTelegramToken]);
}
