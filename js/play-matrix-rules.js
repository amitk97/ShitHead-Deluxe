// Dynamic House Rules legality helper for the Play Matrix.
// Rendering and standard matrix data remain separate.
function houseMatrixLegal(rowRank, colRank) {
  if (!isHouseRulesMatch()) return null;
  if (rowRank === 'JOKER') return state.houseRules.joker !== 'off';
  const rowPower = housePower(rowRank);
  const colPower = housePower(colRank);
  const constraint = deriveHouseConstraint(colPower);
  if (rowPower === 'reset') return constraint !== 'ODD';
  if (rowPower === 'transparent') return constraint !== 'EVEN';
  if (rowPower === 'burn') return constraint !== 'LOW7' && constraint !== 'ODD';
  if (constraint === 'EVEN') return EVENS.includes(rowRank);
  if (constraint === 'ODD') return ODDS.includes(rowRank);
  if (constraint === 'LOW7') return RANK_VALUES[rowRank] <= 7 || ['reset','transparent'].includes(rowPower);
  if (colPower === 'reset' || colPower === 'transparent') return true;
  if (colRank === 'JOKER' && colPower === 'pickUp') return false;
  return RANK_VALUES[rowRank] >= RANK_VALUES[colRank];
}
