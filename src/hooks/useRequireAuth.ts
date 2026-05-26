import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export function useRequireAuth(shopSlug: string) {
  const { user, loading } = useAuth();
  const hasTelegramToken = typeof window !== 'undefined' && !!localStorage.getItem('telegram_token');

  useEffect(() => {
    if (!loading && !user && !hasTelegramToken && shopSlug) {
      window.location.href = `/?p=/${encodeURIComponent(shopSlug)}-user-dashboard-login`;
    }
  }, [loading, user, hasTelegramToken, shopSlug]);

  return { user, loading, isAuthenticated: !!user || hasTelegramToken };
}
