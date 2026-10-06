'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sources = [...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+)"[^>]*>/g)]
  .map(m => m[1]).filter(s => !/^https?:/.test(s) && /\.(?:js|css)(?:\?|$)/.test(s));
const handlers = {};
const origin = 'https://game.test';
const cached = { ok: true, marker: 'offline-code' };
const requests = [];
const context = vm.createContext({
  URL, Response, console,
  self: { location: { origin }, addEventListener: (name, fn) => { handlers[name] = fn; }, skipWaiting() {}, clients: { claim() {} } },
  fetch: async () => { throw new Error('offline'); },
  caches: { open: async () => ({ match: async request => { requests.push(request.url); return cached; } }) }
});
vm.runInContext(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), context);
const offline = vm.runInContext('OFFLINE_ASSETS', context);
for (const src of sources) {
  assert(fs.existsSync(path.join(root, src.split('?')[0])), 'missing ' + src);
  assert(offline.includes('/' + src), 'not precached: ' + src);
  assert(vm.runInContext('isCachedAsset(new URL(' + JSON.stringify('/' + src) + ', self.location.origin))', context), 'no offline handler: ' + src);
}
for (const url of ['/__/auth/handler', '/functions/economy', '/users/alice', 'https://database.test/users.json']) {
  assert.equal(vm.runInContext('isCachedAsset(new URL(' + JSON.stringify(url) + ', self.location.origin))', context), false);
}
(async () => {
  for (const src of sources) {
    let response;
    handlers.fetch({ request: { method: 'GET', mode: 'same-origin', url: origin + '/' + src }, respondWith: p => { response = p; }, waitUntil() {} });
    assert(response, 'fetch not intercepted: ' + src);
    assert.equal(await response, cached, 'offline fallback failed: ' + src);
  }
  assert.equal(requests.length, sources.length);
  const hosting = JSON.parse(fs.readFileSync(path.join(root, 'firebase.json'), 'utf8')).hosting;
  for (const target of hosting) {
    assert.equal(target.public, '.');
    for (const pattern of ['/*.js', '/*.css']) assert(target.headers.some(h => h.source === pattern && h.headers.some(v => v.key === 'Cache-Control' && v.value.includes('no-cache'))));
  }
  console.log('PASS: ' + sources.length + ' local scripts/styles exist, are precached, load offline, and hosting headers cover extracted files; auth/database routes bypass caching.');
})().catch(error => { console.error(error); process.exitCode = 1; });
