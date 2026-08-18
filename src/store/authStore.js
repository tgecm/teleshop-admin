import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { unregisterFCMToken } from '../lib/pushNotifications';

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      isSuperadmin: false,
      isStaff: false,
      login: (token, user, isStaff) => {
        localStorage.setItem('token', token);
        set({ token, user, isSuperadmin: user.is_superadmin, isStaff: !!isStaff });
      },
      logout: () => {
        unregisterFCMToken();
        localStorage.clear();
        if ('caches' in window) {
          caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
        }
        set({ token: null, user: null, isSuperadmin: false, isStaff: false });
      },
      setUser: (user) => set({ user, isSuperadmin: user.is_superadmin }),
    }),
    {
      name: 'auth-storage',
      merge: (persisted, current) => ({
        ...current,
        ...persisted,
        token: persisted.token || localStorage.getItem('token') || null,
      }),
    }
  )
);
