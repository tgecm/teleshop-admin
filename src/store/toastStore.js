import { create } from 'zustand';
import { successSound } from '../utils/sound';

function formatToastMessage(msg) {
  if (!msg) return '';
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) {
    return msg
      .map((item) => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item !== null) {
          return item.msg || item.detail || item.message || JSON.stringify(item);
        }
        return String(item);
      })
      .join(', ');
  }
  if (typeof msg === 'object' && msg !== null) {
    return msg.msg || msg.detail || msg.message || JSON.stringify(msg);
  }
  return String(msg);
}

export const useToastStore = create((set) => ({
  toasts: [],
  addToast: (rawMessage, type = 'success') => {
    const message = formatToastMessage(rawMessage);
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
