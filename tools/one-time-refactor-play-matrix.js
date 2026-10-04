const fs = require('fs');

const indexPath = 'index.html';
let html = fs.readFileSync(indexPath, 'utf8');

const ranks = "const PLAY_MATRIX_RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', 'JOKER'];";
if (!html.includes(ranks)) throw new Error('PLAY_MATRIX_RANKS declaration not found');
html = html.replace(ranks + '\n', '');

const matrixStart = html.indexOf('    const PLAY_MATRIX = {');
const validationMarker = '    // Verifies PLAY_MATRIX is well-formed';
const matrixEnd = html.indexOf(validationMarker, matrixStart);
if (matrixStart < 0 || matrixEnd < 0) throw new Error('PLAY_MATRIX block not found');
const matrixBlock = html.slice(matrixStart, matrixEnd);
if (!matrixBlock.includes("'JOKER':")) throw new Error('PLAY_MATRIX block failed safety check');
html = html.slice(0, matrixStart) + html.slice(matrixEnd);

const scriptMarker = '  <script src="js/card-reference-data.js"></script>\n';
if (!html.includes(scriptMarker)) throw new Error('card-reference-data script marker not found');
html = html.replace(scriptMarker, scriptMarker + '  <script src="js/play-matrix-data.js"></script>\n');
fs.writeFileSync(indexPath, html);

const matrixFile = `// Static standard Play Matrix data used by the reference UI.\n// Legality logic and validation intentionally remain in index.html.\nconst PLAY_MATRIX_RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', 'JOKER'];\n\n${matrixBlock.trimStart()}`;
fs.writeFileSync('js/play-matrix-data.js', matrixFile);
