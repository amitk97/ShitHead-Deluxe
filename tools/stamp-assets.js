'use strict';
// Rewrites the ?v=<hash> on EVERY local script/style (adding a ?v= where one is missing) in index.html and sw.js (art engines and js/* too; an old
// hand-numbered ?v=325 becomes a hash) so a changed file always gets a new URL (hash = first 12 hex of its sha256).
// A forgotten bump once left phones on an old burns3d.js (v406). Run after editing any script or style:
//   node tools/stamp-assets.js
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
let changed = 0;
for (const page of ['index.html', 'sw.js']) {
  const file = path.join(root, page);
  const before = fs.readFileSync(file, 'utf8');
  const after = before.replace(/((?:src|href)="|')(\/?[\w\/.-]+\.(?:js|css))(?:\?v=[0-9A-Za-z]+)?(?=["'])/g, (m, pre, src) => {
    const f = path.join(root, src.replace(/^\//, ''));
    if (!fs.existsSync(f)) return m;
    return pre + src + '?v=' + crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 12);
  });
  if (after !== before) { fs.writeFileSync(file, after); changed++; console.log('updated ' + page); }
}
console.log(changed ? 'done' : 'all hashes current');
