import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      token: localStorage.getItem('token') || null,
      user: null,
      isSuperadmin: false,
      login: (token, user) => {
        localStorage.setItem('token', token);
        set({ token, user, isSuperadmin: user.is_superadmin });
      },
      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('auth-storage');
        set({ token: null, user: null, isSuperadmin: false });
      },
      setUser: (user) => set({ user, isSuperadmin: user.is_superadmin }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
