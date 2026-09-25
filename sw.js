// ShitHead Deluxe service worker.
// Makes the game installable, playable offline (Vs Bots and the Tutorial)
// and shows notifications. Pages always come from the network first so
// every deploy reaches players straight away; the cached copy is only used
// when offline. Game files (sounds, art, fonts, the Firebase and confetti
// scripts) are served from the cache and refreshed in the background.
const CACHE = 'shithead-shell-v2';
const ASSET_CACHE = 'shithead-assets-v1';
const DATA_CACHE = 'shithead-data-v1'; // small saved data (event calendar), kept across updates
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];
// Everything a Vs Bots game needs with no signal, fetched when the app installs.
const OFFLINE_ASSETS = [
  '/audio/riffle.mp3', '/audio/place.mp3', '/audio/take.mp3', '/audio/turn.mp3', '/audio/notify.mp3',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-check-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js'
];
// Files kept as they're used (card art, tables, fonts). Nothing that talks
// to the database or sign-in is ever cached.
function isCachedAsset(url) {
  if (url.origin === self.location.origin) {
    return /^\/(art|audio|icons)\//.test(url.pathname) || url.pathname === '/manifest.webmanifest';
  }
  return (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/'))
    || (url.hostname === 'cdn.jsdelivr.net' && url.pathname.startsWith('/npm/canvas-confetti'))
    || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
}

self.addEventListener('install', (event) => {
  event.waitUntil(Promise.all([
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => {}),
    // One at a time, so a single failure never stops the rest.
    caches.open(ASSET_CACHE).then((cache) => Promise.all(OFFLINE_ASSETS.map((url) => cache.add(url).catch(() => {}))))
  ]));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => ![CACHE, ASSET_CACHE, DATA_CACHE].includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Firebase's own pages (Google sign-in handler) are never touched.
  if (url.origin === self.location.origin && url.pathname.startsWith('/__/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && url.pathname === '/') {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put('/', copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match('/').then((cached) => cached || Response.error()))
    );
    return;
  }
  if (!isCachedAsset(url)) return;
  // Stale-while-revalidate: the cached copy straight away, a fresh one saved for next time.
  event.respondWith(caches.open(ASSET_CACHE).then(async (cache) => {
    const cached = await cache.match(request, { ignoreVary: true });
    const refresh = fetch(request).then((response) => {
      if (response && (response.ok || response.type === 'opaque')) cache.put(request, response.clone()).catch(() => {});
      return response;
    }).catch(() => null);
    if (cached) { event.waitUntil(refresh); return cached; }
    const fresh = await refresh;
    return fresh || Response.error();
  }));
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

// ---- Notifications while the app is closed ----------------------------
async function readJson(name, fallback) {
  try {
    const hit = await (await caches.open(DATA_CACHE)).match(name);
    return hit ? await hit.json() : fallback;
  } catch (e) { return fallback; }
}
async function writeJson(name, value) {
  try {
    await (await caches.open(DATA_CACHE)).put(name, new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } }));
  } catch (e) {}
}
function showGameNotification({ title, body, tag, open }) {
  return self.registration.showNotification(title || 'ShitHead', {
    body: body || '',
    // Same tags as the in-game alerts, so one thing never alerts twice.
    tag: `shithead-${tag || 'update'}`,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { open: open || 'inbox' }
  });
}
async function gameIsOnScreen() {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  return windows.some((client) => client.visibilityState === 'visible');
}
// Push messages from the Cloud Functions (functions/index.js). If the game
// is open on screen it already shows these itself. Apple devices must show
// every push, or they stop delivering them, so there it always shows.
self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (e) {}
  const data = payload.data || payload.notification || payload;
  const apple = /iPhone|iPad|Macintosh/.test(self.navigator.userAgent || '');
  event.waitUntil((async () => {
    if (!apple && await gameIsOnScreen()) return;
    await showGameNotification(data);
  })());
});

// Event starts without any server (Android's installed app): the page sends
// the upcoming event dates, and a periodic background check shows the alert
// on the day an event starts.
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'season-calendar' && Array.isArray(data.events)) {
    event.waitUntil(writeJson('/__season-calendar', data.events.slice(0, 40)));
  }
});
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
async function checkSeasonStarts(now = new Date()) {
  const events = await readJson('/__season-calendar', []);
  const notified = await readJson('/__season-notified', {});
  const today = ymd(now);
  const yesterday = ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  let changed = false;
  for (const ev of events) {
    if (!ev || notified[ev.key] || (ev.start !== today && ev.start !== yesterday)) continue;
    notified[ev.key] = true;
    changed = true;
    await showGameNotification({
      title: `${ev.emoji} ${ev.name} has started!`,
      body: `${ev.title} — new ${ev.name} items are in the Shop for a limited time.`,
      tag: `season-${ev.key}`,
      open: 'shop'
    });
  }
  if (changed) await writeJson('/__season-notified', notified);
}
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'season-check') event.waitUntil(checkSeasonStarts());
});
