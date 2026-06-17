import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function useRequireAuth(shopSlug: string) {
  const { user, loading } = useAuth();
  const hasTelegramToken = typeof window !== 'undefined' && !!localStorage.getItem('telegram_token');
  const hasPendingAuthParams = typeof window !== 'undefined'
    && !!new URLSearchParams(window.location.search).get('auth_token');
  const [settled, setSettled] = useState(false);

  // Give Firebase a moment to restore persisted session before redirecting
  useEffect(() => {
    if (!loading && !settled) {
      const t = setTimeout(() => setSettled(true), 300);
      return () => clearTimeout(t);
    }
  }, [loading, settled]);

  useEffect(() => {
    if (settled && !user && !hasTelegramToken && !hasPendingAuthParams && shopSlug) {
      window.location.href = `/?p=/${encodeURIComponent(shopSlug)}-user-dashboard-login`;
    }
  }, [settled, user, hasTelegramToken, hasPendingAuthParams, shopSlug]);

  return { user, loading, isAuthenticated: !!user || hasTelegramToken || hasPendingAuthParams };
}
