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
//   claim         one challenge by completion key (daily_…, weekly_…, season_…, id)
//   puzzle        a solved weekly puzzle: the moves are replayed here (catalog puzzles), once per puzzle per UK week
//   weeklyReroll  swap one weekly challenge for another, once a UK week (level-locked)
//   matchWin      a Vs Bots or casual online win (caps: see MATCH_LIMITS)
//   matchFinished a finished match (ShitHead Virgin / Beginner)
//   rankedDeal    the server's seat order + shuffled deck for a Ranked match
//   gauntlet      Vs Bots Gauntlet runs: start, each game's result, the reward
//   referral      invite codes, linking a new player to their inviter, the rewards
//   accountData   everything stored about the account (Profile → Download my data)
//   deleteAccount request (7-day recovery window) / cancel / status (functions/account.js)
//   rankedResult  score a finished Ranked room for every seat, once
//   buyItem / buyBundle / buyNameToken / sendGift / claimGift
//
// XP (functions/xp.js) rides along on matchFinished, matchWin, rankedResult,
// claim and gauntlet: only while the owner's switch config/features/xp is on.
'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const CAT = require('./catalog.json');
Object.entries(CAT.items).forEach(([id, item]) => { item.id = id; });
const { seasonalWindowsForYear } = require('./seasons');
const nodeCrypto = require('crypto');

const MAX_DIAMONDS = 999999;
const AMITK_EMAIL = 'amirk2197@googlemail.com';
// Test resets (owner): a record of today's spin / card / Three Cards without this `resetV` no longer counts for that uid, so they can
// play once more (prizes stay). Bump a number to reset again. Scratch also resets Pooja (28 Oct).
const AMITK_UID = '11d84kCgSde82Xlu8k5U65OB9662', POOJA_UID = 'pAB2xxrFWMhUv6AYtJMP1nSxA5l1';
const RESET_V = { wheel: { [AMITK_UID]: 1 }, scratch: { [AMITK_UID]: 2, [POOJA_UID]: 1 }, monty: { [AMITK_UID]: 1 } };
const resetOk = (kind, uid, rec) => !RESET_V[kind][uid] || (rec && rec.resetV === RESET_V[kind][uid]);
const DIFFICULTIES = ['easy', 'medium', 'hard', 'boss'];
// Phase 2 caps. A real match takes well over a minute even at 4x speed, so
// these never touch honest play; they stop scripted reward farming.
const MATCH_LIMITS = { minGapMs: 45 * 1000, perDay: 40 };
// Per-match ceilings on the Ranked counters a room reports.
const RANKED_STAT_CAPS = { burnt: 60, jokersPlayed: 8, challengeBurns: 20, jokerDeflects: 8, snapBurns: 12 };
const SEASON_SLACK_MS = 14 * 60 * 60 * 1000; // phones' local dates vs the server's UTC
const PROCESSED_KEEP = 200;
// On (owner, v241): a Ranked match with a hard audit finding isn't scored
// (both players get "didn't pass the Ranked checks"). Off = shadow mode: the
// findings are only recorded on each result (rankedResults/{matchId}/audit).
// If honest players ever lose matches to it, set it back to false.
const RANKED_AUDIT_ENFORCE = true;
const RANKED_PAIR_PER_DAY = 5; // processedMatchRewards / processedRankedMatches entries kept

const db = () => admin.database();
const boards = require('./boards');
const puzzles = require('./puzzle-engine'); // copy of js/puzzle-engine.js (a test keeps them identical)
const xp = require('./xp'); // XP & levels: off until config/features/xp is true
// An action's XP: `past` is the account's one-time XP for play from before
// levels (xp.backfill, taken at the start of the mutator, before this
// action changes any counter), then this action's own parts.
function xpResult(user, parts, now, past) {
  const res = xp.award(user, parts, now, addDiamonds);
  if (!past || !past.gained) return res;
  const cur = res || { gained: 0, total: user.xp.total, level: user.xp.level, levelUps: [] };
  const rewards = [...(past.rewards || []), ...(cur.rewards || [])];
  return { ...cur, ...(rewards.length ? { rewards } : {}), backfill: { xp: past.gained, level: past.level, reward: past.levelUps.reduce((sum, u) => sum + u.reward, 0) } };
}
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
function pickN(poolIds, seedText, n = 3) {
  const rng = mulberry32(hashStringToSeed(seedText));
  const pool = [...poolIds];
  for (let i = pool.length - 1; i > pool.length - 1 - n; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(pool.length - n);
}
// The weekly rules are versioned by UK week (the game's weeklyRulesFor):
// each rule applies from its `from` week (zero-padded keys compare as text).
function weeklyRuleFor(weekKey) {
  const rules = Array.isArray(CAT.weeklyRules) && CAT.weeklyRules.length
    ? CAT.weeklyRules : [{ from: '', picks: 3, pool: CAT.weeklyPool }];
  let rule = rules[0];
  rules.forEach((r) => { if (String(weekKey) >= String(r.from || '')) rule = r; });
  return rule;
}
// extra = more picks from the same seeded shuffle; the first picks never
// change (pickN takes from the end), so extras only add to the list.
const pickDailyIds = (dateKey, extra = 0) => pickN(CAT.dailyPool.map(c => c.id), dateKey, Math.min(CAT.dailyPool.length, 3 + extra));
const pickWeeklyIds = (weekKey, extra = 0) => {
  const rule = weeklyRuleFor(weekKey);
  return pickN(rule.pool.map(c => c.id), `weekly-${weekKey}`, Math.min(rule.pool.length, rule.picks + extra));
};
// Extra challenges by level (v290, owner): xp.extraDaily / xp.extraWeekly
// list the levels that each add one more pick.
const userLevel = (user) => xp.levelFor(num(user && user.xp && user.xp.total));
const extraPicks = (levels, L) => (Array.isArray(levels) ? levels.filter(n => L >= num(n)).length : 0);
const userDailyIds = (user, dateKey) => pickDailyIds(dateKey, extraPicks(xp.RULES.extraDaily, userLevel(user)));
// The account's own picks: the week's picks (plus its level extras) with its
// reroll swapped in (users/{uid}/weeklyReroll = {week, from, to}, server-only; v289).
function userWeeklyIds(user, weekKey) {
  const ids = pickWeeklyIds(weekKey, extraPicks(xp.RULES.extraWeekly, userLevel(user)));
  const r = user && user.weeklyReroll;
  if (r && r.week === weekKey && ids.includes(r.from) && r.to && !ids.includes(r.to)) ids[ids.indexOf(r.from)] = r.to;
  return ids;
}

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

// Ranked points on top of Elo (catalog rankedBonus; index.html RANKED_BONUS):
// a flat bonus for every win, so the pool of points grows instead of staying
// zero-sum around 500, plus a one-off bonus when a win streak reaches 2, 3, 5
// and 10 (then every further 10). No extra loss for losing streaks.
const RANKED_BONUS = CAT.rankedBonus || { win: 10, streak: { 2: 5, 3: 10, 5: 15, 10: 20 } };
function rankedStreakBonus(streak, table = RANKED_BONUS.streak) {
  const n = Math.floor(num(streak));
  if (table[n]) return num(table[n]);
  const top = Math.max(...Object.keys(table).map(Number));
  return n > top && n % top === 0 ? num(table[top]) : 0;
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
  let outcome = null, before = null;
  const result = await db().ref(`users/${uid}`).transaction((current) => {
    outcome = null;
    before = current;
    if (current === null) return null;
    const out = mutate(JSON.parse(JSON.stringify(current)));
    outcome = out || { noop: true };
    if (!out || out.error || out.noop) return; // abort: nothing to write
    return out.user;
  }, undefined, false);
  if (!result.snapshot.exists()) fail('failed-precondition', 'Your profile is still being created. Please try again.');
  if (outcome?.error) fail('failed-precondition', outcome.error);
  const saved = result.snapshot.val() || {};
  // Leaderboards + congratulations (functions/boards.js); never fails the action.
  if (result.committed && outcome && !outcome.noop) {
    try { outcome.boardMail = await boards.onUserChanged(uid, before, saved); } catch (e) { logger.warn('boards update failed', { uid, error: String(e) }); }
    try { await xp.mailFriendsOnLevel(uid, before, saved); } catch (e) { logger.warn('friend level mail failed', { uid, error: String(e) }); }
  }
  return { ...(outcome || {}), user: saved };
}
function pruneMap(map, keep = PROCESSED_KEEP) {
  const entries = Object.entries(map || {});
  if (entries.length <= keep) return map || {};
  const at = (v) => num(v?.awardedAt ?? v?.appliedAt ?? v?.at, 0);
  return Object.fromEntries(entries.sort((a, b) => at(b[1]) - at(a[1])).slice(0, keep));
}

// Finishing all four challenges of an event earns its Champion frame (v376).
function grantChampionFrame(user, key, now) {
  const m = /^season_([a-z]+)-\d{4}_all$/.exec(key);
  const ev = m && CAT.seasonalEvents.find(e => e.id === m[1]);
  if (!ev) return null;
  const id = `frame-${ev.id}-champion`;
  user.ownedCosmetics = user.ownedCosmetics || {};
  if (user.ownedCosmetics[id]) return null;
  user.ownedCosmetics[id] = { cost: 0, purchasedAt: now };
  user.activityInbox = user.activityInbox || {};
  const name = `${ev.name} Champion`;
  user.activityInbox[`unlock_${id}`] = { type: 'shop', unlocked: true, name, cost: 0, requirement: 'Finish all four event challenges', sentAt: now };
  return { id, name };
}
// ---- Challenges ---------------------------------------------------------------------
function recordClaim(user, id, name, reward, now) {
  user.completedChallenges = user.completedChallenges || {};
  user.completedChallenges[id] = { completedAt: now, reward };
  user.challengeInbox = user.challengeInbox || {};
  user.challengeInbox[id] = { name: clip(name || id, 80), reward, completedAt: now };
  addDiamonds(user, reward);
  grantChampionFrame(user, id, now);
  return { id, name, reward };
}
const sumValues = (obj) => Object.values(obj || {}).reduce((s, n) => s + num(n), 0);
// Milestone challenges the server can check from the account's own totals.
function milestoneEligible(user) {
  const cs = user.challengeStats || {}, rs = user.rankedStats || {}, dw = user.difficultyWins || {};
  const games = num(user.wins) + num(user.losses) + num(rs.draws);
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
  add(d.recruits || [], num(user.referralStats?.recruits));
  // 2 vs 2 wins (matchCounters.twosWins, counted by matchWin).
  add(d.twosWins || [], num(user.matchCounters?.twosWins));
  // Multiple Decks: wins, Snap Burns and top-three finishes at big tables (matchCounters).
  add(d.decksWins || [], num(user.matchCounters?.decksWins));
  add(d.decksSnaps || [], num(user.matchCounters?.decksSnaps));
  add(d.decksTop3 || [], num(user.matchCounters?.decksTop3));
  // No Mercy: wins, Queens played and cards taken with Kings (matchCounters).
  add(d.noMercyWins || [], num(user.matchCounters?.noMercyWins));
  add(d.noMercyQueens || [], num(user.matchCounters?.nmQueens));
  add(d.noMercyKings || [], num(user.matchCounters?.nmKings));
  // Hidden: Draw a Game (a stalemate draw in any mode).
  add(d.draws || [], num(user.matchCounters?.draws) + num(rs.draws));
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
  Object.keys(user.completedChallenges || {}).forEach(k => { const f = grantChampionFrame(user, k, now); if (f) newly.push(f); });
  Object.entries(CAT.earned).forEach(([id, rule]) => {
    if (owns(user, legacy, id)) return;
    const met = rule.type === 'peakRating' ? peak >= rule.min
      : rule.type === 'rankedGames' ? num(user.wins) + num(user.losses) >= rule.min
      : rule.type === 'lossStreak' ? num(rs.bestLossStreak) >= rule.min
      : rule.type === 'seasonWins' ? seasonalWinsFor(user.seasonWins, rule.season) >= rule.min
      : rule.type === 'recruits' ? num(user.referralStats?.recruits) >= rule.min
      : rule.type === 'twosWins' ? num(user.matchCounters?.twosWins) >= rule.min
      : rule.type === 'decksWins' ? num(user.matchCounters?.decksWins) >= rule.min
      : rule.type === 'nmWins' ? num(user.matchCounters?.noMercyWins) >= rule.min
      : rule.type === 'nmQueens' ? num(user.matchCounters?.nmQueens) >= rule.min
      : rule.type === 'nmKings' ? num(user.matchCounters?.nmKings) >= rule.min
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
    if (!def || !userDailyIds(user, dateKey).includes(poolId)) return { error: 'Not one of that day\'s challenges.' };
    return { name: def.name, reward: CAT.dailyReward };
  }
  const weekly = /^weekly_(\d{4}-W\d{2})_([a-z0-9-]+)$/.exec(id);
  if (weekly) {
    const [, weekKey, poolId] = weekly;
    const thisWeek = ukWeekKey(now), lastWeek = ukWeekKey(new Date(now.getTime() - 7 * 864e5));
    if (weekKey !== thisWeek && weekKey !== lastWeek) return { error: 'That weekly challenge has expired.' };
    const def = weeklyRuleFor(weekKey).pool.find(c => c.id === poolId);
    if (!def || !userWeeklyIds(user, weekKey).includes(poolId)) return { error: 'Not one of that week\'s challenges.' };
    return { name: def.name, reward: CAT.weeklyReward };
  }
  // Seasonal: only while that event instance is on (with the usual slack).
  const season = /^season_([a-z]+-\d{4})_([a-z0-9-]+)$/.exec(id);
  if (season) {
    const [, key, cid] = season;
    if (!activeSeasonWindows(now).some(w => w.key === key)) return { error: 'That event has ended.' };
    const bonus = CAT.seasonalChallengeBonus;
    if (cid === bonus.id) {
      const allDone = CAT.seasonalChallenges.every(c => user.completedChallenges?.[`season_${key}_${c.id}`]);
      return allDone ? { name: bonus.name, reward: bonus.reward } : { error: 'Not completed yet.' };
    }
    const def = CAT.seasonalChallenges.find(c => c.id === cid);
    return def ? { name: def.name, reward: def.reward } : { error: 'Unknown challenge.' };
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
actions.privateTableAccess = async ({uid}) => {
  const table = require('./private-table');
  if (uid !== table.SENDER_UID) fail('permission-denied', 'This item is not available.');
  await table.grant(admin.database(), uid);
  await require('./private-burn').grant(admin.database(), uid);
  await require('./private-back').grant(admin.database(), uid);
  return {itemId:table.ITEM_ID};
};

// When the account was really created (Firebase Auth), for referrals: the game
// can write to users/{uid} before init runs, so "no profile yet" alone can't
// tell a new account. null if Auth doesn't know the account (unit tests).
async function authCreatedAt(uid) {
  try {
    const rec = await admin.auth().getUser(uid);
    const t = Date.parse(rec?.metadata?.creationTime || '');
    return Number.isFinite(t) ? t : null;
  } catch (e) { return null; }
}
actions.init = async ({ uid, auth }) => {
  const ref = db().ref(`users/${uid}`);
  const snap = await ref.once('value');
  const created = snap.exists() && snap.child('createdAt').exists() ? null : await authCreatedAt(uid);
  if (!snap.exists()) {
    await ref.transaction(c => c === null ? {
      createdAt: Date.now(), // a new account (only these can be linked to an inviter)
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
    if (!user.createdAt && created) { user.createdAt = created; changed = true; }
    let testGrant = false;
    if (isAmitK(auth) && !user.amitKShopTestGrantV4Done) {
      user.diamonds = MAX_DIAMONDS; user.amitKShopTestGrantV4Done = true; changed = true; testGrant = true;
    }
    return changed ? { user, testGrant } : { noop: true };
  });
  const u = res.user;
  return { diamonds: num(u.diamonds), rating: num(u.rating, 500), wins: num(u.wins), losses: num(u.losses), testGrant: !!res.testGrant };
};

actions.sync = async ({ uid, auth }) => {
  const legacy = await legacyOwned(uid);
  const now = Date.now();
  const xpOn = await xp.enabled();
  const res = await userTx(uid, (user) => {
    // A bigger level table (tableVersion): this account's level again.
    const releveled = xpOn && xp.relevel(user);
    // XP for past play, once (the first sign-in after the switch goes on).
    const past = xpOn ? xp.backfill(user, now, addDiamonds) : null;
    const xpRes = past ? xpResult(user, [], now, past) : releveled ? { gained: 0, total: user.xp.total, level: user.xp.level, levelUps: [] } : null;
    const claimed = grantMilestones(user, now);
    const newAvatars = grantEarnedAvatars(user, legacy, now);
    // Level rewards for accounts already past their level (xp.grantLevelRewards).
    const levelRewards = xpOn ? xp.grantLevelRewards(user, now) : [];
    // Season Pass items missed by a failed write, and (test account) every item of every season: a change here must be saved, so it counts below.
    const passItems = [...(xpOn ? require('./season-pass').grantReached(user, now) : []), ...(isAmitK(auth) ? require('./season-pass').grantAll(user, now) : [])];
    // A first Gauntlet clear from before it was a challenge: record it (already paid).
    let backfilled = false;
    // Gauntlet bots beaten from before they were counted: 5 per clear + this run's.
    if (user.gauntlet && user.gauntlet.botsBeaten == null && (num(user.gauntlet.completions) || user.gauntlet.run)) {
      user.gauntlet.botsBeaten = num(user.gauntlet.completions) * CAT.gauntlet.rounds.length + num(user.gauntlet.run?.round);
      backfilled = true;
    }
    if (user.gauntlet?.firstDoneAt && !user.completedChallenges?.['gauntlet-first']) {
      user.completedChallenges = user.completedChallenges || {};
      user.completedChallenges['gauntlet-first'] = { completedAt: num(user.gauntlet.firstDoneAt), reward: num(CAT.gauntlet.firstReward) };
      backfilled = true;
    }
    const xpOut = levelRewards.length ? { ...(xpRes || { gained: 0, total: num(user.xp?.total), level: num(user.xp?.level, 1), levelUps: [] }), rewards: levelRewards } : xpRes;
    return claimed.length || newAvatars.length || passItems.length || backfilled || past || releveled || levelRewards.length ? { user, claimed, newAvatars, xp: xpOut } : { noop: true, claimed: [], newAvatars: [] };
  });
  // After a level-table change, fix every account's level once (xp.migrateAll).
  if (xpOn) { try { await xp.migrateAll(); } catch (e) { logger.warn('xp migrate failed', { error: String(e) }); } }
  // Make sure this player is on the Challenges / Gauntlet boards (older accounts).
  try { await boards.onUserChanged(uid, null, res.user, { force: true }); } catch (e) { logger.warn('boards backfill failed', { uid, error: String(e) }); }
  return { claimed: res.claimed || [], newAvatars: res.newAvatars || [], diamonds: num(res.user.diamonds), xp: res.xp || null };
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
    // Event login bonus (v380): the day's claim also pays a flat bonus while a seasonal event is live
    // (UK day, both end days included). It rides the once-a-day streak claim, so it can't repeat.
    const ev = num(CAT.eventLoginBonus) > 0 ? require('./seasons').eventLiveOn(today) : null;
    const bonus = ev ? { event: ev.id, name: ev.name, amount: num(CAT.eventLoginBonus) } : null;
    addDiamonds(user, reward + (bonus ? bonus.amount : 0));
    return { user, claimed: { count, reward, ...(bonus ? { bonus } : {}) } };
  });
  return { claimed: res.claimed || null, streak: res.user.loginStreak || null, diamonds: num(res.user.diamonds) };
};

// Drop Zone (v503): a bank of cards, 1 to start, +1 for every game won in any mode (matchWin, Ranked win, each Gauntlet bot beaten), at most
// `cap`. Stored server-only in `users/{uid}/dropzone` = {cards, earned, used, at, last}. A fresh record starts at `start`.
const dzCap = () => num(CAT.dropzone?.cap, 10), dzStart = () => num(CAT.dropzone?.start, 1);
function dzAward(user, now) {
  if (!CAT.dropzone) return false;
  const d = user.dropzone || (user.dropzone = { cards: dzStart(), earned: 0, used: 0, at: now });
  if (num(d.cards) >= dzCap()) return false;
  d.cards = num(d.cards) + 1; d.earned = num(d.earned) + 1;
  return true;
}
const dzView = (user, awarded) => ({ cards: user.dropzone ? num(user.dropzone.cards) : dzStart(), awarded: !!awarded });
// Daily Spin (v469): one free spin a UK day. The server draws the prize by weight (catalog `wheel`) and pays it in
// the same write that marks the day, so it can never repeat. XP prizes are left out of the draw while XP is off.
// The two item prizes are wheel-only; owning one already pays `dupeDiamonds` instead.
actions.wheel = async ({ uid, data }) => {
  const W = CAT.wheel;
  if (!W || !Array.isArray(W.prizes)) fail('failed-precondition', 'The Daily Spin is not available yet.');
  const now = new Date(), today = ukDateKey(now);
  if (clip(data.op, 10) !== 'spin') {
    const w = (await admin.database().ref(`users/${uid}/wheel`).once('value')).val() || {};
    const owned = (await admin.database().ref(`users/${uid}/ownedCosmetics`).once('value')).val() || {};
    return { canSpin: w.lastDate !== today || !resetOk('wheel', uid, w), last: w.last || null, spins: num(w.spins), owned: Object.fromEntries(W.prizes.filter(p => p.kind === 'item').map(p => [p.itemId, !!owned[p.itemId]])) };
  }
  const xpOn = await xp.enabled();
  const pool = W.prizes.filter(p => xpOn || p.kind !== 'xp');
  const total = pool.reduce((sum, p) => sum + num(p.weight), 0);
  let roll = nodeCrypto.randomInt(total);
  const prize = pool.find(p => (roll -= num(p.weight)) < 0) || pool[0];
  const res = await userTx(uid, (user) => {
    if (user.wheel?.lastDate === today && resetOk('wheel', uid, user.wheel)) return { noop: true, already: true };
    let paid = 0, duplicate = false, xpRes = null;
    if (prize.kind === 'diamonds') { paid = num(prize.amount); addDiamonds(user, paid); }
    else if (prize.kind === 'xp') {
      const past = xp.backfill(user, now.getTime(), addDiamonds);
      xpRes = xpResult(user, [['wheel', num(prize.amount)]], now.getTime(), past);
    } else if (prize.kind === 'item') {
      if (user.ownedCosmetics?.[prize.itemId]) { duplicate = true; paid = num(W.dupeDiamonds); addDiamonds(user, paid); }
      else {
        user.ownedCosmetics = user.ownedCosmetics || {};
        user.ownedCosmetics[prize.itemId] = { cost: 0, purchasedAt: now.getTime() };
        user.activityInbox = user.activityInbox || {};
        user.activityInbox[`unlock_${prize.itemId}`] = { type: 'shop', unlocked: true, name: clip(prize.name, 80), cost: 0, requirement: 'Won on the Daily Spin', sentAt: now.getTime() };
      }
    }
    user.wheel = { lastDate: today, last: { id: prize.id, at: now.getTime() }, spins: num(user.wheel?.spins) + 1, ...(RESET_V.wheel[uid] ? { resetV: RESET_V.wheel[uid] } : {}) };
    return { user, spin: { prize: prize.id, kind: prize.kind, amount: num(prize.amount), itemId: prize.itemId || null, name: prize.name || null, duplicate, paid }, xp: xpRes };
  });
  if (res.already) return { already: true, canSpin: false, last: res.user.wheel?.last || null, diamonds: num(res.user.diamonds) };
  return { spin: res.spin, canSpin: false, diamonds: num(res.user.diamonds), xp: res.xp || null };
};

// Drop Zone (v503): `status` returns the card count; `drop` {n} spends up to n cards (all of them in one write), draws a slot for
// each by weight (catalog `dropzone`), pays it and returns the list so the phone can animate each card into its slot.
actions.dropzone = async ({ uid, data }) => {
  const D = CAT.dropzone;
  if (!D || !Array.isArray(D.slots)) fail('failed-precondition', 'Drop Zone is not available yet.');
  const now = Date.now();
  if (clip(data.op, 10) !== 'drop') {
    const u = (await admin.database().ref(`users/${uid}`).once('value')).val() || {};
    const owned = u.ownedCosmetics || {};
    return { cards: u.dropzone ? num(u.dropzone.cards) : dzStart(), cap: dzCap(), last: u.dropzone?.last || null, owned: Object.fromEntries(D.slots.filter(sl => sl.kind === 'item').map(sl => [sl.itemId, !!owned[sl.itemId]])) };
  }
  const want = Math.max(1, Math.min(dzCap(), Math.trunc(num(data.n, 1))));
  const total = D.slots.reduce((sum, sl) => sum + num(sl.weight), 0);
  const draws = Array.from({ length: want }, () => { let r = nodeCrypto.randomInt(total); const i = D.slots.findIndex(sl => (r -= num(sl.weight)) < 0); return i < 0 ? 0 : i; });
  const res = await userTx(uid, (user) => {
    const d = user.dropzone || { cards: dzStart(), earned: 0, used: 0, at: now };
    if (num(d.cards) < 1) return { noop: true, none: true };
    const k = Math.min(want, num(d.cards)), drops = [];
    for (let i = 0; i < k; i++) {
      const slot = D.slots[draws[i]];
      let paid = 0, duplicate = false;
      if (slot.kind === 'diamonds') { paid = num(slot.amount); addDiamonds(user, paid); }
      else if (user.ownedCosmetics?.[slot.itemId]) { duplicate = true; paid = num(D.dupeDiamonds); addDiamonds(user, paid); }
      else {
        user.ownedCosmetics = user.ownedCosmetics || {};
        user.ownedCosmetics[slot.itemId] = { cost: 0, purchasedAt: now };
        user.activityInbox = user.activityInbox || {};
        user.activityInbox[`unlock_${slot.itemId}`] = { type: 'shop', unlocked: true, name: clip(slot.name, 80), cost: 0, requirement: 'Won on Drop Zone', sentAt: now };
      }
      drops.push({ slot: draws[i], id: slot.id, kind: slot.kind, amount: num(slot.amount), itemId: slot.itemId || null, name: slot.name || null, duplicate, paid });
    }
    d.cards = num(d.cards) - k; d.used = num(d.used) + k; d.at = now; d.last = { slot: drops[drops.length - 1].slot, at: now };
    user.dropzone = d;
    return { user, drops };
  });
  if (res.none) return { none: true, cards: 0, diamonds: num(res.user.diamonds) };
  return { drops: res.drops, cards: num(res.user.dropzone.cards), diamonds: num(res.user.diamonds) };
};

// Scratch Card (v478): one free card a UK day. `play` draws the result by weight, lays out the 3x3 grid that shows it
// (a line of three of one symbol wins that symbol's prize; a losing grid has no line), pays it at once and keeps
// the card in `users/{uid}/scratch` so a reopened pop-up shows it. Scratching the foil off is only the reveal.
const scratchShuffle = (list) => { for (let i = list.length - 1; i > 0; i--) { const j = nodeCrypto.randomInt(i + 1); [list[i], list[j]] = [list[j], list[i]]; } return list; };
const SCRATCH_LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const scratchLinesOf = (grid) => SCRATCH_LINES.filter(l => grid[l[0]] === grid[l[1]] && grid[l[1]] === grid[l[2]]);
// v479: tic tac toe. A win is exactly ONE line (row, column or diagonal) of the prize symbol; a loss has no line at all.
const scratchGrid = (symbols, win) => {
  for (;;) {
    const grid = Array.from({ length: 9 }, () => symbols[nodeCrypto.randomInt(symbols.length)]);
    const line = win ? SCRATCH_LINES[nodeCrypto.randomInt(SCRATCH_LINES.length)] : null;
    if (line) line.forEach(i => { grid[i] = win; });
    const lines = scratchLinesOf(grid);
    if (win ? lines.length === 1 && lines[0] === line : !lines.length) return grid;
  }
};
// One-off reset (28 Oct, owner): AmitK's and Pooja's card for today (drawn before the v479 line rules) no longer counts, so each can
// play once more. The marker `resetV` lives inside the card, so no rules change; bump SCRATCH_RESET_V to reset them again.
const scratchToday = (uid, card, today) => card && card.date === today && resetOk('scratch', uid, card);
actions.scratch = async ({ uid, data }) => {
  const S = CAT.scratch;
  if (!S || !Array.isArray(S.prizes)) fail('failed-precondition', 'The Scratch Card is not available yet.');
  const now = new Date(), today = ukDateKey(now);
  if (clip(data.op, 10) !== 'play') {
    const c = (await admin.database().ref(`users/${uid}/scratch`).once('value')).val() || {};
    const owned = (await admin.database().ref(`users/${uid}/ownedCosmetics`).once('value')).val() || {};
    return { canPlay: !scratchToday(uid, c, today), last: scratchToday(uid, c, today) ? c : null, owned: Object.fromEntries(S.prizes.filter(p => p.kind === 'item').map(p => [p.itemId, !!owned[p.itemId]])) };
  }
  const total = S.prizes.reduce((sum, p) => sum + num(p.weight), 0);
  let roll = nodeCrypto.randomInt(total);
  const prize = S.prizes.find(p => (roll -= num(p.weight)) < 0) || S.prizes[0];
  const grid = scratchGrid(S.symbols, prize.symbol || null);
  const res = await userTx(uid, (user) => {
    if (scratchToday(uid, user.scratch, today)) return { noop: true, already: true };
    let paid = 0, duplicate = false;
    if (prize.kind === 'diamonds') { paid = num(prize.amount); addDiamonds(user, paid); }
    else if (prize.kind === 'item') {
      if (user.ownedCosmetics?.[prize.itemId]) { duplicate = true; paid = num(S.dupeDiamonds); addDiamonds(user, paid); }
      else {
        user.ownedCosmetics = user.ownedCosmetics || {};
        user.ownedCosmetics[prize.itemId] = { cost: 0, purchasedAt: now.getTime() };
        user.activityInbox = user.activityInbox || {};
        user.activityInbox[`unlock_${prize.itemId}`] = { type: 'shop', unlocked: true, name: clip(prize.name, 80), cost: 0, requirement: 'Won on the Scratch Card', sentAt: now.getTime() };
      }
    }
    user.scratch = { date: today, grid, prize: prize.id, kind: prize.kind, amount: num(prize.amount), itemId: prize.itemId || null, name: prize.name || null, duplicate, paid, at: now.getTime(), plays: num(user.scratch?.plays) + 1, ...(RESET_V.scratch[uid] ? { resetV: RESET_V.scratch[uid] } : {}) };
    return { user, card: user.scratch };
  });
  if (res.already) return { already: true, canPlay: false, last: res.user.scratch || null, diamonds: num(res.user.diamonds) };
  return { card: res.card, canPlay: false, diamonds: num(res.user.diamonds) };
};

// Three Cards (v474): one free play a UK week. `start` draws the shuffle (a list of position swaps) and keeps the
// answer in server-only `montyGames/{uid}` (users/{uid} is readable by the player, so the answer can't live there);
// `pick` {index} pays the prize under that position once and records the result in `users/{uid}/monty`.
// A modified client could follow the swaps itself and always take the big prize once a week; that is the cost.
actions.monty = async ({ uid, data }) => {
  const M = CAT.monty;
  if (!M || !Array.isArray(M.small)) fail('failed-precondition', 'Three Cards is not available yet.');
  const now = new Date(), week = ukWeekKey(now), op = clip(data.op, 10);
  const gameRef = admin.database().ref(`montyGames/${uid}`);
  const done = (m) => m && m.week === week && m.done && resetOk('monty', uid, m) ? m : null;
  if (op !== 'start' && op !== 'pick') {
    const m = (await admin.database().ref(`users/${uid}/monty`).once('value')).val();
    const g = (await gameRef.once('value')).val();
    const live = g && g.week === week && !g.done && resetOk('monty', uid, g);
    return { canPlay: !done(m), started: !!live && !done(m), swaps: live && !done(m) ? g.swaps : null, result: done(m) ? { pick: m.pick, prize: m.prize, reveal: m.reveal } : null };
  }
  if (op === 'start') {
    const u = (await admin.database().ref(`users/${uid}/monty`).once('value')).val();
    if (done(u)) return { canPlay: false, result: { pick: u.pick, prize: u.prize, reveal: u.reveal } };
    const pairs = [[0, 1], [0, 2], [1, 2]], swaps = [];
    while (swaps.length < num(M.swaps, 9)) {
      const p = pairs[nodeCrypto.randomInt(3)];
      if (!swaps.length || swaps[swaps.length - 1].join() !== p.join()) swaps.push(p);
    }
    const flip = nodeCrypto.randomInt(2);
    const arr = [M.small[flip], num(M.big), M.small[1 - flip]];
    const start = arr.slice();
    swaps.forEach(([a, b]) => { const t = arr[a]; arr[a] = arr[b]; arr[b] = t; });
    const fresh = { week, swaps, start, final: arr, at: now.getTime(), done: false, ...(RESET_V.monty[uid] ? { resetV: RESET_V.monty[uid] } : {}) };
    const r = await gameRef.transaction(cur => (cur && cur.week === week && resetOk('monty', uid, cur) ? undefined : fresh));
    const g = r.committed ? fresh : (await gameRef.once('value')).val();
    return { canPlay: true, swaps: g.swaps, big: num(M.big), bigAt: g.start.indexOf(num(M.big)) };
  }
  const index = Math.floor(num(data.index, -1));
  if (!(index >= 0 && index <= 2)) fail('invalid-argument', 'Pick one of the three cards.');
  const g = (await gameRef.once('value')).val();
  if (!g || g.week !== week || !resetOk('monty', uid, g)) fail('failed-precondition', 'Start the game first.');
  const prize = num(g.final[index]);
  const res = await userTx(uid, (user) => {
    if (user.monty?.week === week && user.monty.done && resetOk('monty', uid, user.monty)) return { noop: true, already: true };
    addDiamonds(user, prize);
    user.monty = { week, done: true, pick: index, prize, reveal: g.final, at: now.getTime(), ...(RESET_V.monty[uid] ? { resetV: RESET_V.monty[uid] } : {}) };
    return { user };
  });
  if (res.already) return { canPlay: false, already: true, result: { pick: res.user.monty.pick, prize: res.user.monty.prize, reveal: res.user.monty.reveal }, diamonds: num(res.user.diamonds) };
  await gameRef.update({ done: true });
  return { canPlay: false, result: { pick: index, prize, reveal: g.final }, diamonds: num(res.user.diamonds) };
};

// One weekly challenge swapped for another, once a UK week, from level
// xp.weeklyRerollLevel (owner, v289). Not for one already completed.
// Weekly Puzzles (v346). The game exports the puzzles into catalog.puzzles; the week's puzzle is the
// list entry at (years since 2026 x 53 + week number) mod length, as in js/puzzles.js. The moves
// the phone sends are replayed against the catalog's own Hand and Pile, so only a real solution
// pays: puzzle_<week>_<id> is recorded like any challenge (once), 5 Diamonds + XP_RULES.puzzle XP.
// The AmitK test account may solve any puzzle for its reward; everyone else only this week's.
const PUZZLES = CAT.puzzles || { list: [], reward: { diamonds: 0 } };
function puzzleOfWeek(weekKey) {
  if (puzzles.weekNumber(weekKey) === null || !PUZZLES.list.length) return null;
  return PUZZLES.list[puzzles.weekIndex(weekKey, PUZZLES.list)]; // seeded shuffle shared with js/puzzles.js (puzzle-engine.js)
}
actions.puzzle = async ({ uid, auth, data }) => {
  const id = clip(data.id, 20);
  const puzzle = PUZZLES.list.find(p => p.id === id);
  if (!puzzle) fail('invalid-argument', 'Unknown puzzle.');
  const now = new Date(), week = ukWeekKey(now), key = `puzzle_${week}_${id}`;
  if (!isAmitK(auth) && (puzzleOfWeek(week) || {}).id !== id) fail('failed-precondition', 'That is not this week\'s puzzle.');
  const start = { hand: puzzle.hand, pile: puzzle.pile, constraint: puzzle.constraint || null, base: puzzle.base || null };
  if (!puzzles.verify(start, puzzle.goal, data.moves)) fail('failed-precondition', 'Those moves do not solve the puzzle.');
  const xpOn = await xp.enabled();
  const res = await userTx(uid, (user) => {
    if (user.completedChallenges?.[key]) return { noop: true, already: true };
    const past = xpOn ? xp.backfill(user, now.getTime(), addDiamonds) : null;
    recordClaim(user, key, `Weekly Puzzle: ${puzzle.name}`, num(PUZZLES.reward.diamonds), now.getTime());
    const xpRes = xpOn ? xpResult(user, [['puzzle', num(xp.RULES.puzzle)]], now.getTime(), past) : null;
    return { user, awarded: { id: key, name: `Weekly Puzzle: ${puzzle.name}`, reward: num(PUZZLES.reward.diamonds) }, xp: xpRes };
  });
  return { awarded: res.awarded || null, already: !!res.already, diamonds: num(res.user.diamonds), xp: res.xp || null };
};

actions.weeklyReroll = async ({ uid, data }) => {
  const from = clip(data.id, 40);
  if (!/^[a-z0-9-]+$/.test(from)) fail('invalid-argument', 'Unknown challenge.');
  if (!(await xp.enabled())) fail('failed-precondition', 'Rerolls need levels, which are switched off right now.');
  const need = num(xp.RULES.weeklyRerollLevel) || 40;
  const now = new Date();
  const week = ukWeekKey(now);
  const res = await userTx(uid, (user) => {
    if (xp.levelFor(num(user.xp?.total)) < need) return { error: `Weekly rerolls unlock at level ${need}.` };
    if (user.weeklyReroll?.week === week) return { error: 'You have already rerolled a challenge this week.' };
    const ids = userWeeklyIds(user, week);
    if (!ids.includes(from)) return { error: 'That is not one of this week\'s challenges.' };
    if (user.completedChallenges?.[`weekly_${week}_${from}`]) return { error: 'That challenge is already complete.' };
    const options = weeklyRuleFor(week).pool.map(c => c.id).filter(id => !ids.includes(id));
    if (!options.length) return { error: 'There is nothing to swap it for.' };
    const to = options[nodeCrypto.randomInt(options.length)];
    user.weeklyReroll = { week, from, to, at: now.getTime() };
    return { user, reroll: user.weeklyReroll };
  });
  return { reroll: res.reroll || res.user.weeklyReroll || null };
};

actions.claim = async ({ uid, data }) => {
  const id = clip(data.id, 80);
  if (!/^[A-Za-z0-9_-]+$/.test(id)) fail('invalid-argument', 'Unknown challenge.');
  const now = new Date();
  const xpOn = await xp.enabled();
  const res = await userTx(uid, (user) => {
    if (user.completedChallenges?.[id]) return { noop: true, already: true };
    const def = challengeForKey(id, user, now);
    if (def.error) return { error: def.error };
    const past = xpOn ? xp.backfill(user, now.getTime(), addDiamonds) : null;
    recordClaim(user, id, def.name, def.reward, now.getTime());
    const kind = id.startsWith('daily_') ? 'daily' : id.startsWith('weekly_') ? 'weekly' : null;
    const xpRes = xpOn ? xpResult(user, kind ? [[kind, xp.RULES[kind]]] : [], now.getTime(), past) : null;
    return { user, awarded: { id, name: def.name, reward: def.reward }, xp: xpRes };
  });
  return { awarded: res.awarded || null, already: !!res.already, diamonds: num(res.user.diamonds), xp: res.xp || null };
};

// A Vs Bots win pays Diamonds and counts towards difficulty unlocks; any
// casual win counts towards seasonal pictures. Online wins are checked
// against the room.
actions.matchWin = async ({ uid, data }) => {
  const mode = data.mode === 'online' ? 'online' : data.mode === 'bots' ? 'bots' : fail('invalid-argument', 'Unknown mode.');
  const matchId = clip(data.matchId, 80);
  if (!KEY_RE.test(matchId)) fail('invalid-argument', 'Bad match id.');
  const difficulty = mode === 'bots' ? (DIFFICULTIES.includes(data.difficulty) ? data.difficulty : fail('invalid-argument', 'Unknown difficulty.')) : null;
  // 2 vs 2 (v389): the phone says so for bot games; online the room decides.
  let twos = mode === 'bots' && data.twos === true;
  let decks = mode === 'bots' && data.decks === true;
  let noMercy = mode === 'bots' && data.noMercy === true;
  if (mode === 'online') {
    const code = clip(data.roomCode, 6);
    if (!/^\d{6}$/.test(code)) fail('invalid-argument', 'Bad room.');
    const room = (await db().ref(`rooms/${code}`).once('value')).val();
    const seats = Object.values(room?.players || {});
    const me = seats.find(p => p && p.uid === uid);
    if (!room || room.isRanked || room.matchId !== matchId || !me || me.finishRank !== 1 || me.drew || seats.length < 2) fail('failed-precondition', 'That win could not be checked.');
    twos = room.friendsMode === 'twos' && seats.length === 4 && seats.every(p => p && (p.team === 0 || p.team === 1));
    decks = room.friendsMode === 'decks' && seats.length >= 4;
    noMercy = room.friendsMode === 'noMercy';
  }
  const legacy = await legacyOwned(uid);
  const now = Date.now();
  const xpOn = await xp.enabled();
  const res = await userTx(uid, (user) => {
    user.processedMatchRewards = user.processedMatchRewards || {};
    if (user.processedMatchRewards[matchId]) return { noop: true, already: true };
    const today = ukDateKey(new Date(now));
    const counters = user.matchCounters = user.matchCounters || {};
    if (counters.day !== today) { counters.day = today; counters.winsToday = 0; }
    if (num(counters.winsToday) >= MATCH_LIMITS.perDay) return { noop: true, capped: 'daily' };
    if (now - num(counters.lastWinAt) < MATCH_LIMITS.minGapMs) return { noop: true, capped: 'too-soon' };
    const past = xpOn ? xp.backfill(user, now, addDiamonds) : null;
    let amount = 0, unlocked = null;
    if (mode === 'bots') {
      const open = unlockedDifficulties(user.difficultyWins);
      if (!open[difficulty]) return { error: 'That difficulty is still locked.' };
      amount = num(CAT.matchWinRewards.bots);
      // A 2 vs 2 win pays the same Diamonds but never counts towards unlocking
      // a harder bot (a strong partner could carry the player).
      // A Multiple Decks win never counts either (a big table is a different game).
      if (!twos && !decks && !noMercy) {
        user.difficultyWins = user.difficultyWins || {};
        user.difficultyWins[difficulty] = num(user.difficultyWins[difficulty]) + 1;
        const rule = CAT.difficultyUnlocks.find(r => r.requireDiff === difficulty && r.requireWins === user.difficultyWins[difficulty]);
        if (rule) unlocked = rule.diff;
      }
    }
    if (twos) counters.twosWins = Math.min(100000, num(counters.twosWins) + 1);
    if (decks) counters.decksWins = Math.min(100000, num(counters.decksWins) + 1);
    if (noMercy) counters.noMercyWins = Math.min(100000, num(counters.noMercyWins) + 1);
    addDiamonds(user, amount);
    counters.winsToday = num(counters.winsToday) + 1;
    counters.lastWinAt = now;
    counters.wins = num(counters.wins) + 1;
    user.processedMatchRewards[matchId] = { amount, label: mode === 'bots' ? 'Match Won!' : 'Online win', awardedAt: now };
    user.processedMatchRewards = pruneMap(user.processedMatchRewards);
    const seasonWins = countSeasonWin(user, new Date(now));
    const claimed = grantMilestones(user, now);
    const newAvatars = grantEarnedAvatars(user, legacy, now);
    const xpRes = xpOn ? xpResult(user, [['win', xp.RULES.win]], now, past) : null;
    const dz = dzAward(user, now);
    return { user, amount, unlocked, seasonWins, claimed, newAvatars, xp: xpRes, dz };
  });
  return {
    xp: res.xp || null,
    already: !!res.already, capped: res.capped || null, diamondsAwarded: num(res.amount), diamonds: num(res.user.diamonds),
    difficultyWins: res.user.difficultyWins || {}, unlockedDifficulty: res.unlocked || null,
    seasonWins: res.user.seasonWins || {}, claimed: res.claimed || [], newAvatars: res.newAvatars || [],
    twosWins: num(res.user.matchCounters?.twosWins),
    decksWins: num(res.user.matchCounters?.decksWins),
    noMercyWins: num(res.user.matchCounters?.noMercyWins),
    dropzone: dzView(res.user, res.dz)
  };
};

actions.matchFinished = async ({ uid, data }) => {
  const matchId = clip(data.matchId, 80);
  if (!KEY_RE.test(matchId)) fail('invalid-argument', 'Bad match id.');
  const now = Date.now();
  // A stalemate draw (the hidden Draw a Game challenge). Online, the room
  // must show this account's seat as drawn; Vs Bots is the phone's word,
  // like its wins.
  let drew = data.drew === true;
  // Multiple Decks extras: Snap Burns this game and a top-three finish at a 6+ table.
  let decksSnaps = 0, decksTop3 = false;
  if (data.decks && typeof data.decks === 'object') {
    decksSnaps = Math.max(0, Math.min(30, Math.trunc(num(data.decks.snaps))));
    decksTop3 = data.decks.top3 === true;
    if (data.roomCode !== undefined) {
      const dcode = clip(data.roomCode, 6);
      const droom = /^\d{6}$/.test(dcode) ? (await db().ref(`rooms/${dcode}`).once('value')).val() : null;
      const seats = Object.values(droom?.players || {});
      const dme = seats.find(p => p && p.uid === uid);
      if (!droom || droom.friendsMode !== 'decks') { decksSnaps = 0; decksTop3 = false; }
      else decksTop3 = decksTop3 && !!dme && num(dme.finishRank) >= 1 && num(dme.finishRank) <= 3 && seats.length >= 6;
    }
  }
  // No Mercy extras: Queens played and cards taken with Kings this game (a game cannot hold more than 40 of either).
  let nmQueens = 0, nmKings = 0;
  if (data.noMercy && typeof data.noMercy === 'object') {
    nmQueens = Math.max(0, Math.min(40, Math.trunc(num(data.noMercy.queens))));
    nmKings = Math.max(0, Math.min(40, Math.trunc(num(data.noMercy.kings))));
    if (data.roomCode !== undefined) {
      const ncode = clip(data.roomCode, 6);
      const nroom = /^\d{6}$/.test(ncode) ? (await db().ref(`rooms/${ncode}`).once('value')).val() : null;
      if (!nroom || nroom.friendsMode !== 'noMercy') { nmQueens = 0; nmKings = 0; }
    }
  }
  if (drew && data.roomCode !== undefined) {
    const code = clip(data.roomCode, 6);
    const room = /^\d{6}$/.test(code) ? (await db().ref(`rooms/${code}`).once('value')).val() : null;
    drew = !!Object.values(room?.players || {}).find(p => p && p.uid === uid && p.drew);
  }
  const xpOn = await xp.enabled();
  const legacy = (nmQueens || nmKings) ? await legacyOwned(uid) : null;
  const res = await userTx(uid, (user) => {
    const counters = user.matchCounters = user.matchCounters || {};
    const recent = counters.recentFinished || {};
    if (recent[matchId]) return { noop: true };
    const past = xpOn ? xp.backfill(user, now, addDiamonds) : null;
    if (drew) counters.draws = num(counters.draws) + 1;
    if (now - num(counters.lastFinishedAt) < 20 * 1000) {
      if (!drew) return { noop: true, capped: 'too-soon' };
      counters.recentFinished = pruneMap({ ...recent, [matchId]: { at: now } }, 20);
      return { user, claimed: grantMilestones(user, now), referral: null };
    }
    // XP: the first game of the UK day counts before `day` below moves on.
    const firstToday = counters.finishedDay !== ukDateKey(new Date(now));
    counters.finishedDay = ukDateKey(new Date(now));
    counters.finished = num(counters.finished) + 1;
    if (decksSnaps) counters.decksSnaps = Math.min(100000, num(counters.decksSnaps) + decksSnaps);
    if (decksTop3) counters.decksTop3 = Math.min(100000, num(counters.decksTop3) + 1);
    if (nmQueens) counters.nmQueens = Math.min(100000, num(counters.nmQueens) + nmQueens);
    if (nmKings) counters.nmKings = Math.min(100000, num(counters.nmKings) + nmKings);
    counters.lastFinishedAt = now;
    counters.recentFinished = pruneMap({ ...recent, [matchId]: { at: now } }, 20);
    const referral = referralGameCounted(user, now);
    const claimed = grantMilestones(user, now);
    const newAvatars = legacy ? grantEarnedAvatars(user, legacy, now) : [];
    const xpRes = xpOn ? xpResult(user, [['finish', xp.RULES.finish], ['firstGameOfDay', firstToday ? xp.RULES.firstGameOfDay : 0]], now, past) : null;
    return { user, claimed, referral, newAvatars, xp: xpRes };
  });
  if (res.referral) await referralReportToInviter(uid, res.user, res.referral, now);
  return { claimed: res.claimed || [], newAvatars: res.newAvatars || [], diamonds: num(res.user.diamonds), referral: res.referral ? { games: res.referral.games, paid: !!res.referral.paid } : null, xp: res.xp || null };
};

// Scores a finished Ranked room for every seat at once (idempotent: the
// second player's call just reads the stored result). Ratings come from the
// server's own records, not from the room.
// Legacy browsers must never receive a full shuffled deck again.
actions.rankedDeal = async () => fail('failed-precondition', 'Ranked has changed. Return home and reopen the game.');
const rankedServer = require('./ranked');
actions.rankedStart = rankedServer.start;
actions.rankedMove = rankedServer.move;

// Gauntlet: five 1-bot games in a row (CAT.gauntlet.rounds: easy, easy,
// medium, hard, boss) with 3 lives. The server keeps the run (users/{uid}/
// gauntlet, server-only) so lives and rounds can't be edited on the phone.
// Completing it pays once per UK day: the first ever completion gives
// firstReward + the earn-only picture and frame, later days dailyReward.
// Gauntlet games never count towards difficulty unlocks (no matchWin).
// ---- Referrals --------------------------------------------------------------------
// Each account can make one invite code (from its username, e.g. AMITK) kept in
// server-only referralCodes/{CODE}. A NEW account (created by init within
// REFERRAL.newAccountDays) with a verified email can link itself to a code once
// (op 'claim'): users/{uid}/referredBy, the inviter's users/{inv}/referrals/{uid},
// and the two become friends. After REFERRAL.gamesNeeded finished games (at
// least REFERRAL.gameGapMs apart, counted in matchFinished) the new player gets
// REFERRAL.newPlayerReward and the inviter REFERRAL.inviterReward, at most
// REFERRAL.monthlyCap paid a month (UK month). Every completed recruit counts
// toward the Recruiter picture and challenge (referralStats.recruits).
const REFERRAL = CAT.referral;
const REF_CODE_RE = /^[A-Z0-9]{3,16}$/;
const ukMonthKey = (now) => ukDateKey(new Date(now)).slice(0, 7);
function referralGameCounted(user, now) {
  const r = user.referredBy;
  if (!r || r.paid || !r.uid) return null;
  if (now - num(r.lastGameAt) < REFERRAL.gameGapMs) return null;
  r.games = num(r.games) + 1;
  r.lastGameAt = now;
  if (r.games < REFERRAL.gamesNeeded) return { inviter: r.uid, games: r.games };
  r.paid = true; r.paidAt = now;
  const inviterName = clip(r.name || 'a friend', 20);
  recordClaim(user, `referral_joined_${r.uid}`.slice(0, 80), `Joined with ${inviterName}'s invite`, num(REFERRAL.newPlayerReward), now);
  return { inviter: r.uid, games: r.games, paid: true };
}
async function referralReportToInviter(uid, invitee, ref, now) {
  const name = clip(invitee.username || 'A friend', 20);
  const legacy = await legacyOwned(ref.inviter);
  await userTx(ref.inviter, (user) => {
    user.referrals = user.referrals || {};
    const entry = user.referrals[uid];
    if (!entry) return { noop: true };
    entry.name = name;
    entry.games = ref.games;
    if (!ref.paid || entry.paidAt) return { user };
    entry.paidAt = now;
    const stats = user.referralStats = user.referralStats || {};
    const month = ukMonthKey(now);
    if (stats.month !== month) { stats.month = month; stats.paidThisMonth = 0; }
    stats.recruits = num(stats.recruits) + 1;
    if (num(stats.paidThisMonth) < num(REFERRAL.monthlyCap)) {
      stats.paidThisMonth = num(stats.paidThisMonth) + 1;
      entry.reward = num(REFERRAL.inviterReward);
      recordClaim(user, `referral_${uid}`.slice(0, 80), `${name} joined with your invite`, num(REFERRAL.inviterReward), now);
    } else {
      entry.reward = 0;
      user.activityInbox = user.activityInbox || {};
      user.activityInbox[`referral_${uid}`] = { type: 'referral', event: 'capped', name, sentAt: now };
    }
    grantMilestones(user, now);
    grantEarnedAvatars(user, legacy, now);
    return { user };
  });
}
function referralCodeFromName(name) {
  return String(name || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
}
actions.referral = async ({ uid, auth, data }) => {
  const op = data.op; // code | claim | status
  if (!['code', 'claim', 'status'].includes(op)) fail('invalid-argument', 'Unknown referral step.');
  const verified = !!auth?.token?.email_verified;
  const now = Date.now();
  const userRef = db().ref(`users/${uid}`);
  const status = async () => {
    const [code, by, list, stats] = await Promise.all(['referralCode', 'referredBy', 'referrals', 'referralStats']
      .map(k => userRef.child(k).once('value').then(s => s.val())));
    return {
      code: code || null,
      referredBy: by ? { name: by.name || null, games: num(by.games), needed: REFERRAL.gamesNeeded, paid: !!by.paid } : null,
      recruits: Object.entries(list || {}).map(([id, r]) => ({ name: r.name || 'New player', games: num(r.games), done: !!r.paidAt, reward: num(r.reward), at: num(r.at) }))
        .sort((a, b) => b.at - a.at),
      recruited: num(stats?.recruits),
      paidThisMonth: stats?.month === ukMonthKey(now) ? num(stats.paidThisMonth) : 0
    };
  };
  if (op === 'status') return status();
  if (!verified) fail('failed-precondition', 'Verify your email address first.');
  if (op === 'code') {
    const existing = (await userRef.child('referralCode').once('value')).val();
    if (existing) return status();
    const username = (await userRef.child('username').once('value')).val();
    const base = referralCodeFromName(username);
    if (base.length < 3) fail('failed-precondition', 'Choose a username first.');
    let code = null;
    for (let i = 0; i < 6 && !code; i++) {
      const candidate = i === 0 ? base : `${base.slice(0, 12)}${nodeCrypto.randomInt(10, 9999)}`;
      const res = await db().ref(`referralCodes/${candidate}`).transaction(c => (c === null ? { uid, at: now } : undefined), undefined, false);
      if (res.committed || res.snapshot.val()?.uid === uid) code = candidate;
    }
    if (!code) fail('resource-exhausted', 'Could not make a code. Please try again.');
    await userRef.child('referralCode').set(code);
    return status();
  }
  // claim: a new player arriving by a link
  const code = clip(data.code, 16).toUpperCase();
  if (!REF_CODE_RE.test(code)) fail('invalid-argument', 'That invite code is not valid.');
  const owner = (await db().ref(`referralCodes/${code}`).once('value')).val();
  if (!owner || !owner.uid) fail('not-found', 'That invite code was not found.');
  if (owner.uid === uid) fail('failed-precondition', "You can't use your own invite.");
  const inviterName = clip((await db().ref(`users/${owner.uid}/username`).once('value')).val() || code, 20);
  const res = await userTx(uid, (user) => {
    if (user.referredBy) return { error: 'This account is already linked to an invite.' };
    const created = num(user.createdAt);
    if (!created || now - created > num(REFERRAL.newAccountDays) * 864e5) return { error: 'Invites are for new accounts.' };
    user.referredBy = { uid: owner.uid, code, name: inviterName, at: now, games: 0, lastGameAt: 0, paid: false };
    return { user };
  });
  const myName = clip(res.user.username || 'A new player', 20);
  await db().ref().update({
    [`users/${owner.uid}/referrals/${uid}`]: { name: myName, at: now, games: 0 },
    [`users/${owner.uid}/activityInbox/referral_join_${uid}`]: { type: 'referral', event: 'joined', name: myName, sentAt: now },
    [`friends/${uid}/${owner.uid}`]: true,
    [`friends/${owner.uid}/${uid}`]: true,
    [`friendRequests/${uid}/${owner.uid}`]: null,
    [`friendRequests/${owner.uid}/${uid}`]: null
  });
  return { ...(await status()), inviterName };
};

// ---- Account data and deletion (functions/account.js) -----------------------------
const account = require('./account');
actions.accountData = async ({ uid }) => {
  let authUser = null;
  try { authUser = await admin.auth().getUser(uid); } catch (e) { authUser = null; }
  return account.collectAccountData(uid, authUser);
};
actions.deleteAccount = async ({ uid, data }) => {
  const op = data.op; // request | cancel | status
  if (op === 'request') return { deletion: await account.requestDeletion(uid) };
  if (op === 'cancel') { await account.cancelDeletion(uid); return { deletion: null }; }
  if (op === 'status') return { deletion: (await db().ref(`users/${uid}/deletion`).once('value')).val() || null };
  fail('invalid-argument', 'Unknown step.');
};

const GAUNTLET_MIN_GAME_MS = 30000; // a real game against a bot takes longer than this
// Modes (v254): easy | hard | boss (CAT.gauntlet.modes; an older catalog has
// only the top-level Easy fields). Easy's record stays at the top of
// users/{uid}/gauntlet (completions, firstDoneAt, doneDay, failed); Hard and
// Boss keep theirs under gauntlet/modes/{mode}. g.run.mode names the run's
// mode (none = easy) and g.dayMode = {day, mode} the one mode played today.
const gauntletModes = () => {
  const G = CAT.gauntlet;
  return G.modes || { easy: { name: 'Easy', rounds: G.rounds, lives: G.lives, firstReward: G.firstReward, dailyReward: G.dailyReward,
    level: 0, needs: {}, picture: G.picture, pictureName: G.pictureName, frame: G.frame, frameName: G.frameName } };
};
const gauntletStats = (g, mode, create) => {
  if (mode === 'easy') return g;
  if (create) { g.modes = g.modes || {}; g.modes[mode] = g.modes[mode] || {}; }
  return (g.modes && g.modes[mode]) || {};
};
// Why a mode can't be started (null = it can): level and earlier modes beaten.
function gauntletLockReason(user, mode) {
  const M = gauntletModes()[mode];
  if (!M) return 'Unknown Gauntlet.';
  const g = user.gauntlet || {};
  const level = num(user.xp && user.xp.level, 1);
  if (level < num(M.level)) return `Reach Lvl ${num(M.level)} to unlock the ${M.name} Gauntlet.`;
  for (const [need, times] of Object.entries(M.needs || {})) {
    const have = num(gauntletStats(g, need).completions);
    if (have < num(times)) {
      const N = gauntletModes()[need] || { name: need };
      return num(times) === 1 ? `Beat the ${N.name} Gauntlet first.` : `Beat the ${N.name} Gauntlet ${num(times)} times first (${have} so far).`;
    }
  }
  return null;
}
actions.gauntlet = async ({ uid, data }) => {
  const MODES = gauntletModes();
  const op = data.op; // start (a new run, its first game begins) | begin (the next game) | result | status
  if (!['start', 'begin', 'result', 'status'].includes(op)) fail('invalid-argument', 'Unknown Gauntlet step.');
  const now = Date.now();
  const today = ukDateKey(new Date(now));
  // A run belongs to the UK day it started on: the next day the Gauntlet
  // starts again from the first bot (full lives), never from where an
  // old run stopped.
  const runDay = (run) => ukDateKey(new Date(num(run.startedAt) || num(run.lastAt) || 0));
  const liveRun = (g) => (g.run && runDay(g.run) === today ? g.run : null);
  const runMode = (run) => (run && MODES[run.mode] ? run.mode : 'easy');
  const todayMode = (g) => (g.dayMode && g.dayMode.day === today && MODES[g.dayMode.mode] ? g.dayMode.mode : (liveRun(g) ? runMode(g.run) : (g.doneDay === today ? 'easy' : null)));
  const status = (user) => {
    const g = user.gauntlet || {};
    const run = liveRun(g);
    const modes = {};
    Object.keys(MODES).forEach((m) => {
      const st = gauntletStats(g, m);
      modes[m] = { completions: num(st.completions), firstDone: !!st.firstDoneAt, doneToday: st.doneDay === today, locked: gauntletLockReason(user, m) };
    });
    return {
      run: run ? { id: run.id, mode: runMode(run), round: num(run.round), lives: num(run.lives), playing: !!run.playing, day: today } : null,
      todayMode: todayMode(g), modes,
      // Easy's, for builds before v254:
      doneToday: g.doneDay === today, completions: num(g.completions), firstDone: !!g.firstDoneAt
    };
  };
  if (op === 'status') {
    const [g, level] = await Promise.all([db().ref(`users/${uid}/gauntlet`).once('value'), db().ref(`users/${uid}/xp/level`).once('value')]);
    return status({ gauntlet: g.val() || {}, xp: { level: level.val() } });
  }
  const xpOn = await xp.enabled();
  let xpRes = null, dzGot = false;
  const res = await userTx(uid, (user) => {
    xpRes = null;
    const g = user.gauntlet = user.gauntlet || {};
    if (op === 'start') {
      const mode = data.mode == null ? 'easy' : String(data.mode);
      const M = MODES[mode];
      if (!M) return { error: 'Unknown Gauntlet.' };
      const live = liveRun(g);
      if (live && runMode(live) !== mode) return { error: `Finish your ${MODES[runMode(live)].name} Gauntlet first: win it or run out of lives.` };
      const dayMode = todayMode(g);
      if (dayMode && dayMode !== mode) return { error: `Today's Gauntlet is ${MODES[dayMode].name}. You can play a different one from midnight (UK time).` };
      if (gauntletStats(g, mode).doneDay === today) return { error: `You've already beaten the ${mode === 'easy' ? '' : `${M.name} `}Gauntlet today. Come back tomorrow!` };
      const locked = gauntletLockReason(user, mode);
      if (locked) return { error: locked };
      g.run = { id: `g${now.toString(36)}${nodeCrypto.randomInt(1e9).toString(36)}`, mode, round: 0, lives: num(M.lives), startedAt: now, lastAt: now, playing: true };
      g.dayMode = { day: today, mode };
      return { user };
    }
    const run = liveRun(g);
    if (!run || run.id !== clip(data.runId, 40)) return { error: g.run && !run ? "That Gauntlet run has ended: it's a new day, so the Gauntlet starts again from the first bot." : 'That Gauntlet run has ended.' };
    const mode = runMode(run), M = MODES[mode];
    const stats = gauntletStats(g, mode, true);
    const loseLife = () => {
      run.lives = num(run.lives) - 1;
      run.playing = false;
      if (run.lives > 0) return false;
      g.run = null; stats.failed = num(stats.failed) + 1;
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
    const past = xpOn ? xp.backfill(user, now, addDiamonds) : null;
    const botXp = xp.gauntletBotXp(num(run.round), mode); // scales with the bot's difficulty
    run.playing = false;
    run.round = num(run.round) + 1;
    g.botsBeaten = num(g.botsBeaten) + 1; // Gauntlet board (every mode)
    dzGot = dzAward(user, now);
    const boardWeek = xp.ukWeekKey(new Date(now));
    g.weekBotsBeaten = (g.week === boardWeek ? num(g.weekBotsBeaten) : 0) + 1;
    g.week = boardWeek;
    if (xpOn) xpRes = xpResult(user, [['gauntletBot', botXp]], now, past);
    if (run.round < M.rounds.length) return { user };
    // Beaten: once a day.
    g.run = null;
    stats.doneDay = today;
    stats.completions = num(stats.completions) + 1;
    const first = !stats.firstDoneAt;
    const amount = first ? num(M.firstReward) : num(M.dailyReward);
    const newItems = [];
    user.activityInbox = user.activityInbox || {};
    if (first) {
      stats.firstDoneAt = now;
      user.ownedCosmetics = user.ownedCosmetics || {};
      [[M.picture, M.pictureName], [M.frame, M.frameName]].forEach(([id, name]) => {
        if (id && !user.ownedCosmetics[id]) {
          user.ownedCosmetics[id] = { cost: 0, purchasedAt: now };
          user.activityInbox[`unlock_${id}`] = { type: 'shop', unlocked: true, name, cost: 0, requirement: mode === 'easy' ? 'Beat the Gauntlet' : `Beat the ${M.name} Gauntlet`, sentAt: now };
          newItems.push({ id, name });
        }
      });
    }
    // Completed challenges: 'gauntlet-first' / 'gauntlet-<mode>-first' or
    // the day's 'gauntlet_<date>' (one mode a day); pays and mails like any challenge.
    const firstKey = mode === 'easy' ? 'gauntlet-first' : `gauntlet-${mode}-first`;
    const firstName = mode === 'easy' ? 'Gauntlet Champion' : `${M.name} Gauntlet Champion`;
    recordClaim(user, first ? firstKey : `gauntlet_${today}`, first ? firstName : (mode === 'easy' ? 'Daily Gauntlet' : `Daily ${M.name} Gauntlet`), amount, now);
    return { user, completed: true, amount, first, newItems };
  });
  return {
    ...status(res.user), over: !!res.over, completed: !!res.completed, forfeited: !!res.forfeited,
    diamondsAwarded: num(res.amount), first: !!res.first, newItems: res.newItems || [], diamonds: num(res.user.diamonds), xp: xpRes, dropzone: dzView(res.user, dzGot)
  };
};

actions.rankedResult = async ({ uid, data }) => {
  const code = clip(data.roomCode, 6);
  if (!/^\d{6}$/.test(code)) fail('invalid-argument', 'Bad room.');
  const room = (await db().ref(`rankedGames/${code}`).once('value')).val();
  if (!room || room.authority !== 1) fail('failed-precondition', 'That match was not run by the Ranked server.');
  if (!room || room.isRanked !== true) fail('failed-precondition', 'Not a Ranked room.');
  const seats = Object.values(room.players || {}).filter(Boolean);
  if (seats.length < 2 || seats.length > 4) fail('failed-precondition', 'Not a Ranked table.');
  if (room.phase !== 'FINISHED' || seats.some(p => !p.uid || p.finishRank == null)) fail('failed-precondition', 'The match has not finished.');
  const uids = seats.map(p => p.uid);
  if (new Set(uids).size !== uids.length || !uids.includes(uid)) fail('permission-denied', 'You were not in that match.');
  // Every seat must have entered this room itself (rankedMembers is only
  // writable by that account), within the last day.
  const members = await Promise.all(uids.map(u => db().ref(`rankedMembers/${code}/${u}`).once('value').then(s => num(s.val(), 0))));
  if (members.some(at => !at || Date.now() - at > 24 * 60 * 60 * 1000)) fail('failed-precondition', 'That match could not be checked.');
  // Canonical state is private and only server move transactions can change it.
  // Legacy asynchronous room-audit counts are not the authority for these games.
  const audit = { hard: 0, soft: 0 };
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
  // Preserve finish XP, first-game progress and referrals using verified
  // canonical participants, rather than a separate browser finish report.
  for (const seat of seats) await actions.matchFinished({uid:seat.uid,data:{matchId:resultId,drew:!!seat.drew}});
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
  const xpOn = await xp.enabled();
  const players = seats.map((p, i) => ({ uid: p.uid, finishRank: num(p.finishRank, 99), rating: ratings[i], seat: p }));
  const deltas = pairwiseEloDeltas(players);
  const now = Date.now();
  const results = {};
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    // A stalemate draw (the game's endInStalemate): the drawn seats share a
    // place, so Elo already scores them as level; nobody wins it, and it
    // leaves both win and losing streaks as they were.
    const drew = !!p.seat.drew;
    const won = p.finishRank === 1 && !drew;
    const gs = p.seat.gameStats || {};
    const stat = (key) => Math.max(0, Math.min(RANKED_STAT_CAPS[key], Math.floor(num(gs[key]))));
    const opponent = players.find(q => q.uid !== p.uid);
    const legacy = await legacyOwned(p.uid);
    try {
      const res = await userTx(p.uid, (user) => {
        user.processedRankedMatches = user.processedRankedMatches || {};
        if (user.processedRankedMatches[resultId]) return { noop: true };
        const past = xpOn ? xp.backfill(user, now, addDiamonds) : null;
        const previousRating = num(user.rating, 500);
        const rs = user.rankedStats || {};
        const newStreak = won ? num(rs.currentStreak) + 1 : drew ? num(rs.currentStreak) : 0;
        const winBonus = won ? num(RANKED_BONUS.win) : 0;
        const streakBonus = won ? rankedStreakBonus(newStreak) : 0;
        const newRating = Math.max(0, previousRating + deltas[i] + winBonus + streakBonus);
        const lossStreak = won ? 0 : drew ? num(rs.currentLossStreak) : num(rs.currentLossStreak) + 1;
        user.rankedStats = {
          burnt: num(rs.burnt) + stat('burnt'),
          jokersPlayed: num(rs.jokersPlayed) + stat('jokersPlayed'),
          currentStreak: newStreak,
          bestStreak: Math.max(num(rs.bestStreak), newStreak),
          currentLossStreak: lossStreak,
          bestLossStreak: Math.max(num(rs.bestLossStreak), lossStreak),
          highestRating: Math.max(num(rs.highestRating, previousRating), newRating),
          lowestRating: Math.min(num(rs.lowestRating, previousRating), newRating),
          draws: num(rs.draws) + (drew ? 1 : 0)
        };
        const cs = user.challengeStats || {};
        user.challengeStats = {
          burns: num(cs.burns) + stat('challengeBurns'),
          jokerDeflects: num(cs.jokerDeflects) + stat('jokerDeflects'),
          snapBurns: num(cs.snapBurns) + stat('snapBurns')
        };
        user.rating = newRating;
        user.wins = num(user.wins) + (won ? 1 : 0);
        user.losses = num(user.losses) + (won || drew ? 0 : 1);
        user.processedRankedMatches[resultId] = { rank: p.finishRank, appliedAt: now };
        user.processedRankedMatches = pruneMap(user.processedRankedMatches);
        if (opponent) user.lastRankedOpponent = { uid: opponent.uid, at: now };
        const fromTier = tierName(previousRating), toTier = tierName(newRating);
        if (fromTier !== toTier) {
          user.activityInbox = user.activityInbox || {};
          user.activityInbox[`rank_${now}_${i}`] = { type: 'rank', fromTier, toTier, direction: newRating > previousRating ? 'up' : 'down', previousRating, newRating, sentAt: now };
        }
        let amount = 0, dz = false;
        const claimed = [];
        if (won) {
          amount = num(CAT.matchWinRewards.ranked);
          addDiamonds(user, amount);
          user.processedMatchRewards = pruneMap({ ...(user.processedMatchRewards || {}), [resultId]: { amount, label: 'Ranked Win!', awardedAt: now } });
          countSeasonWin(user, new Date(now));
          dz = dzAward(user, now);
          const lastRank = String(p.seat.lastPlayRank || '');
          const ending = CAT.challengeDefs.endingCards.find(c => c.rank === lastRank);
          if (ending && !user.completedChallenges?.[ending.id]) claimed.push(recordClaim(user, ending.id, ending.name, ending.reward, now));
        }
        claimed.push(...grantMilestones(user, now));
        const newAvatars = grantEarnedAvatars(user, legacy, now);
        const xpRes = xpOn ? xpResult(user, [['ranked', xp.RULES.ranked], ['rankedWin', won ? xp.RULES.rankedWin : 0]], now, past) : null;
        return { user, result: { from: previousRating, to: newRating, won, drew, elo: deltas[i], winBonus, streak: newStreak, streakBonus, diamondsAwarded: amount, claimed, newAvatars, xp: xpRes, dropzone: dzView(user, dz) } };
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

// AmitK test switch (owner): while on, every cosmetic Custom can show counts as owned (server-only
// `testOwned`, so real ownership is never touched and a purchase or reward made meanwhile stays
// real). `testUnlock` keeps a note of what the account owned and wore before; turning it off clears
// `testOwned` and puts back the earlier look for any slot wearing an item that is no longer owned.
const EQUIP_FREE = new Set(['default']);
// AmitK only (verified email): makes today's Daily Spin, today's Scratch Card and this week's Three Cards playable again.
// Only the "done" markers change; Diamonds, items and the last prize records stay.
actions.testResetLucky = async ({ uid, auth }) => {
  if (!isAmitK(auth)) fail('permission-denied', 'This button is not available.');
  await userTx(uid, (user) => {
    if (user.wheel) user.wheel = { ...user.wheel, lastDate: '' };
    if (user.scratch) user.scratch = { ...user.scratch, date: '' };
    if (user.monty) user.monty = { ...user.monty, week: '', done: false };
    return { user };
  });
  await admin.database().ref(`montyGames/${uid}`).remove();
  return { ok: true };
};
// AmitK only (dev page): lists every account with a public profile (name, level) so Diamonds can be sent.
actions.devPlayers = async ({ auth }) => {
  if (!isAmitK(auth)) fail('permission-denied', 'This tool is not available.');
  const snap = await admin.database().ref('publicProfiles').once('value');
  const out = [];
  snap.forEach((c) => {
    const v = c.val() || {};
    if (!v.username) return;
    // online = flag set and heartbeat (`seen`) within 3 minutes, same rule as the game's isProfileOnline
    const online = v.online === true && num(v.seen) > Date.now() - 3 * 60 * 1000;
    out.push({ uid: c.key, name: clip(v.username, 20), level: num(v.level) || 1, online, playing: online && v.playing ? clip(v.playing.mode, 10) : '' });
  });
  out.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  return { players: out };
};
// AmitK only: gives a player 1 to 100,000 Diamonds and mails them (type 'diamonds', optional short note).
actions.devGrantDiamonds = async ({ auth, data }) => {
  if (!isAmitK(auth)) fail('permission-denied', 'This tool is not available.');
  const to = String(data?.to || '');
  const amount = Math.floor(num(data?.amount));
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(to)) fail('invalid-argument', 'Pick a player.');
  if (amount < 1 || amount > 100000) fail('invalid-argument', 'Amount must be 1 to 100,000.');
  const note = clip(String(data?.note || ''), 120);
  const now = Date.now();
  const res = await userTx(to, (user) => {
    addDiamonds(user, amount);
    user.activityInbox = { ...(user.activityInbox || {}), [`diamonds_${now}`]: { type: 'diamonds', amount, note, sentAt: now } };
    return { user };
  });
  return { ok: true, amount, diamonds: res.user.diamonds };
};
actions.testUnlock = async ({ uid, auth, data }) => {
  if (!isAmitK(auth)) fail('permission-denied', 'This switch is not available.');
  const on = !!data?.on;
  const legacy = await legacyOwned(uid);
  const res = await userTx(uid, (user) => {
    const tu = user.testUnlock || {};
    const owned = (id) => !!(user.ownedCosmetics?.[id] || legacy[id] || (CAT.builtIn || []).includes(id) || EQUIP_FREE.has(id));
    if (on) {
      if (tu.on) return { noop: true };
      user.testUnlock = { on: true, at: Date.now(), ownedBefore: Object.keys(user.ownedCosmetics || {}), equippedBefore: { ...(user.equippedCosmetics || {}) } };
      user.testOwned = Object.fromEntries((CAT.allCosmeticIds || []).filter(id => !owned(id)).map(id => [id, true]));
      return { user, granted: Object.keys(user.testOwned).length };
    }
    if (!tu.on && !user.testOwned) return { noop: true };
    const gone = Object.keys(user.testOwned || {}).filter(id => !owned(id));
    const eq = user.equippedCosmetics || {};
    const restored = {};
    for (const [type, id] of Object.entries(eq)) {
      if (!gone.includes(id)) continue;
      const before = tu.equippedBefore?.[type];
      eq[type] = before && !gone.includes(before) && owned(before) ? before : 'default';
      restored[type] = eq[type];
    }
    if (user.equippedCosmetics) user.equippedCosmetics = eq;
    delete user.testOwned;
    user.testUnlock = { on: false, at: Date.now(), ownedBefore: tu.ownedBefore || [], equippedBefore: tu.equippedBefore || {} };
    return { user, relocked: gone.length, restored };
  });
  return { on, testOwned: Object.keys(res.user.testOwned || {}), granted: res.granted || 0, relocked: res.relocked || 0, restored: res.restored || {}, equipped: res.user.equippedCosmetics || {} };
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
  // Gifting unlocks at xp.giftLevel (owner, v289); no lock while XP is off.
  const giftLevel = num(xp.RULES.giftLevel);
  if (giftLevel > 1 && await xp.enabled() && (await seriesPlayerLevel(uid)) < giftLevel) {
    fail('failed-precondition', `Gifting unlocks at level ${giftLevel}.`);
  }
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
  const privateDelivery = require('./private-delivery');
  const privateItem = privateDelivery.itemFor(gift.itemId);
  if (privateItem && !privateDelivery.canClaim(uid, gift)) fail('permission-denied', 'This gift is not available.');
  const item = privateItem || CAT.items[gift.itemId];
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

// ---- Best of series (Play Friends, 2 players) -------------------------------
// series/{room} (server-only, readable by signed-in players):
//   { id, room, bestOf, need, fee, pot, host, guest, names, wins {uid: n},
//     games {matchId: uid|'draw'}, played, status pending|live|done|cancelled,
//     winner, reason, createdAt, updatedAt, lastGameAt, settled {uid: true} }
// The host needs CAT.series.levels[bestOf]; the guest only SERIES.guestLevels (Best of 7), signed in with a verified
// email, and pay the entry (CAT.series.bestOf[n]) up front: the host on
// `create`, the other player on `accept`. The server matches the pot, so the
// winner gets fee x 4. A game counts once (by matchId) and needs the room to
// show it finished; a stalemate draw counts as played with no winner.
// Leaving forfeits; a player whose stand-in bot has played CAT.series.
// forfeitTurns turns and who hasn't been seen for a minute can be claimed as a
// forfeit by the other. users/{uid}/series = { room, id, status } (the game
// rejoins it at sign-in); money moves are idempotent via users/{uid}/seriesLedger.
const SERIES = CAT.series || {};
const SERIES_STALE_MS = 24 * 60 * 60 * 1000;
const seriesRef = (code) => db().ref(`series/${code}`);
const seriesActive = (s) => !!s && (s.status === 'pending' || s.status === 'live');
async function seriesPlayerLevel(uid) {
  const x = (await db().ref(`users/${uid}/xp`).once('value')).val() || {};
  return xp.levelFor(num(x.total));
}
// Takes or returns an entry (and clears/sets users/{uid}/series) exactly once.
async function seriesMoney(uid, key, delta, s, mail) {
  const now = Date.now();
  return userTx(uid, (user) => {
    user.seriesLedger = user.seriesLedger || {};
    if (user.seriesLedger[key]) return { noop: true, already: true };
    if (delta < 0 && num(user.diamonds) < -delta) return { error: `You need ${-delta} Diamonds to play this series.` };
    addDiamonds(user, delta);
    user.seriesLedger[key] = { at: now, amount: delta };
    user.seriesLedger = pruneMap(user.seriesLedger, 60);
    if (s) user.series = seriesActive(s) ? { room: s.room, id: s.id, status: s.status, bestOf: s.bestOf } : null;
    if (mail) { user.activityInbox = user.activityInbox || {}; user.activityInbox[`series_${s.id}`] = { type: 'series', sentAt: now, ...mail }; }
    return { user };
  });
}
// Pays / refunds whatever a finished series still owes (safe to run again).
async function settleSeries(s) {
  if (!s || seriesActive(s)) return s;
  const players = [s.host, s.guest].filter(Boolean);
  for (const u of players) {
    if (s.settled && s.settled[u]) continue;
    const other = players.find(p => p !== u);
    const score = `${num(s.wins?.[u])}–${num(s.wins?.[other])}`;
    const base = { bestOf: s.bestOf, opponent: clip(s.names?.[other] || 'Your opponent', 20), score, reason: s.reason || null };
    if (s.status === 'done') {
      const won = s.winner === u;
      await seriesMoney(u, `${s.id}_${won ? 'won' : 'lost'}`, won ? num(s.pot) : 0, s, { ...base, won, pot: won ? num(s.pot) : 0, fee: num(s.fee) });
    } else {
      const paid = !!(s.paid && s.paid[u]);
      await seriesMoney(u, `${s.id}_refund`, paid ? num(s.fee) : 0, s, { ...base, cancelled: true, refund: paid ? num(s.fee) : 0 });
    }
    await seriesRef(s.room).child(`settled/${u}`).set(true);
    s.settled = { ...(s.settled || {}), [u]: true };
  }
  return s;
}
// Moves a series on inside a transaction on series/{room}; returns the new value.
// The first pass sees the (empty) local cache: unless we're creating the
// series, return null there so Firebase re-runs with the server's value.
async function seriesTx(code, change, { create = false } = {}) {
  let err = null;
  const res = await seriesRef(code).transaction((cur) => {
    err = null;
    if (cur === null && !create) return null;
    const next = change(cur ? JSON.parse(JSON.stringify(cur)) : null);
    if (next && next.error) { err = next.error; return; }
    if (next === undefined) return; // nothing to change
    return next;
  }, undefined, false);
  if (err) fail('failed-precondition', err);
  return res.snapshot.val();
}
function finishSeries(s, winner, reason, now) {
  s.status = 'done'; s.winner = winner; s.reason = reason; s.updatedAt = now;
  return s;
}
actions.series = async ({ uid, auth, data }) => {
  const op = data.op;
  if (!['status', 'create', 'accept', 'cancel', 'game', 'readyNext', 'startNext', 'forfeit', 'claimForfeit'].includes(op)) fail('invalid-argument', 'Unknown series step.');
  const code = clip(data.roomCode, 6);
  if (!/^\d{6}$/.test(code)) fail('invalid-argument', 'Bad room.');
  const now = Date.now();
  let s = (await seriesRef(code).once('value')).val();
  // A series nobody has touched for a day is called off (entries back).
  if (seriesActive(s) && now - num(s.updatedAt) > SERIES_STALE_MS) {
    s = await seriesTx(code, (cur) => (seriesActive(cur) && now - num(cur.updatedAt) > SERIES_STALE_MS ? { ...cur, status: 'cancelled', reason: 'expired', updatedAt: now } : undefined));
  }
  if (s && !seriesActive(s)) s = await settleSeries(s);
  if (op === 'status') return { series: s || null };

  const room = (await db().ref(`rooms/${code}`).once('value')).val();
  const seats = Object.values(room?.players || {}).filter(Boolean);
  const mine = seats.find(p => p.uid === uid);
  const isMember = s && (s.host === uid || s.guest === uid);

  if (op === 'create') {
    const bestOf = num(data.bestOf);
    const fee = num(SERIES.bestOf?.[bestOf]);
    if (!fee) fail('invalid-argument', 'Choose Best of 3, 5 or 7.');
    if (!(await xp.enabled())) fail('failed-precondition', 'Series need levels, which are switched off right now.');
    if (!auth?.token?.email_verified) fail('failed-precondition', 'Verify your email address first.');
    if (!room || room.isRanked) fail('failed-precondition', 'Series are only for Play Friends rooms.');
    if (room.ruleMode === 'house') fail('failed-precondition', 'Series use Standard rules. Switch modes first.');
    const humans = seats.filter(p => !p.isBot && p.uid);
    if (seats.length !== 2 || humans.length !== 2) fail('failed-precondition', 'A series needs exactly two signed-in players and no bots.');
    if (!mine || !mine.isHost) fail('failed-precondition', 'Only the host can start a series.');
    if (['SWAP', 'PLAY'].includes(room.phase)) fail('failed-precondition', 'Wait for this game to finish first.');
    if (seriesActive(s)) fail('failed-precondition', 'A series is already set up in this room.');
    const other = humans.find(p => p.uid !== uid);
    const [myLevel, theirLevel] = await Promise.all([seriesPlayerLevel(uid), seriesPlayerLevel(other.uid)]);
    // The host needs the level for this length; the other player only for Best of 7 (SERIES.guestLevels).
    const requiredLevel = Math.max(num(SERIES.level), num(SERIES.levels?.[bestOf], { 3: 5, 5: 15, 7: 30 }[bestOf]));
    const guestLevel = num(SERIES.guestLevels?.[bestOf], { 7: 30 }[bestOf] || 0);
    if (myLevel < requiredLevel) fail('failed-precondition', `Best of ${bestOf} unlocks at level ${requiredLevel}.`);
    if (theirLevel < guestLevel) fail('failed-precondition', `${clip(other.name, 20)} needs to reach level ${guestLevel} first.`);
    const id = `s${now.toString(36)}${nodeCrypto.randomInt(1e9).toString(36)}`;
    const draft = {
      id, room: code, bestOf, need: Math.ceil(bestOf / 2), fee, pot: fee * 4, host: uid, guest: other.uid,
      names: { [uid]: clip(mine.name, 20), [other.uid]: clip(other.name, 20) },
      wins: { [uid]: 0, [other.uid]: 0 }, played: 0, status: 'pending', paid: { [uid]: true },
      createdAt: now, updatedAt: now
    };
    // One series at a time per player, and a few a day.
    const today = ukDateKey(new Date(now));
    const dayCount = (user) => (user.seriesDay && user.seriesDay.day === today ? num(user.seriesDay.count) : 0);
    await userTx(uid, (user) => {
      if (seriesActive(user.series) && user.series.room !== code) return { error: 'Finish your other series first.' };
      if (dayCount(user) >= num(SERIES.perDay, 5)) return { error: `You can start ${num(SERIES.perDay, 5)} series a day. Come back tomorrow.` };
      return { noop: true };
    });
    await seriesMoney(uid, `${id}_entry`, -fee, draft);
    try {
      s = await seriesTx(code, (cur) => (seriesActive(cur) ? { error: 'A series is already set up in this room.' } : draft), { create: true });
    } catch (e) {
      await seriesMoney(uid, `${id}_refund`, fee, { ...draft, status: 'cancelled' });
      throw e;
    }
    await userTx(uid, (user) => { user.seriesDay = { day: today, count: dayCount(user) + 1 }; return { user }; });
    return { series: s };
  }

  if (!s || !seriesActive(s)) fail('failed-precondition', 'There is no series going on in this room.');
  if (!isMember) fail('permission-denied', 'You are not in this series.');
  const other = s.host === uid ? s.guest : s.host;

  if (op === 'accept') {
    if (uid !== s.guest || s.status !== 'pending') fail('failed-precondition', 'Nothing to accept.');
    if (!auth?.token?.email_verified) fail('failed-precondition', 'Verify your email address first.');
    const guestLevel = num(SERIES.guestLevels?.[s.bestOf], { 7: 30 }[s.bestOf] || 0);
    if (guestLevel && (await seriesPlayerLevel(uid)) < guestLevel) fail('failed-precondition', `Both players must reach level ${guestLevel} for Best of ${s.bestOf}.`);
    await userTx(uid, (user) => (seriesActive(user.series) && user.series.room !== code ? { error: 'Finish your other series first.' } : { noop: true }));
    await seriesMoney(uid, `${s.id}_entry`, -num(s.fee), { ...s, status: 'live' });
    try {
      s = await seriesTx(code, (cur) => (cur && cur.id === s.id && cur.status === 'pending'
        ? { ...cur, status: 'live', paid: { ...(cur.paid || {}), [uid]: true }, updatedAt: now } : { error: 'That series was called off.' }));
    } catch (e) {
      await seriesMoney(uid, `${s.id}_refund`, num(s.fee), { ...s, status: 'cancelled' });
      throw e;
    }
    // The host's record says live too (for rejoining).
    await db().ref(`users/${s.host}/series`).set({ room: code, id: s.id, status: 'live', bestOf: s.bestOf });
    return { series: s };
  }

  if (op === 'readyNext' || op === 'startNext') {
    const matchId = clip(data.matchId, 80);
    if (!KEY_RE.test(matchId) || !room || room.phase !== 'FINISHED' || room.matchId !== matchId || !mine || mine.isBot) fail('failed-precondition', 'Wait for the current game to finish.');
    if (seats.length !== 2 || seats.some(p => p.isBot) || !seats.some(p => p.uid === s.host) || !seats.some(p => p.uid === s.guest)) fail('failed-precondition', 'Both series players must be here.');
    if (op === 'startNext' && !mine.isHost) fail('permission-denied', 'Only the current host can start the next game.');
    const nextMatchId = nodeCrypto.randomUUID();
    s = await seriesTx(code, (cur) => {
      if (!cur || cur.id !== s.id || cur.status !== 'live' || !(cur.games?.[matchId] || cur.skippedGames?.[matchId])) return { error:'That game has not been counted or the series has ended.' };
      const round = cur.nextRound?.matchId === matchId ? cur.nextRound : { matchId, ready:{} };
      if (op === 'readyNext') round.ready = { ...(round.ready || {}), [uid]:true };
      else {
        if (!round.ready?.[cur.host] || !round.ready?.[cur.guest]) return { error:'Both players must press Ready.' };
        round.started = true;
        round.nextMatchId = round.nextMatchId || nextMatchId;
      }
      cur.nextRound = round; cur.updatedAt = now;
      return cur;
    });
    return { series:s };
  }

  if (op === 'cancel') {
    // Before the first game only: after that, leaving is a forfeit.
    s = await seriesTx(code, (cur) => (cur && cur.id === s.id && seriesActive(cur) && !num(cur.played)
      ? { ...cur, status: 'cancelled', reason: 'called-off', updatedAt: now } : { error: 'Games have been played: leaving now forfeits the series.' }));
    return { series: await settleSeries(s) };
  }

  if (op === 'forfeit' || op === 'claimForfeit') {
    let loser = uid;
    if (op === 'claimForfeit') {
      // The other player left: their stand-in bot has played its turns and
      // they haven't been seen for a minute (only they can write that).
      loser = other;
      const seat = seats.find(p => p.uid === other);
      const turns = num(seat?.substituteMoveCount);
      const pub = (await db().ref(`publicProfiles/${other}`).once('value')).val() || {};
      const away = pub.online !== true || now - num(pub.seen) > 60 * 1000;
      if (!seat || !seat.isBot || turns < num(SERIES.forfeitTurns, 5) || !away) fail('failed-precondition', 'They still have time to come back.');
    }
    if (s.status === 'pending') {
      s = await seriesTx(code, (cur) => (cur && cur.id === s.id && seriesActive(cur) ? { ...cur, status: 'cancelled', reason: 'called-off', updatedAt: now } : undefined));
    } else {
      const winner = loser === s.host ? s.guest : s.host;
      s = await seriesTx(code, (cur) => (cur && cur.id === s.id && seriesActive(cur) ? finishSeries(cur, winner, 'forfeit', now) : undefined));
    }
    return { series: await settleSeries(s) };
  }

  // op === 'game': a finished game in the room counts once.
  if (s.status !== 'live') fail('failed-precondition', 'The series has not started yet.');
  const matchId = clip(data.matchId, 80);
  if (!KEY_RE.test(matchId)) fail('invalid-argument', 'Bad match id.');
  if (!room || room.matchId !== matchId || room.phase !== 'FINISHED') fail('failed-precondition', 'That game could not be checked.');
  if (s.games?.[matchId] || s.skippedGames?.[matchId]) return { series:s, skipped:!!s.skippedGames?.[matchId] };
  const hostSeat = seats.find(p => p.uid === s.host), guestSeat = seats.find(p => p.uid === s.guest);
  if (!hostSeat || !guestSeat) fail('failed-precondition', 'That game could not be checked.');
  const drew = !!(hostSeat.drew || guestSeat.drew);
  const winnerSeat = drew ? null : [hostSeat, guestSeat].find(p => num(p.finishRank, 99) === 1);
  if (!drew && !winnerSeat) fail('failed-precondition', 'That game has no winner yet.');
  if (now - num(s.lastGameAt) < num(SERIES.minGameMs, 60000)) {
    // A disqualified fast game still needs a deliberate Ready from each player.
    // It earns no score or payout, but must not strand the series between games.
    s = await seriesTx(code, cur => {
      if (!cur || cur.id !== s.id || cur.status !== 'live') return { error:'The series has ended.' };
      if (cur.games?.[matchId] || cur.skippedGames?.[matchId]) return undefined;
      cur.skippedGames = { ...(cur.skippedGames || {}), [matchId]:true };
      delete cur.nextRound; cur.updatedAt = now;
      return cur;
    });
    return { series:s, skipped:true };
  }
  s = await seriesTx(code, (cur) => {
    if (!cur || cur.id !== s.id || cur.status !== 'live') return { error: 'The series has ended.' };
    if (cur.games && cur.games[matchId]) return undefined;
    cur.games = { ...(cur.games || {}), [matchId]: drew ? 'draw' : winnerSeat.uid };
    cur.played = num(cur.played) + 1;
    cur.lastGameAt = now; cur.updatedAt = now;
    delete cur.nextRound; // Readiness belongs only to the game just finished.
    if (!drew) cur.wins = { ...(cur.wins || {}), [winnerSeat.uid]: num(cur.wins?.[winnerSeat.uid]) + 1 };
    const leader = [cur.host, cur.guest].sort((a, b) => num(cur.wins?.[b]) - num(cur.wins?.[a]))[0];
    if (num(cur.wins?.[leader]) >= num(cur.need)) return finishSeries(cur, leader, 'won', now);
    // Endless draws: after twice the games, the leader takes it (level = entries back).
    if (cur.played >= cur.bestOf * 2) {
      if (num(cur.wins?.[cur.host]) === num(cur.wins?.[cur.guest])) { cur.status = 'cancelled'; cur.reason = 'drawn'; return cur; }
      return finishSeries(cur, leader, 'won', now);
    }
    return cur;
  });
  return { series: s ? await settleSeries(s) : (await seriesRef(code).once('value')).val() };
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
exports._test = { actions, puzzleOfWeek, pickDailyIds, pickWeeklyIds, userWeeklyIds, userDailyIds, ukDateKey, ukWeekKey, shiftDateKey, activeSeasonWindows, pairwiseEloDeltas, rankedStreakBonus, RANKED_BONUS, tierName, challengeForKey, milestoneEligible, unlockedDifficulties, dzAward, dzView };
