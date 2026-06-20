import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { getPendingOrderCount } from '../api/orders';
import { useBotStore } from '../store/botStore';

const SYNC_INTERVAL = 15 * 60 * 1000;
const LAST_SYNC_KEY = 'last_background_sync';
const LAST_COUNT_KEY = 'last_pending_order_count';

export function useBackgroundSync() {
  const selectedBotId = useBotStore((s) => s.selectedBotId);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !selectedBotId) return;

    const doSync = async () => {
      try {
        const result = await getPendingOrderCount(selectedBotId);
        const count = result.count || result.pending_count || 0;
        const prevCount = parseInt(localStorage.getItem(LAST_COUNT_KEY) || '0', 10);

        localStorage.setItem(LAST_COUNT_KEY, String(count));
        localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());

        if (count > prevCount && prevCount > 0 && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('New Orders', {
            body: `${count - prevCount} new order(s) received`,
            icon: '/icon-192.svg',
          });
        }
      } catch {
      }
    };

    doSync();
    intervalRef.current = setInterval(doSync, SYNC_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [selectedBotId]);

  return {
    lastSync: localStorage.getItem(LAST_SYNC_KEY),
  };
}
