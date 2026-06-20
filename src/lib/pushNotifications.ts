import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

const API_BASE = 'https://api.telegramecommerce.shop';
let fcmReadyCallbacks: Array<(token: string) => void> = [];
let fcmTokenValue: string | null = localStorage.getItem('fcm_token');

export function onFCMTokenReady(cb: (token: string) => void): void {
  if (fcmTokenValue) {
    cb(fcmTokenValue);
    return;
  }
  fcmReadyCallbacks.push(cb);
}

export async function registerFCMToken(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }
    if (permStatus.receive !== 'granted') return;

    await PushNotifications.register();
  } catch {
    // registration failed
  }
}

export async function sendTokenToBackend(token: string): Promise<void> {
  const authToken = localStorage.getItem('telegram_token');
  if (!authToken) return;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${API_BASE}/notifications/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ token }),
      });
      if (res.ok) return;
    } catch {
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

export function initPushNotifications(): void {
  if (!Capacitor.isNativePlatform()) return;

  PushNotifications.addListener('registration', (result) => {
    const token = result.value;
    fcmTokenValue = token;
    localStorage.setItem('fcm_token', token);
    sendTokenToBackend(token);
    fcmReadyCallbacks.forEach((cb) => cb(token));
    fcmReadyCallbacks = [];
  });

  PushNotifications.addListener('registrationError', () => {
    // registration failed
  });

  PushNotifications.addListener(
    'pushNotificationReceived',
    (notification) => {
      const title = notification.title || 'Notification';
      const body = notification.body || '';
      const event = new CustomEvent('app:notification', {
        detail: { title, body, data: notification.data },
      });
      window.dispatchEvent(event);
    },
  );

  PushNotifications.addListener(
    'pushNotificationActionPerformed',
    (action) => {
      const data = action.notification.data;
      if (data?.route) {
        window.location.href = data.route as string;
      }
    },
  );

  registerFCMToken();
}
