import { create } from 'zustand';
import { successSound } from '../utils/sound';

export const useToastStore = create((set) => ({
  toasts: [],
  addToast: (message, type = 'success') => {
    if (type === 'success') successSound();
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 3000);
  },
}));
