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
