import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export function useRequireAuth(shopSlug: string) {
  const { user, loading } = useAuth();
  const hasTelegramToken = typeof window !== 'undefined' && !!localStorage.getItem('telegram_token');
  const hasPendingAuthParams = typeof window !== 'undefined'
    && !!new URLSearchParams(window.location.search).get('auth_token');

  useEffect(() => {
    if (!loading && !user && !hasTelegramToken && !hasPendingAuthParams && shopSlug) {
      window.location.href = `/?p=/${encodeURIComponent(shopSlug)}-user-dashboard-login`;
    }
  }, [loading, user, hasTelegramToken, hasPendingAuthParams, shopSlug]);

  return { user, loading, isAuthenticated: !!user || hasTelegramToken || hasPendingAuthParams };
}
