/* Burn tile pictures drawn as SVG (no emoji): one shared look, a dark lit scene with a playing card that the
 * effect is destroying. ShBurnIcons.html(id) returns an <svg> that fills its tile; ShBurnIcons.has(id). */
(function () {
  'use strict';
  let seq = 0;
  const f = (n) => Math.round(n * 10) / 10;
  const spade = (x, y, s, c) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0-10C6-3 10 1 10 5C10 9 6 10 3 8C4 12 5 14 7 15H-7C-5 14-4 12-3 8C-6 10-10 9-10 5C-10 1-6-3 0-10Z" fill="${c}"/>`;
  // A playing card (centre x,y, rotation, scale). `tint` recolours it (frozen, marble...), `burn` chars the lower edge.
  const rnd = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // A playing card (centre x,y, rotation, scale): paper gradient, bevel, both corner indices, soft shadow. `tint` recolours it, `extra` draws over it.
  const card = (x, y, r, s, o = {}) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><rect x="-12" y="-16" width="26" height="36" rx="3.4" fill="#000" opacity=".5" filter="url(#__ID__k)"/><g filter="url(#__ID__s)"><rect x="-13" y="-18" width="26" height="36" rx="3.2" fill="${o.body ? o.body : 'url(#__ID__p)'}" stroke="${o.edge || '#3a2f22'}" stroke-width=".9"/><rect x="-11.6" y="-16.6" width="23.2" height="33.2" rx="2.4" fill="none" stroke="rgba(255,255,255,.7)" stroke-width=".4"/>${spade(0, 1.5, .95, o.pip || '#1b1b26')}${spade(-8.2, -12.2, .3, o.pip || '#1b1b26')}${spade(8.2, 12.2, .3, o.pip || '#1b1b26')}<path d="M-13 -18H13V-6C4 -9-6-9-13-3Z" fill="#fff" opacity=".16"/>${o.extra || ''}</g></g>`;
  // Glow: the same shapes blurred and added over the scene.
  const glow = (svg, id, b = 'k') => `<g filter="url(#${id}${b})" style="mix-blend-mode:screen">${svg}</g>`;
  const rays = (n, cx, cy, r1, r2, w, col, o = 1, rot = 0) => Array.from({ length: n }, (_, k) => { const a = rot + k / n * Math.PI * 2, L = k % 2 ? r2 * .72 : r2, c = Math.cos(a), sn = Math.sin(a), px = -sn * w, py = c * w; return `<path d="M${f(cx + c * r1 + px)} ${f(cy + sn * r1 + py)}L${f(cx + c * L)} ${f(cy + sn * L)}L${f(cx + c * r1 - px)} ${f(cy + sn * r1 - py)}Z" fill="${col}" opacity="${o}"/>`; }).join('');
  // Embers: n seeded particles inside a box, sizes falling off, colours cycled.
  const embers = (seed, n, x0, y0, x1, y1, cols, rmax = 1.6) => { const r = rnd(seed); return Array.from({ length: n }, (_, k) => { const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), q = r() * r(); return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(.35 + q * rmax)}" fill="${cols[k % cols.length]}" opacity="${f(.45 + r() * .55)}"/>`; }).join(''); };
  const dots = (arr, col, r = 1) => arr.map(([x, y, s = 1]) => `<circle cx="${x}" cy="${y}" r="${f(r * s)}" fill="${col}"/>`).join('');
  const wrap = (body, defs, bg) => { const id = 'bi' + (++seq), d = defs(id), own = (n) => d.includes('id="' + id + n + '"'); return `<svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style="display:block;border-radius:inherit"><defs>${d}${own('p') ? '' : `<linearGradient id="${id}p" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#e2d4b8"/></linearGradient>`}<filter id="${id}k" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.6"/></filter><filter id="${id}K" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter><filter id="${id}s" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1.4" stdDeviation="1.2" flood-color="#000" flood-opacity=".55"/></filter>${own('v') ? '' : `<radialGradient id="${id}v" cx="50%" cy="50%" r="72%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".62"/></radialGradient>`}</defs><rect width="100" height="100" fill="url(#${id}b)"/>${body(id)}<rect width="100" height="100" fill="url(#${id}v)"/><rect x=".5" y=".5" width="99" height="99" rx="12" fill="none" stroke="rgba(255,255,255,.14)"/></svg>`.replace(/__ID__/g, id); };
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
      <path d="M50 10L58 36L84 30L66 50L90 64L62 66L58 92L46 68L16 80L34 54L10 36L40 38Z" fill="url(#${i}Zs)" opacity=".95"/>
      <path d="M50 10L58 36L50 50L40 38Z" fill="#e8fbff"/><path d="M84 30L66 50L58 36Z" fill="#9ee0f7"/><path d="M90 64L62 66L66 50Z" fill="#7cc8e6"/><path d="M58 92L46 68L62 66Z" fill="#bff0ff"/><path d="M16 80L34 54L46 68Z" fill="#8fd3ee"/><path d="M10 36L40 38L34 54Z" fill="#c9f2ff"/>
      ${card(50, 50, 10, 1.05, { body: '#bfe9fb', pip: '#12384f', edge: '#e9fbff' })}
      <path d="M44 38L50 50L42 58M50 50L60 56" stroke="#fff" stroke-width="1.3" fill="none" opacity=".9"/>
      ${[[22, 22], [80, 18], [88, 52], [18, 66], [72, 84], [36, 88]].map(([x, y]) => `<path d="M${x} ${y - 4}L${x + 1.2} ${y - 1.2}L${x + 4} ${y}L${x + 1.2} ${y + 1.2}L${x} ${y + 4}L${x - 1.2} ${y + 1.2}L${x - 4} ${y}L${x - 1.2} ${y - 1.2}Z" fill="#fff"/>`).join('')}`,
      (i) => radial(i, 'b', [[0, '#1e6fa3'], [.6, '#0b2f55'], [1, '#04101f']], 50, 50, 75) + linear(i, 'Zs', [[0, '#e8fbff'], [1, '#56b6df']])),
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
    'default': () => wrap((i) => `
      ${glow('<ellipse cx="50" cy="88" rx="46" ry="14" fill="#ff8a1e" opacity=".8"/>', i, 'K')}
      <path d="M4 96C2 72 14 64 12 44C22 54 26 40 20 24C34 34 38 50 32 60C40 46 42 28 36 10C54 24 58 44 52 58C60 46 62 34 58 22C72 34 76 50 70 62C78 54 80 46 78 38C92 52 96 70 90 96Z" fill="url(#${i}f)"/>
      <path d="M20 96C16 82 26 76 26 66C32 72 36 64 34 54C44 62 46 74 42 82C50 74 54 66 52 58C62 68 66 80 62 96Z" fill="url(#${i}m)"/>
      <path d="M34 96C34 86 42 82 42 74C48 80 50 74 48 68C56 76 58 86 54 96Z" fill="#fff6c8"/>
      ${glow('<path d="M28 60C34 40 46 30 50 8C56 30 70 40 74 62C60 56 42 56 28 60Z" fill="#ffb347" opacity=".75"/>', i)}
      ${card(50, 48, -6, 1.28, { extra: '<path d="M-13 6L-6 1L0 9L6 0L13 5V18H-13Z" fill="#1c0904"/><path d="M-13 6L-6 1L0 9L6 0L13 5" fill="none" stroke="#ff9a2e" stroke-width="1.5"/><path d="M-13 6L-6 1L0 9L6 0L13 5" fill="none" stroke="#fff3b0" stroke-width=".5"/>' })}
      ${Array.from({ length: 9 }, (_, k) => `<path d="M${14 + k * 9} 94C${12 + k * 9} 70 ${20 + k * 9} 60 ${16 + k * 9} 42" fill="none" stroke="#ffd45a" stroke-width=".6" opacity=".35"/>`).join('')}
      ${embers(7, 46, 4, 4, 96, 70, ['#ffd45a', '#ff9a2e', '#fff1b0', '#ff6a1f'], 1.7)}
      ${glow(embers(8, 14, 8, 6, 92, 60, ['#ffb347', '#ffe27a'], 2.2), i)}`,
      (i) => radial(i, 'b', [[0, '#5a1c06'], [.55, '#220b05'], [1, '#060202']], 50, 86, 95) + linear(i, 'f', [[0, '#fff2a8'], [.3, '#ffb028'], [.7, '#e2410a'], [1, '#7a1405']]) + linear(i, 'm', [[0, '#ffe27a'], [.6, '#ff9a1e'], [1, '#d4400a']])),
    'burn-lvl-spark-snap': () => wrap((i) => `
      ${glow('<circle cx="50" cy="50" r="34" fill="url(#' + i + 'g)"/>', i, 'K')}
      ${rays(16, 50, 50, 14, 52, .9, 'url(#' + i + 'r)', .9, .1)}
      ${glow(rays(16, 50, 50, 14, 52, 1.6, '#ffc94d', .6, .1), i)}
      <ellipse cx="50" cy="88" rx="44" ry="9" fill="none" stroke="#ffb347" stroke-width="1.6" opacity=".7"/><ellipse cx="50" cy="88" rx="30" ry="6" fill="none" stroke="#fff1b0" stroke-width="1.2" opacity=".6"/><ellipse cx="50" cy="88" rx="16" ry="3" fill="#ffd45a" opacity=".5"/>
      ${card(54, 50, 16, 1.3)}
      ${glow('<circle cx="50" cy="50" r="13" fill="#fff"/>', i)}
      <circle cx="50" cy="50" r="6" fill="#fff"/>
      <path d="M50 30L53 46L70 50L53 54L50 70L47 54L30 50L47 46Z" fill="#fff"/>
      ${embers(21, 60, 4, 4, 96, 96, ['#ffd45a', '#fff6c8', '#ff9a2e'], 1.5)}
      ${glow(embers(22, 12, 6, 6, 94, 94, ['#ffe27a'], 2.4), i)}`,
      (i) => radial(i, 'b', [[0, '#3a1608'], [.5, '#170a06'], [1, '#050202']], 50, 50, 80) + radial(i, 'g', [[0, 'rgba(255,214,110,.95)'], [.6, 'rgba(255,150,40,.35)'], [1, 'rgba(255,120,20,0)']], 50, 50, 34) + linear(i, 'r', [[0, '#ffffff'], [1, '#ff9a2e']], 0, 0, 1, 1)),
    'burn-lvl-smoke-burst': () => wrap((i) => {
      const r = rnd(5), puff = (x, y, rad, a) => `<circle cx="${x}" cy="${y}" r="${rad}" fill="url(#${i}Zs)" opacity="${a}"/><circle cx="${f(x - rad * .28)}" cy="${f(y - rad * .32)}" r="${f(rad * .6)}" fill="#fff" opacity=".12"/><circle cx="${f(x + rad * .3)}" cy="${f(y + rad * .35)}" r="${f(rad * .55)}" fill="#000" opacity=".18"/>`;
      const back = [[24, 64, 20], [76, 62, 21], [50, 80, 19], [16, 36, 15], [84, 34, 16], [50, 18, 16], [30, 20, 11], [72, 12, 10]];
      const front = [[18, 56, 13], [82, 56, 13], [50, 90, 12], [24, 30, 10], [78, 28, 10]];
      return `
      ${glow('<circle cx="50" cy="50" r="26" fill="#ff6a1f" opacity=".6"/>', i, 'K')}
      ${back.map(([x, y, rad]) => puff(x, y, rad, .92)).join('')}
      ${card(50, 50, -9, 1.3, { extra: '<path d="M-13 10L-5 5L2 12L8 4L13 9V18H-13Z" fill="#1c1210" opacity=".85"/>' })}
      ${front.map(([x, y, rad]) => puff(x, y, rad, .96)).join('')}
      ${Array.from({ length: 12 }, () => `<path d="M${f(10 + r() * 80)} ${f(10 + r() * 80)}l${f(r() * 6 - 3)} ${f(r() * 6 - 3)}" stroke="#ff9a4a" stroke-width="1.4" stroke-linecap="round" opacity=".8"/>`).join('')}
      ${embers(6, 30, 4, 4, 96, 96, ['#ff9a4a', '#ffd45a', '#ff6a1f'], 1.4)}`;
    },
      (i) => radial(i, 'b', [[0, '#3a2a26'], [1, '#0b0707']], 50, 50, 75) + radial(i, 'Zs', [[0, '#f1ece8'], [.55, '#a8a09b'], [1, '#4f4642']], 40, 34, 26)),
    'burn-lvl-inferno-sweep': () => wrap((i) => `
      ${glow('<path d="M-6 74C20 28 62 16 108 30L108 50C64 42 30 58 6 98Z" fill="#ff7a1e" opacity=".8"/>', i, 'K')}
      <path d="M-6 76C20 30 62 18 108 32L108 52C64 44 30 60 6 100Z" fill="url(#${i}f)"/>
      <path d="M-6 92C26 56 66 48 108 58L108 70C66 66 34 80 14 106Z" fill="url(#${i}f)" opacity=".75"/>
      <path d="M-6 58C26 22 64 14 108 20L108 28C66 24 34 36 2 70Z" fill="url(#${i}f)" opacity=".6"/>
      ${Array.from({ length: 7 }, (_, k) => `<path d="M${-4 + k * 6} ${82 - k * 8}C${24 + k * 8} ${40 - k * 3} ${60} ${28 + k * 2} 104 ${36 + k * 2}" fill="none" stroke="#fff1b0" stroke-width="${f(1.4 - k * .14)}" stroke-linecap="round" opacity="${f(.9 - k * .1)}"/>`).join('')}
      ${card(60, 54, 12, 1.32, { extra: '<path d="M-13 4L-5 -1L2 7L8 -2L13 3V18H-13Z" fill="#1c0904"/><path d="M-13 4L-5 -1L2 7L8 -2L13 3" fill="none" stroke="#ff9a2e" stroke-width="1.4"/>' })}
      ${glow('<path d="M52 44L66 38L72 52Z" fill="#ffd45a" opacity=".8"/>', i)}
      <path d="M52 30L60 44M70 22L74 38M86 60L100 54M34 40L46 50" stroke="#fff4c4" stroke-width="2.2" stroke-linecap="round"/>
      ${embers(31, 50, 4, 4, 96, 96, ['#ffd45a', '#ff9a2e', '#fff1b0'], 1.6)}
      ${glow(embers(32, 10, 6, 6, 94, 90, ['#ffe27a'], 2.4), i)}`,
      (i) => radial(i, 'b', [[0, '#4a1606'], [.6, '#1a0805'], [1, '#050202']], 60, 55, 85) + linear(i, 'f', [[0, '#fff6c0'], [.3, '#ffb028'], [.7, '#e2380c'], [1, '#6a1004']], 0, 0, 1, 1)),
    'burn-lvl-hellfire-spiral': () => wrap((i) => {
      const rings = [[40, 12], [37, 22], [34, 32], [30, 42], [26, 52], [21, 62], [16, 72], [11, 82]];
      return `
      ${glow('<path d="M12 12C40 4 64 20 88 10L66 86C56 94 38 94 28 86Z" fill="#ff6a1f" opacity=".55"/>', i, 'K')}
      <path d="M10 14C40 6 62 22 90 12L70 88C58 96 38 96 26 88Z" fill="url(#${i}f)" opacity=".55"/>
      ${rings.map(([w, y], k) => `<ellipse cx="50" cy="${y}" rx="${w}" ry="${f(w * .24)}" fill="none" stroke="${k % 2 ? '#ff7a1e' : '#ffd45a'}" stroke-width="${f(3.2 - k * .2)}" opacity="${f(1 - k * .05)}" transform="rotate(${k % 2 ? -4 : 5} 50 ${y})"/><ellipse cx="50" cy="${y}" rx="${f(w * .84)}" ry="${f(w * .2)}" fill="none" stroke="#fff1b0" stroke-width=".7" opacity=".55" transform="rotate(${k % 2 ? -4 : 5} 50 ${y})"/>`).join('')}
      ${card(50, 54, -8, 1.05, { extra: '<path d="M-13 8L-5 3L1 10L7 2L13 7V18H-13Z" fill="#1c0904"/><path d="M-13 8L-5 3L1 10L7 2L13 7" fill="none" stroke="#ff9a2e" stroke-width="1.3"/>' })}
      ${[[14, 40, 28], [84, 30, 52], [20, 70, 14], [86, 66, 40]].map(([x, y, a]) => `<g transform="translate(${x} ${y}) rotate(${a})"><rect x="-4" y="-5.5" width="8" height="11" rx="1.2" fill="#f1e2c6"/><path d="M-4 1L0 -1L4 2V5.5H-4Z" fill="#1c0904"/></g>`).join('')}
      <ellipse cx="50" cy="94" rx="38" ry="6" fill="#120806"/><path d="M16 94L28 84L38 91L52 82L64 91L76 84L88 94Z" fill="#2c140a" stroke="#ff6a1f" stroke-width="1.1"/><path d="M28 84L38 91M52 82L64 91" stroke="#ffd45a" stroke-width=".8"/>
      ${embers(41, 54, 4, 4, 96, 90, ['#ffd45a', '#ff9a2e', '#ff6a1f'], 1.6)}
      ${glow(embers(42, 10, 8, 8, 92, 80, ['#ffe27a'], 2.4), i)}`;
    },
      (i) => radial(i, 'b', [[0, '#4a1204'], [.65, '#190804'], [1, '#050202']], 50, 50, 78) + linear(i, 'f', [[0, '#ffcf5a'], [.5, '#e8561a'], [1, '#6a1004']])),
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
