// ShitHead Deluxe service worker.
// Makes the game installable and shows notifications. Pages always come
// from the network first so every deploy reaches players straight away;
// the cached copy is only used when offline.
const CACHE = 'shithead-shell-v1';
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || request.mode !== 'navigate') return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && new URL(request.url).pathname === '/') {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('/', copy)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match('/').then((cached) => cached || Response.error()))
  );
});

// Tapping a notification brings the game forward (or opens it) on the
// right page.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const open = (event.notification.data && event.notification.data.open) || 'inbox';
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) {
      await existing.focus();
      existing.postMessage({ type: 'notification-open', open });
      return;
    }
    await self.clients.openWindow(`/?open=${encodeURIComponent(open)}`);
  })());
});
