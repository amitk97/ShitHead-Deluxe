// Play Matrix rendering only. Data and House Rules legality live in separate files.
function renderMatrixReference() {
  const table = document.getElementById('matrixRefTable');
  if (!table || !matrixRefOpen) return;
  const { ranks } = getReferenceAvailableRanks();
  const colLabel = (r) => (r === 'JOKER' ? 'JKR' : r);
  let html = '<thead><tr>';
  html += '<th style="padding:1px 4px 1px 1px;" class="text-slate-500 font-bold text-left">&#9660;/&#9658;</th>';
  PLAY_MATRIX_RANKS.forEach((col) => {
    html += `<th style="padding:1px 3px;" class="text-amber-400 font-black text-center">${colLabel(col)}</th>`;
  });
  html += '</tr></thead><tbody>';
  PLAY_MATRIX_RANKS.forEach((row) => {
    const rowData = isHouseRulesMatch()
      ? PLAY_MATRIX_RANKS.map((col) => houseMatrixLegal(row, col) ? 1 : 0)
      : PLAY_MATRIX[row];
    if (!rowData) return; // Defensive: validatePlayMatrix() already
    // guarantees this can't happen, but a render function should never
    // throw on bad data — it should just skip the broken row.
    const owns = ranks.has(row);
    html += '<tr>';
    html += `<th style="padding:1px 4px 1px 1px;" class="text-left font-black ${owns ? 'text-amber-400' : 'text-slate-500'}">${colLabel(row)}</th>`;
    rowData.forEach((legal) => {
      html += `<td style="padding:1px 3px;" class="text-center font-black ${legal ? 'text-emerald-400' : 'text-rose-500'}">${legal ? '✓' : '✗'}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody>';
  table.innerHTML = html;
  positionMatrixRefPanel({ keep: true });
}
