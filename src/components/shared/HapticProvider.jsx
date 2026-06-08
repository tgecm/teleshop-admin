import { useEffect } from 'react';
import { clickSound } from '../../utils/sound';

export default function HapticProvider({ children }) {
  useEffect(() => {
    const handler = (e) => {
      const target = e.target.closest('[data-haptic]');
      if (!target) return;
      clickSound();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(8);
      }
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, []);

  return children;
}
