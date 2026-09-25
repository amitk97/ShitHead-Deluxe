// Push notifications for ShitHead Deluxe, sent while the app is closed.
// Each device that turns on Settings -> Notifications saves its push token
// under pushTokens/{uid}/{key}. These functions watch the database and send:
//   - a new game invite      gameInvites/{uid}/{inviteId}
//   - a new friend request   friendRequests/{uid}/{fromUid}
//   - a new gift             gifts/{uid}/{giftId}
//   - a seasonal event starting (every day at 09:00 UK time, to everyone)
// Messages are data-only; sw.js turns them into notifications (and skips
// them if the game is already open on screen). Tags match the in-game ones,
// so one alert never shows twice.
'use strict';

const { onValueCreated } = require('firebase-functions/v2/database');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const { eventsStartingOn } = require('./seasons');

admin.initializeApp();

const REGION = 'europe-west1';                 // same region as the database
const INSTANCE = 'shithead-pro-default-rtdb';
const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument'
]);

const clip = (value, max) => String(value || '').slice(0, max);

// Sends one data message to every token in `entries` ([[path, token]]) and
// removes tokens the push service says are gone.
async function sendToTokens(entries, message, ttlSeconds) {
  if (!entries.length) return 0;
  let sent = 0;
  for (let i = 0; i < entries.length; i += 500) {
    const batch = entries.slice(i, i + 500);
    const response = await admin.messaging().sendEachForMulticast({
      tokens: batch.map(([, token]) => token),
      data: message,
      webpush: { headers: { Urgency: 'high', TTL: String(ttlSeconds) } }
    });
    const removals = {};
    response.responses.forEach((result, index) => {
      if (result.success) { sent += 1; return; }
      if (DEAD_TOKEN_CODES.has(result.error && result.error.code)) removals[batch[index][0]] = null;
    });
    if (Object.keys(removals).length) await admin.database().ref().update(removals);
  }
  return sent;
}

async function tokensForUser(uid) {
  const snap = await admin.database().ref(`pushTokens/${uid}`).once('value');
  const entries = [];
  snap.forEach((child) => {
    const token = child.child('token').val();
    if (typeof token === 'string' && token) entries.push([`pushTokens/${uid}/${child.key}`, token]);
  });
  return entries;
}

async function notifyUser(uid, message, ttlSeconds = 3600) {
  const entries = await tokensForUser(uid);
  const sent = await sendToTokens(entries, message, ttlSeconds);
  logger.info('notified', { uid, tag: message.tag, devices: entries.length, sent });
}

const trigger = (ref) => ({ ref, region: REGION, instance: INSTANCE });

exports.notifyGameInvite = onValueCreated(trigger('/gameInvites/{uid}/{inviteId}'), (event) => {
  const invite = event.data.val() || {};
  const who = clip(invite.fromName, 12) || 'A friend';
  // Invites expire after 5 minutes, so an old alert is useless.
  return notifyUser(event.params.uid, {
    title: `🃏 ${who} invited you to a game`,
    body: 'Tap to join before the invite runs out.',
    tag: `invite-${event.params.inviteId}`,
    open: 'inbox'
  }, 300);
});

exports.notifyFriendRequest = onValueCreated(trigger('/friendRequests/{uid}/{fromUid}'), (event) => {
  const request = event.data.val() || {};
  const who = clip(request.name, 12) || 'Someone';
  return notifyUser(event.params.uid, {
    title: `👋 ${who} wants to be friends`,
    body: 'Tap to accept or decline.',
    tag: `request-${event.params.fromUid}`,
    open: 'friends'
  });
});

exports.notifyGift = onValueCreated(trigger('/gifts/{uid}/{giftId}'), (event) => {
  const gift = event.data.val() || {};
  const who = clip(gift.fromName, 12) || 'A friend';
  return notifyUser(event.params.uid, {
    title: `🎁 ${who} sent you a gift`,
    body: 'Open your Inbox to see it.',
    tag: `gift-${event.params.giftId}`,
    open: 'inbox'
  }, 86400);
});

// Today's date in the UK, as { y, m, d }.
function ukToday(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', year: 'numeric', month: 'numeric', day: 'numeric'
  }).formatToParts(now).map((p) => [p.type, p.value]));
  return { y: Number(parts.year), m: Number(parts.month), d: Number(parts.day) };
}

exports.notifySeasonStart = onSchedule({ schedule: 'every day 09:00', timeZone: 'Europe/London', region: REGION }, async () => {
  const starting = eventsStartingOn(ukToday());
  if (!starting.length) return;
  const snap = await admin.database().ref('pushTokens').once('value');
  const entries = [];
  snap.forEach((user) => {
    user.forEach((child) => {
      const token = child.child('token').val();
      if (typeof token === 'string' && token) entries.push([`pushTokens/${user.key}/${child.key}`, token]);
    });
  });
  for (const event of starting) {
    const sent = await sendToTokens(entries, {
      title: `${event.emoji} ${event.name} has started!`,
      body: `${event.title} — new ${event.name} items are in the Shop for a limited time.`,
      tag: `season-${event.key}`,
      open: 'shop'
    }, 43200);
    logger.info('season start', { key: event.key, devices: entries.length, sent });
  }
});

// The economy (Diamonds, purchases, gifts, challenges, Ranked results).
exports.economy = require('./economy').economy;

// Ranked audit: every write to a Ranked room is checked against what an
// honest client could have done (ranked-audit.js), with the account that
// made it. A v1 trigger because only v1 database triggers say who wrote.
// Findings go to rankedAudit/{room}/{matchId} (owner-only; menu → Error
// Reports → RANKED AUDIT) and economy's rankedResult reads them.
const functionsV1 = require('firebase-functions/v1');
const { auditTransition } = require('./ranked-audit');
const AUDIT_FINDINGS_KEEP = 40;
const auditKey = (v) => String(v || 'none').replace(/[.#$[\]/]/g, '_').slice(0, 200);

exports.auditRankedRoom = functionsV1.region(REGION).database.instance(INSTANCE).ref('/rooms/{code}')
  .onWrite(async (change, context) => {
    const after = change.after.val();
    const before = change.before.val();
    if (!after || after.isRanked !== true) return null;
    if (context.authType === 'ADMIN') return null; // the server's own writes
    const uid = (context.auth && context.auth.uid) || null;
    const now = Date.parse(context.timestamp) || Date.now();
    const code = context.params.code;
    const base = admin.database().ref(`rankedAudit/${code}/${auditKey(after.matchId)}`);
    const [seen, left] = await Promise.all([
      base.child('seen').once('value').then((s) => s.val() || {}),
      base.child('left').once('value').then((s) => s.val() || {})
    ]);
    const findings = auditTransition(before, after, { uid, now, seen, left });
    const updates = {};
    if (uid) updates[`seen/${uid}`] = now;
    // A player's own "left" presence lets the others hand their seat to a bot.
    const mySeat = (Array.isArray(after.players) ? after.players : Object.values(after.players || {})).find((p) => p && p.uid === uid);
    if (mySeat && after.presence && after.presence[mySeat.id] && after.presence[mySeat.id].status === 'left') updates[`left/${uid}`] = true;
    if (!findings.length) {
      if (Object.keys(updates).length) await base.update(updates);
      return null;
    }
    updates.meta = {
      room: code,
      matchId: String(after.matchId || ''),
      at: now,
      players: Object.fromEntries((Array.isArray(after.players) ? after.players : Object.values(after.players || {}))
        .filter((p) => p && p.id).map((p) => [auditKey(p.id), { name: String(p.name || '').slice(0, 30), uid: p.uid || null }]))
    };
    await base.update(updates);
    const counts = await base.child('counts').transaction((c) => {
      const cur = c || { hard: 0, soft: 0, logged: 0 };
      findings.forEach((f) => { cur[f.hard ? 'hard' : 'soft'] += 1; });
      cur.logged = Math.min(AUDIT_FINDINGS_KEEP, cur.logged + findings.length);
      return cur;
    });
    const room = counts.snapshot.val() || {};
    const keep = Math.max(0, AUDIT_FINDINGS_KEEP - ((room.logged || 0) - findings.length));
    const adds = {};
    findings.slice(0, keep).forEach((f) => {
      adds[`findings/${base.child('findings').push().key}`] = { ...f, by: uid, at: now, stateVersion: Number(after.stateVersion) || 0 };
    });
    if (Object.keys(adds).length) await base.update(adds);
    logger.warn('Ranked audit finding', { code, matchId: after.matchId, uid, kinds: findings.map((f) => f.kind) });
    return null;
  });
