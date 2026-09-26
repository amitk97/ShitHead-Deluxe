// Referrals end to end: real game pages against the emulators.
// Carol makes her invite code; Erin (a brand-new account) opens Carol's
// ?ref= link signed out (invite pop-up), signs in (linked, friends), plays 3
// counted games (the 3-minute gaps are shortened on the test server) and
// both are paid; Carol's Profile, Challenges and Inbox show it.
//   functions/.env.local with SH_TEST_DB_NS=shithead-pro-default-rtdb (see
//   CLAUDE.md), start the emulators, then
//   NODE_PATH=$(npm root -g) SH_VIDEO_DEPS=/path/with/node_modules node tools/referral-e2e.js
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
const admin = async (p, method = 'GET', v, ns = NS) => (await fetch(`http://127.0.0.1:9000/${p}.json?ns=${ns}`, { method, headers: { Authorization: 'Bearer owner' }, body: v === undefined ? undefined : JSON.stringify(v) })).json();

(async () => {
  for (const ns of [NS, 'shithead-pro']) await admin('', 'DELETE', undefined, ns);
  await fetch('http://127.0.0.1:9099/emulator/v1/projects/shithead-pro/accounts', { method: 'DELETE' });
  const rules = fs.readFileSync(path.join(ROOT, 'database.rules.json'), 'utf8');
  await fetch(`http://127.0.0.1:9000/.settings/rules.json?ns=${NS}`, { method: 'PUT', headers: { Authorization: 'Bearer owner' }, body: rules });
  const carol = await makeUser('carol@test.local', 'secret123');
  const erin = await makeUser('erin@test.local', 'secret123');
  // Carol is an existing player; Erin's profile is made by the game (init) when she signs in.
  await admin('', 'PATCH', { [`users/${carol}`]: { rating: 500, wins: 0, losses: 0, diamonds: 0, username: 'Carol' }, 'usernames/carol': carol });

  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  html = html.replace(/const FIREBASE_APP_CHECK_SITE_KEY = '[^']*';/, "const FIREBASE_APP_CHECK_SITE_KEY = '';");
  html = html.replace('firebase.initializeApp(firebaseConfig);', `firebaseConfig.databaseURL = 'https://${NS}.firebaseio.com'; firebase.initializeApp(firebaseConfig); firebase.database().useEmulator('127.0.0.1', 9000); firebase.auth().useEmulator('http://127.0.0.1:9099', { disableWarnings: true }); firebase.app().functions('europe-west1').useEmulator('127.0.0.1', 5001);`);
  const browser = await chromium.launch({ args: ['--no-proxy-server'] });
  const open = async (query = '') => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
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
    await page.goto(`http://127.0.0.1:8765/index.html${query}`);
    await page.waitForTimeout(1500);
    return { page, ctx, errs };
  };
  const signIn = async (page, email) => {
    await page.evaluate((email) => firebase.auth().signInWithEmailAndPassword(email, 'secret123'), email);
    await page.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser && currentUser.uid, null, { timeout: 20000 });
    await page.waitForTimeout(3000);
  };

  // 1. Carol makes her code from Friends → Invite Friends
  const C = await open();
  await signIn(C.page, 'carol@test.local');
  await C.page.evaluate(() => { navigator.share = undefined; document.getElementById('friendsModal').classList.remove('hidden'); document.getElementById('friendsInviteBtn').click(); });
  await C.page.waitForTimeout(3000);
  const code = await C.page.evaluate(() => referralStatusCache && referralStatusCache.code);
  ok(code === 'CAROL', 'Carol gets her invite code from Friends → Invite Friends', code);
  ok((await admin('referralCodes/CAROL'))?.uid === carol, 'the server keeps the code');

  // 2. Erin opens the link signed out
  const E = await open('?ref=carol');
  await E.page.waitForTimeout(3000);
  const invited = await E.page.evaluate(() => [!document.getElementById('referralWelcomeModal').classList.contains('hidden'), document.getElementById('referralWelcomeTitle').textContent, localStorage.getItem('shithead_ref_code'), location.search]);
  ok(invited[0] && /invited/i.test(invited[1]), 'signed out: the invite pop-up shows', invited);
  ok(/CAROL/.test(invited[2] || '') && invited[3] === '', 'the code is remembered and removed from the address bar', invited);
  await E.page.click('#referralWelcomeGoBtn');
  await E.page.waitForTimeout(500);
  ok(await E.page.evaluate(() => !document.getElementById('authModal').classList.contains('hidden') && authMode === 'signup'), 'SIGN UP opens the create-account form');
  await E.page.evaluate(() => document.getElementById('authModal').classList.add('hidden'));
  await signIn(E.page, 'erin@test.local');
  await E.page.waitForFunction(() => !localStorage.getItem('shithead_ref_code'), null, { timeout: 20000 }).catch(() => {});
  // A new player picks a username first; the "joined" pop-up waits for that.
  const askedName = await E.page.evaluate(() => !document.getElementById('usernameModal').classList.contains('hidden'));
  await E.page.evaluate(() => document.getElementById('usernameModal').classList.add('hidden'));
  await E.page.waitForTimeout(2500);
  if (askedName) console.log('   (username pop-up was up first, as for a real new player)');
  const joined = await E.page.evaluate(() => [!document.getElementById('referralWelcomeModal').classList.contains('hidden'), document.getElementById('referralWelcomeTitle').textContent]);
  ok(joined[0] && /Carol/.test(joined[1]), 'signed in: linked, "You joined with Carol\'s invite!"', joined);
  ok((await admin(`users/${erin}/referredBy/uid`)) === carol, 'the server linked Erin to Carol');
  ok((await admin(`friends/${erin}/${carol}`)) === true && (await admin(`friends/${carol}/${erin}`)) === true, 'Erin and Carol are friends');
  await admin(`users/${erin}/username`, 'PUT', 'Erin');

  // 3. Erin plays 3 counted games
  const d0 = Number(await admin(`users/${erin}/diamonds`)) || 0;
  const c0 = Number(await admin(`users/${carol}/diamonds`)) || 0;
  for (let i = 0; i < 3; i++) {
    await admin(`users/${erin}/referredBy/lastGameAt`, 'PUT', 1);
    await admin(`users/${erin}/matchCounters/lastFinishedAt`, 'PUT', 1);
    await E.page.evaluate((i) => { state.matchId = `ref_e2e_${i}`; return reportMatchFinished(); }, i);
    await E.page.waitForTimeout(800);
  }
  const erinRef = await admin(`users/${erin}/referredBy`);
  ok(erinRef && erinRef.games === 3 && erinRef.paid, 'three games complete the invite', erinRef);
  const d1 = Number(await admin(`users/${erin}/diamonds`)) || 0;
  ok(d1 - d0 >= 50, 'Erin gets 💎 50', [d0, d1]);
  ok((Number(await admin(`users/${carol}/diamonds`)) || 0) - c0 === 100, 'Carol gets 💎 100', [c0, await admin(`users/${carol}/diamonds`)]);

  // 4. Carol's Profile, Challenges and Inbox
  await C.page.evaluate(() => { document.getElementById('friendsModal').classList.add('hidden'); openProfilePanel(); });
  await C.page.waitForTimeout(3000);
  const prof = await C.page.evaluate(() => document.getElementById('profileReferralBody').textContent);
  ok(/CAROL/.test(prof) && /Erin/.test(prof) && /\+100/.test(prof) && /1\/5/.test(prof), "Carol's Profile shows the code, Erin done (+100) and Recruiter 1/5", prof.slice(0, 200));
  await C.page.evaluate(() => { document.getElementById('profileModal').classList.add('hidden'); document.getElementById('menuChallengesBtn').click(); });
  await C.page.waitForTimeout(3000);
  const ch = await C.page.evaluate(() => document.getElementById('challengesRecruitList').textContent);
  ok(/Recruiter/.test(ch) && /1\/5/.test(ch), 'Challenges → Friends: Recruiter 1/5', ch);
  await C.page.evaluate(() => { document.getElementById('challengesModal').classList.add('hidden'); document.getElementById('inboxModal').classList.remove('hidden'); renderInbox(); });
  await C.page.waitForTimeout(2500);
  const inbox = await C.page.evaluate(() => document.getElementById('inboxArea').textContent);
  ok(/joined with your invite/i.test(inbox) && /Erin/.test(inbox) && /\+100 Diamonds/.test(inbox), "Carol's Inbox: joined + paid mail", inbox.slice(0, 300));
  ok(!C.errs.length && !E.errs.length, 'no page errors', [...C.errs, ...E.errs].slice(0, 3));

  console.log(`\n${pass} passed, ${failN} failed`);
  await browser.close();
  process.exit(failN ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
