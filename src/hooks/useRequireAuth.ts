import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { isCustomDomain } from '../utils/authProxy';

export function useRequireAuth(shopSlug: string) {
  const { user, loading } = useAuth();
  const hasTelegramToken = typeof window !== 'undefined' && !!localStorage.getItem('telegram_token');
  const hasGoogleToken = typeof window !== 'undefined' && !!(localStorage.getItem('google_token') || localStorage.getItem('google_user'));
  const hasCustomerToken = typeof window !== 'undefined' && !!(localStorage.getItem('customer_token') || localStorage.getItem('customer_user'));
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
    if (settled && !user && !hasTelegramToken && !hasGoogleToken && !hasCustomerToken && !hasPendingAuthParams) {
      if (isCustomDomain()) {
        window.location.href = '/';
      } else if (shopSlug) {
        window.location.href = `/?p=/${encodeURIComponent(shopSlug)}`;
      } else {
        window.location.href = '/';
      }
    }
  }, [settled, user, hasTelegramToken, hasGoogleToken, hasCustomerToken, hasPendingAuthParams, shopSlug]);

  return {
    user,
    loading: loading || !settled,
    isAuthenticated: !!user || hasTelegramToken || hasGoogleToken || hasCustomerToken || hasPendingAuthParams
  };
}
