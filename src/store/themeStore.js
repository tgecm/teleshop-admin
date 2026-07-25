import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const THEMES = {
  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'Clean & familiar light design',
    preview: ['#ffffff', '#6366f1', '#f8fafc'],
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    description: 'Obsidian dark with indigo glow',
    preview: ['#050508', '#6366f1', '#0d0d14'],
  },
  slate: {
    id: 'slate',
    name: 'Slate Pro',
    description: 'Clean light slate with top navigation',
    preview: ['#ffffff', '#0284c7', '#f1f5f9'],
  },
  aurora: {
    id: 'aurora',
    name: 'Aurora',
    description: 'Emerald teal with white & dark modes',
    preview: ['#ffffff', '#10b981', '#f0fdf4'],
  },
  rose: {
    id: 'rose',
    name: 'Rose Gold',
    description: 'Luxury rose & gold with white & dark modes',
    preview: ['#ffffff', '#f43f5e', '#fff5f7'],
  },
};

export const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'classic',
      setTheme: (theme) => {
        set({ theme });
        document.documentElement.setAttribute('data-theme', theme);
      },
    }),
    { name: 'ui-theme' }
  )
);

export function initTheme() {
  const stored = (() => {
    try {
      const raw = localStorage.getItem('ui-theme');
      return raw ? JSON.parse(raw)?.state?.theme : null;
    } catch {
      return null;
    }
  })();
  document.documentElement.setAttribute('data-theme', stored || 'classic');
}
