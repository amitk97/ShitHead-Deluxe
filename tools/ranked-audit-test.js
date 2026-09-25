// Unit tests for the Ranked audit (functions/ranked-audit.js): honest moves
// give no findings, every kind of tampering is caught.
//   node tools/ranked-audit-test.js
'use strict';
const { auditTransition } = require('../functions/ranked-audit');
const { canonicalCard } = require('../functions/rules');

let pass = 0, failN = 0;
const ok = (c, label, extra) => { if (c) { pass++; } else { failN++; console.log('FAIL', label, extra === undefined ? '' : JSON.stringify(extra)); } };
const clone = (v) => JSON.parse(JSON.stringify(v));

// Card by rank: the first unused id with that rank.
const used = new Set();
function card(rank) {
  for (let n = 1; n <= 54; n++) {
    const id = `c_${n}`;
    const c = canonicalCard(id);
    if (!used.has(id) && c.rank === rank) { used.add(id); return { id, rank: c.rank, suit: c.suit, isJoker: c.isJoker }; }
  }
  throw new Error(`no ${rank} left`);
}
function room() {
  used.clear();
  return {
    isRanked: true, phase: 'PLAY', matchId: 'm1', currentTurnIndex: 0, direction: 1, turnDeadline: 100000, stateVersion: 5,
    discardPile: [card('5')],
    drawPile: [card('9'), card('Q')],
    players: [
      { id: 'p_host', uid: 'alice', name: 'Alice', hand: [card('7'), card('7'), card('K')], faceUp: [card('A'), card('JOKER')], faceDown: [card('3'), card('4')] },
      { id: 'p_room1', uid: 'bob', name: 'Bob', hand: [card('6'), card('8'), card('2')], faceUp: [card('10')], faceDown: [card('J'), card('Q')] }
    ]
  };
}
const release = (cards) => cards.forEach(c => used.delete(c.id));
const kinds = (f) => f.map(x => x.kind);
const hard = (f) => f.filter(x => x.hard).map(x => x.kind);
const ctx = (uid, now = 1000, extra = {}) => ({ uid, now, seen: {}, left: {}, ...extra });
const play = (r, seatIdx, ids) => {
  const seat = r.players[seatIdx];
  const moved = [];
  ['hand', 'faceUp', 'faceDown'].forEach(z => { seat[z] = seat[z].filter(c => { if (ids.includes(c.id)) { moved.push(c); return false; } return true; }); });
  r.discardPile.push(...moved);
  r.currentTurnIndex = 1 - seatIdx;
  r.stateVersion++;
  return r;
};

// --- honest moves ---
let b = room(), a = play(clone(b), 0, [b.players[0].hand[0].id, b.players[0].hand[1].id]);
a.players[0].hand.push(a.drawPile.pop(), a.drawPile.pop());
ok(auditTransition(b, a, ctx('alice')).length === 0, 'two 7s on a 5 + refill is clean', auditTransition(b, a, ctx('alice')));

b = room(); b.currentTurnIndex = 1; a = clone(b);
a.players[1].hand.push(...a.discardPile); a.discardPile = []; a.currentTurnIndex = 0;
ok(auditTransition(b, a, ctx('bob')).length === 0, 'picking up the pile yourself is clean');

b = room(); b.currentTurnIndex = 1; b.turnDeadline = 1000; a = clone(b);
a.players[1].hand.push(...a.discardPile); a.discardPile = []; a.currentTurnIndex = 0;
ok(auditTransition(b, a, ctx('alice', 1500)).length === 0, 'opponent auto-picks up for you after your deadline');

b = room(); b.currentTurnIndex = 1; a = play(clone(b), 1, [b.players[1].faceUp[0].id]);
b.players[1].hand = []; a.players[1].hand = []; b.drawPile = []; a.drawPile = [];
a = clone(a); a.discardPile = []; // the 10 burns the pile in the same write
ok(hard(auditTransition(b, a, ctx('bob'))).length === 0, 'a 10 burning the pile is clean', auditTransition(b, a, ctx('bob')));

b = room(); b.discardPile.push(card('10')); a = clone(b); a.discardPile = [];
ok(auditTransition(b, a, ctx('alice')).length === 0, 'clearing a pile topped by a 10 is clean');

b = room(); release(b.players[1].hand); release(b.discardPile); b.players[1].hand = [card('8'), card('8'), card('8')]; b.discardPile = [card('8')]; b.currentTurnIndex = 0;
a = clone(b); a.discardPile.push(...a.players[1].hand); a.players[1].hand = [];
ok(auditTransition(b, a, ctx('bob')).length === 0, 'a snap (completing four 8s out of turn) is clean', auditTransition(b, a, ctx('bob')));

// Joker duel: Alice plays her Joker (face-up, hand empty), Bob picks up.
b = room(); b.players[0].hand = []; b.drawPile = [];
a = clone(b); const joker = a.players[0].faceUp.find(c => c.isJoker);
a.players[0].faceUp = a.players[0].faceUp.filter(c => !c.isJoker);
a.players[1].hand.push(...a.discardPile); a.discardPile = [];
ok(hard(auditTransition(b, a, ctx('alice'))).length === 0, 'a Joker duel (initiator makes the target pick up) is clean', auditTransition(b, a, ctx('alice')));

b = room(); b.players[1].hand = []; b.players[1].faceUp = []; b.players[1].faceDown = [card('4')]; b.currentTurnIndex = 1;
b.discardPile = [card('K')]; a = clone(b); a.discardPile.push(a.players[1].faceDown.pop());
ok(hard(auditTransition(b, a, ctx('bob'))).length === 0, 'a blind flip that fails is not an illegal play');

b = room(); b.players[0].hand = [card('K')]; b.players[0].faceUp = []; b.players[0].faceDown = []; b.drawPile = [];
a = play(clone(b), 0, [b.players[0].hand[0].id]); a.players[0].hasFinished = true; a.players[0].finishRank = 1;
a.players[1].hasFinished = true; a.players[1].finishRank = 2; a.phase = 'FINISHED';
ok(auditTransition(b, a, ctx('alice')).length === 0, 'winning with your last card is clean', auditTransition(b, a, ctx('alice')));

// Ranked concession: Bob's seat is a stand-in bot, he concedes; Alice wins holding cards.
b = room(); b.players[1].isBot = true; a = clone(b);
a.players[1].hasFinished = true; a.players[1].finishRank = 2; a.players[0].hasFinished = true; a.players[0].finishRank = 1; a.phase = 'FINISHED';
ok(auditTransition(b, a, ctx('alice')).length === 0, 'a Ranked concession is clean');

b = room(); b.phase = 'SWAP'; a = clone(b);
[a.players[0].hand[0], a.players[0].faceUp[0]] = [a.players[0].faceUp[0], a.players[0].hand[0]];
ok(auditTransition(b, a, ctx('alice')).length === 0, 'swapping your own cards is clean');

b = room(); a = clone(b); a.presence = { p_host: { status: 'connected' } }; a.lastEmote = { e: '😂' };
ok(auditTransition(b, a, ctx('mallory')).length === 0, 'writes that change no game state are ignored');

// --- tampering ---
b = room(); a = play(clone(b), 0, [b.players[0].hand[2].id]); // K on a 5 is fine...
b.activeConstraint = 'LOW7'; // ...but not under a 7-or-lower
ok(hard(auditTransition(b, a, ctx('alice'))).includes('illegal-play'), 'illegal play caught');

b = room(); a = play(clone(b), 0, [b.players[0].hand[0].id, b.players[0].hand[2].id]);
ok(hard(auditTransition(b, a, ctx('alice'))).includes('mixed-play'), 'playing two ranks at once caught');

b = room(); b.currentTurnIndex = 1; a = play(clone(b), 1, [b.players[1].hand[1].id]);
ok(hard(auditTransition(b, a, ctx('alice'))).includes('moved-by-other'), "playing someone else's card caught");

b = room(); a = clone(b); a.players[1].hand.push(...a.discardPile); a.discardPile = [];
ok(hard(auditTransition(b, a, ctx('alice'))).includes('pushed-cards'), 'forcing a pickup on someone caught');

b = room(); a = clone(b); a.players[0].hand = [];
ok(hard(auditTransition(b, a, ctx('alice'))).includes('vanished'), 'deleting your own cards caught');

b = room(); a = clone(b); a.players[0].hand[2] = { ...a.players[0].hand[2], rank: '2' };
ok(hard(auditTransition(b, a, ctx('alice'))).includes('bad-card'), 'relabelling a card caught');

b = room(); a = clone(b); a.players[0].hand.push({ id: 'c_99', rank: 'A', suit: '♠' });
ok(hard(auditTransition(b, a, ctx('alice'))).includes('bad-card'), 'an invented card caught');

b = room(); a = clone(b); a.players[0].hasFinished = true; a.players[0].finishRank = 1; a.phase = 'FINISHED';
ok(hard(auditTransition(b, a, ctx('alice'))).includes('finished-with-cards'), 'crowning yourself while holding cards caught');

b = room(); a = clone(b); a.players[1].isBot = true;
ok(hard(auditTransition(b, a, ctx('alice', 50000, { seen: { bob: 45000 } }))).includes('seat-hijack'), 'turning an active player into a bot caught');
ok(!hard(auditTransition(b, a, ctx('alice', 100000, { seen: { bob: 45000 } }))).includes('seat-hijack'), '...but fine when they really were away');

b = room(); a = play(clone(b), 0, [b.players[0].hand[2].id]);
ok(hard(auditTransition(b, a, ctx('mallory'))).includes('outsider-write'), 'a write by someone not at the table caught');

b = room(); b.phase = 'SWAP'; a = clone(b); a.players[0].hand[0] = a.drawPile.pop();
ok(hard(auditTransition(b, a, ctx('alice'))).includes('swap-changed-cards'), 'swapping in a Deck card caught');

b = room(); b.currentTurnIndex = 1; a = play(clone(b), 0, [b.players[0].hand[2].id]);
ok(kinds(auditTransition(b, a, ctx('alice'))).includes('out-of-turn'), 'playing on the other player\'s turn flagged');

// --- the deal comes from the server (economy rankedDeal) ---
function dealFrom(deal, seats) {
  const deck = deal.deck.map(id => ({ id, ...canonicalCard(id) }));
  const players = deal.order.map(uid => {
    const seat = seats.find(s => s.uid === uid);
    return { ...seat, hand: deck.splice(0, 3), faceUp: deck.splice(0, 3), faceDown: deck.splice(0, 3) };
  });
  return { isRanked: true, phase: 'SWAP', matchId: deal.matchId, players, drawPile: deck, discardPile: [], currentTurnIndex: 0 };
}
const serverDeal = { matchId: 'm2', order: ['bob', 'alice'], deck: Array.from({ length: 54 }, (_, i) => `c_${54 - i}`) };
const lobbySeats = [{ id: 'p_host', uid: 'alice', name: 'Alice' }, { id: 'p_room1', uid: 'bob', name: 'Bob' }];
const lobby = { isRanked: true, phase: 'LOBBY', matchId: 'm1', players: lobbySeats };
a = dealFrom(serverDeal, lobbySeats);
ok(auditTransition(lobby, a, ctx('alice', 1000, { deal: serverDeal })).length === 0, "dealing the server's deck is clean", auditTransition(lobby, a, ctx('alice', 1000, { deal: serverDeal })));
ok(hard(auditTransition(lobby, a, ctx('alice'))).includes('no-server-deal'), 'a Ranked deal without the server deck caught');
a = dealFrom(serverDeal, lobbySeats); [a.players[1].hand[0], a.drawPile[0]] = [a.drawPile[0], a.players[1].hand[0]];
ok(hard(auditTransition(lobby, a, ctx('alice', 1000, { deal: serverDeal }))).includes('rigged-deal'), 'swapping a Deck card into your deal caught');
a = dealFrom(serverDeal, lobbySeats); a.players.reverse();
ok(hard(auditTransition(lobby, a, ctx('alice', 1000, { deal: serverDeal }))).includes('rigged-deal'), 'changing who goes first caught');

console.log(`\n${pass} passed, ${failN} failed`);
process.exit(failN ? 1 : 0);
