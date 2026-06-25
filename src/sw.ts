// @ts-nocheck
import {precacheAndRoute} from 'workbox-precaching';
import {registerRoute} from 'workbox-routing';
import {CacheFirst, NetworkFirst, StaleWhileRevalidate} from 'workbox-strategies';

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({url}) => url.pathname.startsWith('/api/'),
  new NetworkFirst({cacheName: 'api-cache'}),
);

registerRoute(
  ({request}) => request.mode === 'navigate',
  new StaleWhileRevalidate({cacheName: 'pages-cache'}),
);

registerRoute(
  ({request}) =>
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    request.destination === 'worker',
  new StaleWhileRevalidate({cacheName: 'static-cache'}),
);

registerRoute(
  ({request}) => request.destination === 'image',
  new CacheFirst({cacheName: 'image-cache'}),
);

self.addEventListener('install', () => {
  self.skipWaiting();
});

const PRESERVE_CACHES = ['image-cache', 'img-cache-v1'];

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => !PRESERVE_CACHES.includes(key))
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const notification = data.notification || {};
    const title = notification.title || 'E-commerce Myanmar';
    const opts = {
      body: notification.body || '',
      icon: notification.icon || '/icon-192.png',
      badge: '/icon-192.png',
      data: data.data || {},
      vibrate: [200, 100, 200],
    };
    event.waitUntil(self.registration.showNotification(title, opts));
  } catch {
    // not a notification payload
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/';
  const urlToOpen = new URL(target, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({type: 'window', includeUncontrolled: true}).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(urlToOpen);
          return;
        }
      }
      self.clients.openWindow(urlToOpen);
    }),
  );
});
