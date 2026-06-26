import { API_BASE } from '../api/config';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

let fcmReadyCallbacks: Array<(token: string) => void> = [];
let fcmTokenValue: string | null = localStorage.getItem('fcm_token');

function debugLog(msg: string): void {
  const log = JSON.parse(localStorage.getItem('fcm_debug') || '[]') as string[];
  log.push(`${new Date().toISOString().slice(11, 19)} ${msg}`);
  if (log.length > 50) log.splice(0, log.length - 50);
  localStorage.setItem('fcm_debug', JSON.stringify(log));
}

export function onFCMTokenReady(cb: (token: string) => void): void {
  if (fcmTokenValue) {
    cb(fcmTokenValue);
    return;
  }
  fcmReadyCallbacks.push(cb);
}

export async function registerFCMToken(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    debugLog('not native platform, skipping FCM');
    return;
  }

  try {
    debugLog('checking permissions...');
    let permStatus = await PushNotifications.checkPermissions();
    debugLog(`perm status: ${permStatus.receive}`);

    if (permStatus.receive === 'prompt') {
      debugLog('requesting permission...');
      let prev = Date.now();
      permStatus = await PushNotifications.requestPermissions();
      debugLog(`permission result: ${permStatus.receive} (took ${Date.now() - prev}ms)`);
    }
    if (permStatus.receive !== 'granted') {
      debugLog('permission not granted, skipping register');
      return;
    }

    debugLog('calling PushNotifications.register()...');
    let prev = Date.now();
    await PushNotifications.register();
    debugLog(`PushNotifications.register() resolved (took ${Date.now() - prev}ms)`);
  } catch (e: any) {
    debugLog(`register error: ${e?.message || e}`);
  }
}

export async function sendTokenToBackend(token: string): Promise<void> {
  const authToken = localStorage.getItem('token');
  if (!authToken) {
    debugLog('sendTokenToBackend: no auth token yet');
    return;
  }
  debugLog(`sending token to backend (attempt 1)...`);
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
        debugLog('token registered on backend OK');
        return;
      }
      debugLog(`send attempt ${attempt + 1} failed: ${res.status}`);
    } catch (e: any) {
      debugLog(`send attempt ${attempt + 1} error: ${e?.message || e}`);
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

export function sendStoredFCMToken(): void {
  const stored = localStorage.getItem('fcm_token');
  if (stored) {
    debugLog('sendStoredFCMToken: found stored token, sending');
    sendTokenToBackend(stored);
    return;
  }
  debugLog('sendStoredFCMToken: no stored token, registering...');
  registerFCMToken();
  onFCMTokenReady((token) => sendTokenToBackend(token));
}

export function initPushNotifications(): void {
  if (!Capacitor.isNativePlatform()) {
    debugLog('init: not native platform');
    return;
  }

  debugLog('init: registering listeners...');

  PushNotifications.addListener('registration', (result) => {
    const token = result.value;
    debugLog(`registration event received! token: ${token.slice(0, 20)}...`);
    fcmTokenValue = token;
    localStorage.setItem('fcm_token', token);
    sendTokenToBackend(token);
    fcmReadyCallbacks.forEach((cb) => cb(token));
    fcmReadyCallbacks = [];
  });

  PushNotifications.addListener('registrationError', (err: any) => {
    debugLog(`registrationError: ${err?.error || JSON.stringify(err)}`);
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    debugLog(`push received: ${notification.title}`);
    const title = notification.title || 'Notification';
    const body = notification.body || '';
    const event = new CustomEvent('app:notification', {
      detail: { title, body, data: notification.data },
    });
    window.dispatchEvent(event);
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    debugLog(`push action performed`);
    const data = action.notification.data;
    if (data?.route) {
      window.location.href = data.route as string;
    }
  });

  debugLog('init: calling registerFCMToken...');
  registerFCMToken();
}
