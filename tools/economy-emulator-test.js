// Tests functions/economy.js and database.rules.json together on the
// Firebase emulators: the server pays and charges correctly, and every
// direct write a cheater could try is refused.
//
//   1. npx firebase-tools emulators:start --only auth,database,functions --project shithead-pro
//   2. NODE_PATH=$SH_VIDEO_DEPS/node_modules node tools/economy-emulator-test.js
//      (needs the firebase@10.12.0 npm package; see CLAUDE.md → Promo videos)
//
// Locally the Functions emulator's admin SDK uses the "shithead-pro"
// database namespace, so the test does too.
'use strict';
const { initializeApp } = require('firebase/app');
const { getDatabase, connectDatabaseEmulator, ref, set, update, get, remove, serverTimestamp } = require('firebase/database');

const NS = 'shithead-pro';
const DB = 'http://127.0.0.1:9000';
const FN = 'http://127.0.0.1:5001/shithead-pro/europe-west1/economy';
let pass = 0, failN = 0;
const ok = (cond, label, extra) => { if (cond) { pass++; console.log('PASS', label); } else { failN++; console.log('FAIL', label, extra !== undefined ? JSON.stringify(extra) : ''); } };

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function token(uid, email, verified = true) {
  const now = Math.floor(Date.now() / 1000);
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ iss: 'https://securetoken.google.com/shithead-pro', aud: 'shithead-pro', auth_time: now, user_id: uid, sub: uid, iat: now, exp: now + 3600, email: email || `${uid}@test.local`, email_verified: verified, firebase: { sign_in_provider: 'password' } })}.`;
}
async function call(uid, data, email, verified = true) {
  const res = await fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(uid, email, verified)}` }, body: JSON.stringify({ data }) });
  const body = await res.json();
  return body.error ? { error: body.error } : body.result;
}
async function admin(path, method = 'GET', value) {
  const res = await fetch(`${DB}/${path}.json?ns=${NS}`, { method, headers: { Authorization: 'Bearer owner' }, body: value === undefined ? undefined : JSON.stringify(value) });
  return res.json();
}
const num0 = (v) => Number(v) || 0;
const clients = {};
function client(uid) {
  if (!clients[uid]) {
    const app = initializeApp({ projectId: 'shithead-pro', databaseURL: `http://127.0.0.1:9000?ns=${NS}` }, uid);
    const db = getDatabase(app);
    connectDatabaseEmulator(db, '127.0.0.1', 9000, { mockUserToken: { user_id: uid, sub: uid } });
    clients[uid] = db;
  }
  return clients[uid];
}
async function tryWrite(uid, fn) { try { await fn(client(uid)); return 'ok'; } catch (e) { return /permission/i.test(e.message) ? 'denied' : e.message; } }

(async () => {
  // Rules in force
  const rules = require('fs').readFileSync(require('path').join(__dirname, '..', 'database.rules.json'), 'utf8');
  const put = await fetch(`${DB}/.settings/rules.json?ns=${NS}`, { method: 'PUT', headers: { Authorization: 'Bearer owner' }, body: rules });
  ok(put.ok, 'rules load in the emulator', put.ok ? undefined : await put.text());
  await admin('', 'DELETE');
  await admin('friends', 'PUT', { alice: { bob: true }, bob: { alice: true } });

  // init
  let r = await call('alice', { action: 'init' });
  ok(r && r.diamonds === 0 && r.rating === 500, 'init creates a profile', r);
  r = await call('bob', { action: 'init' });
  ok(r && r.rating === 500, 'init bob', r);
  ok((await call('nobody', { action: 'bogus' })).error, 'unknown action refused');

  // Direct writes (the cheats)
  const denied = async (label, fn) => ok((await tryWrite('alice', fn)) === 'denied', `blocked: ${label}`);
  const allowed = async (label, fn) => { const out = await tryWrite('alice', fn); ok(out === 'ok', `allowed: ${label}`, out); };
  await denied('set own Diamonds', db => set(ref(db, 'users/alice/diamonds'), 999999));
  await denied('write the whole user node', db => set(ref(db, 'users/alice'), { diamonds: 5 }));
  await denied('claim a challenge', db => set(ref(db, 'users/alice/completedChallenges/burner'), { completedAt: 1, reward: 50 }));
  await denied('add an owned item', db => set(ref(db, 'users/alice/ownedCosmetics/table-royal'), { cost: 0, purchasedAt: 1 }));
  await denied('Shop purchase mirror', db => set(ref(db, 'shopPurchases/alice/cosmetics/table-royal'), { cost: 750, purchasedAt: 1 }));
  await denied('set rating', db => set(ref(db, 'users/alice/rating'), 3000));
  await denied('set wins', db => set(ref(db, 'users/alice/wins'), 3000));
  await denied('set difficulty wins', db => set(ref(db, 'users/alice/difficultyWins/hard'), 10));
  await denied('set season wins', db => set(ref(db, 'users/alice/seasonWins/halloween-2026'), 3));
  await denied('set login streak', db => set(ref(db, 'users/alice/loginStreak'), { count: 7, lastDate: '2020-01-01' }));
  await denied('set ranked stats', db => set(ref(db, 'users/alice/challengeStats'), { burns: 100 }));
  await denied('multi-path Diamonds + settings', db => update(ref(db, 'users/alice'), { diamonds: 50, settings: { a: 1 } }));
  await denied('create a free gift', db => set(ref(db, 'gifts/bob/g1'), { fromUid: 'alice', fromName: 'A', itemId: 'table-royal', cost: 750, sentAt: 1 }));
  await denied('buy a name token directly', db => set(ref(db, 'shopPurchases/alice/nameChangeToken'), { cost: 100, purchasedAt: 1 }));
  await denied('fake public rating', db => set(ref(db, 'publicProfiles/alice/rating'), 2500));
  await allowed('settings', db => set(ref(db, 'users/alice/settings'), { masterVolume: 50 }));
  await allowed('match history', db => set(ref(db, 'users/alice/matchHistory/m1'), { at: 1 }));
  await allowed('equip a free item', db => set(ref(db, 'users/alice/equippedCosmetics/avatar'), 'avatar-suit-spades'));
  await allowed('daily progress', db => set(ref(db, 'users/alice/dailyChallengeState'), { dateKey: '2026-09-25', challengeIds: ['a', 'b', 'c'], progress: { a: 1 } }));
  await allowed('tutorial flag', db => set(ref(db, 'users/alice/tutorialCompleted'), true));
  await allowed('first username', db => set(ref(db, 'users/alice/username'), 'Alice'));
  await admin('usernames/alice', 'PUT', 'alice');
  await denied('rename without a token', db => set(ref(db, 'users/alice/username'), 'Alicia'));
  await allowed('real public rating + tier', db => update(ref(db, 'publicProfiles/alice'), { rating: 500, tier: 'Bronze', username: 'Alice', online: true }));
  await denied('wrong tier for the rating', db => update(ref(db, 'publicProfiles/alice'), { rating: 500, tier: 'Master' }));
  await denied('fake leaderboard rating', db => set(ref(db, 'leaderboard/alice'), { username: 'Alice', rating: 2400, tier: 'Master', wins: 0, losses: 0 }));
  await allowed('real leaderboard entry', db => set(ref(db, 'leaderboard/alice'), { username: 'Alice', rating: 500, tier: 'Bronze', wins: 0, losses: 0 }));
  await admin('users/alice/challengeInbox', 'PUT', { x: { name: 'X', reward: 1, completedAt: 1 } });
  await allowed('delete an inbox note', db => remove(ref(db, 'users/alice/challengeInbox/x')));
  await denied('write an inbox note', db => set(ref(db, 'users/alice/challengeInbox/y'), { name: 'Y', reward: 999, completedAt: 1 }));

  // Streak
  r = await call('alice', { action: 'streak' });
  ok(r.claimed && r.claimed.count === 1 && r.claimed.reward === 10 && r.diamonds === 10, 'streak day 1 pays 10', r);
  r = await call('alice', { action: 'streak' });
  ok(!r.claimed && r.diamonds === 10, 'streak once per day', r);

  // Shop
  await admin('users/alice/diamonds', 'PUT', 1000);
  r = await call('alice', { action: 'buyItem', itemId: 'back-midnight' });
  ok(r.diamonds === 960, 'buy Midnight Royale (40)', r);
  r = await call('alice', { action: 'buyItem', itemId: 'back-midnight' });
  ok(r.error && /owned/i.test(r.error.message), 'no buying twice', r);
  r = await call('alice', { action: 'buyItem', itemId: 'table-devilish' });
  ok(r.error && /need 2000/.test(r.error.message), 'not enough Diamonds', r);
  r = await call('alice', { action: 'buyItem', itemId: 'back-valentine' });
  ok(r.error && /only sold during/.test(r.error.message), 'seasonal item out of season refused', r);
  r = await call('alice', { action: 'buyItem', itemId: 'avatar-crown-gold' });
  ok(r.error, 'earn-only picture not for sale', r);
  const owned = await admin('users/alice/ownedCosmetics');
  ok(owned && owned['back-midnight'] && !owned['avatar-crown-gold'], 'owned list right', owned);
  ok((await admin('shopPurchases/alice/cosmetics/back-midnight')) !== null, 'purchase mirror written by server');
  await allowed('equip a bought item', db => set(ref(db, 'users/alice/equippedCosmetics/cardBack'), 'back-midnight'));
  await denied('equip an unowned item', db => set(ref(db, 'users/alice/equippedCosmetics/cardBack'), 'back-neon'));

  // AmitK test account
  r = await call('amit', { action: 'init' }, 'amirk2197@googlemail.com');
  ok(r.diamonds === 999999 && r.testGrant, 'AmitK one-time grant', r);
  r = await call('amit', { action: 'buyItem', itemId: 'back-valentine' }, 'amirk2197@googlemail.com');
  ok(r.diamonds === 999999 - 300, 'AmitK buys a seasonal item any time', r);
  r = await call('amit', { action: 'buyBundle', eventId: 'halloween' }, 'amirk2197@googlemail.com');
  ok(r.price > 0 && Object.keys(r.purchases).length === 7, 'AmitK buys a seasonal bundle', r && { price: r.price, n: r.purchases && Object.keys(r.purchases).length, err: r.error });
  r = await call('amit', { action: 'init' }, 'amirk2197@googlemail.com');
  ok(r.diamonds < 999999, 'the grant never refills', r);

  // Challenges
  const cat = require('../functions/catalog.json');
  const { _test } = require('../functions/economy.js');
  // Same fixture as the game's dev test: the server must pick what the game shows.
  ok(JSON.stringify(_test.pickDailyIds('2026-09-17')) === JSON.stringify(['beat-a-bot', 'win-any-match', 'burn-with-ten']), 'daily picks match the game');
  ok(JSON.stringify(_test.pickWeeklyIds('2026-W38')) === JSON.stringify(['burn-once', 'snap-burn-once', 'win-any-match']), 'weekly picks match the game');
  const today = _test.ukDateKey();
  const picks = _test.pickDailyIds(today);
  const notPicked = cat.dailyPool.map(c => c.id).find(id => !picks.includes(id));
  r = await call('alice', { action: 'claim', id: `daily_${today}_${picks[0]}` });
  ok(r.awarded && r.awarded.reward === 20 && r.diamonds === 980, 'claim today\'s daily challenge', r);
  r = await call('alice', { action: 'claim', id: `daily_${today}_${picks[0]}` });
  ok(r.already && !r.awarded, 'daily only once', r);
  r = await call('alice', { action: 'claim', id: `daily_${today}_${notPicked}` });
  ok(r.error, 'a challenge not picked today is refused', r);
  r = await call('alice', { action: 'claim', id: 'daily_2020-01-01_burn-once' });
  ok(r.error, 'an old daily is refused', r);
  r = await call('alice', { action: 'claim', id: 'burner' });
  ok(r.error && /Not completed/.test(r.error.message), 'Burner refused without 20 Ranked burns', r);
  r = await call('alice', { action: 'claim', id: 'tutorial-quick-start' });
  ok(r.awarded && r.awarded.reward === 50, 'Quick Starter', r);
  r = await call('alice', { action: 'claim', id: 'first-game' });
  ok(r.error, 'ShitHead Virgin needs a finished game', r);

  // Matches
  r = await call('alice', { action: 'matchWin', mode: 'bots', difficulty: 'medium', matchId: 'm_a1' });
  ok(r.error && /locked/.test(r.error.message), 'locked difficulty refused', r);
  const before = (await admin('users/alice/diamonds'));
  r = await call('alice', { action: 'matchWin', mode: 'bots', difficulty: 'easy', matchId: 'm_a1' });
  ok(r.diamondsAwarded === 10 && r.difficultyWins.easy === 1, 'bot win pays 10 and counts', r);
  ok(r.claimed.some(c => c.id === 'first-win') && r.claimed.some(c => c.id === 'first-game'), 'first win also pays Beginner + ShitHead Virgin', r.claimed);
  ok(r.diamonds === before + 10 + 20 + 20, 'balance right after the win', { before, after: r.diamonds });
  r = await call('alice', { action: 'matchWin', mode: 'bots', difficulty: 'easy', matchId: 'm_a1' });
  ok(r.already, 'the same match never pays twice', r);
  r = await call('alice', { action: 'matchWin', mode: 'bots', difficulty: 'easy', matchId: 'm_a2' });
  ok(r.capped === 'too-soon' && r.diamondsAwarded === 0, 'a second win 1s later is capped', r);
  r = await call('alice', { action: 'matchWin', mode: 'online', matchId: 'm_o1', roomCode: '654321' });
  ok(r.error, 'online win without a real room refused', r);
  r = await call('alice', { action: 'matchFinished', matchId: 'm_a1' });
  ok(Array.isArray(r.claimed), 'match finished recorded', r);

  // Gifts
  await admin('users/alice/diamonds', 'PUT', 800);
  r = await call('alice', { action: 'sendGift', itemId: 'table-royal', friendUid: 'bob', friendName: 'Bob' });
  ok(r.diamonds === 50 && r.giftId, 'send a gift (750)', r);
  const gid = r.giftId;
  const gift = await admin(`gifts/bob/${gid}`);
  ok(gift && gift.itemId === 'table-royal' && gift.fromUid === 'alice', 'gift delivered by server', gift);
  r = await call('alice', { action: 'sendGift', itemId: 'table-royal', friendUid: 'carol' });
  ok(r.error, 'gifts only to friends', r);
  r = await call('bob', { action: 'claimGift', giftId: gid });
  ok(r.itemId === 'table-royal' && !r.asDiamonds, 'bob opens the gift', r);
  ok((await admin(`users/bob/ownedCosmetics/table-royal`)) !== null && (await admin(`gifts/bob/${gid}`)) === null, 'gift owned and removed');
  r = await call('bob', { action: 'claimGift', giftId: gid });
  ok(r.error, 'a gift opens once', r);

  // Ranked
  await admin('rankedMembers/123456', 'PUT', { alice: Date.now(), bob: Date.now() });
  await admin('rooms/123456', 'PUT', {
    isRanked: true, phase: 'FINISHED', matchId: 'rk_1', createdAt: Date.now(),
    players: [
      { id: 'p_host', uid: 'alice', finishRank: 1, rating: 9999, lastPlayRank: 'K', gameStats: { burnt: 8, challengeBurns: 2, jokerDeflects: 1, snapBurns: 50 } },
      { id: 'p_room1', uid: 'bob', finishRank: 2, rating: 500, gameStats: { burnt: 3 } }
    ]
  });
  // The server deals Ranked (seat order + deck), once per room
  r = await call('carol', { action: 'rankedDeal', roomCode: '123456', matchId: 'rk_1' });
  ok(r.error, 'no deal for someone not at the table', r);
  const deal = await call('alice', { action: 'rankedDeal', roomCode: '123456', matchId: 'rk_1' });
  ok(deal.matchId === 'rk_1' && deal.order.sort().join() === 'alice,bob' && new Set(deal.deck).size === 54, 'a member gets the full shuffled deal', deal);
  r = await call('bob', { action: 'rankedDeal', roomCode: '123456', matchId: 'rk_1' });
  ok(r.deck && r.deck.join() === deal.deck.join(), 'asking again for the same match gives the same deal');
  r = await call('alice', { action: 'rankedDeal', roomCode: '123456', matchId: 'rk_2' });
  ok(r.error, 'no fresh deal for the same room straight away (no fishing for a good hand)', r);
  await denied('read the server deal', db => get(ref(db, 'rankedDeals/123456')));
  const aBefore = await admin('users/alice/diamonds');
  r = await call('alice', { action: 'rankedResult', roomCode: '123456' });
  ok(r.won && r.from === 500 && r.to === 516 && r.diamondsAwarded === 20, 'Ranked win: +16 from server ratings (not the room\'s 9999), +20 Diamonds', r);
  ok(r.claimed.some(c => c.id === 'kingpin') && r.claimed.some(c => c.id === 'gotcha'), 'ending card + deflect challenges', r.claimed);
  ok(r.challengeStats.snapBurns === 12, 'per-match cap on reported snap burns', r.challengeStats);
  const rb = await call('bob', { action: 'rankedResult', roomCode: '123456' });
  ok(rb.from === 500 && rb.to === 484 && !rb.won, 'bob gets the stored result', rb);
  r = await call('alice', { action: 'rankedResult', roomCode: '123456' });
  ok(r.to === 516, 'scoring twice changes nothing', r);
  ok((await admin('users/alice/rating')) === 516 && (await admin('users/bob/rating')) === 484, 'ratings saved once');
  ok((await admin('publicProfiles/alice/rating')) === 516, 'public rating updated by the server');
  r = await call('carol', { action: 'rankedResult', roomCode: '123456' });
  ok(r.error, 'a stranger can\'t score the room', r);
  // A fake room with a victim who never sat there is refused
  await admin('users/carol', 'PUT', { rating: 900, wins: 3, losses: 0, diamonds: 0 });
  await admin('rankedMembers/333333/alice', 'PUT', Date.now());
  await admin('rooms/333333', 'PUT', { isRanked: true, matchId: 'rk_fake', players: [{ uid: 'alice', finishRank: 1 }, { uid: 'carol', finishRank: 2 }] });
  r = await call('alice', { action: 'rankedResult', roomCode: '333333' });
  ok(r.error && (await admin('users/carol/rating')) === 900, 'a fake room with someone who never sat there is refused', r);
  ok(await tryWrite('alice', db => set(ref(db, 'rankedMembers/444444/alice'), serverTimestamp())) === 'ok', 'allowed: marking yourself as seated (as the game does)');
  ok(await tryWrite('alice', db => set(ref(db, 'rankedMembers/444444/carol'), Date.now())) === 'denied', 'blocked: marking someone else as seated');
  ok(await tryWrite('alice', db => set(ref(db, 'rankedMembers/444444/alice'), 1)) === 'denied', 'blocked: a back-dated seat marker');
  // The same two accounts: at most 5 scored matches a day
  let limited = null;
  for (let i = 0; i < 6; i++) {
    const code = String(500000 + i);
    await admin(`rankedMembers/${code}`, 'PUT', { alice: Date.now(), bob: Date.now() });
    await admin(`rooms/${code}`, 'PUT', { isRanked: true, matchId: `rk_pair_${i}`, players: [{ uid: 'alice', finishRank: 1 }, { uid: 'bob', finishRank: 2 }] });
    limited = await call('alice', { action: 'rankedResult', roomCode: code });
  }
  ok(limited.error && /a lot today/.test(limited.error.message), 'sixth scored match against the same opponent today refused (first one earlier + 4 more)', limited);
  await admin('rooms/222222', 'PUT', { isRanked: false, players: [{ uid: 'alice', finishRank: 1 }, { uid: 'bob', finishRank: 2 }] });
  r = await call('alice', { action: 'rankedResult', roomCode: '222222' });
  ok(r.error, 'casual room is not Ranked', r);

  // Name change token
  await admin('users/alice/diamonds', 'PUT', 150);
  r = await call('alice', { action: 'buyNameToken' });
  ok(r.diamonds === 50, 'buy name token', r);
  await admin('usernames/alicia', 'PUT', 'alice');
  await allowed('rename with the token', db => update(ref(db), { 'users/alice/username': 'Alicia', 'shopPurchases/alice/nameChangeToken/usedAt': Date.now() }));
  await denied('rename again', db => set(ref(db, 'users/alice/username'), 'Alice2'));

  // Sync grants milestone pictures from server data only
  await admin('users/bob/rating', 'PUT', 1600);
  r = await call('bob', { action: 'sync' });
  ok(r.newAvatars.some(a => a.id === 'avatar-crown-gold') && r.claimed.some(c => c.id === 'reach-gold'), 'sync: Gold Crown + Reach Gold from the real rating', r);

  // Friends' "in a match" status
  await allowed('set own playing status', db => set(ref(db, 'publicProfiles/alice/playing'), { mode: 'online', room: '424242', at: 1 }));
  await allowed('bots status without a room', db => set(ref(db, 'publicProfiles/alice/playing'), { mode: 'bots', at: 1 }));
  await allowed('clear playing status', db => set(ref(db, 'publicProfiles/alice/playing'), null));
  await denied('bad playing mode', db => set(ref(db, 'publicProfiles/alice/playing'), { mode: 'hacked', at: 1 }));
  await denied('bad playing room', db => set(ref(db, 'publicProfiles/alice/playing'), { mode: 'online', room: '../x', at: 1 }));
  await denied("someone else's playing status", db => set(ref(db, 'publicProfiles/bob/playing'), { mode: 'bots', at: 1 }));

  // Player reports
  await allowed('report another player', db => set(ref(db, 'playerReports/bob/alice'), { reason: 'cheating', at: 1, note: 'x', mode: 'ranked', room: '424242' }));
  await denied('report yourself', db => set(ref(db, 'playerReports/alice/alice'), { reason: 'cheating', at: 1 }));
  await denied('report as someone else', db => set(ref(db, 'playerReports/carol/bob'), { reason: 'cheating', at: 1 }));
  await denied('unknown report reason', db => set(ref(db, 'playerReports/bob/alice'), { reason: 'spam', at: 1 }));
  await denied('extra report fields', db => set(ref(db, 'playerReports/bob/alice'), { reason: 'other', at: 1, diamonds: 5 }));
  await denied('read player reports', db => get(ref(db, 'playerReports')));
  await denied('delete reports', db => set(ref(db, 'playerReports/bob'), null));

  // Health records (menu → Error Reports → HEALTH)
  const hrec = { uid: 'alice', v: 'v146', device: 'iphone', at: 1, loadMs: 1200, app: true, frames: { n: 10, slow: 1, ms: 170 }, counts: { botsStarted: 1 } };
  await allowed('save own health record', db => set(ref(db, 'health/2026-09-25/sabc1234'), hrec));
  await denied('health record for another account', db => set(ref(db, 'health/2026-09-25/sabc9999'), { ...hrec, uid: 'bob' }));
  await denied('bad health device', db => set(ref(db, 'health/2026-09-25/sabc5555'), { ...hrec, device: 'toaster' }));
  await denied('extra health fields', db => set(ref(db, 'health/2026-09-25/sabc6666'), { ...hrec, diamonds: 5 }));
  await denied('read health records', db => get(ref(db, 'health')));

  // Gauntlet: 5 one-bot games, 3 lives, once a day
  await call('dave', { action: 'init' });
  const backdate = () => admin('users/dave/gauntlet/run/lastAt', 'PUT', Date.now() - 31000);
  const gGame = async (runId, won, begin = true) => {
    if (begin) await call('dave', { action: 'gauntlet', op: 'begin', runId });
    if (won) await backdate();
    return call('dave', { action: 'gauntlet', op: 'result', runId, won });
  };
  let g = await call('dave', { action: 'gauntlet', op: 'start' });
  ok(g.run && g.run.round === 0 && g.run.lives === 3 && g.run.playing, 'Gauntlet run starts with 3 lives, first game on', g);
  const runId = g.run.id;
  r = await call('dave', { action: 'gauntlet', op: 'result', runId, won: true });
  ok(r.error, 'a win straight after the start is too quick to count', r);
  r = await call('dave', { action: 'gauntlet', op: 'result', runId: 'gnope', won: false });
  ok(r.error, 'a result for another run is refused', r);
  r = await gGame(runId, false, false);
  ok(r.run && r.run.lives === 2 && r.run.round === 0 && !r.over, 'a loss costs a life, same bot again', r);
  r = await call('dave', { action: 'gauntlet', op: 'result', runId, won: false });
  ok(r.error, 'no result without a game in progress', r);
  await call('dave', { action: 'gauntlet', op: 'begin', runId });
  r = await call('dave', { action: 'gauntlet', op: 'begin', runId });
  ok(r.forfeited && r.run && r.run.lives === 1 && r.run.playing, 'leaving a game half-way costs a life', r);
  await backdate();
  r = await call('dave', { action: 'gauntlet', op: 'result', runId, won: true });
  for (let i = 0; i < 3; i++) r = await gGame(runId, true);
  ok(r.run && r.run.round === 4 && r.run.lives === 1 && !r.completed, 'four wins reach the boss', r);
  r = await gGame(runId, true);
  ok(r.completed && r.first && r.diamondsAwarded === 200 && r.diamonds === 200 && r.newItems.length === 2 && !r.run, 'beating the boss the first time pays 200 + picture + frame', r);
  const gOwned = await admin('users/dave/ownedCosmetics');
  ok(gOwned && gOwned['avatar-gauntlet'] && gOwned['frame-gauntlet'], 'Gauntlet picture and frame owned', gOwned);
  ok(await admin(`users/dave/challengeInbox`) !== null, 'Gauntlet mail sent');
  ok((await admin('users/dave/completedChallenges/gauntlet-first'))?.reward === 200, 'first clear is a completed challenge (Bots tab)');
  await admin('users/dave/completedChallenges/gauntlet-first', 'DELETE');
  const daveD = await admin('users/dave/diamonds');
  await call('dave', { action: 'sync' });
  ok(!!(await admin('users/dave/completedChallenges/gauntlet-first')) && (await admin('users/dave/diamonds')) === daveD, 'an older first clear is recorded at sync without paying again');
  r = await call('dave', { action: 'gauntlet', op: 'start' });
  ok(r.error, 'only once a day', r);
  g = await call('dave', { action: 'gauntlet', op: 'status' });
  ok(g.doneToday && g.completions === 1 && g.firstDone && !g.run, 'status shows today done', g);
  const daveCan = async (label, fn) => { const out = await tryWrite('dave', fn); ok(out === 'ok', `allowed: ${label}`, out); };
  await daveCan('equip the Gauntlet frame', db => set(ref(db, 'users/dave/equippedCosmetics/frame'), 'frame-gauntlet'));
  await daveCan('equip the Gauntlet picture', db => set(ref(db, 'users/dave/equippedCosmetics/avatar'), 'avatar-gauntlet'));
  await denied('equip the Gauntlet frame without it', db => set(ref(db, 'users/alice/equippedCosmetics/frame'), 'frame-gauntlet'));
  ok((await tryWrite('dave', db => set(ref(db, 'users/dave/gauntlet/doneDay'), 'x'))) === 'denied', 'blocked: write your own Gauntlet record');
  r = await call('alice', { action: 'buyItem', itemId: 'frame-gauntlet' });
  ok(r.error, 'the Gauntlet frame is not for sale', r);
  // Next day: 50 Diamonds, no second copy of the items
  await admin('users/dave/gauntlet/doneDay', 'PUT', '2000-01-01');
  g = await call('dave', { action: 'gauntlet', op: 'start' });
  r = await gGame(g.run.id, true, false);
  for (let i = 0; i < 4; i++) r = await gGame(g.run.id, true);
  ok(r.completed && !r.first && r.diamondsAwarded === 50 && r.diamonds === 250 && r.newItems.length === 0, 'a later day pays 50', r);
  const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  ok((await admin(`users/dave/completedChallenges/gauntlet_${todayKey}`))?.reward === 50, "a daily clear is that day's Daily Gauntlet challenge");
  // Three losses end the run
  await admin('users/dave/gauntlet/doneDay', 'PUT', '2000-01-01');
  g = await call('dave', { action: 'gauntlet', op: 'start' });
  r = await gGame(g.run.id, false, false);
  for (let i = 0; i < 2; i++) r = await gGame(g.run.id, false);
  ok(r.over && !r.run, 'losing all 3 lives ends the run', r);
  ok((await admin('users/dave/difficultyWins')) === null, 'Gauntlet wins never count toward difficulty unlocks');

  // Referrals: invite codes, linking new players, rewards after 3 real games
  await call('carol', { action: 'init' });
  await admin('users/carol/username', 'PUT', 'Carol');
  r = await call('carol', { action: 'referral', op: 'code' }, undefined, false);
  ok(r.error, 'no invite code without a verified email', r);
  r = await call('carol', { action: 'referral', op: 'code' });
  ok(r.code === 'CAROL' && r.recruits.length === 0, 'invite code made from the username', r);
  r = await call('carol', { action: 'referral', op: 'code' });
  ok(r.code === 'CAROL', 'asking again keeps the same code', r);
  r = await call('carol', { action: 'referral', op: 'claim', code: 'CAROL' });
  ok(r.error, "can't use your own invite", r);
  await admin('users/bob/createdAt', 'DELETE'); // accounts from before referrals have no createdAt
  r = await call('bob', { action: 'referral', op: 'claim', code: 'CAROL' });
  ok(r.error, 'an existing (old) account cannot use an invite', r);
  await call('erin', { action: 'init' });
  await admin('users/erin/username', 'PUT', 'Erin');
  r = await call('erin', { action: 'referral', op: 'claim', code: 'NOPE99' });
  ok(r.error, 'an unknown code is refused', r);
  r = await call('erin', { action: 'referral', op: 'claim', code: 'CAROL' }, undefined, false);
  ok(r.error, 'an invite needs a verified email', r);
  r = await call('erin', { action: 'referral', op: 'claim', code: 'carol' });
  ok(r.inviterName === 'Carol' && r.referredBy && r.referredBy.games === 0, 'a new player links to the inviter (code in any case)', r);
  ok((await admin('friends/erin/carol')) === true && (await admin('friends/carol/erin')) === true, 'inviter and new player are made friends');
  const joinMail = await admin('users/carol/activityInbox/referral_join_erin');
  ok(joinMail && joinMail.type === 'referral' && joinMail.event === 'joined', 'the inviter is told someone joined', joinMail);
  r = await call('erin', { action: 'referral', op: 'claim', code: 'CAROL' });
  ok(r.error, 'an account links to one invite only', r);
  await call('carol', { action: 'sync' }); await call('erin', { action: 'sync' }); // pay anything already due first
  const erinDiamonds0 = num0(await admin('users/erin/diamonds')), carolDiamonds0 = num0(await admin('users/carol/diamonds'));
  const refGame = async (uid, id) => {
    await admin(`users/${uid}/matchCounters/lastFinishedAt`, 'PUT', 1);
    return call(uid, { action: 'matchFinished', matchId: id });
  };
  r = await refGame('erin', 'rf1');
  ok(r.referral && r.referral.games === 1, 'first game counts toward the invite', r);
  r = await refGame('erin', 'rf2');
  ok(!r.referral, 'a game straight after another does not count (must be a real game)', r);
  await admin('users/erin/referredBy/lastGameAt', 'PUT', 1);
  r = await refGame('erin', 'rf3');
  ok(r.referral && r.referral.games === 2, 'second game counts', r);
  ok((await admin('users/carol/referrals/erin/games')) === 2, "the inviter sees the new player's progress");
  await admin('users/erin/referredBy/lastGameAt', 'PUT', 1);
  r = await refGame('erin', 'rf4');
  ok(r.referral && r.referral.paid, 'third game completes the invite', r);
  ok(num0(await admin('users/erin/diamonds')) - erinDiamonds0 >= 50, 'new player gets 50 💎', await admin('users/erin/diamonds'));
  ok(num0(await admin('users/carol/diamonds')) - carolDiamonds0 === 100, 'inviter gets 100 💎', await admin('users/carol/diamonds'));
  ok((await admin('users/carol/referralStats/recruits')) === 1, 'one recruit counted');
  await admin('users/erin/referredBy/lastGameAt', 'PUT', 1);
  r = await refGame('erin', 'rf5');
  ok(!r.referral, 'nothing more after the invite is paid', r);
  ok(num0(await admin('users/carol/diamonds')) - carolDiamonds0 === 100, 'the inviter is paid once');
  r = await call('carol', { action: 'referral', op: 'status' });
  ok(r.recruits.length === 1 && r.recruits[0].name === 'Erin' && r.recruits[0].done && r.recruited === 1 && r.paidThisMonth === 1, 'status lists recruits', r);
  // Monthly cap, then the 5th recruit: Recruiter picture + challenge
  const month = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit' }).format(new Date());
  await admin('users/carol/referralStats', 'PATCH', { month, paidThisMonth: 10, recruits: 4 });
  await call('fay', { action: 'init' });
  await admin('users/fay/username', 'PUT', 'Fay');
  await call('fay', { action: 'referral', op: 'claim', code: 'CAROL' });
  const carolBefore = num0(await admin('users/carol/diamonds'));
  for (let i = 0; i < 3; i++) { await admin('users/fay/referredBy/lastGameAt', 'PUT', 1); r = await refGame('fay', `ff${i}`); }
  ok(r.referral && r.referral.paid && num0(await admin('users/fay/diamonds')) >= 50, 'the new player is still paid when the inviter is capped', r);
  const carolAfter = num0(await admin('users/carol/diamonds'));
  ok(carolAfter - carolBefore === 250, 'capped: no 100 💎 for the inviter, but the Recruiter challenge pays 250', carolAfter - carolBefore);
  ok((await admin('users/carol/referralStats/recruits')) === 5, 'still counts as a recruit');
  ok(!!(await admin('users/carol/ownedCosmetics/avatar-recruiter')), 'Recruiter picture unlocked at 5 recruits');
  ok(!!(await admin('users/carol/completedChallenges/recruit-five')), 'Recruit 5 players challenge completed');
  const capMail = await admin('users/carol/activityInbox/referral_fay');
  ok(capMail && capMail.event === 'capped', 'the inviter is told the monthly limit was reached', capMail);
  // Rules: all of it is server-only
  const erinCan = (fn) => tryWrite('erin', fn);
  ok((await erinCan(db => set(ref(db, 'users/erin/referredBy/paid'), false))) === 'denied', 'blocked: rewriting your own invite');
  ok((await erinCan(db => set(ref(db, 'users/erin/createdAt'), Date.now()))) === 'denied', 'blocked: making your account look new');
  ok((await tryWrite('carol', db => set(ref(db, 'users/carol/referralStats/recruits'), 99))) === 'denied', 'blocked: faking recruits');
  ok((await tryWrite('carol', db => set(ref(db, 'users/carol/referrals/x'), { name: 'x' }))) === 'denied', 'blocked: adding a fake recruit');
  ok((await erinCan(db => get(ref(db, 'referralCodes')))) === 'denied', 'blocked: reading the invite codes');
  ok((await erinCan(db => set(ref(db, 'referralCodes/ERIN'), { uid: 'erin' }))) === 'denied', 'blocked: making your own code by hand');

  // Account data: export, deletion with a 7-day recovery window, the purge
  await call('gina', { action: 'init' });
  await admin('', 'PATCH', {
    'users/gina/username': 'Gina', 'usernames/gina': 'gina',
    'friends/gina/alice': true, 'friends/alice/gina': true, 'friendRequests/bob/gina': { name: 'Gina', sentAt: 1 },
    'publicProfiles/gina': { username: 'Gina', rating: 500 }, 'leaderboard/gina': { username: 'Gina', rating: 500, tier: 'Bronze', wins: 0, losses: 0 },
    'playerReports/bob/gina': { reason: 'other', at: 1 }, 'referralCodes/GINA': { uid: 'gina', at: 1 }, 'pushTokens/gina/k1': { token: 't', at: 1 }
  });
  r = await call('gina', { action: 'accountData' });
  ok(r.account && r.account.uid === 'gina' && r.account.username === 'Gina' && r.profile && r.profile.username === 'Gina', 'export: account and profile', r.account);
  ok(r.friends.join() === 'alice' && r.friendRequestsSent.length === 1 && r.friendRequestsSent[0].toUid === 'bob', 'export: friends and requests sent', [r.friends, r.friendRequestsSent]);
  ok(r.playerReportsMade.length === 1 && !JSON.stringify(r).includes('"token"'), 'export: reports made, push tokens left out');
  r = await call('gina', { action: 'deleteAccount', op: 'request' });
  const del = await admin('users/gina/deletion');
  ok(del && del.purgeAt - del.requestedAt === 7 * 864e5, 'delete: a 7-day recovery window', del);
  ok((await admin('publicProfiles/gina')) === null && (await admin('leaderboard/gina')) === null, 'delete: hidden from profiles and the leaderboard at once');
  ok((await admin('users/gina/username')) === 'Gina' && (await admin('usernames/gina')) === 'gina', 'delete: data and username kept during the window');
  r = await call('gina', { action: 'deleteAccount', op: 'status' });
  ok(r.deletion && r.deletion.purgeAt === del.purgeAt, 'delete: status shows the date', r);
  r = await call('gina', { action: 'deleteAccount', op: 'cancel' });
  ok(!r.deletion && (await admin('users/gina/deletion')) === null, 'delete: signing back in can cancel it', r);
  ok((await tryWrite('gina', db => set(ref(db, 'users/gina/deletion'), { requestedAt: 1, purgeAt: 2 }))) === 'denied', 'blocked: writing your own deletion');
  await call('gina', { action: 'deleteAccount', op: 'request' });
  await admin('users/gina/deletion/purgeAt', 'PUT', Date.now() - 1000);
  await call('alice', { action: 'deleteAccount', op: 'request' }); // not due yet: must survive
  process.env.FIREBASE_DATABASE_EMULATOR_HOST = '127.0.0.1:9000';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  const fAdmin = require('../functions/node_modules/firebase-admin');
  if (!fAdmin.apps.length) fAdmin.initializeApp({ projectId: 'shithead-pro', databaseURL: `http://127.0.0.1:9000?ns=${NS}` });
  const purged = await require('../functions/account').purgeDueAccounts();
  ok(purged.join() === 'gina', 'purge: only accounts past their window', purged);
  const gone = await Promise.all(['users/gina', 'friends/gina', 'friends/alice/gina', 'friendRequests/bob/gina', 'usernames/gina', 'referralCodes/GINA', 'playerReports/bob/gina', 'pushTokens/gina'].map(p => admin(p)));
  ok(gone.every(v => v === null), 'purge: erased everywhere, including friends\' lists, requests, username and code', gone);
  ok((await admin('users/alice/username')) !== undefined && (await admin('users/alice')) !== null, 'purge: other accounts untouched');
  await call('alice', { action: 'deleteAccount', op: 'cancel' });

  console.log(`\n${pass} passed, ${failN} failed`);
  process.exit(failN ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
