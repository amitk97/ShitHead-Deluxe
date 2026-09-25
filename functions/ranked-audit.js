// Ranked audit: checks every write to a Ranked room against what a real
// client could have done, using who made the write (the database trigger
// knows the account) and the room before and after it.
//
// Rooms are writable by anyone, and the host's phone runs the game, so a
// modified client could otherwise play someone else's cards, invent cards,
// empty its own hand or crown itself. Each finding says what looked wrong;
// "hard" ones cannot come from an honest game (card conservation, moving
// another player's cards, finishing while still holding cards...), "soft"
// ones are unusual but can come from timing (a play out of turn).
//
// auditTransition is pure (no database), so it's unit-tested directly and
// by the two-player emulator games in tools/.
'use strict';

const { DECK_SIZE, isPlayLegal, canonicalCard } = require('./rules');

const TIMEOUT_GRACE_MS = 2000;     // an opponent may act for you this close to your deadline
const AWAY_BEFORE_BOT_MS = 40000;  // index.html hands a seat to a bot after 45s away

const list = (v) => (Array.isArray(v) ? v : v && typeof v === 'object' ? Object.values(v) : []).filter(Boolean);
const seatsOf = (room) => list(room && room.players);
const seatCards = (seat) => [...list(seat.hand), ...list(seat.faceUp), ...list(seat.faceDown)];

// id -> where that card is: { zone: 'seat'|'pile'|'deck', seatId, sub }
function locate(room) {
  const where = new Map();
  seatsOf(room).forEach((seat) => {
    ['hand', 'faceUp', 'faceDown'].forEach((sub) => list(seat[sub]).forEach((c) => where.set(c.id, { zone: 'seat', seatId: seat.id, sub, card: c })));
  });
  list(room && room.discardPile).forEach((c) => where.set(c.id, { zone: 'pile', card: c }));
  list(room && room.drawPile).forEach((c) => where.set(c.id, { zone: 'deck', card: c }));
  return where;
}

function allCards(room) {
  const out = [];
  seatsOf(room).forEach((seat) => seatCards(seat).forEach((c) => out.push(c)));
  list(room && room.discardPile).forEach((c) => out.push(c));
  list(room && room.drawPile).forEach((c) => out.push(c));
  return out;
}

// A 10 on top, or the last four cards the same (non-Joker) rank.
function pileBurns(pile) {
  if (!pile.length) return false;
  const top = pile[pile.length - 1];
  if (top.rank === '10') return true;
  if (pile.length < 4 || top.isJoker) return false;
  return pile.slice(-4).every((c) => c.rank === top.rank && !c.isJoker);
}

function gameChanged(before, after) {
  const keys = ['players', 'discardPile', 'drawPile', 'phase', 'currentTurnIndex', 'matchId'];
  return keys.some((k) => JSON.stringify(before && before[k]) !== JSON.stringify(after && after[k]));
}

/**
 * @param before room before the write (or null)
 * @param after room after the write
 * @param ctx { uid, now, seen: {uid: lastWriteMs}, left: {uid: true} }
 * @returns findings [{ kind, hard, seat?, detail }]
 */
function auditTransition(before, after, ctx) {
  const findings = [];
  const add = (kind, hard, detail = '', seat = null) => findings.push({ kind, hard, seat, detail: String(detail).slice(0, 200) });
  if (!after || after.isRanked !== true) return findings;
  if (before && !gameChanged(before, after)) return findings;

  // Every card must be a real card, only once, with its real rank and suit.
  const ids = new Set();
  for (const c of allCards(after)) {
    const real = canonicalCard(c.id);
    if (!real) { add('bad-card', true, `unknown card ${c.id}`); continue; }
    if (real.rank !== c.rank || !!real.isJoker !== !!c.isJoker) add('bad-card', true, `${c.id} shown as ${c.rank}, is ${real.rank}`);
    if (ids.has(c.id)) add('dup-card', true, `${c.id} appears twice`);
    ids.add(c.id);
  }

  const newMatch = !before || before.matchId !== after.matchId || !['SWAP', 'PLAY', 'FINISHED'].includes(before.phase);
  if (newMatch) {
    if (after.phase === 'SWAP') {
      if (ids.size !== DECK_SIZE) add('bad-deal', true, `${ids.size} cards dealt`);
      seatsOf(after).forEach((seat) => {
        if (list(seat.hand).length !== 3 || list(seat.faceUp).length !== 3 || list(seat.faceDown).length !== 3) add('bad-deal', true, 'not 3/3/3', seat.id);
      });
    }
    return findings;
  }

  const author = ctx.uid || null;
  const beforeSeats = new Map(seatsOf(before).map((s) => [s.id, s]));
  const afterSeats = new Map(seatsOf(after).map((s) => [s.id, s]));
  const isMember = seatsOf(before).some((s) => s.uid && s.uid === author);
  if (!isMember) add('outsider-write', true, `write by ${author || 'no account'}`);

  // A seat's owner can't change, and only someone really away is replaced by a bot.
  beforeSeats.forEach((b, id) => {
    const a = afterSeats.get(id);
    if (!a) return;
    if ((b.uid || null) !== (a.uid || null)) add('seat-owner-changed', true, `${b.uid} -> ${a.uid}`, id);
    if (!b.isBot && a.isBot && b.uid && author !== b.uid) {
      const lastSeen = (ctx.seen && ctx.seen[b.uid]) || 0;
      const away = (ctx.now || 0) - lastSeen >= AWAY_BEFORE_BOT_MS;
      if (!away && !(ctx.left && ctx.left[b.uid])) add('seat-hijack', true, `turned into a bot ${Math.round(((ctx.now || 0) - lastSeen) / 1000)}s after their last move`, id);
    }
  });

  if (before.phase === 'SWAP') {
    // Swapping only rearranges a seat's own nine cards.
    beforeSeats.forEach((b, id) => {
      const a = afterSeats.get(id);
      if (!a) return;
      const bIds = seatCards(b).map((c) => c.id).sort().join();
      const aIds = seatCards(a).map((c) => c.id).sort().join();
      if (bIds !== aIds) add('swap-changed-cards', true, 'cards changed during the swap', id);
      else if (JSON.stringify([b.hand, b.faceUp]) !== JSON.stringify([a.hand, a.faceUp]) && b.uid && author !== b.uid && !b.isBot) {
        add('swap-by-other', false, 'rearranged by another player', id);
      }
    });
    return findings;
  }
  if (before.phase !== 'PLAY') return findings;

  const bLoc = locate(before);
  const aLoc = locate(after);
  const turnSeat = seatsOf(before)[Number(before.currentTurnIndex) || 0];
  const timedOut = (seat) => !!(turnSeat && turnSeat.id === seat.id && before.turnDeadline && (ctx.now || 0) >= Number(before.turnDeadline) - TIMEOUT_GRACE_MS);
  const mayActFor = (seat) => !!seat && ((seat.uid && seat.uid === author) || seat.isBot || timedOut(seat));
  const beforePile = list(before.discardPile);
  const topBefore = beforePile[beforePile.length - 1];
  let jokerInvolved = !!(topBefore && topBefore.isJoker);
  bLoc.forEach((from, id) => {
    const to = aLoc.get(id);
    if (from.card.isJoker && (!to || to.zone !== from.zone || to.seatId !== from.seatId)) jokerInvolved = true;
  });

  // Cards played to the Pile in this write, per seat.
  const played = new Map();
  const vanished = [];
  bLoc.forEach((from, id) => {
    const to = aLoc.get(id);
    if (to && to.zone === from.zone && to.seatId === from.seatId) return;
    if (!to) {
      vanished.push(from);
      // A card that left a seat and is gone was played and burnt in the same write.
      if (from.zone === 'seat') {
        if (!mayActFor(beforeSeats.get(from.seatId)) && !from.card.isJoker) add('moved-by-other', true, `${from.card.rank} played for them`, from.seatId);
        if (!played.has(from.seatId)) played.set(from.seatId, []);
        played.get(from.seatId).push(from);
      }
      return;
    }
    if (from.zone === 'seat') {
      const seat = beforeSeats.get(from.seatId);
      if (to.zone === 'pile') {
        if (!mayActFor(seat) && !from.card.isJoker) add('moved-by-other', true, `${from.card.rank} played for them`, from.seatId);
        if (!played.has(from.seatId)) played.set(from.seatId, []);
        played.get(from.seatId).push(from);
      } else if (to.zone === 'deck') {
        add('to-deck', true, `${from.card.rank} put back in the Deck`, from.seatId);
      } else if (to.seatId !== from.seatId && !jokerInvolved) {
        add('seat-to-seat', true, `${from.card.rank} moved to another player`, from.seatId);
      }
    } else if (from.zone === 'pile') {
      if (to.zone === 'seat') {
        if (!mayActFor(beforeSeats.get(to.seatId)) && !jokerInvolved) add('pushed-cards', true, `made to pick up ${from.card.rank}`, to.seatId);
      } else {
        add('pile-tamper', true, `${from.card.rank} moved from the Pile to the Deck`);
      }
    } else if (from.zone === 'deck') {
      if (to.zone === 'seat') {
        if (!mayActFor(beforeSeats.get(to.seatId)) && !jokerInvolved) add('pushed-cards', true, `given ${from.card.rank} from the Deck`, to.seatId);
      } else {
        add('deck-tamper', true, `${from.card.rank} taken from the Deck to the Pile`);
      }
    }
  });
  aLoc.forEach((to, id) => { if (!bLoc.has(id)) add('new-card', true, `${to.card.rank} (${id}) appeared`, to.seatId || null); });

  // Cards may only disappear in a burn (or a Joker duel).
  const pileAfterPlays = [...beforePile, ...[...played.values()].flat().map((f) => f.card)];
  const burnt = pileBurns(beforePile) || pileBurns(pileAfterPlays);
  vanished.forEach((from) => {
    if (from.card.isJoker) return;
    if (from.zone === 'pile' && burnt) return;
    if (from.zone === 'seat' && burnt && mayActFor(beforeSeats.get(from.seatId))) return;
    add('vanished', true, `${from.card.rank} disappeared from the ${from.zone === 'seat' ? 'table' : from.zone}`, from.seatId || null);
  });

  // Plays: one rank at a time, legal on the Pile, blind ones one card at a time.
  played.forEach((froms, seatId) => {
    const seat = beforeSeats.get(seatId);
    const blind = froms.filter((f) => f.sub === 'faceDown');
    const open = froms.filter((f) => f.sub !== 'faceDown');
    if (blind.length > 1) add('multi-blind', true, `${blind.length} face-down cards at once`, seatId);
    if (!open.length) return;
    const ranks = new Set(open.filter((f) => !f.card.isJoker).map((f) => f.card.rank));
    if (ranks.size > 1) { add('mixed-play', true, `played ${[...ranks].join('+')} together`, seatId); return; }
    const card = open[0].card;
    const legal = isPlayLegal(card, beforePile, before.activeConstraint || null, before.baseOverrideCard || null)
      || (pileBurns(beforePile) && isPlayLegal(card, [], null, null));
    if (!legal) add('illegal-play', true, `${card.rank} on ${topBefore ? topBefore.rank : 'an empty pile'}${before.activeConstraint ? ` (${before.activeConstraint})` : ''}`, seatId);
    if (turnSeat && turnSeat.id !== seatId && !card.isJoker) {
      let run = 0;
      for (let i = beforePile.length - 1; i >= 0 && beforePile[i].rank === card.rank && !beforePile[i].isJoker; i--) run++;
      const snap = run > 0 && run + open.length >= 4;
      const followUp = before.pendingFollowUp && before.pendingFollowUp.playerId === seatId;
      if (!snap && !followUp && before.jokerTurnOwnerId !== seatId && seat) add('out-of-turn', false, `${card.rank} played on someone else's turn`, seatId);
    }
  });

  // Finishing: all cards gone, unless it's a Ranked concession (the seat is
  // a stand-in bot) or the winner left standing after one.
  afterSeats.forEach((a, id) => {
    const b = beforeSeats.get(id);
    if (!b || b.hasFinished || !a.hasFinished) return;
    if (!seatCards(a).length) return;
    if (a.isBot) return;
    const others = [...afterSeats.values()].filter((s) => s.id !== id);
    const othersDone = others.every((s) => s.hasFinished);
    // The last one left is the ShitHead: finished last, still holding cards.
    const lastStanding = othersDone && others.some((s) => !seatCards(s).length && !s.isBot) && Number(a.finishRank) === afterSeats.size;
    const byConcession = othersDone && others.some((s) => s.isBot && seatCards(s).length);
    if (!lastStanding && !byConcession) add('finished-with-cards', true, `finished #${a.finishRank} holding ${seatCards(a).length} cards`, id);
  });

  return findings;
}

module.exports = { auditTransition, pileBurns, locate, TIMEOUT_GRACE_MS, AWAY_BEFORE_BOT_MS };
