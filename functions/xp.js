// XP & levels, awarded by the server only (the rules make users/{uid}/xp
// server-only). OFF until the owner turns it on: database
// config/features/xp = true (owner-only write). While off, nothing is added
// and nothing changes for players.
//
// users/{uid}/xp = { total, level, day, today }
//   total  all XP ever earned (never goes down)
//   level  the level for that total (catalog xp.curve * (L-1)^1.5 per level)
//   day / today  the UK day and the XP earned on it (capped at xp.dailyCap)
// A level up pays Diamonds (xp.levelUpDiamonds, or xp.milestoneDiamonds on
// every xp.milestoneEvery-th level) and sends an activityInbox 'level' mail.
'use strict';

const admin = require('firebase-admin');
const CAT = require('./catalog.json');

const RULES = CAT.xp || {};
const num = (v, f = 0) => { const n = Number(v); return v !== null && v !== undefined && v !== '' && Number.isFinite(n) ? n : f; };
const ukDateKey = (date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

const xpForLevel = (level) => Math.round(num(RULES.curve, 100) * Math.pow(Math.max(0, level - 1), 1.5));
function levelFor(total) {
  let level = 1;
  const max = num(RULES.maxLevel, 100);
  while (level < max && num(total) >= xpForLevel(level + 1)) level++;
  return level;
}

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

// Adds XP inside a users/{uid} transaction (mutates `user`). `parts` is a
// list of [reason, amount]. Returns { gained, total, level, levelUps } or
// null when nothing was added. `addDiamonds` pays level-up rewards.
function award(user, parts, now, addDiamonds) {
  const wanted = parts.reduce((s, [, n]) => s + Math.max(0, num(n)), 0);
  if (!wanted) return null;
  const today = ukDateKey(new Date(now));
  const xp = user.xp = user.xp || {};
  if (xp.day !== today) { xp.day = today; xp.today = 0; }
  const room = Math.max(0, num(RULES.dailyCap, 600) - num(xp.today));
  const gained = Math.min(wanted, room);
  if (!gained) return { gained: 0, capped: true, total: num(xp.total), level: num(xp.level, 1), levelUps: [] };
  const before = levelFor(num(xp.total));
  xp.total = num(xp.total) + gained;
  xp.today = num(xp.today) + gained;
  xp.level = levelFor(xp.total);
  const levelUps = [];
  for (let L = before + 1; L <= xp.level; L++) {
    const milestone = num(RULES.milestoneEvery) > 0 && L % num(RULES.milestoneEvery) === 0;
    const reward = milestone ? num(RULES.milestoneDiamonds) : num(RULES.levelUpDiamonds);
    if (reward) addDiamonds(user, reward);
    user.activityInbox = user.activityInbox || {};
    user.activityInbox[`level_${L}`] = { type: 'level', level: L, reward, sentAt: now };
    levelUps.push({ level: L, reward });
  }
  return { gained, capped: gained < wanted, total: xp.total, level: xp.level, levelUps };
}

module.exports = { RULES, enabled, award, levelFor, xpForLevel, resetCache };
