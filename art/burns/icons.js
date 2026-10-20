/* Burn tile pictures drawn as SVG (no emoji): one shared look, a dark lit scene with a playing card that the
 * effect is destroying. ShBurnIcons.html(id) returns an <svg> that fills its tile; ShBurnIcons.has(id). */
(function () {
  'use strict';
  let seq = 0;
  const f = (n) => Math.round(n * 10) / 10;
  const spade = (x, y, s, c) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0-10C6-3 10 1 10 5C10 9 6 10 3 8C4 12 5 14 7 15H-7C-5 14-4 12-3 8C-6 10-10 9-10 5C-10 1-6-3 0-10Z" fill="${c}"/>`;
  // A playing card (centre x,y, rotation, scale). `tint` recolours it (frozen, marble...), `burn` chars the lower edge.
  const card = (x, y, r, s, o = {}) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><rect x="-13" y="-18" width="26" height="36" rx="3" fill="${o.body || '#f6efe1'}" stroke="${o.edge || 'rgba(0,0,0,.45)'}" stroke-width=".9"/>${spade(0, 1.5, .95, o.pip || '#1b1b26')}${spade(-8.2, -12.2, .3, o.pip || '#1b1b26')}<rect x="-13" y="-18" width="26" height="36" rx="3" fill="none" stroke="rgba(255,255,255,.55)" stroke-width=".5"/>${o.extra || ''}</g>`;
  const dots = (arr, col, r = 1) => arr.map(([x, y, s = 1]) => `<circle cx="${x}" cy="${y}" r="${f(r * s)}" fill="${col}"/>`).join('');
  const wrap = (body, defs, bg) => { const id = 'bi' + (++seq); return `<svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style="display:block;border-radius:inherit"><defs>${defs(id)}</defs><rect width="100" height="100" fill="url(#${id}b)"/>${body(id)}</svg>`.replace(/__BG__/g, bg || ''); };
  const radial = (id, name, stops, cx = 50, cy = 50, r = 60) => `<radialGradient id="${id}${name}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</radialGradient>`;
  const linear = (id, name, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) => `<linearGradient id="${id}${name}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;

  const ICONS = {
    'burn-lava': () => wrap((i) => `
      <ellipse cx="50" cy="84" rx="60" ry="20" fill="url(#${i}l)"/>
      <path d="M-5 82C10 74 22 80 34 76S58 80 70 74 92 78 105 74V105H-5Z" fill="url(#${i}l)"/>
      <path d="M8 88L30 83M44 92L68 84M60 80L90 86M20 96L48 90" stroke="#fff1a8" stroke-width="1.4" stroke-linecap="round" opacity=".85"/>
      ${card(50, 38, -8, 1.45, { body: '#f3e7d2', extra: '<path d="M-13 9L-5 5L0 11L6 4L13 8V18H-13Z" fill="#1a0b08"/><path d="M-13 9L-5 5L0 11L6 4L13 8" fill="none" stroke="#ff9a2e" stroke-width="1.4"/>' })}
      <path d="M4 72L16 62L26 70L22 84L6 84Z" fill="#231411" stroke="#ff6a1f" stroke-width="1"/><path d="M76 70L88 60L98 72L94 86L78 86Z" fill="#231411" stroke="#ff6a1f" stroke-width="1"/>
      ${dots([[22, 24, 1.3], [80, 20, 1], [12, 40, .8], [90, 38, 1.2], [66, 10, .8], [36, 12, .9]], '#ffb347', 1.6)}`,
      (i) => radial(i, 'b', [[0, '#5a1708'], [.6, '#220a06'], [1, '#080303']], 50, 80, 90) + linear(i, 'l', [[0, '#fff2a6'], [.3, '#ffb028'], [.7, '#e2410a'], [1, '#7a1405']])),
    'burn-sweets': () => wrap((i) => `
      ${card(50, 50, -12, 1.3, { extra: '<path d="M-13 14L-4 11L2 17L9 11L13 15V18H-13Z" fill="#d94a8c" opacity=".9"/>' })}
      <g transform="translate(24 26)"><circle r="13" fill="#fff"/><path d="M0 0m-13 0a13 13 0 0 1 26 0" fill="none"/><g stroke="#e53e5a" stroke-width="3.6" fill="none"><path d="M-12 0A12 12 0 0 1 12 0M-8 0A8 8 0 0 1 8 0M-4 0A4 4 0 0 1 4 0" transform="rotate(-30)"/></g><circle r="13" fill="none" stroke="#fff" stroke-width="1.4"/><rect x="-1.6" y="12" width="3.2" height="22" rx="1.6" fill="#f4e7d3" transform="rotate(-8 0 12)"/></g>
      <g transform="translate(76 70) rotate(18)"><ellipse rx="12" ry="7.5" fill="#35b36a"/><path d="M-10 -5L-17 -9L-16 0L-17 9L-10 5Z M10 -5L17 -9L16 0L17 9L10 5Z" fill="#7fe0a1"/><path d="M-6 -6L-2 6M2 -6L6 6" stroke="#e9ffe9" stroke-width="2" opacity=".8"/></g>
      <g transform="translate(78 24)"><path d="M0-10C9-10 12-2 10 4L-10 4C-12-2-9-10 0-10Z" fill="#8b5cf6"/><path d="M-10 4H10L8 10H-8Z" fill="#a78bfa"/><ellipse cx="-3" cy="-5" rx="3" ry="2" fill="#fff" opacity=".6"/></g>
      <g transform="translate(22 76)"><path d="M0-10C9-10 12-2 10 4L-10 4C-12-2-9-10 0-10Z" fill="#fb923c"/><path d="M-10 4H10L8 10H-8Z" fill="#fdba74"/><ellipse cx="-3" cy="-5" rx="3" ry="2" fill="#fff" opacity=".6"/></g>
      <path d="M48 12l4 3M60 88l-3 4M90 48l4-2M8 54l4 2" stroke="#fde047" stroke-width="2.4" stroke-linecap="round"/>
      ${dots([[40, 14, 1], [88, 88, 1], [10, 92, .8], [94, 12, .9]], '#f472b6', 2)}`,
      (i) => radial(i, 'b', [[0, '#5b1d4f'], [1, '#1a0a22']], 50, 50, 70)),
    'burn-origami': () => wrap((i) => `
      <ellipse cx="50" cy="88" rx="38" ry="5" fill="#000" opacity=".35"/>
      ${card(26, 66, -24, .8, { body: '#f3e8d2' })}
      <path d="M14 58L44 50L58 62L44 78Z" fill="#e9dcc0"/>
      <path d="M14 58L44 50L44 78Z" fill="#fff9ec"/><path d="M44 50L58 62L44 78Z" fill="#cdbb96"/>
      <path d="M58 62L68 52L74 30L82 24L80 32L78 52L70 72L56 80L44 78Z" fill="#f6ecd6"/>
      <path d="M58 62L68 52L70 72Z" fill="#d9c8a4"/><path d="M68 52L74 30L78 52Z" fill="#fffdf5"/><path d="M74 30L82 24L80 32Z" fill="#e0cfa9"/>
      <path d="M82 24L92 28L80 32Z" fill="#f2a43a"/>
      <path d="M40 54L52 24L66 58Z" fill="#fff9ec"/><path d="M52 24L66 58L56 60Z" fill="#d8c7a2"/><path d="M40 54L52 24L48 56Z" fill="#efe2c6"/>
      <circle cx="79" cy="27" r="1" fill="#2a1a0c"/>
      <path d="M62 14l8 -4l-3 9zM88 50l9 2l-6 6zM10 40l8 -3l-2 8zM84 80l9 -2l-3 7z" fill="#f3e6cb"/>
      ${dots([[70, 12, 1], [90, 66, .8], [16, 84, 1], [34, 14, .7]], '#ffd98a', 1.5)}`,
      (i) => radial(i, 'b', [[0, '#6b3d1c'], [.55, '#2a160b'], [1, '#0c0705']], 50, 55, 80)),
    'burn-ice': () => wrap((i) => `
      <path d="M50 10L58 36L84 30L66 50L90 64L62 66L58 92L46 68L16 80L34 54L10 36L40 38Z" fill="url(#${i}s)" opacity=".95"/>
      <path d="M50 10L58 36L50 50L40 38Z" fill="#e8fbff"/><path d="M84 30L66 50L58 36Z" fill="#9ee0f7"/><path d="M90 64L62 66L66 50Z" fill="#7cc8e6"/><path d="M58 92L46 68L62 66Z" fill="#bff0ff"/><path d="M16 80L34 54L46 68Z" fill="#8fd3ee"/><path d="M10 36L40 38L34 54Z" fill="#c9f2ff"/>
      ${card(50, 50, 10, 1.05, { body: '#bfe9fb', pip: '#12384f', edge: '#e9fbff' })}
      <path d="M44 38L50 50L42 58M50 50L60 56" stroke="#fff" stroke-width="1.3" fill="none" opacity=".9"/>
      ${[[22, 22], [80, 18], [88, 52], [18, 66], [72, 84], [36, 88]].map(([x, y]) => `<path d="M${x} ${y - 4}L${x + 1.2} ${y - 1.2}L${x + 4} ${y}L${x + 1.2} ${y + 1.2}L${x} ${y + 4}L${x - 1.2} ${y + 1.2}L${x - 4} ${y}L${x - 1.2} ${y - 1.2}Z" fill="#fff"/>`).join('')}`,
      (i) => radial(i, 'b', [[0, '#1e6fa3'], [.6, '#0b2f55'], [1, '#04101f']], 50, 50, 75) + linear(i, 's', [[0, '#e8fbff'], [1, '#56b6df']])),
    'burn-paint': () => wrap((i) => `
      ${card(50, 50, -6, 1.45, { body: '#f6efe1' })}
      <path d="M22 18C30 10 42 12 42 22C50 22 54 32 46 38C54 46 46 54 38 50C34 58 22 56 24 46C14 44 14 30 22 18Z" fill="#ef4444" opacity=".95"/>
      <path d="M58 40C66 32 80 36 78 46C86 54 78 64 68 62C62 70 50 66 52 58C46 54 50 44 58 40Z" fill="#3b82f6" opacity=".95"/>
      <path d="M26 62C32 58 42 62 40 70C44 78 36 84 28 80C20 82 16 70 26 62Z" fill="#facc15" opacity=".95"/>
      <path d="M62 70C70 66 80 72 76 80C78 88 66 90 62 84C54 84 54 74 62 70Z" fill="#22c55e" opacity=".95"/>
      <rect x="26" y="78" width="3.4" height="12" rx="1.7" fill="#facc15"/><rect x="64" y="84" width="3.4" height="10" rx="1.7" fill="#22c55e"/><rect x="58" y="58" width="3.4" height="9" rx="1.7" fill="#3b82f6"/>
      ${dots([[12, 14, 1.4], [88, 14, 1.1], [92, 56, 1.2], [8, 52, 1.2], [50, 92, .9], [90, 88, 1]], '#f472b6', 2)}${dots([[78, 8, 1], [6, 36, 1]], '#38bdf8', 2)}`,
      (i) => radial(i, 'b', [[0, '#3a2257'], [1, '#120a22']], 50, 50, 70)),
    'burn-smoke': () => wrap((i) => `
      <circle cx="26" cy="46" r="17" fill="url(#${i}c)"/><circle cx="50" cy="26" r="20" fill="url(#${i}c)"/><circle cx="76" cy="40" r="18" fill="url(#${i}c)"/><circle cx="84" cy="66" r="13" fill="url(#${i}c)"/><circle cx="18" cy="70" r="13" fill="url(#${i}c)"/>
      <circle cx="36" cy="14" r="10" fill="url(#${i}c)" opacity=".9"/><circle cx="70" cy="14" r="9" fill="url(#${i}c)" opacity=".8"/>
      ${card(50, 58, -8, 1.3, { body: '#e9e2d3', extra: '<path d="M-13 11L-6 8L0 13L7 7L13 11V18H-13Z" fill="#2a2a30"/>' })}
      <circle cx="30" cy="80" r="14" fill="url(#${i}c)" opacity=".95"/><circle cx="66" cy="82" r="15" fill="url(#${i}c)" opacity=".95"/>
      <path d="M24 90C40 84 60 84 78 90" stroke="#ff7a2e" stroke-width="3" fill="none" stroke-linecap="round" opacity=".85"/>
      ${dots([[20, 92, 1], [34, 96, .8], [60, 94, 1], [80, 94, .9]], '#ff8f3c', 1.6)}`,
      (i) => radial(i, 'b', [[0, '#3a3d46'], [1, '#101116']], 50, 55, 80) + radial(i, 'c', [[0, '#f1f1f4'], [.6, '#a9acb8'], [1, '#5a5d6a']], 50, 50, 22).replace('userSpaceOnUse', 'objectBoundingBox').replace(/cx="[^"]+" cy="[^"]+" r="[^"]+"/, 'cx=".38" cy=".34" r=".75"')),
    'burn-blackhole': () => wrap((i) => `
      <ellipse cx="50" cy="52" rx="44" ry="15" fill="url(#${i}d)" opacity=".9" transform="rotate(-14 50 52)"/>
      <ellipse cx="50" cy="52" rx="34" ry="10.5" fill="none" stroke="#ffd08a" stroke-width="1.6" opacity=".8" transform="rotate(-14 50 52)"/>
      <ellipse cx="50" cy="52" rx="24" ry="7" fill="#000" transform="rotate(-14 50 52)"/>
      <circle cx="50" cy="50" r="13" fill="#000"/><circle cx="50" cy="50" r="13" fill="none" stroke="#fff3d0" stroke-width="1.2" opacity=".9"/>
      <g opacity=".95"><path d="M70 22C60 30 56 40 52 46L56 48C60 42 66 34 76 28Z" fill="#f6efe1"/>${spade(66, 28, .35, '#1b1b26')}</g>
      <path d="M22 70C30 62 40 58 46 54" stroke="#f6efe1" stroke-width="3.6" stroke-linecap="round" opacity=".35"/>
      ${dots([[16, 20, 1], [86, 80, 1.2], [12, 84, .8], [90, 24, .9], [30, 12, .7], [78, 12, .8]], '#e9d5ff', 1.4)}`,
      (i) => radial(i, 'b', [[0, '#2a1050'], [.6, '#10061f'], [1, '#030108']], 50, 50, 75) + linear(i, 'd', [[0, '#ff9a2e'], [.5, '#b44cff'], [1, '#3b1a8a']], 0, 0, 1, 0)),
    'burn-pixel': () => wrap((i) => {
      const spadeRows = ['...X...', '..XXX..', '.XXXXX.', 'XXXXXXX', 'XXXXXXX', '.X.X.X.', '...X...', '..XXX..'];
      const cells = []; spadeRows.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'X') cells.push([x, y]); }));
      const cols = ['#f6efe1', '#f6efe1', '#ffffff', '#e8dcc4'];
      return `<rect x="14" y="8" width="72" height="84" rx="6" fill="#241247" stroke="#a78bfa" stroke-width="1.2" opacity=".6"/>
      ${cells.map(([x, y], k) => `<rect x="${f(x * 9.8 + 15.6)}" y="${f(y * 9.8 + 9)}" width="9" height="9" fill="${cols[k % 4]}"/>`).join('')}
      ${[[4, 10, '#facc15'], [88, 8, '#38bdf8'], [92, 44, '#f472b6'], [4, 56, '#a3e635'], [86, 84, '#fb923c'], [10, 86, '#38bdf8'], [46, 92, '#f472b6'], [70, 2, '#a3e635'], [2, 30, '#f472b6'], [94, 70, '#facc15']].map(([x, y, c]) => `<rect x="${x}" y="${y}" width="6" height="6" fill="${c}"/>`).join('')}
      ${[[90, 26], [6, 74], [78, 94], [28, 96], [20, 4]].map(([x, y]) => `<rect x="${x}" y="${y}" width="3" height="3" fill="#fff"/>`).join('')}`;
    }, (i) => radial(i, 'b', [[0, '#3b1a6e'], [1, '#12082a']], 50, 50, 70)),
    // ---- Season Pass burns
    'burn-ss2611-sandstorm': () => wrap((i) => `
      <path d="M6 22C30 12 70 12 94 22C84 30 66 34 60 44C58 54 56 64 52 78H48C44 64 42 54 40 44C34 34 16 30 6 22Z" fill="url(#${i}t)" opacity=".92"/>
      ${[[50, 22, 40, 7], [50, 34, 30, 6], [50, 46, 22, 5], [50, 58, 15, 4], [50, 70, 9, 3]].map(([x, y, rx, ry], k) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="none" stroke="${k % 2 ? '#fff0c2' : '#8a5a1c'}" stroke-width="1.6" opacity=".7"/>`).join('')}
      ${card(50, 82, -20, .9, { body: '#f0e2c4' })}
      <ellipse cx="50" cy="94" rx="46" ry="6" fill="#d9a441" opacity=".55"/>
      ${dots([[12, 40, 1.2], [88, 36, 1], [20, 62, .9], [82, 62, 1.1], [30, 14, .8], [72, 12, .9], [10, 80, 1], [92, 84, .8]], '#f3c46a', 1.8)}
      <path d="M-4 52C18 46 28 56 44 50M100 48C84 44 74 56 60 50" stroke="#f7d48a" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".6"/>`,
      (i) => radial(i, 'b', [[0, '#b9731f'], [.55, '#5a2f10'], [1, '#1c0d06']], 50, 40, 85) + linear(i, 't', [[0, '#f4c867'], [1, '#a8651a']])),
    'burn-ss2701-glacier': () => wrap((i) => `
      <path d="M22 18L58 10L82 30L88 70L62 90L26 84L12 52Z" fill="url(#${i}i)" opacity=".92"/>
      <path d="M22 18L58 10L50 40Z" fill="#e8fbff" opacity=".85"/><path d="M58 10L82 30L50 40Z" fill="#b8ecfb" opacity=".8"/><path d="M82 30L88 70L50 40Z" fill="#7fd0ee" opacity=".7"/><path d="M12 52L22 18L50 40Z" fill="#a7e3f8" opacity=".75"/><path d="M26 84L12 52L50 40Z" fill="#8fd9f2" opacity=".6"/>
      ${card(50, 50, -6, 1.05, { body: '#cdeefb', pip: '#12384f', edge: '#fff' })}
      <path d="M36 30L48 46L42 62M48 46L66 52M58 36L62 48" stroke="#fff" stroke-width="1.3" fill="none" opacity=".9"/>
      <path d="M2 88C20 80 34 90 50 84S80 82 98 90V100H2Z" fill="#e8fbff" opacity=".55"/>
      ${[[14, 18], [86, 14], [92, 56], [10, 70], [78, 88]].map(([x, y]) => `<path d="M${x} ${y - 4}L${x + 1.2} ${y - 1.2}L${x + 4} ${y}L${x + 1.2} ${y + 1.2}L${x} ${y + 4}L${x - 1.2} ${y + 1.2}L${x - 4} ${y}L${x - 1.2} ${y - 1.2}Z" fill="#fff"/>`).join('')}`,
      (i) => radial(i, 'b', [[0, '#1b5f93'], [.6, '#0a2a4d'], [1, '#040d1b']], 50, 40, 80) + linear(i, 'i', [[0, '#bdeeff'], [1, '#3a9cc7']], 0, 0, 1, 1)),
    'burn-ss2703-shuriken': () => wrap((i) => `
      ${card(46, 54, -10, 1.2, { body: '#f6efe1', extra: '<path d="M-13 -6L13 4" stroke="#fff" stroke-width="2"/><path d="M-13 -6L13 4" stroke="#e11d48" stroke-width=".9"/>' })}
      <path d="M12 76C34 52 58 32 90 20" stroke="#fff" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M12 76C34 52 58 32 90 20" stroke="#e11d48" stroke-width="7" fill="none" stroke-linecap="round" opacity=".35"/>
      ${[[26, 26, 12, 20], [76, 72, 14, -14], [80, 34, 9, 40]].map(([x, y, r, rot]) => `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M0-${r}L${f(r * .3)}-${f(r * .3)}L${r} 0L${f(r * .3)} ${f(r * .3)}L0 ${r}L-${f(r * .3)} ${f(r * .3)}L-${r} 0L-${f(r * .3)}-${f(r * .3)}Z" fill="url(#${i}m)" stroke="#2a3140" stroke-width=".8"/><circle r="${f(r * .2)}" fill="#0b0e14"/></g>`).join('')}
      ${[[16, 14, 22], [60, 12, -30], [88, 56, 50], [30, 84, 10], [58, 88, -40], [10, 46, 70], [92, 86, 20]].map(([x, y, r]) => `<g transform="translate(${x} ${y}) rotate(${r})"><path d="M0 4C5 2 5-4 0-6C-5-4-5 2 0 4Z" fill="#ffb7cf"/><path d="M0 4C1 0 1-2 0-6" stroke="#fff" stroke-width=".4" opacity=".6"/></g>`).join('')}`,
      (i) => radial(i, 'b', [[0, '#7a2b5a'], [.6, '#2d0f33'], [1, '#0e0616']], 50, 50, 80) + linear(i, 'm', [[0, '#eef2f7'], [.5, '#8d98a8'], [1, '#4a5463']], 0, 0, 1, 1)),
    'burn-ss2705-whirlpool': () => wrap((i) => `
      ${[[44, 20], [38, 15], [31, 11], [23, 8], [14, 5]].map(([rx, ry], k) => `<ellipse cx="50" cy="56" rx="${rx}" ry="${ry}" fill="none" stroke="${['#37e5d5', '#8af3e9', '#1fb5b0', '#c4fbf4', '#2dd4c4'][k]}" stroke-width="${f(3.6 - k * .4)}" opacity="${f(.9 - k * .1)}" stroke-dasharray="${f(40 - k * 4)} ${f(10 + k * 3)}" transform="rotate(${-8 + k * 14} 50 56)"/>`).join('')}
      <ellipse cx="50" cy="56" rx="10" ry="3.4" fill="#02121e"/>
      ${card(50, 50, 24, .85, { body: '#bfe6ee', pip: '#0d3a46', edge: '#7fe6df', extra: '<rect x="-13" y="-18" width="26" height="36" rx="3" fill="#0a6a7a" opacity=".35"/>' })}
      ${[[22, 22, 4], [80, 24, 5.4], [88, 70, 3.4], [14, 76, 4.6], [60, 12, 3], [34, 90, 3.6], [72, 88, 4.2]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="rgba(180,255,250,.16)" stroke="#d7fffb" stroke-width=".9"/><circle cx="${f(x - r * .35)}" cy="${f(y - r * .35)}" r="${f(r * .22)}" fill="#fff"/>`).join('')}`,
      (i) => radial(i, 'b', [[0, '#0b5a78'], [.55, '#06283f'], [1, '#020a16']], 50, 56, 80)),
    'burn-ss2707-zeus': () => wrap((i) => `
      <path d="M60 2L44 34L58 36L38 66L52 66L34 98L72 52L56 50L72 30L58 30Z" fill="url(#${i}z)"/><path d="M60 2L44 34L58 36L38 66L52 66L34 98L72 52L56 50L72 30L58 30Z" fill="none" stroke="#fff" stroke-width="1.4"/>
      <circle cx="50" cy="60" r="26" fill="url(#${i}g)" opacity=".8"/>
      ${card(50, 62, 8, 1, { body: '#e7e0cf', pip: '#3a342a', edge: '#b6ab92', extra: '<path d="M-8 -10L-3 -2L-9 6L-4 14M5 -14L2 -4L8 4" stroke="#f5c542" stroke-width="1.1" fill="none"/>' })}
      <path d="M18 70L30 62L34 76L22 82ZM70 76L82 66L88 80L76 88ZM24 40L34 34L36 44L26 48Z" fill="#cfc6b0" stroke="#7d7461" stroke-width=".8"/>
      <path d="M8 44L18 38L14 50L26 46M92 40L84 48L94 52" stroke="#ffe27a" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      ${dots([[14, 14, 1], [86, 12, 1.2], [90, 90, 1], [10, 92, .9]], '#ffd966', 1.6)}`,
      (i) => radial(i, 'b', [[0, '#4a3a2e'], [.6, '#1f1a22'], [1, '#09070e']], 50, 40, 85) + radial(i, 'g', [[0, '#fff3b0'], [1, 'rgba(255,200,60,0)']], 50, 60, 26) + linear(i, 'z', [[0, '#ffffff'], [1, '#ffcb3d']])),
    'burn-coloured': () => wrap((i) => {
      const tongue = (x, h, w, a, g) => `<path transform="translate(${x} 88) rotate(${a})" d="M0 0C${-w} ${-h * .3} ${-w * .6} ${-h * .65} ${-w * .1} ${-h}C${w * .2} ${-h * .6} ${w * 1.1} ${-h * .5} ${w} ${-h * .2}C${w * .9} ${-h * .08} ${w * .4} 0 0 0Z" fill="url(#${i}${g})"/>`;
      return `
      <ellipse cx="50" cy="90" rx="46" ry="9" fill="url(#${i}h)"/>
      ${tongue(14, 52, 9, -12, 'a')}${tongue(86, 56, 9, 12, 'c')}${tongue(30, 70, 11, -6, 'p')}${tongue(70, 66, 11, 6, 'a')}
      ${card(50, 46, 4, 1.35, { body: '#2b1747', pip: '#e9c8ff', edge: '#c084fc', extra: '<path d="M-13 8L-6 3L0 10L6 2L13 7V18H-13Z" fill="#12061f"/><path d="M-13 8L-6 3L0 10L6 2L13 7" fill="none" stroke="#ff7ad9" stroke-width="1.4"/>' })}
      ${tongue(42, 44, 8, -3, 'c')}${tongue(58, 40, 8, 3, 'p')}${tongue(50, 30, 6, 0, 'w')}
      ${dots([[20, 22, 1.2], [80, 18, 1], [10, 50, .9], [92, 46, 1.1], [60, 8, .8], [36, 10, 1]], '#7df0ff', 1.6)}`;
    },
      (i) => radial(i, 'b', [[0, '#3b1070'], [.6, '#16082e'], [1, '#07030f']], 50, 80, 90) + radial(i, 'h', [[0, 'rgba(255,122,217,.55)'], [1, 'rgba(255,122,217,0)']], 50, 90, 46)
        + linear(i, 'a', [[0, '#ffffff'], [.25, '#7df0ff'], [.7, '#6d4bff'], [1, '#3a1a9a']]) + linear(i, 'p', [[0, '#fff'], [.25, '#ff9ae6'], [.7, '#c13bd6'], [1, '#5a1a8a']]) + linear(i, 'c', [[0, '#fff'], [.3, '#8ff7ff'], [.75, '#22b8e6'], [1, '#1a4f9a']]) + linear(i, 'w', [[0, '#fff'], [1, '#ffd6f6']])),
    'burn-electric': () => wrap((i) => {
      const bolt = (pts, w, c) => `<path d="${pts}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
      const main = 'M58 2L44 30L56 32L38 58L50 60L34 96';
      return `
      <circle cx="50" cy="52" r="44" fill="url(#${i}g)"/>
      ${bolt('M2 30L22 36L18 50L38 52', 1.6, '#6fb8ff')}${bolt('M98 24L78 34L84 46L62 54', 1.6, '#6fb8ff')}${bolt('M96 78L76 70L72 84L56 74', 1.4, '#6fb8ff')}${bolt('M4 80L22 72L28 84L42 74', 1.4, '#6fb8ff')}
      ${card(50, 54, -7, 1.3, { body: '#1d2a4a', pip: '#bfe0ff', edge: '#5aa9ff', extra: '<path d="M-13 -4L-5 -9L-1 -2L8 -10L13 -4" fill="none" stroke="#fff" stroke-width=".9" opacity=".8"/>' })}
      ${bolt(main, 7, 'rgba(90,170,255,.45)')}${bolt(main, 3.6, '#7cc2ff')}${bolt(main, 1.5, '#ffffff')}
      <path d="M44 30L30 24M56 32L70 28M38 58L24 60" stroke="#bfe0ff" stroke-width="1.2" stroke-linecap="round"/>
      ${dots([[14, 16, 1.2], [88, 12, 1], [90, 90, 1.1], [10, 92, 1], [74, 52, .8], [24, 44, .8]], '#e8f4ff', 1.5)}
      <path d="M26 92L34 86M70 94L64 88M82 66L90 62" stroke="#ffe27a" stroke-width="2" stroke-linecap="round"/>`;
    },
      (i) => radial(i, 'b', [[0, '#14306e'], [.6, '#0a1233'], [1, '#04060f']], 50, 50, 80) + radial(i, 'g', [[0, 'rgba(110,180,255,.5)'], [1, 'rgba(110,180,255,0)']], 50, 52, 44)),
    'burn-lvl-spark-snap': () => wrap((i) => `
      <circle cx="50" cy="50" r="40" fill="url(#${i}g)"/>
      ${Array.from({ length: 14 }, (_, k) => { const a = k / 14 * Math.PI * 2, r1 = 22, r2 = k % 2 ? 36 : 46; return `<path d="M${f(50 + Math.cos(a) * r1)} ${f(50 + Math.sin(a) * r1)}L${f(50 + Math.cos(a) * r2)} ${f(50 + Math.sin(a) * r2)}" stroke="${k % 2 ? '#ffd45a' : '#fff6c8'}" stroke-width="${k % 2 ? 1.6 : 2.4}" stroke-linecap="round"/>`; }).join('')}
      ${card(50, 50, 14, 1.15, { body: '#f3e7d2', extra: '<path d="M-13 12L-6 8L0 14L7 7L13 11V18H-13Z" fill="#2a1208"/><path d="M-13 12L-6 8L0 14L7 7L13 11" fill="none" stroke="#ffb02e" stroke-width="1.2"/>' })}
      <path d="M50 38L53 47L62 50L53 53L50 62L47 53L38 50L47 47Z" fill="#fff" opacity=".9"/>
      ${dots([[16, 18, 1.3], [86, 16, 1], [90, 80, 1.2], [12, 84, 1], [30, 92, .8], [74, 8, .8]], '#ffc94d', 1.6)}`,
      (i) => radial(i, 'b', [[0, '#4a1c06'], [.6, '#1e0b05'], [1, '#080303']], 50, 50, 75) + radial(i, 'g', [[0, 'rgba(255,200,80,.6)'], [1, 'rgba(255,200,80,0)']], 50, 50, 40)),
    'burn-lvl-smoke-burst': () => wrap((i) => `
      ${[[26, 62, 17], [74, 60, 18], [50, 78, 16], [20, 38, 13], [80, 34, 14], [50, 22, 14]].map(([x, y, r], k) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${i}s)"/><circle cx="${x - r * .3}" cy="${y - r * .35}" r="${f(r * .55)}" fill="#fff" opacity="${k % 2 ? .1 : .16}"/>`).join('')}
      ${card(50, 50, -9, 1.2, { body: '#f3e7d2' })}
      ${[[34, 48, 13], [66, 52, 12], [50, 34, 11], [46, 68, 12]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${i}s)" opacity=".95"/>`).join('')}
      <path d="M14 56L30 52M72 66L90 72M42 14L46 26M60 88L58 78" stroke="#ff7a2e" stroke-width="2.2" stroke-linecap="round"/>
      ${dots([[12, 22, 1], [90, 20, 1.2], [8, 84, 1], [92, 86, 1.1]], '#ff9a4a', 1.5)}`,
      (i) => radial(i, 'b', [[0, '#3a2a28'], [1, '#0e0909']], 50, 50, 70) + radial(i, 's', [[0, '#e9e4e0'], [.7, '#9a928e'], [1, '#5a504e']], 40, 36, 24)),
    'burn-lvl-inferno-sweep': () => wrap((i) => `
      <path d="M-4 70C20 30 60 20 104 30L104 46C64 40 30 56 6 92Z" fill="url(#${i}f)"/>
      <path d="M-4 84C26 50 66 44 104 54L104 64C66 60 34 74 12 100Z" fill="url(#${i}f)" opacity=".7"/>
      <path d="M0 62C26 28 64 22 100 28" fill="none" stroke="#fff4c4" stroke-width="2" stroke-linecap="round"/>
      ${card(58, 54, 10, 1.25, { body: '#f3e7d2', extra: '<path d="M-13 6L-5 1L2 8L8 0L13 5V18H-13Z" fill="#2a0e04"/><path d="M-13 6L-5 1L2 8L8 0L13 5" fill="none" stroke="#ff8a1e" stroke-width="1.3"/>' })}
      <path d="M22 28L30 40M40 14L44 26M80 78L92 74" stroke="#ffd45a" stroke-width="2.4" stroke-linecap="round"/>
      ${dots([[14, 20, 1.2], [90, 18, 1], [88, 90, 1.2], [18, 90, 1], [70, 10, .8]], '#ffb347', 1.6)}`,
      (i) => radial(i, 'b', [[0, '#4a1606'], [1, '#0a0403']], 50, 60, 80) + linear(i, 'f', [[0, '#fff3b0'], [.35, '#ffa826'], [.75, '#e2380c'], [1, '#6a1004']], 0, 0, 1, 1)),
    'burn-lvl-hellfire-spiral': () => wrap((i) => `
      ${[[40, 14], [34, 24], [28, 34], [22, 46], [16, 58], [10, 70]].map(([w, y], k) => `<ellipse cx="50" cy="${y + 8}" rx="${w}" ry="${f(w * .22)}" fill="none" stroke="${k % 2 ? '#ff7a1e' : '#ffc14a'}" stroke-width="${k < 2 ? 3 : 2.4}" opacity="${f(1 - k * .06)}"/>`).join('')}
      <path d="M14 18C40 10 62 24 84 16L72 74C62 84 40 84 28 74Z" fill="url(#${i}f)" opacity=".5"/>
      ${card(50, 52, -6, 1, { body: '#f3e7d2', extra: '<path d="M-13 10L-5 6L1 12L7 5L13 9V18H-13Z" fill="#240a04"/>' })}
      <ellipse cx="50" cy="90" rx="34" ry="7" fill="#1a0a06"/><path d="M22 90L32 82L40 88L52 80L62 88L74 82L80 90Z" fill="#3a1a0e" stroke="#ff6a1f" stroke-width="1"/>
      ${dots([[22, 30, 1.3], [78, 26, 1.2], [14, 60, 1], [88, 56, 1.1], [60, 8, .9], [40, 70, 1]], '#ffb347', 1.5)}`,
      (i) => radial(i, 'b', [[0, '#4a1204'], [.7, '#1a0804'], [1, '#070303']], 50, 50, 75) + linear(i, 'f', [[0, '#ffcf5a'], [1, '#c22a08']])),
    'burn-lvl-royal-incineration': () => wrap((i) => `
      ${Array.from({ length: 11 }, (_, k) => { const a = (-80 + k * 16) * Math.PI / 180; return `<path d="M50 40L${f(50 + Math.cos(a) * 56)} ${f(40 + Math.sin(a) * 56)}" stroke="#ffd45a" stroke-width="3" opacity=".22"/>`; }).join('')}
      <path d="M14 96C22 74 30 60 50 56C70 60 78 74 86 96Z" fill="url(#${i}f)" opacity=".85"/>
      ${card(50, 62, 4, 1.05, { body: '#f3e7d2' })}
      <path d="M26 34L34 12L42 26L50 8L58 26L66 12L74 34Z" fill="url(#${i}c)" stroke="#fff2b0" stroke-width="1"/>
      <rect x="26" y="34" width="48" height="6" rx="2" fill="#c8901e" stroke="#fff2b0" stroke-width=".8"/>
      <circle cx="50" cy="22" r="2.6" fill="#ff3b5c"/><circle cx="36" cy="30" r="1.8" fill="#4aa8ff"/><circle cx="64" cy="30" r="1.8" fill="#4aa8ff"/>
      ${dots([[14, 40, 1.2], [88, 36, 1.1], [10, 70, 1], [92, 74, 1.2], [50, 98, .8]], '#ffd45a', 1.5)}`,
      (i) => radial(i, 'b', [[0, '#4a2a06'], [.7, '#1a0e04'], [1, '#080402']], 50, 50, 75) + linear(i, 'f', [[0, '#fff0a0'], [.5, '#ff9a20'], [1, '#a82008']]) + linear(i, 'c', [[0, '#fff2b0'], [.5, '#f2b52a'], [1, '#a8700e']])),
    'burn-lvl-shitstorm': () => wrap((i) => `
      ${[[38, 12], [32, 24], [26, 36], [20, 48], [14, 60]].map(([w, y], k) => `<ellipse cx="50" cy="${y + 10}" rx="${w}" ry="${f(w * .24)}" fill="none" stroke="${k % 2 ? '#c58a3e' : '#f2c25a'}" stroke-width="2.6" opacity="${f(.95 - k * .08)}"/>`).join('')}
      <path d="M50 14C66 18 72 28 66 36C74 40 76 52 66 58C72 64 70 76 54 80C40 84 28 76 32 66C22 60 24 48 34 44C28 36 34 22 50 14Z" fill="url(#${i}p)" stroke="#2a1608" stroke-width="1.2"/>
      <ellipse cx="42" cy="46" rx="4" ry="5" fill="#fff"/><ellipse cx="58" cy="46" rx="4" ry="5" fill="#fff"/><circle cx="43" cy="47" r="2" fill="#1a0e06"/><circle cx="59" cy="47" r="2" fill="#1a0e06"/>
      <path d="M40 60Q50 68 60 60" fill="none" stroke="#1a0e06" stroke-width="2" stroke-linecap="round"/>
      ${card(20, 78, -22, .6, { body: '#f3e7d2' })}${card(82, 24, 20, .55, { body: '#f3e7d2' })}
      ${dots([[12, 24, 1.2], [90, 56, 1.2], [78, 88, 1], [20, 52, 1], [66, 8, .8]], '#ffd45a', 1.5)}`,
      (i) => radial(i, 'b', [[0, '#3a2410'], [.7, '#160e08'], [1, '#070403']], 50, 50, 75) + radial(i, 'p', [[0, '#c98a4a'], [.7, '#7a4a22'], [1, '#4a2a12']], 44, 36, 40)),
    'burn-ss2709-hex': () => wrap((i) => `
      <circle cx="50" cy="50" r="40" fill="none" stroke="#b36bff" stroke-width="2.4"/><circle cx="50" cy="50" r="40" fill="none" stroke="#7a2cff" stroke-width="7" opacity=".3"/><circle cx="50" cy="50" r="34" fill="none" stroke="#b36bff" stroke-width="1" stroke-dasharray="2 2.6"/>
      <circle cx="50" cy="50" r="25" fill="none" stroke="#3dffb0" stroke-width="1.6"/>
      <path d="M50 25L69.8 65.6L25.4 41L74.6 41L30.2 65.6Z" fill="none" stroke="#3dffb0" stroke-width="1.8" stroke-linejoin="round"/>
      ${Array.from({ length: 12 }, (_, k) => { const a = k / 12 * Math.PI * 2, x = 50 + Math.cos(a) * 31, y = 50 + Math.sin(a) * 31; return `<circle cx="${f(x)}" cy="${f(y)}" r="1.8" fill="${k % 2 ? '#3dffb0' : '#c58bff'}"/>`; }).join('')}
      ${card(50, 50, -6, .78, { body: '#2a1646', pip: '#c58bff', edge: '#b36bff', extra: '<rect x="-13" y="-18" width="26" height="36" rx="3" fill="url(#' + i + 'v)" opacity=".7"/>' })}
      <circle cx="50" cy="50" r="46" fill="url(#${i}g)"/>
      ${dots([[12, 18, 1], [90, 20, 1.2], [92, 78, 1], [8, 82, .9], [50, 6, .8], [50, 95, .8]], '#3dffb0', 1.5)}`,
      (i) => radial(i, 'b', [[0, '#3a1470'], [.6, '#150a2e'], [1, '#05020c']], 50, 50, 75) + radial(i, 'g', [[.5, 'rgba(160,90,255,0)'], [1, 'rgba(160,90,255,.35)']], 50, 50, 46) + radial(i, 'v', [[0, 'rgba(61,255,176,.5)'], [1, 'rgba(61,255,176,0)']], 0, 0, 20).replace('userSpaceOnUse', 'objectBoundingBox').replace(/cx="[^"]+" cy="[^"]+" r="[^"]+"/, 'cx=".5" cy=".5" r=".6"'))
  };
  window.ShBurnIcons = { has: (id) => !!ICONS[id], html: (id) => (ICONS[id] ? ICONS[id]() : ''), IDS: Object.keys(ICONS) };
})();
