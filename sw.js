// ShitHead Deluxe service worker.
// Makes the game installable, playable offline (Vs Bots and the Tutorial)
// and shows notifications. Pages always come from the network first so
// every deploy reaches players straight away; the cached copy is only used
// when offline. Game files (sounds, art, fonts, the Firebase and confetti
// scripts) are served from the cache and refreshed in the background.
const CACHE = 'shithead-shell-v10';
const ASSET_CACHE = 'shithead-assets-v1';
const DATA_CACHE = 'shithead-data-v1'; // small saved data (event calendar), kept across updates
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192-v302.png', '/icons/icon-512-v302.png'];
// Everything a Vs Bots game needs with no signal, fetched when the app installs.
const OFFLINE_ASSETS = [
  // Application code and styles, including their deployment version keys.
  '/game.css?v=67830c795315',
  '/tailwind.css?v=a6876526974d',
  '/sound.js?v=79610d853777',
  '/burn-effects.js?v=13093a728abe',
  '/card-animations.js?v=0fe6bd1289f1',
  '/js/card-reference-data.js',
  '/js/card-reference-ui.js',
  '/js/card-reference-panel.js',
  '/js/play-matrix-data.js',
  '/js/play-matrix-rules.js',
  '/js/play-matrix-ui.js',
  '/js/play-matrix-panel.js',
  '/js/card-hold.js',
  '/js/whats-new-data.js',
  '/js/avatar-tones.js',
  '/cosmetics-data.js?v=924c8ed0b06b',
  '/tutorial-data.js?v=cf577eec4ae6',
  '/tutorial.js?v=9f026d55aa51',
  '/level-ladder.js?v=f629d34f1b74',
  '/home-navigation.js?v=d5db5d5896e6',
  '/shop.js?v=1ac6c06e3853',
  '/multiplayer-lobby.js?v=563279447523',
  '/private-cosmetics.js?v=02b0b4227104',
  '/app.js?v=ebb0be878f0e',
  '/js/house-rules.js',
  '/js/house-rules-bots.js',
  '/js/house-rules-presets.js?v=335',
  '/js/friends-lobby.js?v=335',
  '/css/friends-lobby.css?v=245eed70ee85',
  '/icons/splash-handoff-v309.webp',
  '/art/fonts/cinzel-latin-v26.woff2',
  '/art/burns/level-v294/effects.js?v=295',
  '/art/burns/level-v294/layers.webp',
  '/art/burns/level-v294/concepts.webp',
  '/art/burns/level-3d/burns3d.js?v=313',
  '/art/burns/coloured-flame/layers.webp?v=1',
  '/art/burns/coloured-flame/tile.webp',
  '/art/burns/electric-blast/layers.webp?v=1',
  '/art/burns/electric-blast/tile.webp',
  '/art/burns/confectionery/layers.webp?v=1',
  '/art/burns/confectionery/tile.webp',
  '/art/burns/lava-melt/layers.webp?v=1',
  '/art/burns/lava-melt/tile.webp',
  '/art/burns/origami-fold/layers.webp?v=1',
  '/art/burns/origami-fold/tile.webp',
  '/art/burns/default/layers.webp?v=1',
  '/art/burns/default/tile.webp',
  '/art/burns/smoke-burst/layers.webp?v=1',
  '/art/burns/smoke-burst/tile.webp',
  '/art/burns/royal-incineration/layers.webp?v=1',
  '/art/burns/royal-incineration/tile.webp',
  '/art/burns/hellfire-spiral/layers.webp?v=2',
  '/art/burns/hellfire-spiral/tile.webp',
  '/art/burns/shitstorm/layers.webp?v=1',
  '/art/burns/shitstorm/tile.webp',
  '/art/burns/ghost-flames/layers.webp?v=1',
  '/art/burns/ghost-flames/tile.webp',
  '/art/burns/inferno-sweep/layers.webp?v=1',
  '/art/burns/inferno-sweep/tile.webp',
  '/art/burns/spark-snap/layers.webp?v=1',
  '/art/burns/spark-snap/tile.webp',
  '/art/tables/full-scenes-v270/scenes.js?v=274',
  '/art/avatars/approved-v267/royal-card-10.webp',
  '/art/avatars/approved-v267/royal-card-J.webp',
  '/art/avatars/approved-v267/royal-card-Q.webp',
  '/art/avatars/approved-v267/royal-card-K.webp',
  '/art/avatars/approved-v267/royal-card-A.webp',

  '/art/avatars/approved-v265/avatar-suit-spades.webp',
  '/art/avatars/approved-v265/avatar-suit-hearts.webp',
  '/art/avatars/approved-v267/avatar-suit-clubs.webp',
  '/art/avatars/approved-v267/avatar-suit-diamonds.webp',
  '/art/avatars/approved-v265/avatar-lunar.webp',
  '/art/avatars/approved-v265/avatar-valentine-earned.webp',
  '/art/avatars/approved-v265/avatar-valentine.webp',
  '/art/avatars/approved-v265/avatar-ramadan-earned.webp',
  '/art/avatars/approved-v265/avatar-ramadan.webp',
  '/art/avatars/approved-v265/avatar-easter-earned.webp',
  '/art/avatars/approved-v265/avatar-easter.webp',
  '/art/avatars/approved-v265/avatar-summer-earned.webp',
  '/art/avatars/approved-v265/avatar-summer.webp',
  '/art/avatars/approved-v265/avatar-halloween-earned.webp',
  '/art/avatars/approved-v265/avatar-diwali-earned.webp',
  '/art/avatars/approved-v265/avatar-diwali.webp',
  '/art/avatars/approved-v265/avatar-christmas-earned.webp',
  '/art/avatars/approved-v265/avatar-christmas.webp',
  '/art/avatars/approved-v265/avatar-newyear-earned.webp',
  '/art/avatars/approved-v265/avatar-newyear.webp',
  '/art/avatars/approved-v265/avatar-lunar-earned.webp',
  '/art/avatars/approved-v265/avatar-ace-spades.webp',
  '/art/avatars/approved-v265/avatar-joker.webp',
  '/art/avatars/approved-v265/avatar-queen-hearts.webp',
  '/art/avatars/approved-v265/avatar-burn-flame.webp',
  '/art/avatars/approved-v265/avatar-frozen.webp',
  '/art/avatars/approved-v265/avatar-ghost.webp',
  '/art/avatars/approved-v265/avatar-burning-ten.webp',
  '/art/avatars/approved-v265/avatar-fanned-hand.webp',
  '/art/avatars/approved-v265/avatar-joker-card.webp',
  '/art/avatars/approved-v267/avatar-cosmic-ace-clean.webp',
  '/art/avatars/approved-v267/avatar-royal-flush-clean.webp',
  '/art/avatars/approved-v267/avatar-shithead-clean.webp',
  '/art/avatars/approved-v265/avatar-centurion.webp',
  '/art/backs/approved-v267/back-ramadan.webp',
  '/art/backs/approved-v267/back-newyear.webp',
  '/art/backs/approved-v267/back-christmas.webp',
  '/art/backs/approved-v267/back-halloween.webp',
  '/art/backs/approved-v267/back-valentine.webp',
  '/art/backs/approved-v267/back-lunar.webp',
  '/art/backs/approved-v267/back-diwali.webp',
  '/art/backs/approved-v267/back-easter.webp',
  '/art/backs/approved-v267/back-summer.webp',
  '/art/backs/approved-v267/back-cobalt-linen.webp',
  '/art/backs/approved-v267/back-sage-linen.webp',
  '/art/backs/approved-v267/back-plum-linen.webp',
  '/art/backs/approved-v267/back-midnight.webp',
  '/art/backs/approved-v267/back-emerald.webp',
  '/art/backs/approved-v267/back-crimson.webp',
  '/art/backs/approved-v267/back-neon.webp',
  '/art/backs/approved-v267/back-tartan.webp',
  '/art/backs/approved-v267/back-artdeco.webp',
  '/art/backs/approved-v267/back-arcade.webp',
  '/art/backs/approved-v267/back-inferno.webp',
  '/art/backs/approved-v267/back-nebula.webp',
  '/art/backs/approved-v267/back-space.webp',
  '/art/backs/approved-v267/back-dragon.webp',
  '/art/backs/approved-v267/back-stained.webp',
  '/art/backs/approved-v267/default.webp',

  '/art/avatars/crowns-v263.png',
  '/audio/riffle.mp3', '/audio/place.mp3', '/audio/take.mp3', '/audio/turn.mp3', '/audio/notify.mp3',
  '/audio/lion-roar-v287.mp3', '/audio/boo-v287.mp3', '/audio/fireworks-v275.mp3',
  '/art/effects/fireworks-gold-complete-v264.webp?v=264',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-check-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-functions-compat.js',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js'
];
// Files kept as they're used (card art, tables, fonts). Nothing that talks
// to the database or sign-in is ever cached.
function isCachedAsset(url) {
  if (url.origin === self.location.origin) {
    return /^\/(art|audio|icons|js|css)\//.test(url.pathname)
      || /^\/(?:app|private-cosmetics|multiplayer-lobby|home-navigation|shop|level-ladder|sound|tutorial|tutorial-data|cosmetics-data|burn-effects|card-animations)\.js$/.test(url.pathname)
      || /^\/(?:game|tailwind)\.css$/.test(url.pathname)
      || url.pathname === '/manifest.webmanifest';
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
    icon: '/icons/icon-192-v302.png',
    badge: '/icons/icon-192-v302.png',
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

