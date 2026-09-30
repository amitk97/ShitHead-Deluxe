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
  await allowed('equip the free Oak Wood table', db => set(ref(db, 'users/alice/equippedCosmetics/tableTheme'), 'table-wood'));
  await allowed('equip the free Classic Felt table', db => set(ref(db, 'users/alice/equippedCosmetics/tableTheme'), 'table-felt'));
  await denied('equip an unowned Shop table', db => set(ref(db, 'users/alice/equippedCosmetics/tableTheme'), 'table-angelic'));
  await allowed('daily progress', db => set(ref(db, 'users/alice/dailyChallengeState'), { dateKey: '2026-09-25', challengeIds: ['a', 'b', 'c'], progress: { a: 1 } }));
  await allowed('tutorial flag', db => set(ref(db, 'users/alice/tutorialCompleted'), true));
  await allowed('first username', db => set(ref(db, 'users/alice/username'), 'Alice'));
  await admin('usernames/alice', 'PUT', 'alice');
  await denied('rename without a token', db => set(ref(db, 'users/alice/username'), 'Alicia'));
  await allowed('real public rating + tier', db => update(ref(db, 'publicProfiles/alice'), { rating: 500, tier: 'Bronze', username: 'Alice', online: true }));
  await denied('wrong tier for the rating', db => update(ref(db, 'publicProfiles/alice'), { rating: 500, tier: 'Master' }));
  await denied('fake leaderboard rating', db => set(ref(db, 'leaderboard/alice'), { username: 'Alice', rating: 2400, tier: 'Master', wins: 0, losses: 0 }));
  await allowed('real leaderboard entry', db => set(ref(db, 'leaderboard/alice'), { username: 'Alice', rating: 500, tier: 'Bronze', wins: 0, losses: 0 }));
  await denied('fake leaderboard level', db => update(ref(db, 'leaderboard/alice'), { level: 50 }));
  await admin('users/alice/xp', 'PUT', { total: 2200, level: 10 });
  await allowed('real leaderboard level', db => update(ref(db, 'leaderboard/alice'), { level: 10 }));
  await allowed('the phone updates its entry without touching the level', db => update(ref(db, 'leaderboard/alice'), { username: 'Alice', rating: 500, tier: 'Bronze', wins: 0, losses: 0 }));
  await admin('users/alice/xp', 'DELETE');
  await admin('leaderboard/alice/level', 'DELETE');
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
  // Premium effects (v189): bought at their price and equippable; unowned refused.
  await admin('users/alice/diamonds', 'PUT', 3000);
  r = await call('alice', { action: 'buyItem', itemId: 'burn-origami' });
  ok(r.diamonds === 500, 'buy Origami Fold (2500)', r);
  await allowed('equip a premium burn', db => set(ref(db, 'users/alice/equippedCosmetics/burnEffect'), 'burn-origami'));
  await denied('equip an unowned premium Joker', db => set(ref(db, 'users/alice/equippedCosmetics/jokerEffect'), 'joker-portal'));
  await denied('equip an unowned premium victory', db => set(ref(db, 'users/alice/equippedCosmetics/victoryEffect'), 'victory-origami'));
  // Premium pictures (2500) and tables (3000), v196.
  await admin('users/alice/diamonds', 'PUT', 5600);
  r = await call('alice', { action: 'buyItem', itemId: 'avatar-phoenix' });
  ok(r.error && (await admin('users/alice/diamonds')) === 5600, 'Phoenix is no longer sold', r);
  r = await call('alice', { action: 'buyItem', itemId: 'avatar-royal-flush' });
  ok(r.diamonds === 3100, 'buy Royal Flush (2500)', r);
  r = await call('alice', { action: 'buyItem', itemId: 'table-space' });
  ok(r.diamonds === 100, 'buy Deep Space (3000)', r);
  await allowed('equip a premium picture', db => set(ref(db, 'users/alice/equippedCosmetics/avatar'), 'avatar-royal-flush'));
  await allowed('equip a premium table', db => set(ref(db, 'users/alice/equippedCosmetics/tableTheme'), 'table-space'));
  await denied('equip an unowned premium picture', db => set(ref(db, 'users/alice/equippedCosmetics/avatar'), 'avatar-cosmic-ace'));
  await denied('equip an unowned premium table', db => set(ref(db, 'users/alice/equippedCosmetics/tableTheme'), 'table-neon'));
  await denied('equip a made-up table', db => set(ref(db, 'users/alice/equippedCosmetics/tableTheme'), 'table-neonx'));
  // v197: new card backs and decks are sold at their price; backs equip once owned.
  await admin('users/alice/diamonds', 'PUT', 2000);
  r = await call('alice', { action: 'buyItem', itemId: 'back-dragon' });
  ok(r.diamonds === 1000, 'buy Dragon Scale (1000)', r);
  r = await call('alice', { action: 'buyItem', itemId: 'deck-royalgold' });
  ok(r.diamonds === 0, 'buy Royal Gold deck (1000)', r);
  await allowed('equip a new card back', db => set(ref(db, 'users/alice/equippedCosmetics/cardBack'), 'back-dragon'));
  await denied('equip an unowned new card back', db => set(ref(db, 'users/alice/equippedCosmetics/cardBack'), 'back-stained'));
  await allowed('showcase a deck', db => set(ref(db, 'publicProfiles/alice/showcase/deck'), 'deck-royalgold'));
  // v218: premium photo pictures at 5000.
  await admin('users/alice/diamonds', 'PUT', 4999);
  r = await call('alice', { action: 'buyItem', itemId: 'avatar-sapphire-sovereign' });
  ok(r.error && /need 5000/.test(r.error.message), 'Sapphire Sovereign refused at 4999', r);
  await admin('users/alice/diamonds', 'PUT', 10000);
  r = await call('alice', { action: 'buyItem', itemId: 'avatar-sapphire-sovereign' });
  ok(r.diamonds === 5000, 'buy Sapphire Sovereign (5000)', r);
  r = await call('alice', { action: 'buyItem', itemId: 'avatar-sapphire-sovereign' });
  ok(r.error && /owned/i.test(r.error.message) && (await admin('users/alice/diamonds')) === 5000, 'no buying Sapphire Sovereign twice', r);
  r = await call('alice', { action: 'buyItem', itemId: 'avatar-crimson-inferno' });
  ok(r.diamonds === 0, 'buy Crimson Inferno (5000)', r);
  await admin('users/alice/diamonds', 'PUT', 5000);
  r = await call('alice', { action: 'buyItem', itemId: 'avatar-turtley' });
  ok(r.diamonds === 0, 'buy Turtley (5000)', r);
  await allowed('equip Turtley', db => set(ref(db, 'users/alice/equippedCosmetics/avatar'), 'avatar-turtley'));
  ok((await admin('users/alice/ownedCosmetics/avatar-sapphire-sovereign')) !== null && (await admin('users/alice/ownedCosmetics/avatar-crimson-inferno')) !== null, 'both saved to the account');
  await allowed('equip a premium photo picture', db => set(ref(db, 'users/alice/equippedCosmetics/avatar'), 'avatar-sapphire-sovereign'));
  await allowed('equip the other one', db => set(ref(db, 'users/alice/equippedCosmetics/avatar'), 'avatar-crimson-inferno'));
  await denied('equip an unowned premium photo picture', db => set(ref(db, 'users/alice/equippedCosmetics/avatar'), 'avatar-scarlet-guardian'));
  await denied('equip a made-up picture', db => set(ref(db, 'users/alice/equippedCosmetics/avatar'), 'avatar-sapphire-sovereignx'));
  await admin('users/alice/diamonds', 'PUT', 960);

  // AmitK test account
  r = await call('amit', { action: 'init' }, 'amirk2197@googlemail.com');
  ok(r.diamonds === 999999 && r.testGrant, 'AmitK one-time grant', r);
  r = await call('amit', { action: 'buyItem', itemId: 'back-valentine' }, 'amirk2197@googlemail.com');
  ok(r.diamonds === 999999 - 300, 'AmitK buys a seasonal item any time', r);
  r = await call('amit', { action: 'buyBundle', eventId: 'halloween' }, 'amirk2197@googlemail.com');
  ok(r.price > 0 && Object.keys(r.purchases).length === 8, 'AmitK buys a seasonal bundle (8 items incl. the Joker effect)', r && { price: r.price, n: r.purchases && Object.keys(r.purchases).length, err: r.error });
  r = await call('amit', { action: 'init' }, 'amirk2197@googlemail.com');
  ok(r.diamonds < 999999, 'the grant never refills', r);

  // Challenges
  const cat = require('../functions/catalog.json');
  const { _test } = require('../functions/economy.js');
  // Same fixture as the game's dev test: the server must pick what the game shows.
  ok(JSON.stringify(_test.pickDailyIds('2026-09-17')) === JSON.stringify(['beat-a-bot', 'win-any-match', 'burn-with-ten']), 'daily picks match the game');
  ok(JSON.stringify(_test.pickWeeklyIds('2026-W38')) === JSON.stringify(['burn-once', 'snap-burn-once', 'win-any-match']), 'weekly picks match the game');
  ok(JSON.stringify(_test.pickWeeklyIds('2026-W41')) === JSON.stringify(['snap-burn-once', 'win-streak', 'pile-diver', 'play-facedown', 'rank-triple']), 'weekly picks from 2026-W41 (5 a week) match the game');
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
  // Seasonal challenges: only while that event is on; the bonus needs all four.
  r = await call('alice', { action: 'claim', id: 'season_halloween-2020_burn-once' });
  ok(r.error && /ended/.test(r.error.message), 'a seasonal challenge from a past event is refused', r);
  {
    const hw = new Date('2026-10-20T12:00:00Z');
    const key = 'halloween-2026';
    const c = (id, u = {}) => _test.challengeForKey(`season_${key}_${id}`, u, hw);
    ok(c('burn-once').reward === 275 && c('win-any-match').reward === 440, 'seasonal rewards come from the catalog', c('burn-once'));
    ok(c('nope').error, 'an unknown seasonal challenge is refused');
    ok(/Not completed/.test(c('all').error || ''), 'the Season Complete bonus needs all four first');
    const done = Object.fromEntries(cat.seasonalChallenges.map(x => [`season_${key}_${x.id}`, { reward: x.reward }]));
    ok(c('all', { completedChallenges: done }).reward === 550, 'the bonus pays once all four are done');
    ok(_test.challengeForKey(`season_${key}_burn-once`, {}, new Date('2026-12-01T12:00:00Z')).error, 'refused after the event');
  }
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
  await admin('users/alice/diamonds', 'PUT', 5000);
  r = await call('alice', { action: 'sendGift', itemId: 'avatar-scarlet-guardian', friendUid: 'bob', friendName: 'Bob' });
  ok(r.diamonds === 0 && r.giftId, 'gift Scarlet Guardian (5000)', r);
  r = await call('bob', { action: 'claimGift', giftId: r.giftId });
  ok(r.itemId === 'avatar-scarlet-guardian' && !r.asDiamonds && (await admin('users/bob/ownedCosmetics/avatar-scarlet-guardian')) !== null, 'bob opens the premium picture', r);
  ok((await tryWrite('bob', db => set(ref(db, 'users/bob/equippedCosmetics/avatar'), 'avatar-scarlet-guardian'))) === 'ok', 'bob equips the gifted picture');
  await admin('users/alice/diamonds', 'PUT', 50);

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
  ok(r.won && r.from === 500 && r.to === 526 && r.elo === 16 && r.winBonus === 10 && r.streak === 1 && r.streakBonus === 0 && r.diamondsAwarded === 20, 'Ranked win: +16 Elo from server ratings (not the room\'s 9999) + 10 win bonus, +20 Diamonds', r);
  ok(r.claimed.some(c => c.id === 'kingpin') && r.claimed.some(c => c.id === 'gotcha'), 'ending card + deflect challenges', r.claimed);
  ok(r.challengeStats.snapBurns === 12, 'per-match cap on reported snap burns', r.challengeStats);
  const rb = await call('bob', { action: 'rankedResult', roomCode: '123456' });
  ok(rb.from === 500 && rb.to === 484 && !rb.won && rb.winBonus === 0 && rb.streakBonus === 0, 'bob gets the stored result (a loss is only the Elo change)', rb);
  r = await call('alice', { action: 'rankedResult', roomCode: '123456' });
  ok(r.to === 526, 'scoring twice changes nothing', r);
  ok((await admin('users/alice/rating')) === 526 && (await admin('users/bob/rating')) === 484, 'ratings saved once');
  ok((await admin('publicProfiles/alice/rating')) === 526, 'public rating updated by the server');
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
  const streakRuns = [];
  for (let i = 0; i < 6; i++) {
    const code = String(500000 + i);
    await admin(`rankedMembers/${code}`, 'PUT', { alice: Date.now(), bob: Date.now() });
    await admin(`rooms/${code}`, 'PUT', { isRanked: true, matchId: `rk_pair_${i}`, players: [{ uid: 'alice', finishRank: 1 }, { uid: 'bob', finishRank: 2 }] });
    limited = await call('alice', { action: 'rankedResult', roomCode: code });
    if (!limited.error) streakRuns.push([limited.streak, limited.streakBonus, limited.to - limited.from === limited.elo + 10 + limited.streakBonus]);
  }
  ok(JSON.stringify(streakRuns) === JSON.stringify([[2, 5, true], [3, 10, true], [4, 0, true], [5, 15, true]]), 'win streak bonuses: +5 at 2, +10 at 3, none at 4, +15 at 5 (never stacked)', streakRuns);
  ok(limited.error && /a lot today/.test(limited.error.message), 'sixth scored match against the same opponent today refused (first one earlier + 4 more)', limited);
  // A stalemate draw: nobody wins, level Elo, no win bonus, streaks and W/L kept
  const bobBefore = await admin('users/bob');
  await admin('rankedMembers/600000', 'PUT', { carol: Date.now(), bob: Date.now() });
  await admin('rooms/600000', 'PUT', { isRanked: true, matchId: 'rk_draw', players: [{ uid: 'carol', finishRank: 1, drew: true }, { uid: 'bob', finishRank: 1, drew: true }] });
  r = await call('bob', { action: 'rankedResult', roomCode: '600000' });
  const bobAfter = await admin('users/bob');
  ok(r.drew && !r.won && r.winBonus === 0 && r.streakBonus === 0 && r.to - r.from === r.elo && r.elo > 0, 'draw: level Elo only (the lower rating gains a little)', r);
  ok(bobAfter.losses === bobBefore.losses && bobAfter.wins === bobBefore.wins && bobAfter.rankedStats.draws === 1
    && bobAfter.rankedStats.currentLossStreak === bobBefore.rankedStats.currentLossStreak, 'draw: wins, losses and streaks unchanged, draws counted', bobAfter.rankedStats);
  ok(r.claimed.some(c => c.id === 'draw-a-game' && c.reward === 420), 'draw: the hidden Draw a Game challenge pays 420', r.claimed);
  // Casual online: a draw claim needs the room to show this seat drawn
  await admin('rooms/600001', 'PUT', { isRanked: false, phase: 'FINISHED', players: [{ uid: 'alice', finishRank: 1 }, { uid: 'carol', finishRank: 2 }] });
  r = await call('alice', { action: 'matchFinished', matchId: 'm_fake_draw', drew: true, roomCode: '600001' });
  ok(!(await admin('users/alice/matchCounters/draws')) && !r.claimed.some(c => c.id === 'draw-a-game'), 'a draw the room doesn\'t show is not counted', r);
  // Vs Bots: the phone reports it (counted even straight after another finish)
  r = await call('alice', { action: 'matchFinished', matchId: 'm_bot_draw', drew: true });
  ok((await admin('users/alice/matchCounters/draws')) === 1 && r.claimed.some(c => c.id === 'draw-a-game'), 'a Vs Bots draw counts and pays Draw a Game', r);
  r = await call('alice', { action: 'matchFinished', matchId: 'm_bot_draw', drew: true });
  ok((await admin('users/alice/matchCounters/draws')) === 1 && !r.claimed.length, 'the same match twice counts once, paid once', r);
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
  // Earned Recruiter picture (5 invites) must be equippable once owned.
  await admin('users/dave/ownedCosmetics/avatar-recruiter', 'PUT', true);
  await daveCan('equip the Recruiter picture', db => set(ref(db, 'users/dave/equippedCosmetics/avatar'), 'avatar-recruiter'));
  await daveCan('equip the Gauntlet picture again', db => set(ref(db, 'users/dave/equippedCosmetics/avatar'), 'avatar-gauntlet'));
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
  // Joker effects: bought from the server's catalog (2000), equipped only when owned
  await admin('users/dave/diamonds', 'PUT', 2500);
  r = await call('dave', { action: 'buyItem', itemId: 'joker-grin' });
  ok(r.diamonds === 500, 'buy a Joker effect (2000)', r);
  await daveCan('equip a Joker effect', db => set(ref(db, 'users/dave/equippedCosmetics/jokerEffect'), 'joker-grin'));
  ok((await tryWrite('dave', db => set(ref(db, 'users/dave/equippedCosmetics/jokerEffect'), 'joker-glitch'))) === 'denied', 'blocked: equip a Joker effect you do not own');
  r = await call('dave', { action: 'buyItem', itemId: 'joker-halloween' });
  ok(r.error && /only sold during|need 3000/.test(r.error.message), 'seasonal Joker effect (3000) not bought out of season', r);
  await daveCan('show the Joker effect in the showcase', db => set(ref(db, 'publicProfiles/dave/showcase/jokerEffect'), 'joker-grin'));
  const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  ok((await admin(`users/dave/completedChallenges/gauntlet_${todayKey}`))?.reward === 50, "a daily clear is that day's Daily Gauntlet challenge");
  // Three losses end the run
  await admin('users/dave/gauntlet/doneDay', 'PUT', '2000-01-01');
  g = await call('dave', { action: 'gauntlet', op: 'start' });
  r = await gGame(g.run.id, false, false);
  for (let i = 0; i < 2; i++) r = await gGame(g.run.id, false);
  ok(r.over && !r.run, 'losing all 3 lives ends the run', r);
  ok((await admin('users/dave/difficultyWins')) === null, 'Gauntlet wins never count toward difficulty unlocks');
  // A new UK day: yesterday's run is gone, the Gauntlet starts again at round 1
  g = await call('dave', { action: 'gauntlet', op: 'start' });
  r = await gGame(g.run.id, true, false);
  ok(r.run && r.run.round === 1, 'a win moves the run to round 2', r);
  await admin('users/dave/gauntlet/run/startedAt', 'PUT', Date.now() - 26 * 3600 * 1000);
  g = await call('dave', { action: 'gauntlet', op: 'status' });
  ok(g.run === null, "yesterday's run is not offered to continue", g);
  r = await call('dave', { action: 'gauntlet', op: 'begin', runId: r.run.id });
  ok(r.error && /new day/.test(r.error.message), "yesterday's run can't be continued", r);
  g = await call('dave', { action: 'gauntlet', op: 'start' });
  ok(g.run && g.run.round === 0 && g.run.lives === 3, 'the new day starts at the first Easy bot with full lives', g);

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

  // Leaderboards the server keeps (boards/challenges, boards/gauntlet) and top-place mail
  ok((await admin('users/dave/gauntlet/botsBeaten')) === 11, 'Gauntlet: every bot beaten is counted (2 clears + 1 win = 11)', await admin('users/dave/gauntlet/botsBeaten'));
  await admin('users/dave/username', 'PUT', 'Dave'); // every real account has one
  await call('dave', { action: 'sync' });
  const gb = await admin('boards/gauntlet/dave');
  ok(gb && gb.count === 11 && gb.name === 'Dave', 'Gauntlet board entry kept by the server', gb);
  const daveDone = Object.keys((await admin('users/dave/completedChallenges')) || {}).length;
  ok((await admin('boards/challenges/dave'))?.count === daveDone, 'Challenges board: challenges completed', [await admin('boards/challenges/dave'), daveDone]);
  let mail = await admin('users/dave/activityInbox/board_gauntlet_1');
  ok(mail && mail.type === 'board' && mail.board === 'gauntlet' && mail.rank === 1, 'reaching #1 sends a congratulations mail', mail);
  ok((await admin('users/alice/activityInbox/board_ranked_1'))?.board === 'ranked', 'Ranked #1 is congratulated too');
  // Older account: bots beaten back-filled at sign-in (5 per clear), overtakes dave
  await call('jon', { action: 'init' });
  await admin('users/jon', 'PATCH', { username: 'Jon', gauntlet: { completions: 3, firstDoneAt: 1 } });
  await call('jon', { action: 'sync' });
  ok((await admin('users/jon/gauntlet/botsBeaten')) === 15 && (await admin('boards/gauntlet/jon'))?.count === 15, 'older accounts are back-filled at sign-in', await admin('boards/gauntlet/jon'));
  ok((await admin('users/jon/activityInbox/board_gauntlet_1'))?.rank === 1, 'the new #1 is congratulated');
  ok((await admin('users/dave/boardBest/gauntlet')) === 1, 'the best place mailed is remembered');
  await admin('users/dave/activityInbox/board_gauntlet_1', 'DELETE');
  await call('dave', { action: 'sync' });
  ok((await admin('users/dave/activityInbox/board_gauntlet_1')) === null && (await admin('users/dave/activityInbox/board_gauntlet_2')) === null, 'no mail again for a place already reached (dropping to #2 after #1)');
  ok((await tryWrite('alice', db => set(ref(db, 'boards/gauntlet/alice'), { name: 'alice', count: 999 }))) === 'denied', 'blocked: writing a board entry');
  ok((await tryWrite('alice', db => set(ref(db, 'users/alice/boardBest/ranked'), 1))) === 'denied', 'blocked: writing your own best place');
  ok((await tryWrite('alice', db => get(ref(db, 'boards/gauntlet')))) === 'ok', 'boards are public to read');

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
  ok((await admin('boards/challenges/gina')) === null && (await admin('boards/gauntlet/gina')) === null, 'purge: off the boards too');

  // XP & levels (v222): nothing happens until the owner's switch config/features/xp is on
  {
    const sleep = (ms) => new Promise(res => setTimeout(res, ms));
    await call('xena', { action: 'init' });
    await admin('config/features/xp', 'DELETE');
    await sleep(11000); // the server re-reads the switch at most every 10s
    let x = await call('xena', { action: 'matchFinished', matchId: 'xp_m0' });
    ok(x && !x.error && x.xp === null && (await admin('users/xena/xp')) === null, 'XP switch off: a finished game adds no XP', x);
    ok((await tryWrite('xena', db => set(ref(db, 'users/xena/xp'), { total: 99999, level: 50 }))) === 'denied', 'blocked: a phone writing its own XP');
    ok((await tryWrite('xena', db => set(ref(db, 'config/features/xp'), true))) === 'denied', 'blocked: a player flicking the XP switch');
    // Back-dating: past play becomes XP once (unit check of the sums).
    const xpMod = require('../functions/xp');
    const pastUser = { matchCounters: { finished: 10, wins: 4 }, wins: 2, losses: 1, rankedStats: { draws: 1 }, gauntlet: { botsBeaten: 7 }, completedChallenges: { daily_a: {}, weekly_b: {}, other: {} } };
    ok(xpMod.pastXp(pastUser) === 1660, 'past play: 10 games, 4 wins, 4 Ranked (2 won), 7 Gauntlet bots, a daily and a weekly = 1660 XP', xpMod.pastXp(pastUser));
    let paid = 0;
    const bf = xpMod.backfill(pastUser, 1, (u, n) => { paid += n; });
    ok(bf.level === 7 && paid === 120 && pastUser.activityInbox.level_backfill?.backfill && !pastUser.activityInbox.level_5, 'back-dating reaches level 7, pays 120 Diamonds with one mail', { bf, paid });
    ok(xpMod.backfill(pastUser, 2, () => {}) === null, 'back-dating happens only once');
    ok(xpMod.gauntletBotXp(0) === 40 && xpMod.gauntletBotXp(2) === 80 && xpMod.gauntletBotXp(3) === 120 && xpMod.gauntletBotXp(4) === 200, 'Gauntlet XP scales with the bot');
    ok(xpMod.levelFor(953) === 4 && xpMod.levelFor(954) === 5 && xpMod.levelFor(1400000) === 99 && xpMod.levelFor(9e9) === 99, 'level table: 954 = level 5, 1,400,000 = level 99, never past 99');
    await admin('config/features/xp', 'PUT', true);
    await sleep(11000);
    await admin('users/xena/matchCounters/lastFinishedAt', 'PUT', 0);
    await admin('users/xena/matchCounters/finishedDay', 'DELETE');
    x = await call('xena', { action: 'matchFinished', matchId: 'xp_m1' });
    ok(x.xp && x.xp.gained === 75 && x.xp.backfill?.xp === 25 && x.xp.total === 100 && x.xp.level === 1, 'XP on: the game from before (25) is back-dated, then this first game of the day = 25 + 50', x.xp);
    await admin('users/xena/matchCounters/lastFinishedAt', 'PUT', 0);
    x = await call('xena', { action: 'matchFinished', matchId: 'xp_m2' });
    ok(x.xp && x.xp.gained === 25 && x.xp.total === 125 && x.xp.level === 1 && !x.xp.levelUps.length && !x.xp.backfill, 'the next game = 25, no second back-dating', x.xp);
    x = await call('xena', { action: 'matchFinished', matchId: 'xp_m2' });
    ok(!x.xp, 'the same game never pays XP twice', x.xp);
    await admin('users/xena/xp', 'PUT', { total: 2160, level: 9, backfilled: true, table: 2 });
    await admin('users/xena/diamonds', 'PUT', 0);
    await admin('users/xena/matchCounters/lastFinishedAt', 'PUT', 0);
    x = await call('xena', { action: 'matchFinished', matchId: 'xp_m3' });
    ok(x.xp && x.xp.level === 10 && x.xp.levelUps.length === 1 && x.xp.levelUps[0].reward === 100, 'level 10 pays 100 Diamonds (instead of 20)', x.xp);
    ok(num0(await admin('users/xena/diamonds')) === 100 && (await admin('users/xena/activityInbox/level_10'))?.type === 'level', 'level-up Diamonds paid and a level mail sent');
    await admin('users/xena/xp', 'PUT', { total: 99999990, level: 99, backfilled: true });
    await admin('users/xena/matchCounters/lastFinishedAt', 'PUT', 0);
    x = await call('xena', { action: 'matchFinished', matchId: 'xp_m4' });
    ok(x.xp && x.xp.total === 100000000 && x.xp.level === 99 && x.xp.gained === 10, 'no daily cap; XP stops at 100 million, level stays 99', x.xp);
    await admin('users/xena/xp', 'PUT', { total: 200, level: 2, backfilled: true });
    await admin('users/xena/matchCounters/lastWinAt', 'PUT', 0);
    x = await call('xena', { action: 'matchWin', mode: 'bots', difficulty: 'easy', matchId: 'xp_w1' });
    ok(x.xp && x.xp.gained === 75, 'a win adds 75 XP on top', x.xp);
    // Levels leaderboard: All-time (total XP) and This week (XP since Monday, UK).
    ok(xpMod.ukWeekKey(new Date('2026-09-29T12:00:00Z')) === '2026-W40', 'the server uses the same week keys as the game');
    await admin('users/xena/username', 'PUT', 'Xena');
    await admin('users/xena/xp', 'PUT', { total: 5000, level: 19, backfilled: true, table: 2, week: '2001-W01', weekXp: 999 });
    await admin('users/xena/matchCounters/lastWinAt', 'PUT', 0);
    x = await call('xena', { action: 'matchWin', mode: 'bots', difficulty: 'easy', matchId: 'xp_w2' });
    await sleep(800);
    const wk = `xpweek_${xpMod.ukWeekKey(new Date())}`;
    const allTime = await admin('boards/levels/xena'), thisWeek = await admin(`boards/${wk}/xena`);
    ok(allTime && allTime.count === 5075 && allTime.name === 'Xena' && allTime.level === xpMod.levelFor(5075), 'All-time board: total XP with the level', allTime);
    ok(thisWeek && thisWeek.count === 75, 'This week board: only XP earned this week (XP from an old week starts again from 0)', thisWeek);
    ok((await admin('users/xena/xp/week')) === xpMod.ukWeekKey(new Date()), 'the weekly counter follows the UK week');
    await admin('boards/xpweek_2001-W01', 'PUT', { ghost: { name: 'Old', count: 5 } });
    const oldWeek = `xpweek_${xpMod.ukWeekKey(new Date(Date.now() - 14 * 86400000))}`;
    await admin(`boards/${oldWeek}`, 'PUT', { ghost: { name: 'Old', count: 5 } });
    await admin('users/xena/matchCounters/lastWinAt', 'PUT', 0);
    await call('xena', { action: 'matchWin', mode: 'bots', difficulty: 'easy', matchId: 'xp_w3' });
    await sleep(800);
    ok((await admin(`boards/${oldWeek}`)) === null, 'weeks before last week are cleared away');
    ok(require('../functions/boards').boardPaths('xena').includes(`boards/${wk}/xena`) && require('../functions/boards').boardPaths('xena').includes('boards/levels/xena'), 'account deletion also clears the Levels boards');
    await admin('boards/xpweek_2001-W01', 'DELETE');
    // The level table doubled (v225): an account levelled on the old table
    // is re-levelled from its total, and levels already paid never pay again.
    await admin('users/xena/xp', 'PUT', { total: 7198, level: 43, backfilled: true });
    await admin('users/xena/diamonds', 'PUT', 0);
    await admin('users/xena/matchCounters/lastFinishedAt', 'PUT', 0);
    x = await call('xena', { action: 'matchFinished', matchId: 'xp_m6' });
    ok(x.xp && x.xp.level === 28 && !x.xp.levelUps.length && num0(await admin('users/xena/diamonds')) === 0 && (await admin('users/xena/xp/paidLevel')) === 43, 'old level 43 (7,198 XP) is level 28 on the doubled table, nothing paid', x.xp);
    await admin('users/xena/xp/total', 'PUT', 12440);
    await admin('users/xena/matchCounters/lastFinishedAt', 'PUT', 0);
    x = await call('xena', { action: 'matchFinished', matchId: 'xp_m7' });
    ok(x.xp && x.xp.level === 40 && !x.xp.levelUps.length && num0(await admin('users/xena/diamonds')) === 0, 'reaching level 40 again pays nothing (already paid up to 43)', x.xp);
    await admin('users/xmig', 'PUT', { username: 'Xmig', xp: { total: 7198, level: 43 } });
    await admin('publicProfiles/xmig', 'PUT', { username: 'Xmig', level: 43 });
    await admin('leaderboard/xmig', 'PUT', { username: 'Xmig', rating: 500, tier: 'Bronze', wins: 0, losses: 0, level: 43 });
    await admin('boards/challenges/xmig', 'PUT', { name: 'Xmig', count: 3, at: 1, level: 43 });
    await admin('config/xpTableDone', 'DELETE');
    const fixedN = await xpMod.migrateAll();
    ok(fixedN >= 1 && (await admin('users/xmig/xp/level')) === 28 && (await admin('publicProfiles/xmig/level')) === 28 && (await admin('config/xpTableDone')) === 2, 'every account (and its public level) is re-levelled once', fixedN);
    ok((await admin('leaderboard/xmig/level')) === 28 && (await admin('boards/challenges/xmig/level')) === 28 && (await admin('boards/gauntlet/xmig')) === null, 'the leaderboards show the new level (no new entries made)');
    ok((await xpMod.migrateAll()) === 0, 'the re-levelling runs once per table');
    // Level rewards (v248): free cosmetics at Lvl 15 / 25 / 50, granted once.
    await admin('users/xena/xp', 'PUT', { total: xpMod.xpForLevel(15) - 10, level: 14, backfilled: true, table: 2, paidLevel: 14 });
    await admin('users/xena/ownedCosmetics', 'DELETE');
    await admin('users/xena/matchCounters/lastFinishedAt', 'PUT', 0);
    x = await call('xena', { action: 'matchFinished', matchId: 'xp_r1' });
    ok(x.xp && x.xp.level === 15 && (x.xp.rewards || []).map(r => r.id).join() === 'back-rising-star', 'reaching Lvl 15 grants the Rising Star card back', x.xp);
    ok((await admin('users/xena/ownedCosmetics/back-rising-star')) && (await admin('users/xena/activityInbox/unlock_back-rising-star'))?.unlocked, 'owned, with an unlock mail');
    ok((await tryWrite('xena', db => set(ref(db, 'users/xena/equippedCosmetics/cardBack'), 'back-rising-star'))) !== 'denied', 'and it can be equipped');
    ok((await tryWrite('xena', db => set(ref(db, 'users/xena/equippedCosmetics/tableTheme'), 'table-summit'))) === 'denied', 'blocked: equipping the Lvl 50 table without it');
    await admin('users/xena/xp', 'PUT', { total: xpMod.xpForLevel(30), level: 30, backfilled: true, table: 2, paidLevel: 30 });
    x = await call('xena', { action: 'sync' });
    ok((await admin('users/xena/ownedCosmetics/frame-ascendant')) && !(await admin('users/xena/ownedCosmetics/table-summit')) && (x.xp?.rewards || []).some(r => r.id === 'frame-ascendant'), 'sign-in grants rewards already reached (Lvl 25 frame), not later ones', x.xp);
    // Friends are mailed at every 10th level and 99 (one mail per write).
    ok(xpMod.friendMailLevel(8, 23) === 20 && xpMod.friendMailLevel(11, 19) === 0 && xpMod.friendMailLevel(97, 99) === 99, 'friend mail levels: the highest 10th (or 99) crossed');
    await admin('users/xpal', 'PUT', { username: 'Xpal' });
    await admin('friends/xena', 'PUT', { xpal: true });
    await admin('users/xena/xp', 'PUT', { total: xpMod.xpForLevel(40) - 10, level: 39, backfilled: true, table: 2, paidLevel: 39 });
    await admin('users/xena/matchCounters/lastFinishedAt', 'PUT', 0);
    x = await call('xena', { action: 'matchFinished', matchId: 'xp_r2' });
    const fmail = await admin('users/xpal/activityInbox/friendlevel_xena_40');
    ok(x.xp?.level === 40 && fmail && fmail.type === 'friendLevel' && fmail.name === 'Xena' && fmail.level === 40, 'a friend is mailed when you reach level 40', fmail);
    await admin('users/xena/matchCounters/lastFinishedAt', 'PUT', 0);
    await call('xena', { action: 'matchFinished', matchId: 'xp_r3' });
    ok(Object.keys((await admin('users/xpal/activityInbox')) || {}).length === 1, 'no mail for a level that is not a 10th');
    await admin('config/features/xp', 'PUT', false);
    await sleep(11000);
    await admin('users/xena/matchCounters/lastFinishedAt', 'PUT', 0);
    x = await call('xena', { action: 'matchFinished', matchId: 'xp_m5' });
    ok(x.xp === null, 'switched off again: XP stops', x.xp);
    // The public copy of the level (player card, friends) must equal the real one.
    const realLevel = (await admin('users/xena/xp'))?.level;
    ok((await tryWrite('xena', db => set(ref(db, 'publicProfiles/xena/level'), realLevel))) !== 'denied', 'a player can publish their real level', realLevel);
    ok((await tryWrite('xena', db => set(ref(db, 'publicProfiles/xena/level'), 99))) === 'denied', 'blocked: publishing a fake level');
  }

  // Best of series (v231): entries held by the server, pot matched, forfeits.
  {
    const sleep = (ms) => new Promise(res => setTimeout(res, ms));
    const code = '424242';
    const lvl20 = 4772; // total XP for level 20
    await admin('config/features/xp', 'PUT', true);
    for (const [u, name] of [['sera', 'Sera'], ['serb', 'Serb']]) {
      await call(u, { action: 'init' });
      await admin(`users/${u}/username`, 'PUT', name);
      await admin(`users/${u}/diamonds`, 'PUT', 1000);
      await admin(`users/${u}/xp`, 'PUT', { total: lvl20, level: 20, backfilled: true, table: 2 });
    }
    const room = (phase, extra = {}) => ({ phase, isRanked: false, matchId: extra.matchId || 'lobby',
      players: [{ id: 'p_host', uid: 'sera', name: 'Sera', isHost: true, isBot: false, finishRank: extra.a ?? null, drew: !!extra.drew },
        { id: 'p_b', uid: 'serb', name: 'Serb', isHost: false, isBot: !!extra.bBot, substituteMoveCount: extra.bTurns || 0, finishRank: extra.b ?? null, drew: !!extra.drew }] });
    await admin(`rooms/${code}`, 'PUT', room('LOBBY'));
    await sleep(11000); // the XP switch is re-read at most every 10s
    const sc = (u, data) => call(u, { action: 'series', roomCode: code, ...data });
    ok((await tryWrite('sera', db => set(ref(db, `series/${code}`), { status: 'live' }))) === 'denied', 'blocked: a phone writing a series');
    ok((await tryWrite('sera', db => set(ref(db, 'users/sera/series'), { room: code, id: 'x', status: 'live' }))) === 'denied', 'blocked: a phone writing its own series record');
    let r = await sc('serb', { op: 'create', bestOf: 3 });
    ok(r.error, 'only the host can start a series', r);
    await admin('users/serb/xp', 'PUT', { total: 100, level: 1, backfilled: true, table: 2 });
    r = await sc('sera', { op: 'create', bestOf: 3 });
    ok(r.error && /level 20/.test(r.error.message), 'both players must be level 20+', r);
    await admin('users/serb/xp', 'PUT', { total: lvl20, level: 20, backfilled: true, table: 2 });
    r = await call('sera', { action: 'series', roomCode: code, op: 'create', bestOf: 3 }, undefined, false);
    ok(r.error, 'a series needs a verified email', r);
    r = await sc('sera', { op: 'create', bestOf: 3 });
    ok(r.series && r.series.status === 'pending' && r.series.pot === 120, 'Best of 3: the host pays 30, the pot is 120 (server matches it)', r);
    ok(num0(await admin('users/sera/diamonds')) === 970 && (await admin('users/sera/series'))?.status === 'pending', 'host entry taken; the account knows its series');
    r = await sc('serb', { op: 'accept' });
    ok(r.series && r.series.status === 'live' && num0(await admin('users/serb/diamonds')) === 970, 'the other player pays 30 on accepting: series live', r);
    ok((await admin('users/sera/series'))?.status === 'live', 'both accounts know the series is live (for rejoining)');
    await admin(`rooms/${code}`, 'PUT', room('FINISHED', { matchId: 'g1', a: 1, b: 2 }));
    r = await sc('sera', { op: 'game', matchId: 'g1' });
    ok(r.series && r.series.wins.sera === 1 && r.series.played === 1, 'game 1 to Sera (1-0)', r);
    r = await sc('serb', { op: 'game', matchId: 'g1' });
    ok(r.series && r.series.wins.sera === 1 && r.series.played === 1, 'the same game never counts twice');
    await admin(`rooms/${code}`, 'PUT', room('FINISHED', { matchId: 'g2', a: 2, b: 1 }));
    r = await sc('serb', { op: 'game', matchId: 'g2' });
    ok(r.error && /too quick/.test(r.error.message), 'a game reported moments after the last one does not count', r);
    await admin(`series/${code}/lastGameAt`, 'PUT', Date.now() - 61000);
    r = await sc('serb', { op: 'game', matchId: 'g2' });
    ok(r.series && r.series.wins.serb === 1, 'game 2 to Serb (1-1)', r);
    await admin(`series/${code}/lastGameAt`, 'PUT', Date.now() - 61000);
    await admin(`rooms/${code}`, 'PUT', room('FINISHED', { matchId: 'g3', drew: true, a: 1, b: 1 }));
    r = await sc('sera', { op: 'game', matchId: 'g3' });
    ok(r.series && r.series.played === 3 && r.series.wins.sera === 1 && r.series.wins.serb === 1 && r.series.status === 'live', 'a stalemate draw is played but nobody scores', r);
    await admin(`series/${code}/lastGameAt`, 'PUT', Date.now() - 61000);
    await admin(`rooms/${code}`, 'PUT', room('FINISHED', { matchId: 'g4', a: 1, b: 2 }));
    r = await sc('serb', { op: 'game', matchId: 'g4' });
    ok(r.series && r.series.status === 'done' && r.series.winner === 'sera', 'Sera wins the series 2-1', r);
    ok(num0(await admin('users/sera/diamonds')) === 1090 && num0(await admin('users/serb/diamonds')) === 970, 'the winner gets the 120 pot (30 in, +90); the loser is down 30');
    const sid = r.series.id;
    const [mailA, mailB] = [await admin(`users/sera/activityInbox/series_${sid}`), await admin(`users/serb/activityInbox/series_${sid}`)];
    ok(mailA?.type === 'series' && mailA.won === true && mailA.pot === 120 && mailB?.won === false && mailA.score === '2–1', 'both get a result mail', [mailA, mailB]);
    ok((await admin('users/sera/series')) === null && (await admin('users/serb/series')) === null, 'both accounts are free for a new series');
    r = await sc('sera', { op: 'status' });
    ok(num0(await admin('users/sera/diamonds')) === 1090, 'settling again never pays twice');

    // Called off before the first game: entries back.
    await admin(`rooms/${code}`, 'PUT', room('LOBBY'));
    r = await sc('sera', { op: 'create', bestOf: 5 });
    ok(r.series && r.series.fee === 50 && r.series.pot === 200, 'Best of 5: 50 each, pot 200', r);
    await sc('serb', { op: 'accept' });
    r = await sc('serb', { op: 'cancel' });
    ok(r.series && r.series.status === 'cancelled' && num0(await admin('users/sera/diamonds')) === 1090 && num0(await admin('users/serb/diamonds')) === 970, 'calling it off before a game refunds both', r);

    // Leaving mid-series forfeits it.
    r = await sc('sera', { op: 'create', bestOf: 3 });
    await sc('serb', { op: 'accept' });
    await admin(`series/${code}/played`, 'PUT', 1);
    r = await sc('sera', { op: 'cancel' });
    ok(r.error, 'after a game, calling it off is refused (leaving forfeits)', r);
    r = await sc('sera', { op: 'forfeit' });
    ok(r.series && r.series.winner === 'serb' && r.series.reason === 'forfeit', 'forfeiting hands the series to the other player', r);
    ok(num0(await admin('users/serb/diamonds')) === 1060 && num0(await admin('users/sera/diamonds')) === 1060, 'forfeit: the other player gets the 120 pot');

    // The other player left: their stand-in bot must have played 5 turns and they must be away.
    r = await sc('sera', { op: 'create', bestOf: 3 });
    await sc('serb', { op: 'accept' });
    await admin(`rooms/${code}`, 'PUT', room('PLAY', { bBot: true, bTurns: 3 }));
    await admin('publicProfiles/serb', 'PUT', { username: 'Serb', online: false, seen: Date.now() - 120000 });
    r = await sc('sera', { op: 'claimForfeit' });
    ok(r.error && /time to come back/.test(r.error.message), 'no forfeit before the stand-in has played 5 turns', r);
    await admin(`rooms/${code}`, 'PUT', room('PLAY', { bBot: true, bTurns: 5 }));
    await admin('publicProfiles/serb', 'PUT', { username: 'Serb', online: true, seen: Date.now() });
    r = await sc('sera', { op: 'claimForfeit' });
    ok(r.error, 'no forfeit while they are still online', r);
    await admin('publicProfiles/serb', 'PUT', { username: 'Serb', online: false, seen: Date.now() - 120000 });
    r = await sc('sera', { op: 'claimForfeit' });
    ok(r.series && r.series.winner === 'sera' && r.series.reason === 'forfeit', 'after 5 stand-in turns away, the series goes to the player who stayed', r);

    // A few a day.
    await admin(`rooms/${code}`, 'PUT', room('LOBBY'));
    await admin('users/sera/seriesDay', 'PUT', { day: new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()), count: 5 });
    r = await sc('sera', { op: 'create', bestOf: 3 });
    ok(r.error && /a day/.test(r.error.message), '5 series a day per player', r);
    await admin('config/features/xp', 'PUT', false);
  }

  // A new picture or name reaches existing board entries (publicProfiles trigger → refreshProfile)
  const boardsMod = require('../functions/boards');
  await admin('publicProfiles/dave/avatar', 'PUT', 'avatar-ghost');
  await boardsMod.refreshProfile('dave');
  ok((await admin('boards/gauntlet/dave/avatar')) === 'avatar-ghost' && (await admin('boards/challenges/dave/avatar')) === 'avatar-ghost', 'a changed picture shows on every board', [await admin('boards/gauntlet/dave'), await admin('boards/challenges/dave')]);
  await admin('users/dave/username', 'PUT', 'Davo');
  await boardsMod.refreshProfile('dave');
  ok((await admin('boards/gauntlet/dave/name')) === 'Davo', 'a changed name shows on the boards');
  await admin('publicProfiles/alice/avatar', 'PUT', 'avatar-ghost');
  const aliceBefore = await admin('boards/gauntlet/alice');
  await boardsMod.refreshProfile('alice');
  ok(JSON.stringify(await admin('boards/gauntlet/alice')) === JSON.stringify(aliceBefore), 'refreshing never adds someone to a board');
  ok((await admin('users/alice/username')) !== undefined && (await admin('users/alice')) !== null, 'purge: other accounts untouched');
  await call('alice', { action: 'deleteAccount', op: 'cancel' });

  console.log(`\n${pass} passed, ${failN} failed`);
  process.exit(failN ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
