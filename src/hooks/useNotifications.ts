import {useState, useEffect, useCallback} from 'react';
import {messaging, getToken, onMessage} from '../lib/firebase';
import {registerDeviceToken, unregisterDeviceToken} from '../api/notifications';

const VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY || '';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    () => ('Notification' in window ? Notification.permission : 'denied'),
  );
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(
    () => localStorage.getItem('notifications_enabled') !== 'false',
  );

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (
      !enabled ||
      !messaging ||
      !VAPID_KEY ||
      Notification.permission !== 'granted'
    )
      return;

    let cancelled = false;

    getToken(messaging, {vapidKey: VAPID_KEY})
      .then((token) => {
        if (!cancelled && token) {
          setFcmToken(token);
          registerDeviceToken(token).catch(() => {});
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (!messaging) return;
    return onMessage(messaging, (payload) => {
      if (
        payload.notification?.title &&
        payload.notification?.body &&
        Notification.permission === 'granted'
      ) {
        new Notification(payload.notification.title, {
          body: payload.notification.body,
          icon: '/icon-192.svg',
        });
      }
    });
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'denied' as NotificationPermission;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const toggleEnabled = useCallback(
    async (val: boolean) => {
      setEnabled(val);
      localStorage.setItem('notifications_enabled', String(val));
      if (!val && fcmToken) {
        try {
          await unregisterDeviceToken();
        } catch {
          /* ignore */
        }
      }
    },
    [fcmToken],
  );

  return {permission, fcmToken, enabled, requestPermission, toggleEnabled};
}
