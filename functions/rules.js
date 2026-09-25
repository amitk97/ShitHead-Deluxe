// COPY of the play-legality rules in index.html (§ Rules engine: RANK_VALUES,
// EVENS, ODDS, getEffectiveTopCard, deriveConstraintFromRank, isPlayLegal),
// used by the Ranked audit. Change both together: a dev test compares them
// on every card × pile × constraint.
'use strict';

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
const RANK_VALUES = {
  '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15, 'JOKER': 99
};
const EVENS = ['2', '4', '6', '8', '10', 'Q', 'A', 'JOKER'];
const ODDS = ['3', '5', '7', '9', 'J', 'K', 'JOKER'];
const DECK_SIZE = SUITS.length * RANKS.length + 2;

function getEffectiveTopCard(pile) {
  if (!pile || pile.length === 0) return null;
  for (let i = pile.length - 1; i >= 0; i--) {
    if (pile[i].rank !== '3') return pile[i];
  }
  return pile[0];
}

function deriveConstraintFromRank(rank) {
  if (rank === '6') return 'EVEN';
  if (rank === '7') return 'LOW7';
  if (rank === 'J') return 'ODD';
  return null;
}

// index.html reads the 5's base override from state; here it is passed in.
function isPlayLegal(card, discardPile, activeConstraint, baseOverrideCard = null) {
  if (card.isJoker) return true;
  let topCard = getEffectiveTopCard(discardPile);
  if (baseOverrideCard) {
    topCard = baseOverrideCard;
    if (!activeConstraint) activeConstraint = deriveConstraintFromRank(topCard.rank);
  }
  if (!topCard) activeConstraint = null;
  if (card.rank === '2') return !(topCard && topCard.rank === 'J');
  if (card.rank === '3') return !(topCard && topCard.rank === '6');
  if (card.rank === '10') return !(topCard && (topCard.rank === '7' || topCard.rank === 'J'));
  if (topCard && topCard.rank === '2') return true;
  if (activeConstraint === 'EVEN') return EVENS.includes(card.rank);
  if (activeConstraint === 'ODD') return ODDS.includes(card.rank);
  if (activeConstraint === 'LOW7') return RANK_VALUES[card.rank] <= 7 || card.rank === '2' || card.rank === '3';
  if (!topCard) return true;
  if (card.rank === '4') {
    return topCard.rank === '2' || topCard.rank === '3' || topCard.rank === '4' || topCard.rank === '6' || topCard.rank === '7';
  }
  return RANK_VALUES[card.rank] >= RANK_VALUES[topCard.rank];
}

// generateDeck numbers the cards c_1..c_54 in SUITS × RANKS order (then the
// two Jokers) BEFORE shuffling, so an id always means the same card.
function canonicalCard(id) {
  const m = /^c_(\d+)$/.exec(String(id || ''));
  if (!m) return null;
  const n = Number(m[1]);
  if (n < 1 || n > DECK_SIZE) return null;
  if (n > SUITS.length * RANKS.length) return { rank: 'JOKER', suit: 'JOKER', isJoker: true };
  return { suit: SUITS[Math.floor((n - 1) / RANKS.length)], rank: RANKS[(n - 1) % RANKS.length], isJoker: false };
}

module.exports = {
  SUITS, RANKS, RANK_VALUES, EVENS, ODDS, DECK_SIZE,
  getEffectiveTopCard, deriveConstraintFromRank, isPlayLegal, canonicalCard
};
