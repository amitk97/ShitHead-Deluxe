// Account data end to end: a real game page on the emulators.
// Hank downloads his data, deletes his account (signed out), signs back in
// ("Keep my account?": nothing public comes back until he keeps it), keeps
// it, deletes again, and after the 7 days the purge erases him everywhere,
// including his friend Ivy's list and the sign-in itself.
//   functions/.env.local with SH_TEST_DB_NS=shithead-pro-default-rtdb (see
//   CLAUDE.md), start the emulators, then
//   NODE_PATH=$(npm root -g) SH_VIDEO_DEPS=/path/with/node_modules node tools/account-e2e.js
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const S = process.env.SH_VIDEO_DEPS || ROOT;
const NS = 'shithead-pro-default-rtdb';
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
let pass = 0, failN = 0;
const ok = (c, label, extra) => { if (c) { pass++; console.log('PASS', label); } else { failN++; console.log('FAIL', label, extra === undefined ? '' : JSON.stringify(extra)); } };
async function makeUser(email, pw) {
  const r = await (await fetch(`${AUTH}/accounts:signUp?key=fake`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pw, returnSecureToken: true }) })).json();
  await fetch(`${AUTH}/projects/shithead-pro/accounts:update`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' }, body: JSON.stringify({ localId: r.localId, emailVerified: true }) });
  return r.localId;
}
const admin = async (p, method = 'GET', v) => (await fetch(`http://127.0.0.1:9000/${p}.json?ns=${NS}`, { method, headers: { Authorization: 'Bearer owner' }, body: v === undefined ? undefined : JSON.stringify(v) })).json();
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  for (const ns of [NS, 'shithead-pro']) await fetch(`http://127.0.0.1:9000/.json?ns=${ns}`, { method: 'DELETE', headers: { Authorization: 'Bearer owner' } });
  await fetch('http://127.0.0.1:9099/emulator/v1/projects/shithead-pro/accounts', { method: 'DELETE' });
  const rules = fs.readFileSync(path.join(ROOT, 'database.rules.json'), 'utf8');
  await fetch(`http://127.0.0.1:9000/.settings/rules.json?ns=${NS}`, { method: 'PUT', headers: { Authorization: 'Bearer owner' }, body: rules });
  const hank = await makeUser('hank@test.local', 'secret123');
  const ivy = await makeUser('ivy@test.local', 'secret123');
  await admin('', 'PATCH', {
    [`users/${hank}`]: { rating: 500, wins: 2, losses: 1, diamonds: 40, username: 'Hank' }, 'usernames/hank': hank,
    [`users/${ivy}`]: { rating: 500, wins: 0, losses: 0, diamonds: 0, username: 'Ivy' }, 'usernames/ivy': ivy,
    [`friends/${hank}/${ivy}`]: true, [`friends/${ivy}/${hank}`]: true
  });

  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  html = html.replace(/const FIREBASE_APP_CHECK_SITE_KEY = '[^']*';/, "const FIREBASE_APP_CHECK_SITE_KEY = '';");
  html = html.replace('firebase.initializeApp(firebaseConfig);', `firebaseConfig.databaseURL = 'https://${NS}.firebaseio.com'; firebase.initializeApp(firebaseConfig); firebase.database().useEmulator('127.0.0.1', 9000); firebase.auth().useEmulator('http://127.0.0.1:9099', { disableWarnings: true }); firebase.app().functions('europe-west1').useEmulator('127.0.0.1', 5001);`);
  const browser = await chromium.launch({ args: ['--no-proxy-server'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route('**/*', async (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === '127.0.0.1' && u.port !== '8765') { try { return route.fulfill({ response: await route.fetch() }); } catch (e) { return route.abort(); } }
    if (u.hostname === '127.0.0.1' && u.port === '8765') {
      if (u.pathname === '/index.html' || u.pathname === '/') return route.fulfill({ body: html, contentType: 'text/html' });
      const local = path.join(ROOT, decodeURIComponent(u.pathname));
      const types = { '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.js': 'text/javascript', '.json': 'application/json' };
      if (fs.existsSync(local)) return route.fulfill({ body: fs.readFileSync(local), contentType: types[path.extname(local)] || 'application/octet-stream' });
      return route.fulfill({ status: 404, body: '' });
    }
    const m = u.pathname.match(/firebasejs\/[\d.]+\/(firebase-[a-z-]+\.js)$/);
    if (m) return route.fulfill({ body: fs.readFileSync(path.join(S, 'node_modules/firebase', m[1])), contentType: 'text/javascript' });
    if (u.pathname.includes('canvas-confetti')) return route.fulfill({ body: fs.readFileSync(path.join(S, 'node_modules/canvas-confetti/dist/confetti.browser.js')), contentType: 'text/javascript' });
    return route.abort();
  });
  await page.goto('http://127.0.0.1:8765/index.html');
  await page.evaluate(() => { localStorage.setItem('shithead_seen_version', 'x'); localStorage.setItem('shithead_whats_new', '0'); localStorage.setItem('shithead_tutorial_progress', JSON.stringify({ quick_start: true })); });
  await page.goto('http://127.0.0.1:8765/index.html');
  await sleep(1500);
  const signIn = async () => {
    // Signing out reloads the page (reloadCleanly): let that finish first.
    await sleep(1500);
    await page.waitForLoadState('load');
    await page.waitForFunction(() => typeof firebase !== 'undefined' && typeof currentUser !== 'undefined', null, { timeout: 20000 });
    await sleep(1000);
    await page.evaluate(() => firebase.auth().signInWithEmailAndPassword('hank@test.local', 'secret123'));
    await page.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser && currentUser.uid, null, { timeout: 20000 });
    await sleep(3500);
  };

  // 1. Signed in normally: public profile made, then Download my data
  await signIn();
  ok(!!(await admin(`publicProfiles/${hank}`)), 'signed in: public profile is there');
  await page.evaluate(() => { window.__blob = null; URL.createObjectURL = (b) => { window.__blob = b; return 'blob:x'; }; openProfilePanel(); document.getElementById('downloadMyDataBtn').click(); });
  await page.waitForFunction(() => window.__blob, null, { timeout: 15000 }).catch(() => {});
  const exported = await page.evaluate(async () => window.__blob && { name: window.__blob.name, data: JSON.parse(await window.__blob.text()) });
  ok(exported && /^shithead-data-Hank-/.test(exported.name), 'Download my data saves a named file', exported && exported.name);
  const balance = await admin(`users/${hank}/diamonds`); // 40 + today's login reward
  ok(exported && exported.data.account.uid && exported.data.account.email === 'hank@test.local' && exported.data.profile.diamonds === balance && exported.data.profile.wins === 2, 'the file has the account, email and profile', exported && [exported.data.profile.diamonds, balance]);
  ok(exported && exported.data.friends.includes(ivy) && exported.data.thisDevice && typeof exported.data.thisDevice === 'object', "the file has friends and this device's settings");

  // 2. Delete: password check, DELETE, signed out, hidden at once
  await page.evaluate(() => { document.getElementById('deleteAccountBtn').click(); document.getElementById('deleteStep1ContinueBtn').click(); });
  await sleep(300);
  await page.fill('#deletePasswordInput', 'secret123');
  await page.fill('#deleteConfirmInput', 'DELETE');
  await page.click('#deleteFinalBtn');
  await page.waitForFunction(() => !currentUser, null, { timeout: 20000 }).catch(() => {});
  ok(await page.evaluate(() => !currentUser), 'delete: signed out');
  const del = await admin(`users/${hank}/deletion`);
  ok(del && del.purgeAt - del.requestedAt === 7 * 864e5, 'delete: 7-day window on the server', del);
  ok((await admin(`publicProfiles/${hank}`)) === null && (await admin('leaderboard/hank')) === null, 'delete: hidden from profiles and leaderboard');

  // 3. Sign back in: asked first, nothing public comes back until Keep
  await signIn();
  ok(await page.evaluate(() => !document.getElementById('keepAccountModal').classList.contains('hidden')), 'sign in again: "Keep my account?" is asked');
  await sleep(2500);
  ok((await admin(`publicProfiles/${hank}`)) === null, 'while asking: the public profile stays hidden');
  await page.click('#keepAccountBtn');
  await sleep(4000);
  ok((await admin(`users/${hank}/deletion`)) === null, 'Keep: deletion cancelled');
  ok(!!(await admin(`publicProfiles/${hank}`)), 'Keep: public profile back');
  ok((await admin(`users/${hank}/diamonds`)) === balance && (await admin(`friends/${ivy}/${hank}`)) === true, 'Keep: Diamonds and friends as they were', [await admin(`users/${hank}/diamonds`), balance]);

  // 4. Delete again; after the window the purge erases everything
  await page.evaluate(() => callEconomy('deleteAccount', { op: 'request' }).then(() => performSignOut()));
  await sleep(2000);
  await admin(`users/${hank}/deletion/purgeAt`, 'PUT', Date.now() - 1000);
  process.env.FIREBASE_DATABASE_EMULATOR_HOST = '127.0.0.1:9000';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  const fAdmin = require('../functions/node_modules/firebase-admin');
  if (!fAdmin.apps.length) fAdmin.initializeApp({ projectId: 'shithead-pro', databaseURL: `http://127.0.0.1:9000?ns=${NS}` });
  const purged = await require('../functions/account').purgeDueAccounts();
  ok(purged.length === 1 && purged[0] === hank, 'purge: the due account', purged);
  const left = await Promise.all([`users/${hank}`, `friends/${hank}`, `friends/${ivy}/${hank}`, 'usernames/hank', `publicProfiles/${hank}`].map(p => admin(p)));
  ok(left.every(v => v === null), "purge: gone from the database, including Ivy's friend list", left);
  ok((await admin(`users/${ivy}/username`)) === 'Ivy', 'purge: Ivy untouched');
  const signin = await (await fetch(`${AUTH}/accounts:signInWithPassword?key=fake`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'hank@test.local', password: 'secret123', returnSecureToken: true }) })).json();
  ok(signin.error && /EMAIL_NOT_FOUND|USER_NOT_FOUND|INVALID_LOGIN_CREDENTIALS/.test(signin.error.message), 'purge: the sign-in is gone too', signin.error);
  ok(!errs.length, 'no page errors', errs.slice(0, 3));

  console.log(`\n${pass} passed, ${failN} failed`);
  await browser.close();
  process.exit(failN ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
