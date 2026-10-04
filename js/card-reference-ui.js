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
