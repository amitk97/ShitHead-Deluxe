// The game's economy, run on the server. Phones can no longer write their own
// Diamonds, owned items, challenge claims, login streak, Ranked rating or
// the counters those depend on (the Database Rules lock those fields); every
// change goes through the `economy` callable below, which checks it first.
//
// Prices, rewards and challenge tables come from catalog.json, exported from
// the game itself (tools/export-catalog.js; a dev test fails when the two
// drift apart). Event dates come from seasons.js (a copy of the game's).
//
// Actions (request.data.action):
//   init          fill in a new/old profile's defaults; the AmitK test grant
//   sync          pay any milestone challenge / earn-only picture already met
//   streak        daily login reward (one per UK calendar day)
//   claim         one challenge by completion key (daily_…, weekly_…, id)
//   matchWin      a Vs Bots or casual online win (caps: see MATCH_LIMITS)
//   matchFinished a finished match (ShitHead Virgin / Beginner)
//   rankedDeal    the server's seat order + shuffled deck for a Ranked match
//   gauntlet      Vs Bots Gauntlet runs: start, each game's result, the reward
//   rankedResult  score a finished Ranked room for every seat, once
//   buyItem / buyBundle / buyNameToken / sendGift / claimGift
'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const CAT = require('./catalog.json');
Object.entries(CAT.items).forEach(([id, item]) => { item.id = id; });
const { seasonalWindowsForYear } = require('./seasons');
const nodeCrypto = require('crypto');
const { DECK_SIZE } = require('./rules');

const MAX_DIAMONDS = 999999;
const AMITK_EMAIL = 'amirk2197@googlemail.com';
const DIFFICULTIES = ['easy', 'medium', 'hard', 'boss'];
// Phase 2 caps. A real match takes well over a minute even at 4x speed, so
// these never touch honest play; they stop scripted reward farming.
const MATCH_LIMITS = { minGapMs: 45 * 1000, perDay: 40 };
// Per-match ceilings on the Ranked counters a room reports.
const RANKED_STAT_CAPS = { burnt: 60, jokersPlayed: 8, challengeBurns: 20, jokerDeflects: 8, snapBurns: 12 };
const SEASON_SLACK_MS = 14 * 60 * 60 * 1000; // phones' local dates vs the server's UTC
const PROCESSED_KEEP = 200;
// Off = shadow mode: the Ranked audit's findings are recorded on each result
// (rankedResults/{matchId}/audit) and shown to the owner, but every match is
// still scored. Turn on once real honest games show no hard findings.
const RANKED_AUDIT_ENFORCE = false;
const RANKED_PAIR_PER_DAY = 5; // processedMatchRewards / processedRankedMatches entries kept

const db = () => admin.database();
const fail = (code, message) => { throw new HttpsError(code, message); };
const clip = (value, max) => String(value == null ? '' : value).slice(0, max);
const num = (value, fallback = 0) => { const n = Number(value); return value !== null && value !== undefined && value !== '' && Number.isFinite(n) ? n : fallback; };
const addDiamonds = (user, amount) => { user.diamonds = Math.max(0, Math.min(MAX_DIAMONDS, num(user.diamonds) + amount)); };
const KEY_RE = /^[A-Za-z0-9_-]{1,80}$/;

// ---- Dates (UK calendar, like the game's daily challenges) ---------------
const ukDateKey = (date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
function shiftDateKey(key, days) {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}
function ukWeekKey(date = new Date()) {
  const [y, m, dd] = ukDateKey(date).split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, dd));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// ---- Daily / weekly picks: the same seeded shuffle as the game ------------
function hashStringToSeed(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pickThree(poolIds, seedText) {
  const rng = mulberry32(hashStringToSeed(seedText));
  const pool = [...poolIds];
  for (let i = pool.length - 1; i > pool.length - 4; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(pool.length - 3);
}
const pickDailyIds = (dateKey) => pickThree(CAT.dailyPool.map(c => c.id), dateKey);
const pickWeeklyIds = (weekKey) => pickThree(CAT.weeklyPool.map(c => c.id), `weekly-${weekKey}`);

// ---- Seasons ---------------------------------------------------------------
// Events on now, with a few hours' slack either side for players' time zones.
function activeSeasonWindows(now = new Date()) {
  const year = now.getUTCFullYear();
  const t = now.getTime();
  const out = [];
  CAT.seasonalEvents.forEach(({ id }) => {
    [year - 1, year, year + 1].forEach(y => seasonalWindowsForYear(id, y).forEach(([start, end]) => {
      const endsAt = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1).getTime();
      if (t >= start.getTime() - SEASON_SLACK_MS && t < endsAt + SEASON_SLACK_MS) out.push({ eventId: id, key: `${id}-${start.getFullYear()}` });
    }));
  });
  return out;
}
const isSeasonOn = (eventId, now) => activeSeasonWindows(now).some(w => w.eventId === eventId);
function seasonalWinsFor(seasonWins, eventId) {
  return Math.max(0, ...Object.entries(seasonWins || {}).filter(([key]) => key.startsWith(`${eventId}-`)).map(([, n]) => num(n)));
}

// ---- Ranks -------------------------------------------------------------------
const tierName = (rating) => (CAT.rankTiers.find(t => Math.max(0, num(rating)) >= t.min) || CAT.rankTiers[CAT.rankTiers.length - 1]).name;
function pairwiseEloDeltas(players, K = 32) {
  const n = players.length;
  return players.map((p, i) => {
    let sum = 0;
    players.forEach((q, j) => {
      if (i === j) return;
      const actual = p.finishRank < q.finishRank ? 1 : p.finishRank > q.finishRank ? 0 : 0.5;
      const expected = 1 / (1 + Math.pow(10, (q.rating - p.rating) / 400));
      sum += (actual - expected);
    });
    return Math.round((K / (n - 1)) * sum);
  });
}

// ---- Who is calling ------------------------------------------------------------
const isAmitK = (auth) => !!auth?.token?.email_verified && String(auth.token.email || '').toLowerCase() === AMITK_EMAIL;

// ---- Owned items ---------------------------------------------------------------
async function legacyOwned(uid) {
  const snap = await db().ref(`shopPurchases/${uid}/cosmetics`).once('value');
  return snap.val() || {};
}
const owns = (user, legacy, id) => !!(user.ownedCosmetics?.[id] || legacy?.[id]);
function itemBuyableNow(item, auth, now) {
  if (!item) return false;
  return !item.season || isAmitK(auth) || isSeasonOn(item.season, now);
}

// ---- users/{uid} transactions ----------------------------------------------------
// Firebase first runs a transaction on its local cache, which is empty on a
// server: returning null there makes it re-run with the real value. `mutate`
// gets a copy and returns { user, ...result }, { error } or { noop, ...result }.
async function userTx(uid, mutate) {
  let outcome = null;
  const result = await db().ref(`users/${uid}`).transaction((current) => {
    outcome = null;
    if (current === null) return null;
    const out = mutate(JSON.parse(JSON.stringify(current)));
    outcome = out || { noop: true };
    if (!out || out.error || out.noop) return; // abort: nothing to write
    return out.user;
  }, undefined, false);
  if (!result.snapshot.exists()) fail('failed-precondition', 'Your profile is still being created. Please try again.');
  if (outcome?.error) fail('failed-precondition', outcome.error);
  return { ...(outcome || {}), user: result.snapshot.val() || {} };
}
function pruneMap(map, keep = PROCESSED_KEEP) {
  const entries = Object.entries(map || {});
  if (entries.length <= keep) return map || {};
  const at = (v) => num(v?.awardedAt ?? v?.appliedAt ?? v?.at, 0);
  return Object.fromEntries(entries.sort((a, b) => at(b[1]) - at(a[1])).slice(0, keep));
}

// ---- Challenges ---------------------------------------------------------------------
function recordClaim(user, id, name, reward, now) {
  user.completedChallenges = user.completedChallenges || {};
  user.completedChallenges[id] = { completedAt: now, reward };
  user.challengeInbox = user.challengeInbox || {};
  user.challengeInbox[id] = { name: clip(name || id, 80), reward, completedAt: now };
  addDiamonds(user, reward);
  return { id, name, reward };
}
const sumValues = (obj) => Object.values(obj || {}).reduce((s, n) => s + num(n), 0);
// Milestone challenges the server can check from the account's own totals.
function milestoneEligible(user) {
  const cs = user.challengeStats || {}, rs = user.rankedStats || {}, dw = user.difficultyWins || {};
  const games = num(user.wins) + num(user.losses);
  const d = CAT.challengeDefs;
  const out = [];
  const add = (defs, value) => defs.forEach(c => { if (value >= c.target) out.push(c); });
  add(d.rankedBurns, num(cs.burns));
  add(d.rankedStreaks, num(rs.bestStreak));
  add(d.rankedJokerDeflects, num(cs.jokerDeflects));
  add(d.rankedSnapBurns, num(cs.snapBurns));
  add(d.rankedGamesPlayed, games);
  // Rank tiers count once the player has played Ranked (everyone starts at 500).
  if (games > 0) d.rankTiers.forEach(c => { if (num(user.rating, 500) >= c.minRating) out.push({ ...c, target: c.minRating }); });
  d.botMatches.forEach(c => { if (num(dw[c.difficulty]) >= c.target) out.push(c); });
  return out;
}
function playedAMatch(user) {
  const c = user.matchCounters || {};
  return num(c.finished) > 0 || num(user.wins) + num(user.losses) > 0 || sumValues(user.difficultyWins) > 0 || Object.keys(user.processedMatchRewards || {}).length > 0;
}
function wonAMatch(user) {
  const c = user.matchCounters || {};
  return num(c.wins) > 0 || num(user.wins) > 0 || sumValues(user.difficultyWins) > 0 || sumValues(user.seasonWins) > 0;
}
// Pays every milestone / getting-started challenge the account already meets.
function grantMilestones(user, now) {
  const done = user.completedChallenges || {};
  const claimed = [];
  milestoneEligible(user).forEach(c => { if (!done[c.id]) claimed.push(recordClaim(user, c.id, c.name, c.reward, now)); });
  const gs = Object.fromEntries(CAT.gettingStarted.map(c => [c.id, c]));
  if (gs['first-game'] && !user.completedChallenges?.['first-game'] && playedAMatch(user)) claimed.push(recordClaim(user, 'first-game', gs['first-game'].name, gs['first-game'].reward, now));
  if (gs['first-win'] && !user.completedChallenges?.['first-win'] && wonAMatch(user)) claimed.push(recordClaim(user, 'first-win', gs['first-win'].name, gs['first-win'].reward, now));
  return claimed;
}
// Earn-only pictures whose milestone the account meets.
function grantEarnedAvatars(user, legacy, now) {
  const rs = user.rankedStats || {};
  const peak = Math.max(num(user.rating), num(rs.highestRating));
  const newly = [];
  Object.entries(CAT.earned).forEach(([id, rule]) => {
    if (owns(user, legacy, id)) return;
    const met = rule.type === 'peakRating' ? peak >= rule.min
      : rule.type === 'rankedGames' ? num(user.wins) + num(user.losses) >= rule.min
      : rule.type === 'lossStreak' ? num(rs.bestLossStreak) >= rule.min
      : rule.type === 'seasonWins' ? seasonalWinsFor(user.seasonWins, rule.season) >= rule.min
      : false;
    if (!met) return;
    user.ownedCosmetics = user.ownedCosmetics || {};
    user.ownedCosmetics[id] = { cost: 0, purchasedAt: now };
    user.activityInbox = user.activityInbox || {};
    user.activityInbox[`unlock_${id}`] = { type: 'shop', unlocked: true, name: rule.name, cost: 0, requirement: clip(rule.requirement, 80), sentAt: now };
    newly.push({ id, name: rule.name });
  });
  return newly;
}
// Adds a win to every event on right now; returns the new counts.
function countSeasonWin(user, now) {
  const windows = activeSeasonWindows(now);
  if (!windows.length) return {};
  user.seasonWins = user.seasonWins || {};
  windows.forEach(w => { user.seasonWins[w.key] = Math.min(100000, num(user.seasonWins[w.key]) + 1); });
  return Object.fromEntries(windows.map(w => [w.key, user.seasonWins[w.key]]));
}
function unlockedDifficulties(dw) {
  const out = { easy: true, medium: false, hard: false, boss: false };
  CAT.difficultyUnlocks.forEach(r => { out[r.diff] = num(dw?.[r.requireDiff]) >= r.requireWins; });
  return out;
}
// Resolves a completion key to its reward, or why it can't be claimed.
function challengeForKey(id, user, now) {
  const daily = /^daily_(\d{4}-\d{2}-\d{2})_([a-z0-9-]+)$/.exec(id);
  if (daily) {
    const [, dateKey, poolId] = daily;
    const today = ukDateKey(now);
    if (dateKey !== today && dateKey !== shiftDateKey(today, -1)) return { error: 'That daily challenge has expired.' };
    const def = CAT.dailyPool.find(c => c.id === poolId);
    if (!def || !pickDailyIds(dateKey).includes(poolId)) return { error: 'Not one of that day\'s challenges.' };
    return { name: def.name, reward: CAT.dailyReward };
  }
  const weekly = /^weekly_(\d{4}-W\d{2})_([a-z0-9-]+)$/.exec(id);
  if (weekly) {
    const [, weekKey, poolId] = weekly;
    const thisWeek = ukWeekKey(now), lastWeek = ukWeekKey(new Date(now.getTime() - 7 * 864e5));
    if (weekKey !== thisWeek && weekKey !== lastWeek) return { error: 'That weekly challenge has expired.' };
    const def = CAT.weeklyPool.find(c => c.id === poolId);
    if (!def || !pickWeeklyIds(weekKey).includes(poolId)) return { error: 'Not one of that week\'s challenges.' };
    return { name: def.name, reward: CAT.weeklyReward };
  }
  const gs = CAT.gettingStarted.find(c => c.id === id);
  if (gs) {
    if (id === 'first-game' && !playedAMatch(user)) return { error: 'Finish a game first.' };
    if (id === 'first-win' && !wonAMatch(user)) return { error: 'Win a game first.' };
    return { name: gs.name, reward: gs.reward };
  }
  const milestone = milestoneEligible(user).find(c => c.id === id);
  if (milestone) return { name: milestone.name, reward: milestone.reward };
  const known = Object.values(CAT.challengeDefs).flat().some(c => c.id === id);
  return { error: known ? 'Not completed yet.' : 'Unknown challenge.' };
}

// ---- Actions ------------------------------------------------------------------------------
const actions = {};

actions.init = async ({ uid, auth }) => {
  const ref = db().ref(`users/${uid}`);
  const snap = await ref.once('value');
  if (!snap.exists()) {
    await ref.transaction(c => c === null ? {
      rating: 500, wins: 0, losses: 0, diamonds: 0, completedChallenges: {},
      retroactiveChallengeCheckDone: true, diamondEconomyResetV2Done: true,
      challengeStats: { burns: 0, snapBurns: 0, jokerDeflects: 0 }
    } : undefined, undefined, false);
  }
  const res = await userTx(uid, (user) => {
    let changed = false;
    ['rating', 'wins', 'losses'].forEach((key) => {
      const fallback = key === 'rating' ? 500 : 0;
      const value = user[key];
      if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) { user[key] = fallback; changed = true; }
    });
    if (!Number.isFinite(Number(user.diamonds))) { user.diamonds = 0; changed = true; }
    if (!user.diamondEconomyResetV2Done) { user.diamondEconomyResetV2Done = true; changed = true; }
    let testGrant = false;
    if (isAmitK(auth) && !user.amitKShopTestGrantV4Done) {
      user.diamonds = MAX_DIAMONDS; user.amitKShopTestGrantV4Done = true; changed = true; testGrant = true;
    }
    return changed ? { user, testGrant } : { noop: true };
  });
  const u = res.user;
  return { diamonds: num(u.diamonds), rating: num(u.rating, 500), wins: num(u.wins), losses: num(u.losses), testGrant: !!res.testGrant };
};

actions.sync = async ({ uid }) => {
  const legacy = await legacyOwned(uid);
  const now = Date.now();
  const res = await userTx(uid, (user) => {
    const claimed = grantMilestones(user, now);
    const newAvatars = grantEarnedAvatars(user, legacy, now);
    return claimed.length || newAvatars.length ? { user, claimed, newAvatars } : { noop: true, claimed: [], newAvatars: [] };
  });
  return { claimed: res.claimed || [], newAvatars: res.newAvatars || [], diamonds: num(res.user.diamonds) };
};

actions.streak = async ({ uid }) => {
  const now = new Date();
  const today = ukDateKey(now), yesterday = shiftDateKey(today, -1);
  const res = await userTx(uid, (user) => {
    const prev = user.loginStreak || {};
    if (prev.lastDate === today) return { noop: true };
    const count = prev.lastDate === yesterday ? num(prev.count) + 1 : 1;
    const rewards = CAT.dailyStreakRewards;
    const reward = rewards[(Math.max(1, count) - 1) % rewards.length];
    user.loginStreak = { count, lastDate: today, best: Math.max(num(prev.best), count) };
    addDiamonds(user, reward);
    return { user, claimed: { count, reward } };
  });
  return { claimed: res.claimed || null, streak: res.user.loginStreak || null, diamonds: num(res.user.diamonds) };
};

actions.claim = async ({ uid, data }) => {
  const id = clip(data.id, 80);
  if (!/^[A-Za-z0-9_-]+$/.test(id)) fail('invalid-argument', 'Unknown challenge.');
  const now = new Date();
  const res = await userTx(uid, (user) => {
    if (user.completedChallenges?.[id]) return { noop: true, already: true };
    const def = challengeForKey(id, user, now);
    if (def.error) return { error: def.error };
    recordClaim(user, id, def.name, def.reward, now.getTime());
    return { user, awarded: { id, name: def.name, reward: def.reward } };
  });
  return { awarded: res.awarded || null, already: !!res.already, diamonds: num(res.user.diamonds) };
};

// A Vs Bots win pays Diamonds and counts towards difficulty unlocks; any
// casual win counts towards seasonal pictures. Online wins are checked
// against the room.
actions.matchWin = async ({ uid, data }) => {
  const mode = data.mode === 'online' ? 'online' : data.mode === 'bots' ? 'bots' : fail('invalid-argument', 'Unknown mode.');
  const matchId = clip(data.matchId, 80);
  if (!KEY_RE.test(matchId)) fail('invalid-argument', 'Bad match id.');
  const difficulty = mode === 'bots' ? (DIFFICULTIES.includes(data.difficulty) ? data.difficulty : fail('invalid-argument', 'Unknown difficulty.')) : null;
  if (mode === 'online') {
    const code = clip(data.roomCode, 6);
    if (!/^\d{6}$/.test(code)) fail('invalid-argument', 'Bad room.');
    const room = (await db().ref(`rooms/${code}`).once('value')).val();
    const seats = Object.values(room?.players || {});
    const me = seats.find(p => p && p.uid === uid);
    if (!room || room.isRanked || !me || me.finishRank !== 1 || seats.length < 2) fail('failed-precondition', 'That win could not be checked.');
  }
  const legacy = await legacyOwned(uid);
  const now = Date.now();
  const res = await userTx(uid, (user) => {
    user.processedMatchRewards = user.processedMatchRewards || {};
    if (user.processedMatchRewards[matchId]) return { noop: true, already: true };
    const today = ukDateKey(new Date(now));
    const counters = user.matchCounters = user.matchCounters || {};
    if (counters.day !== today) { counters.day = today; counters.winsToday = 0; }
    if (num(counters.winsToday) >= MATCH_LIMITS.perDay) return { noop: true, capped: 'daily' };
    if (now - num(counters.lastWinAt) < MATCH_LIMITS.minGapMs) return { noop: true, capped: 'too-soon' };
    let amount = 0, unlocked = null;
    if (mode === 'bots') {
      const open = unlockedDifficulties(user.difficultyWins);
      if (!open[difficulty]) return { error: 'That difficulty is still locked.' };
      amount = num(CAT.matchWinRewards.bots);
      user.difficultyWins = user.difficultyWins || {};
      user.difficultyWins[difficulty] = num(user.difficultyWins[difficulty]) + 1;
      const rule = CAT.difficultyUnlocks.find(r => r.requireDiff === difficulty && r.requireWins === user.difficultyWins[difficulty]);
      if (rule) unlocked = rule.diff;
    }
    addDiamonds(user, amount);
    counters.winsToday = num(counters.winsToday) + 1;
    counters.lastWinAt = now;
    counters.wins = num(counters.wins) + 1;
    user.processedMatchRewards[matchId] = { amount, label: mode === 'bots' ? 'Match Won!' : 'Online win', awardedAt: now };
    user.processedMatchRewards = pruneMap(user.processedMatchRewards);
    const seasonWins = countSeasonWin(user, new Date(now));
    const claimed = grantMilestones(user, now);
    const newAvatars = grantEarnedAvatars(user, legacy, now);
    return { user, amount, unlocked, seasonWins, claimed, newAvatars };
  });
  return {
    already: !!res.already, capped: res.capped || null, diamondsAwarded: num(res.amount), diamonds: num(res.user.diamonds),
    difficultyWins: res.user.difficultyWins || {}, unlockedDifficulty: res.unlocked || null,
    seasonWins: res.user.seasonWins || {}, claimed: res.claimed || [], newAvatars: res.newAvatars || []
  };
};

actions.matchFinished = async ({ uid, data }) => {
  const matchId = clip(data.matchId, 80);
  if (!KEY_RE.test(matchId)) fail('invalid-argument', 'Bad match id.');
  const now = Date.now();
  const res = await userTx(uid, (user) => {
    const counters = user.matchCounters = user.matchCounters || {};
    const recent = counters.recentFinished || {};
    if (recent[matchId]) return { noop: true };
    if (now - num(counters.lastFinishedAt) < 20 * 1000) return { noop: true, capped: 'too-soon' };
    counters.finished = num(counters.finished) + 1;
    counters.lastFinishedAt = now;
    counters.recentFinished = pruneMap({ ...recent, [matchId]: { at: now } }, 20);
    const claimed = grantMilestones(user, now);
    return { user, claimed };
  });
  return { claimed: res.claimed || [], diamonds: num(res.user.diamonds) };
};

// Scores a finished Ranked room for every seat at once (idempotent: the
// second player's call just reads the stored result). Ratings come from the
// server's own records, not from the room.
// The host's phone deals, so it could deal itself a great hand. In Ranked
// the server decides instead: it shuffles the seats and the 54 cards
// (c_1…c_54, crypto-random) once per match and keeps them in rankedDeals
// (server-only); the host deals exactly that and the Ranked audit checks the
// first dealt state against it. One deal per room: a new one only once the
// last is 10 minutes old, so a host can't keep asking until it likes one.
const RANKED_REDEAL_MS = 10 * 60 * 1000;
function shuffledCopy(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = nodeCrypto.randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
actions.rankedDeal = async ({ uid, data }) => {
  const code = clip(data.roomCode, 6);
  const matchId = clip(data.matchId, 80);
  if (!/^\d{6}$/.test(code) || !KEY_RE.test(matchId)) fail('invalid-argument', 'Bad match.');
  const room = (await db().ref(`rooms/${code}`).once('value')).val();
  if (!room || room.isRanked !== true) fail('failed-precondition', 'Not a Ranked room.');
  const uids = Object.values(room.players || {}).filter(Boolean).map(p => p.uid).filter(Boolean);
  if (uids.length < 2 || new Set(uids).size !== uids.length || !uids.includes(uid)) fail('permission-denied', 'You are not at that table.');
  const member = num((await db().ref(`rankedMembers/${code}/${uid}`).once('value')).val(), 0);
  if (!member) fail('permission-denied', 'You are not at that table.');
  const ref = db().ref(`rankedDeals/${code}`);
  let deal = null, refused = false;
  const tx = await ref.transaction((cur) => {
    deal = null; refused = false;
    if (cur && cur.matchId === matchId) { deal = cur; return; } // the same match asking again
    if (cur && Date.now() - num(cur.at) < RANKED_REDEAL_MS) { refused = true; return; }
    deal = {
      matchId,
      at: Date.now(),
      by: uid,
      order: shuffledCopy(uids),
      deck: shuffledCopy(Array.from({ length: DECK_SIZE }, (_, i) => `c_${i + 1}`))
    };
    return deal;
  }, undefined, false);
  if (!tx.committed && !deal) {
    const cur = tx.snapshot.val();
    if (cur && cur.matchId === matchId) deal = cur;
  }
  if (!deal) fail('resource-exhausted', refused ? 'This table was dealt a moment ago.' : 'Could not deal.');
  return { matchId: deal.matchId, order: deal.order, deck: deal.deck };
};

// Gauntlet: five 1-bot games in a row (CAT.gauntlet.rounds: easy, easy,
// medium, hard, boss) with 3 lives. The server keeps the run (users/{uid}/
// gauntlet, server-only) so lives and rounds can't be edited on the phone.
// Completing it pays once per UK day: the first ever completion gives
// firstReward + the earn-only picture and frame, later days dailyReward.
// Gauntlet games never count towards difficulty unlocks (no matchWin).
const GAUNTLET_MIN_GAME_MS = 30000; // a real game against a bot takes longer than this
actions.gauntlet = async ({ uid, data }) => {
  const G = CAT.gauntlet;
  const op = data.op; // start (a new run, its first game begins) | begin (the next game) | result | status
  if (!['start', 'begin', 'result', 'status'].includes(op)) fail('invalid-argument', 'Unknown Gauntlet step.');
  const now = Date.now();
  const today = ukDateKey(new Date(now));
  const status = (g) => ({
    run: g.run ? { id: g.run.id, round: num(g.run.round), lives: num(g.run.lives), playing: !!g.run.playing } : null,
    doneToday: g.doneDay === today, completions: num(g.completions), firstDone: !!g.firstDoneAt
  });
  if (op === 'status') {
    const g = (await db().ref(`users/${uid}/gauntlet`).once('value')).val() || {};
    return status(g);
  }
  const res = await userTx(uid, (user) => {
    const g = user.gauntlet = user.gauntlet || {};
    if (op === 'start') {
      if (g.doneDay === today) return { error: "You've already beaten the Gauntlet today. Come back tomorrow!" };
      g.run = { id: `g${now.toString(36)}${nodeCrypto.randomInt(1e9).toString(36)}`, round: 0, lives: G.lives, startedAt: now, lastAt: now, playing: true };
      return { user };
    }
    const run = g.run;
    if (!run || run.id !== clip(data.runId, 40)) return { error: 'That Gauntlet run has ended.' };
    const loseLife = () => {
      run.lives = num(run.lives) - 1;
      run.playing = false;
      if (run.lives > 0) return false;
      g.run = null; g.failed = num(g.failed) + 1;
      return true;
    };
    if (op === 'begin') {
      // A game that was started and never reported (left half-way) is a loss.
      const forfeited = !!run.playing || undefined;
      if (forfeited && loseLife()) return { user, over: true, forfeited };
      run.playing = true; run.lastAt = now;
      return { user, forfeited };
    }
    if (!run.playing) return { error: 'No Gauntlet game is in progress.' };
    const won = data.won === true;
    if (won && now - num(run.lastAt) < GAUNTLET_MIN_GAME_MS) return { error: 'That game was too quick to count.' };
    run.lastAt = now;
    if (!won) return loseLife() ? { user, over: true } : { user };
    run.playing = false;
    run.round = num(run.round) + 1;
    if (run.round < G.rounds.length) return { user };
    // Beaten: once a day.
    g.run = null;
    g.doneDay = today;
    g.completions = num(g.completions) + 1;
    const first = !g.firstDoneAt;
    const amount = first ? num(G.firstReward) : num(G.dailyReward);
    addDiamonds(user, amount);
    const newItems = [];
    user.activityInbox = user.activityInbox || {};
    if (first) {
      g.firstDoneAt = now;
      user.ownedCosmetics = user.ownedCosmetics || {};
      [[G.picture, G.pictureName], [G.frame, G.frameName]].forEach(([id, name]) => {
        if (!user.ownedCosmetics[id]) {
          user.ownedCosmetics[id] = { cost: 0, purchasedAt: now };
          user.activityInbox[`unlock_${id}`] = { type: 'shop', unlocked: true, name, cost: 0, requirement: 'Beat the Gauntlet', sentAt: now };
          newItems.push({ id, name });
        }
      });
    }
    user.challengeInbox = user.challengeInbox || {};
    user.challengeInbox[`gauntlet_${today}`] = { name: first ? 'Gauntlet beaten (first time!)' : 'Gauntlet beaten', reward: amount, completedAt: now };
    return { user, completed: true, amount, first, newItems };
  });
  return {
    ...status(res.user.gauntlet || {}), over: !!res.over, completed: !!res.completed, forfeited: !!res.forfeited,
    diamondsAwarded: num(res.amount), first: !!res.first, newItems: res.newItems || [], diamonds: num(res.user.diamonds)
  };
};

actions.rankedResult = async ({ uid, data }) => {
  const code = clip(data.roomCode, 6);
  if (!/^\d{6}$/.test(code)) fail('invalid-argument', 'Bad room.');
  const room = (await db().ref(`rooms/${code}`).once('value')).val();
  if (!room || room.isRanked !== true) fail('failed-precondition', 'Not a Ranked room.');
  const seats = Object.values(room.players || {}).filter(Boolean);
  if (seats.length < 2 || seats.length > 4) fail('failed-precondition', 'Not a Ranked table.');
  if (seats.some(p => !p.uid || p.finishRank == null)) fail('failed-precondition', 'The match has not finished.');
  const uids = seats.map(p => p.uid);
  if (new Set(uids).size !== uids.length || !uids.includes(uid)) fail('permission-denied', 'You were not in that match.');
  // Every seat must have entered this room itself (rankedMembers is only
  // writable by that account), within the last day.
  const members = await Promise.all(uids.map(u => db().ref(`rankedMembers/${code}/${u}`).once('value').then(s => num(s.val(), 0))));
  if (members.some(at => !at || Date.now() - at > 24 * 60 * 60 * 1000)) fail('failed-precondition', 'That match could not be checked.');
  // The Ranked audit (index.js auditRankedRoom) has checked every write to
  // this room. While RANKED_AUDIT_ENFORCE is off it only records what it
  // found on the result (shadow mode); on, a match with a hard finding isn't
  // scored.
  const auditRef = db().ref(`rankedAudit/${code}/${String(room.matchId || 'none').replace(/[.#$[\]/]/g, '_').slice(0, 200)}/counts`);
  if (RANKED_AUDIT_ENFORCE) await new Promise(r => setTimeout(r, 1500)); // let the last write's audit land
  const audit = (await auditRef.once('value')).val() || { hard: 0, soft: 0 };
  const resultId = (room.matchId && KEY_RE.test(room.matchId) ? room.matchId : `${code}_${[...uids].sort().join('_')}`).slice(0, 700).replace(/[.#$[\]/]/g, '_');
  const markerRef = db().ref(`rankedResults/${resultId}`);
  // A scoring that died half-way (older than a minute) may be retried: each
  // seat's own processedRankedMatches entry stops anything counting twice.
  const claimTx = await markerRef.transaction(c => (c === null || (c.state === 'scoring' && Date.now() - num(c.at) > 60000))
    ? { at: Date.now(), room: code, state: 'scoring', audit: { hard: num(audit.hard), soft: num(audit.soft) } } : undefined, undefined, false);
  if (!claimTx.committed) {
    // Already scored (or being scored by the other player's call).
    for (let i = 0; i < 20; i++) {
      const mine = (await markerRef.child(`results/${uid}`).once('value')).val();
      if (mine && mine.error === 'audit') fail('failed-precondition', 'This match didn\'t pass the Ranked checks, so it doesn\'t count for rating.');
      if (mine && mine.error === 'pair-limit') fail('resource-exhausted', 'You\'ve played this opponent a lot today: this one doesn\'t count for rating.');
      if (mine && mine.error) fail('internal', 'Your Ranked result could not be saved.');
      if (mine) return mine;
      await new Promise(r => setTimeout(r, 500));
    }
    fail('unavailable', 'Your result is still being saved. It will show shortly.');
  }
  if (RANKED_AUDIT_ENFORCE && num(audit.hard) > 0) {
    const refused = { error: 'audit' };
    await markerRef.update({ state: 'done', results: Object.fromEntries(uids.map(u => [u, refused])) });
    fail('failed-precondition', 'This match didn\'t pass the Ranked checks, so it doesn\'t count for rating.');
  }
  // The same two accounts are scored at most RANKED_PAIR_PER_DAY times a
  // day (stops feeding rating with a second account).
  if (uids.length === 2) {
    const pairRef = db().ref(`rankedPairs/${[...uids].sort().join('_')}`);
    const today = ukDateKey();
    const pair = await pairRef.transaction(c => {
      const cur = c && c.day === today ? c : { day: today, count: 0 };
      if (cur.count >= RANKED_PAIR_PER_DAY) return;
      return { day: today, count: cur.count + 1 };
    }, undefined, false);
    if (!pair.committed) {
      const limited = { error: 'pair-limit' };
      await markerRef.update({ state: 'done', results: Object.fromEntries(uids.map(u => [u, limited])) });
      fail('resource-exhausted', 'You\'ve played this opponent a lot today: this one doesn\'t count for rating.');
    }
  }
  const ratings = await Promise.all(uids.map(u => db().ref(`users/${u}/rating`).once('value').then(s => num(s.val(), 500))));
  const players = seats.map((p, i) => ({ uid: p.uid, finishRank: num(p.finishRank, 99), rating: ratings[i], seat: p }));
  const deltas = pairwiseEloDeltas(players);
  const now = Date.now();
  const results = {};
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const won = p.finishRank === 1;
    const gs = p.seat.gameStats || {};
    const stat = (key) => Math.max(0, Math.min(RANKED_STAT_CAPS[key], Math.floor(num(gs[key]))));
    const opponent = players.find(q => q.uid !== p.uid);
    const legacy = await legacyOwned(p.uid);
    try {
      const res = await userTx(p.uid, (user) => {
        user.processedRankedMatches = user.processedRankedMatches || {};
        if (user.processedRankedMatches[resultId]) return { noop: true };
        const previousRating = num(user.rating, 500);
        const newRating = Math.max(0, previousRating + deltas[i]);
        const rs = user.rankedStats || {};
        const newStreak = won ? num(rs.currentStreak) + 1 : 0;
        const lossStreak = won ? 0 : num(rs.currentLossStreak) + 1;
        user.rankedStats = {
          burnt: num(rs.burnt) + stat('burnt'),
          jokersPlayed: num(rs.jokersPlayed) + stat('jokersPlayed'),
          currentStreak: newStreak,
          bestStreak: Math.max(num(rs.bestStreak), newStreak),
          currentLossStreak: lossStreak,
          bestLossStreak: Math.max(num(rs.bestLossStreak), lossStreak),
          highestRating: Math.max(num(rs.highestRating, previousRating), newRating),
          lowestRating: Math.min(num(rs.lowestRating, previousRating), newRating)
        };
        const cs = user.challengeStats || {};
        user.challengeStats = {
          burns: num(cs.burns) + stat('challengeBurns'),
          jokerDeflects: num(cs.jokerDeflects) + stat('jokerDeflects'),
          snapBurns: num(cs.snapBurns) + stat('snapBurns')
        };
        user.rating = newRating;
        user.wins = num(user.wins) + (won ? 1 : 0);
        user.losses = num(user.losses) + (won ? 0 : 1);
        user.processedRankedMatches[resultId] = { rank: p.finishRank, appliedAt: now };
        user.processedRankedMatches = pruneMap(user.processedRankedMatches);
        if (opponent) user.lastRankedOpponent = { uid: opponent.uid, at: now };
        const fromTier = tierName(previousRating), toTier = tierName(newRating);
        if (fromTier !== toTier) {
          user.activityInbox = user.activityInbox || {};
          user.activityInbox[`rank_${now}_${i}`] = { type: 'rank', fromTier, toTier, direction: newRating > previousRating ? 'up' : 'down', previousRating, newRating, sentAt: now };
        }
        let amount = 0;
        const claimed = [];
        if (won) {
          amount = num(CAT.matchWinRewards.ranked);
          addDiamonds(user, amount);
          user.processedMatchRewards = pruneMap({ ...(user.processedMatchRewards || {}), [resultId]: { amount, label: 'Ranked Win!', awardedAt: now } });
          countSeasonWin(user, new Date(now));
          const lastRank = String(p.seat.lastPlayRank || '');
          const ending = CAT.challengeDefs.endingCards.find(c => c.rank === lastRank);
          if (ending && !user.completedChallenges?.[ending.id]) claimed.push(recordClaim(user, ending.id, ending.name, ending.reward, now));
        }
        claimed.push(...grantMilestones(user, now));
        const newAvatars = grantEarnedAvatars(user, legacy, now);
        return { user, result: { from: previousRating, to: newRating, won, diamondsAwarded: amount, claimed, newAvatars } };
      });
      const u = res.user;
      results[p.uid] = {
        ...(res.result || { from: num(u.rating, 500), to: num(u.rating, 500), won, diamondsAwarded: 0, claimed: [], newAvatars: [] }),
        rating: num(u.rating, 500), wins: num(u.wins), losses: num(u.losses), diamonds: num(u.diamonds),
        rankedStats: u.rankedStats || {}, challengeStats: u.challengeStats || {}
      };
      // The friends-visible copies of the rating.
      const tier = tierName(u.rating);
      const updates = { [`publicProfiles/${p.uid}/rating`]: num(u.rating, 500), [`publicProfiles/${p.uid}/tier`]: tier };
      const nameKey = String(u.username || '').trim().toLowerCase();
      if (/^[a-z0-9][a-z0-9_-]{2,11}$/.test(nameKey)) {
        updates[`leaderboard/${nameKey}/username`] = clip(u.username, 12);
        updates[`leaderboard/${nameKey}/rating`] = num(u.rating, 500);
        updates[`leaderboard/${nameKey}/tier`] = tier;
        updates[`leaderboard/${nameKey}/wins`] = num(u.wins);
        updates[`leaderboard/${nameKey}/losses`] = num(u.losses);
      }
      await db().ref().update(updates).catch(e => logger.warn('rankedResult public copies failed', e));
    } catch (e) {
      logger.error('rankedResult: seat failed', { uid: p.uid, resultId, error: String(e) });
      results[p.uid] = { error: 'not-saved' };
    }
  }
  await markerRef.update({ state: 'done', results });
  if (!results[uid] || results[uid].error) fail('internal', 'Your Ranked result could not be saved.');
  return results[uid];
};

actions.buyItem = async ({ uid, auth, data }) => {
  const id = clip(data.itemId, 60);
  const item = CAT.items[id];
  const now = new Date();
  if (!item) fail('invalid-argument', 'That item isn\'t in the Shop.');
  if (!itemBuyableNow(item, auth, now)) fail('failed-precondition', 'That item is only sold during its event.');
  const legacy = await legacyOwned(uid);
  const purchasedAt = now.getTime();
  const res = await userTx(uid, (user) => {
    if (owns(user, legacy, id)) return { error: 'Already owned.' };
    if (num(user.diamonds) < item.cost) return { error: `You need ${item.cost} Diamonds to buy ${item.name}.` };
    addDiamonds(user, -item.cost);
    user.ownedCosmetics = { ...(user.ownedCosmetics || {}), [id]: { purchasedAt, cost: item.cost } };
    user.activityInbox = { ...(user.activityInbox || {}), [`shop_${id}`]: { type: 'shop', name: item.name, cost: item.cost, sentAt: purchasedAt } };
    return { user };
  });
  await db().ref(`shopPurchases/${uid}/cosmetics/${id}`).set({ purchasedAt, cost: item.cost }).catch(() => {});
  return { diamonds: num(res.user.diamonds), purchase: { purchasedAt, cost: item.cost } };
};

actions.buyBundle = async ({ uid, auth, data }) => {
  const eventId = clip(data.eventId, 20);
  const ev = CAT.seasonalEvents.find(e => e.id === eventId);
  const now = new Date();
  if (!ev) fail('invalid-argument', 'Unknown event.');
  if (!isAmitK(auth) && !isSeasonOn(eventId, now)) fail('failed-precondition', `The ${ev.name} Bundle is only sold during ${ev.name}.`);
  const legacy = await legacyOwned(uid);
  const purchasedAt = now.getTime();
  const res = await userTx(uid, (user) => {
    const items = Object.entries(CAT.items).filter(([id, it]) => it.season === eventId && !owns(user, legacy, id));
    if (items.length < 2) return { error: 'You already own most of this event\'s items.' };
    const full = items.reduce((s, [, it]) => s + it.cost, 0);
    const price = Math.round((full * CAT.seasonalBundleRate) / 10) * 10;
    if (data.price !== undefined && num(data.price) !== price) return { error: 'Your collection changed. Please check the bundle price and try again.' };
    if (num(user.diamonds) < price) return { error: `You need ${price} Diamonds for the ${ev.name} Bundle.` };
    addDiamonds(user, -price);
    const purchases = Object.fromEntries(items.map(([id, it]) => [id, { purchasedAt, cost: it.cost }]));
    user.ownedCosmetics = { ...(user.ownedCosmetics || {}), ...purchases };
    user.activityInbox = { ...(user.activityInbox || {}), [`shop_bundle_${eventId}_${purchasedAt}`]: { type: 'shop', name: `${ev.name} Bundle`, cost: price, sentAt: purchasedAt } };
    return { user, purchases, price };
  });
  await Promise.all(Object.entries(res.purchases).map(([id, rec]) => db().ref(`shopPurchases/${uid}/cosmetics/${id}`).set(rec).catch(() => {})));
  return { diamonds: num(res.user.diamonds), purchases: res.purchases, price: res.price };
};

actions.buyNameToken = async ({ uid }) => {
  const cost = num(CAT.nameChangeTokenCost);
  const purchasedAt = Date.now();
  const existing = (await db().ref(`shopPurchases/${uid}/nameChangeToken`).once('value')).val();
  if (existing) fail('failed-precondition', 'This lifetime item has already been purchased.');
  const res = await userTx(uid, (user) => {
    if (user.nameChangeToken) return { error: 'This lifetime item has already been purchased.' };
    if (num(user.diamonds) < cost) return { error: `You need ${cost} Diamonds to buy this token.` };
    addDiamonds(user, -cost);
    user.nameChangeToken = { purchasedAt, cost };
    user.activityInbox = { ...(user.activityInbox || {}), name_change_token: { type: 'shop', name: 'Name Change Token', cost, sentAt: purchasedAt } };
    return { user };
  });
  await db().ref(`shopPurchases/${uid}/nameChangeToken`).set({ purchasedAt, cost });
  return { diamonds: num(res.user.diamonds), token: { purchasedAt, cost } };
};

actions.sendGift = async ({ uid, auth, data }) => {
  const id = clip(data.itemId, 60);
  const friendUid = clip(data.friendUid, 128);
  const item = CAT.items[id];
  const now = new Date();
  if (!item || !itemBuyableNow(item, auth, now)) fail('failed-precondition', 'That item can\'t be gifted right now.');
  if (!friendUid || friendUid === uid || !KEY_RE.test(friendUid)) fail('invalid-argument', 'Choose a friend.');
  const isFriend = (await db().ref(`friends/${uid}/${friendUid}`).once('value')).val() === true;
  if (!isFriend) fail('permission-denied', 'Gifts can only be sent to friends.');
  const giftId = db().ref(`gifts/${friendUid}`).push().key;
  const sentAt = now.getTime();
  const toName = clip(data.friendName || 'a friend', 12);
  const res = await userTx(uid, (user) => {
    if (num(user.diamonds) < item.cost) return { error: `You need ${item.cost} Diamonds to gift ${item.name}.` };
    addDiamonds(user, -item.cost);
    user.activityInbox = { ...(user.activityInbox || {}), [`gift_sent_${giftId}`]: { type: 'gift', direction: 'sent', name: item.name, to: toName, cost: item.cost, sentAt } };
    return { user };
  });
  const fromName = clip(res.user.username || 'A friend', 12) || 'A friend';
  try {
    await db().ref(`gifts/${friendUid}/${giftId}`).set({ fromUid: uid, fromName, itemId: id, cost: item.cost, sentAt });
  } catch (e) {
    await userTx(uid, (user) => {
      addDiamonds(user, item.cost);
      if (user.activityInbox) delete user.activityInbox[`gift_sent_${giftId}`];
      return { user };
    });
    fail('internal', 'The gift could not be delivered. Your Diamonds were refunded.');
  }
  return { diamonds: num(res.user.diamonds), giftId };
};

actions.claimGift = async ({ uid, data }) => {
  const giftId = clip(data.giftId, 80);
  if (!KEY_RE.test(giftId)) fail('invalid-argument', 'Unknown gift.');
  const giftRef = db().ref(`gifts/${uid}/${giftId}`);
  const gift = (await giftRef.once('value')).val();
  if (!gift) fail('not-found', 'This gift has already been opened.');
  const item = CAT.items[gift.itemId];
  if (!item) fail('failed-precondition', 'This gift is no longer available.');
  const legacy = await legacyOwned(uid);
  const now = Date.now();
  let res;
  try {
    res = await userTx(uid, (user) => {
      if (user.claimedGifts?.[giftId]) return { error: 'Already opened.' };
      const asDiamonds = owns(user, legacy, item.id);
      const value = Math.max(0, Math.min(num(gift.cost, item.cost), item.cost));
      if (asDiamonds) addDiamonds(user, value);
      else user.ownedCosmetics = { ...(user.ownedCosmetics || {}), [item.id]: { purchasedAt: now, cost: 0 } };
      user.claimedGifts = { ...(user.claimedGifts || {}), [giftId]: true };
      user.activityInbox = { ...(user.activityInbox || {}), [`gift_in_${giftId}`]: { type: 'gift', direction: 'received', name: item.name, from: clip(gift.fromName || 'a friend', 12), cost: value, asDiamonds, sentAt: now } };
      return { user, asDiamonds, value };
    });
  } catch (e) {
    if (/Already opened/.test(String(e.message))) await giftRef.remove().catch(() => {});
    throw e;
  }
  await giftRef.remove().catch(() => {});
  return { itemId: item.id, asDiamonds: !!res.asDiamonds, value: num(res.value), diamonds: num(res.user.diamonds) };
};

exports.economy = onCall({ region: 'europe-west1', cors: true, maxInstances: 20 }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) fail('unauthenticated', 'Please sign in.');
  const data = request.data && typeof request.data === 'object' ? request.data : {};
  const handler = Object.prototype.hasOwnProperty.call(actions, data.action) ? actions[data.action] : null;
  if (!handler) fail('invalid-argument', 'Unknown action.');
  try {
    return await handler({ uid, auth: request.auth, data });
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    logger.error(`economy.${data.action} failed`, { uid, error: String(e && e.stack || e) });
    throw new HttpsError('internal', 'Something went wrong. Please try again.');
  }
});

// For the unit tests.
exports._test = { actions, pickDailyIds, pickWeeklyIds, ukDateKey, ukWeekKey, shiftDateKey, activeSeasonWindows, pairwiseEloDeltas, tierName, challengeForKey, milestoneEligible, unlockedDifficulties };
