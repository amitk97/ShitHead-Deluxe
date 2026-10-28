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
  '/art/cities-v2/city-effects.js?v=4e5acd905f79',
  // Application code and styles, including their deployment version keys.
  '/game.css?v=8f298d5a36c9',
  '/tailwind.css?v=a6876526974d',
  '/sound.js?v=405fbeb9481f',
  '/burn-effects.js?v=4a5efe7c5054',
  '/card-animations.js?v=0fe6bd1289f1',
  '/js/card-reference-data.js?v=e8e93ad152f4',
  '/js/card-reference-ui.js?v=9f69f1376876',
  '/js/card-reference-panel.js?v=24b27a802db1',
  '/js/play-matrix-data.js?v=314a42b6e714',
  '/js/play-matrix-rules.js?v=dd6da15b0146',
  '/js/play-matrix-ui.js?v=6a8c496bcbb8',
  '/js/play-matrix-panel.js?v=c3626e811e5c',
  '/js/card-hold.js?v=47726d6f1d5f',
  '/js/whats-new-data.js?v=8aabb96610b8',
  '/js/avatar-tones.js?v=a1fc8ff23117',
  '/cosmetics-data.js?v=7b0ec6f0ca5a',
  '/tutorial-data.js?v=86b1cdade927',
  '/tutorial.js?v=0049a251f6ef',
  '/level-ladder.js?v=2236068565c3',
  '/home-navigation.js?v=8b927cb2e918',
  '/js/wishlist-store.js?v=664496c9f24f',
  '/shop.js?v=c76a38589f68',
  '/multiplayer-lobby.js?v=3e73efeeb3e1',
  '/private-cosmetics.js?v=e9f1b6622a99',
  '/app.js?v=5cbb21bb4376',
  '/js/house-rules.js?v=5d71fee2f41c',
  '/js/house-rules-bots.js?v=1e6c3304258d',
  '/js/house-rules-presets.js?v=80f7a658ecb1',
  '/js/friends-lobby.js?v=d6461177af51',
  '/js/lucky-wheel.js?v=0539cd4ec012',
  '/css/lucky-wheel.css?v=f18f3f73df57',
  '/css/friends-lobby.css?v=d41876d5ca00',
  '/css/puzzles.css?v=584fef898369',
  '/css/welcome-tour.css?v=9d478452ecd0',
  '/js/puzzle-engine.js?v=6da7c2c6c85c',
  '/js/puzzles.js?v=87cb627bec7c',
  '/js/test-lab.js?v=2216dd1aa6a1',
  '/js/welcome-tour.js?v=1ec181602f01',
  '/icons/splash-handoff-v309.webp',
  '/art/fonts/cinzel-latin-v26.woff2',
  '/art/burns/level-v294/effects.js?v=3efa73e57658',
  '/art/burns/level-v294/layers.webp',
  '/art/burns/level-v294/concepts.webp',
  '/art/burns/level-3d/burns3d.js?v=70fc8d4c7c76',
  '/art/burns/season/season-burns.js?v=e48d26ecf736',
  '/art/burns/icons.js?v=97c925509b37',
  '/art/effects/icons.js?v=dc511958ba17',
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
  '/art/burns/shitstorm/layers-v2.webp',
  '/art/burns/shitstorm/tile-v2.webp',
  '/art/burns/ghost-flames/layers.webp?v=1',
  '/art/burns/ghost-flames/tile.webp',
  '/art/burns/inferno-sweep/layers.webp?v=1',
  '/art/burns/inferno-sweep/tile.webp',
  '/art/burns/spark-snap/layers.webp?v=1',
  '/art/burns/spark-snap/tile.webp',
  '/art/tables/full-scenes-v270/scenes.js?v=f13044c23fa4',
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
  if ((url.pathname === '/privateTableArt' || url.pathname === '/privateBurnArt')) return; // Never cache authenticated artwork.
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






