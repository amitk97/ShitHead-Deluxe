// House Rules behaviour helpers used by the in-game Card Powers reference UI.
// Static reference data lives in card-reference-data.js; rendering stays in index.html.
// No Mercy changes Q, K and the Joker (and the 4's answer to it).
const NO_MERCY_LABEL = { Q: 'X-Ray', K: 'Takes Bottom', A: 'Everyone Takes' };
const NO_MERCY_TEXT = {
  Q: 'No Mercy: a high card that X-rays the next player. You see one of their hand cards you have not seen yet, per Queen.',
  K: 'No Mercy: the next player takes a card from the bottom of the Pile per King. It stops at a King, and a King at the bottom cannot be taken.',
  A: 'No Mercy: the highest card. Every opponent in turn order takes one card from the bottom of the Pile. It stops at an Ace, and an Ace at the bottom cannot be taken.',
  '4': 'The weakest card. It can only be played on a 2, 3, 4, 6 or 7. In No Mercy a Joker cannot be played on it.',
  JOKER: 'Choose a player to pick up the whole Pile. In No Mercy it cannot be played on a 4.'
};
function cardReferenceLabel(rank) {
  if (isNoMercy() && NO_MERCY_LABEL[rank]) return NO_MERCY_LABEL[rank];
  if (!isHouseRulesMatch()) return (CARD_REFERENCE.find(([r]) => r === rank) || [])[1] || '';
  const power = housePower(rank);
  return power === 'off' ? 'Off' : (ShHouseRules.LABEL[power] || power || 'No Power');
}
function cardReferenceText(rank) {
  if (isNoMercy() && NO_MERCY_TEXT[rank]) return NO_MERCY_TEXT[rank];
  if (!isHouseRulesMatch()) return CARD_HOLD_TEXT[rank] || '';
  return HOUSE_POWER_TEXT[housePower(rank)] || 'Normal rank rules apply.';
}
function referencePowerIconSvg(rank, cls, style = '') {
  const iconRank = isHouseRulesMatch() ? (HOUSE_POWER_ICON_RANK[housePower(rank)] || rank) : rank;
  return powerIconSvg(iconRank, cls, style);
}

function renderCardReference() {
  const list = document.getElementById('cardRefList');
  if (!list || !cardRefOpen) return;
  const { ranks, zone } = getReferenceAvailableRanks();
  list.innerHTML = '';
  CARD_REFERENCE.forEach(([rank]) => {
    const has = ranks.has(rank);
    const label = cardReferenceLabel(rank);
    const row = document.createElement('div');
    row.className = has ? 'text-slate-200' : 'text-slate-600 opacity-45';
    const name = rank === 'JOKER' ? 'JKR' : rank;
    row.className += ' flex items-center gap-1';
    row.innerHTML = `<span class="${has ? 'text-amber-400' : 'text-slate-600'} font-black w-5 shrink-0">${name}</span>`
      + referencePowerIconSvg(rank, `w-3 h-3 shrink-0 ${has ? 'text-amber-400' : 'text-slate-600'}`)
      + `<span class="opacity-85 whitespace-nowrap">${escapeHtml(label)}</span>`;
    list.appendChild(row);
  });
  const hint = document.getElementById('cardRefHint');
  if (hint) {
    hint.textContent = zone ? 'Bright = Your Cards' : 'Face-down cards stay hidden.';
  }
  positionCardRefPanel({ keep: true });
}
