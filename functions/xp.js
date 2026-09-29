// XP & levels, awarded by the server only (the rules make users/{uid}/xp
// server-only). OFF until the owner turns it on: database
// config/features/xp = true (owner-only write). While off, nothing is added
// and nothing changes for players.
//
// users/{uid}/xp = { total, level, backfilled }
//   total  all XP ever earned (never goes down, stops at xp.maxXp)
//   level  1–99, from the catalog's xp.levels table (total XP per level:
//          a RuneScape-style curve, level 92 is half of 99)
//   backfilled  past play was turned into XP once (see backfill)
// A level up pays Diamonds (xp.levelUpDiamonds, or xp.milestoneDiamonds
// instead on every xp.milestoneEvery-th level) and sends an activityInbox
// 'level' mail. There is no daily cap: the match limits already stop farming.
'use strict';

const admin = require('firebase-admin');
const CAT = require('./catalog.json');

const RULES = CAT.xp || {};
const LEVELS = RULES.levels || [0, 0]; // LEVELS[L] = total XP for level L
const MAX_LEVEL = LEVELS.length - 1;
const num = (v, f = 0) => { const n = Number(v); return v !== null && v !== undefined && v !== '' && Number.isFinite(n) ? n : f; };

const xpForLevel = (level) => LEVELS[Math.max(1, Math.min(MAX_LEVEL, level))] || 0;
function levelFor(total) {
  let level = 1;
  while (level < MAX_LEVEL && num(total) >= LEVELS[level + 1]) level++;
  return level;
}
const levelReward = (L) => (num(RULES.milestoneEvery) > 0 && L % num(RULES.milestoneEvery) === 0 ? num(RULES.milestoneDiamonds) : num(RULES.levelUpDiamonds));

// The switch, read at most every 10s per server instance (so flicking it
// takes effect within about 10 seconds).
let cached = { at: 0, on: false };
async function enabled() {
  if (Date.now() - cached.at < 10000) return cached.on;
  let on = false;
  try { on = (await admin.database().ref('config/features/xp').once('value')).val() === true; } catch (e) { on = false; }
  cached = { at: Date.now(), on };
  return on;
}
const resetCache = () => { cached = { at: 0, on: false }; };

// Adds `amount` XP (mutates `user`) and pays/mails the levels passed.
function addXp(user, amount, now, addDiamonds, { mailEach = true } = {}) {
  const xp = user.xp = user.xp || {};
  const before = num(xp.total);
  const beforeLevel = levelFor(before);
  xp.total = Math.min(num(RULES.maxXp, 1e8), before + Math.max(0, Math.round(amount)));
  xp.level = levelFor(xp.total);
  const levelUps = [];
  for (let L = beforeLevel + 1; L <= xp.level; L++) {
    const reward = levelReward(L);
    if (reward) addDiamonds(user, reward);
    if (mailEach) {
      user.activityInbox = user.activityInbox || {};
      user.activityInbox[`level_${L}`] = { type: 'level', level: L, reward, sentAt: now };
    }
    levelUps.push({ level: L, reward });
  }
  return { gained: xp.total - before, total: xp.total, level: xp.level, levelUps };
}

// XP for what an account did before levels existed, worked out from its
// records (each counted once, never again): games finished, wins, Ranked
// games and wins, Gauntlet bots (runs always go easy, easy, medium, hard,
// boss) and daily/weekly challenges. Runs before the first XP an account
// gets, so the game being reported isn't counted twice. The levels it passes
// pay their Diamonds, with ONE mail for the lot.
function pastXp(user) {
  const c = user.matchCounters || {};
  const rs = user.rankedStats || {};
  const rankedWins = num(user.wins);
  const rankedGames = rankedWins + num(user.losses) + num(rs.draws);
  const casualWins = num(c.wins);
  const finished = Math.max(num(c.finished), casualWins + rankedGames);
  const rounds = (CAT.gauntlet && CAT.gauntlet.rounds) || [];
  const perBot = RULES.gauntletBot || {};
  const bots = num(user.gauntlet?.botsBeaten);
  let gauntlet = 0;
  for (let i = 0; i < bots && rounds.length; i++) gauntlet += num(perBot[rounds[i % rounds.length]]);
  const keys = Object.keys(user.completedChallenges || {});
  const daily = keys.filter(k => k.startsWith('daily_')).length;
  const weekly = keys.filter(k => k.startsWith('weekly_')).length;
  return finished * num(RULES.finish) + casualWins * num(RULES.win) + rankedGames * num(RULES.ranked)
    + rankedWins * num(RULES.rankedWin) + gauntlet + daily * num(RULES.daily) + weekly * num(RULES.weekly);
}
function backfill(user, now, addDiamonds) {
  if (user.xp && user.xp.backfilled) return null;
  const amount = pastXp(user);
  const res = addXp(user, amount, now, addDiamonds, { mailEach: false });
  user.xp.backfilled = true;
  if (res.levelUps.length) {
    user.activityInbox = user.activityInbox || {};
    user.activityInbox.level_backfill = { type: 'level', backfill: true, level: res.level, xp: res.gained, reward: res.levelUps.reduce((s, u) => s + u.reward, 0), sentAt: now };
  }
  return res;
}

// Adds XP inside a users/{uid} transaction (mutates `user`). `parts` is a
// list of [reason, amount]. Returns { gained, total, level, levelUps } or
// null when nothing was added. `addDiamonds` pays level-up rewards.
function award(user, parts, now, addDiamonds) {
  const wanted = parts.reduce((s, [, n]) => s + Math.max(0, num(n)), 0);
  if (!wanted) return null;
  return addXp(user, wanted, now, addDiamonds);
}

// Gauntlet XP for beating the bot of round `round` (0-based).
const gauntletBotXp = (round) => {
  const rounds = (CAT.gauntlet && CAT.gauntlet.rounds) || [];
  return num((RULES.gauntletBot || {})[rounds[round]]);
};

module.exports = { RULES, enabled, award, backfill, pastXp, gauntletBotXp, levelFor, xpForLevel, resetCache };
