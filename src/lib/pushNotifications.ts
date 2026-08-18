import { API_BASE } from '../api/config';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

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
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    await PushNotifications.register();
  } catch {
    // Silently handle
  }
}

export async function sendTokenToBackend(token: string): Promise<void> {
  const authToken = localStorage.getItem('token');
  if (!authToken) {
    return;
  }
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
      if (res.ok) {
        return;
      }
    } catch {
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

export async function unregisterFCMToken(): Promise<void> {
  const token = fcmTokenValue || localStorage.getItem('fcm_token');
  const authToken = localStorage.getItem('token');

  if (token) {
    try {
      await fetch(`${API_BASE}/notifications/unregister`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ token }),
      });
    } catch {
      // Silently handle
    }
  }

  fcmTokenValue = null;
  localStorage.removeItem('fcm_token');

  if (Capacitor.isNativePlatform()) {
    try {
      await PushNotifications.removeAllListeners();
    } catch {
      // Silently handle
    }
  }
}

export function sendStoredFCMToken(): void {
  const stored = localStorage.getItem('fcm_token');
  const authToken = localStorage.getItem('token');
  if (!authToken) return;

  if (stored) {
    sendTokenToBackend(stored);
    return;
  }
  registerFCMToken();
  onFCMTokenReady((token) => sendTokenToBackend(token));
}

export function initPushNotifications(): void {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  PushNotifications.addListener('registration', (result) => {
    const token = result.value;
    fcmTokenValue = token;
    localStorage.setItem('fcm_token', token);
    const authToken = localStorage.getItem('token');
    if (authToken) {
      sendTokenToBackend(token);
    }
    fcmReadyCallbacks.forEach((cb) => cb(token));
    fcmReadyCallbacks = [];
  });

  PushNotifications.addListener('registrationError', () => {
    // Silently handle
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    // If user is not authenticated, ignore push notifications completely
    const authToken = localStorage.getItem('token');
    if (!authToken) return;

    if (notification.data?.type === 'app_release') {
      localStorage.setItem('ota_show_updated_toast', 'true');
      window.location.reload();
      return;
    }

    const title = notification.title || 'Notification';
    const body = notification.body || '';
    const event = new CustomEvent('app:notification', {
      detail: { title, body, data: notification.data },
    });
    window.dispatchEvent(event);
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const authToken = localStorage.getItem('token');
    if (!authToken) return;

    const data = action.notification.data;
    if (data?.type === 'app_release') {
      localStorage.setItem('ota_show_updated_toast', 'true');
      window.location.reload();
      return;
    }
    if (data?.route) {
      const route = data.route as string;
      if (route.startsWith('/') || route.startsWith(window.location.origin)) {
        window.location.href = route;
      }
    }
  });

  const authToken = localStorage.getItem('token');
  if (authToken) {
    registerFCMToken();
  }
}
