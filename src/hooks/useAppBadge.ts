import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { getPendingOrderCount } from '../api/orders';
import { useBotStore } from '../store/botStore';

const BADGE_INTERVAL = 5 * 60 * 1000;

export function useAppBadge() {
  const selectedBotId = useBotStore((s) => s.selectedBotId);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !selectedBotId) return;

    let cancelled = false;

    const updateBadge = async () => {
      try {
        const result = await getPendingOrderCount(selectedBotId);
        const count = result.count || result.pending_count || 0;
        const { Badge } = await import('@capawesome/capacitor-badge');
        await Badge.set({ count });
      } catch {
      }
    };

    updateBadge();
    intervalRef.current = setInterval(updateBadge, BADGE_INTERVAL);

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [selectedBotId]);

  const clearBadge = async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const { Badge } = await import('@capawesome/capacitor-badge');
      await Badge.clear();
    } catch {
    }
  };

  return { clearBadge };
}
