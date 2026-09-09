import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

/**
 * Completely purges customer authentication state, cached tokens,
 * local/session storage, and React Query data to prevent cross-account leaks
 * when switching or re-logging into Customer Dashboard.
 */
export async function clearCustomerSession(queryClient = null) {
  // 1. Clear TanStack React Query cache
  if (queryClient && typeof queryClient.clear === 'function') {
    try {
      queryClient.clear();
    } catch (e) {
      console.warn('[clearCustomerSession] Failed to clear queryClient:', e);
    }
  }

  // 2. Remove known auth keys from localStorage
  const keysToRemove = [
    'telegram_token',
    'telegram_user',
    'google_token',
    'google_user',
    'customer_token',
    'customer_user',
    'customer_info',
    'qr_customer_token',
    'qr_customer_id',
    'qr_customer_user',
    'custom_display_name',
    'admin_session_start',
  ];

  keysToRemove.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {}
  });

  // 3. Remove dynamic session keys from localStorage
  try {
    Object.keys(localStorage).forEach((key) => {
      if (
        key.startsWith('visitor_') ||
        key.startsWith('teleshop_mmpay_active_session_') ||
        key.startsWith('customer_') ||
        key.startsWith('firebase:authUser')
      ) {
        localStorage.removeItem(key);
      }
    });
  } catch {}

  // 4. Clear sessionStorage
  try {
    sessionStorage.clear();
  } catch {}

  // 5. Sign out of Firebase Auth completely and wait for completion
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('[clearCustomerSession] Firebase signOut warning:', err);
  }
}
