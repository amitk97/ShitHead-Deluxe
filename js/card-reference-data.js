// Static data used by the in-game Card Powers reference UI.
// Behaviour intentionally stays in index.html; this file contains data only.
const CARD_REFERENCE = [
  ['2', 'Reset'], ['3', 'Transparent'], ['4', 'Low'], ['5', 'Drop to Base'],
  ['6', 'Evens'], ['7', '7 or Lower'], ['8', 'Skip'], ['9', 'Reverse'],
  ['10', 'Burn'], ['J', 'Odds'], ['Q', 'High'], ['K', 'High'],
  ['A', 'Highest'], ['JOKER', 'Pick Up']
];

const HOUSE_POWER_ICON_RANK = {
  burn:'10', dropBase:'5', evens:'6', none:'Q', odds:'J', pickUp:'JOKER',
  playLower:'7', reset:'2', reverse:'9', skip:'8', transparent:'3', off:'JOKER'
};

const HOUSE_POWER_TEXT = {
  burn:'Burns the whole Pile, then you play again.',
  dropBase:'The next player must beat the card at the bottom of the Pile.',
  evens:'The next player must play an even card.',
  none:'No special power. Normal rank rules apply.',
  odds:'The next player must play an odd card.',
  pickUp:'Makes the next opponent pick up the Pile.',
  playLower:'The next player must play 7 or lower.',
  reset:'Resets the Pile so anything can follow.',
  reverse:'Reverses the direction of play.',
  skip:'Skips the next player.',
  transparent:'See-through: the next player must beat the effective card underneath.',
  off:'This card is removed from House Rules matches.'
};

const CARD_HOLD_TEXT = {
  '2': 'Can be played on anything except a Jack. It resets the Pile, so any card can follow it.',
  '3': 'Can be played on anything except a 6. It is see-through: the next player must beat the card underneath it.',
  '4': 'The weakest card. It can only be played on a 2, 3, 4, 6 or 7.',
  '5': 'The next player must beat the bottom card of the Pile. If it is an 8 or 9, the 5s skip or reverse instead.',
  '6': 'The next player must play an even card.',
  '7': 'The next player must play a 7 or lower, or a Joker.',
  '8': 'Skips the next player. Play more 8s together to skip more players.',
  '9': 'Reverses the direction of play. An even number of 9s keeps it the same.',
  '10': 'Burns the Pile, and then you play again. It cannot be played on a 7 or a Jack.',
  'J': 'The next player must play an odd card.',
  'Q': 'A high card with no special power.',
  'K': 'A high card with no special power. It beats a Queen.',
  'A': 'The highest normal card, with no special power.',
  'JOKER': 'Choose a player to pick up the whole Pile. They can block it with a Joker of their own.'
};
