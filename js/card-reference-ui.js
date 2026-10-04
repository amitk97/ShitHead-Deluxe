// House Rules behaviour helpers used by the in-game Card Powers reference UI.
// Static reference data lives in card-reference-data.js; rendering stays in index.html.
function cardReferenceLabel(rank) {
  if (!isHouseRulesMatch()) return (CARD_REFERENCE.find(([r]) => r === rank) || [])[1] || '';
  const power = housePower(rank);
  return power === 'off' ? 'Off' : (ShHouseRules.LABEL[power] || power || 'No Power');
}
function cardReferenceText(rank) {
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
