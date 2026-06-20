import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

const API_BASE = 'https://api.telegramecommerce.shop';

export async function registerFCMToken(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;

  try {
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }
    if (permStatus.receive !== 'granted') return null;

    await PushNotifications.register();
    return null;
  } catch {
    return null;
  }
}

export async function sendTokenToBackend(token: string): Promise<void> {
  const authToken = localStorage.getItem('telegram_token');
  if (!authToken) return;
  try {
    await fetch(`${API_BASE}/notifications/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token }),
    });
  } catch {
    // silently fail
  }
}

export async function getFCMToken(): Promise<string | null> {
  return localStorage.getItem('fcm_token');
}

export function initPushNotifications(): void {
  if (!Capacitor.isNativePlatform()) return;

  PushNotifications.addListener('registration', (result) => {
    const token = result.value;
    localStorage.setItem('fcm_token', token);
    sendTokenToBackend(token);
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
