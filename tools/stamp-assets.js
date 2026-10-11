'use strict';
// Rewrites the ?v=<hash> on every hashed local script/style in index.html and sw.js
// (hash = first 12 hex of the file's sha256). Run after editing any module:
//   node tools/stamp-assets.js
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
let changed = 0;
for (const page of ['index.html', 'sw.js']) {
  const file = path.join(root, page);
  const before = fs.readFileSync(file, 'utf8');
  const after = before.replace(/((?:src|href)="|')(\/?[\w\/.-]+\.(?:js|css))\?v=([0-9a-f]{12})/g, (m, pre, src, old) => {
    const f = path.join(root, src.replace(/^\//, ''));
    if (!fs.existsSync(f)) return m;
    return pre + src + '?v=' + crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 12);
  });
  if (after !== before) { fs.writeFileSync(file, after); changed++; console.log('updated ' + page); }
}
console.log(changed ? 'done' : 'all hashes current');
