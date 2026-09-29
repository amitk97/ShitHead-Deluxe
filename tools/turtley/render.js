// Renders Turtley's layers with three.js in headless Chromium.
//   NODE_PATH=$(npm root -g) THREE_DIR=/path/to/node_modules/three node tools/turtley/render.js <outDir>
// Writes full.png (whole turtle), body.png (without head and jaw), head.png,
// jaw.png (each alone, hidden where the body covers them) and points.json
// (the jaw hinge, neck and beak on screen, 1254px space).
// tools/make-premium-avatars.py then frames them like the other pictures.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const HERE = __dirname, THREE_DIR = process.env.THREE_DIR, OUT = process.argv[2] || HERE;
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1254, height: 1254 } });
  page.on('pageerror', e => console.error('page error', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error(m.text()); });
  await page.route('**/*', (route) => {
    const u = new URL(route.request().url());
    let file = null;
    if (u.pathname === '/scene.html') file = path.join(HERE, 'scene.html');
    else if (u.pathname === '/three.module.js') file = path.join(THREE_DIR, 'build/three.module.js');
    else if (u.pathname === '/three.core.js') file = path.join(THREE_DIR, 'build/three.core.js');
    else if (u.pathname.startsWith('/addons/')) file = path.join(THREE_DIR, 'examples/jsm', u.pathname.slice(8));
    if (file && fs.existsSync(file)) return route.fulfill({ body: fs.readFileSync(file), contentType: file.endsWith('.html') ? 'text/html' : 'text/javascript' });
    return route.fulfill({ status: 404, body: '' });
  });
  await page.goto('http://turtley.local/scene.html');
  await page.waitForFunction(() => window.ready === true, null, { timeout: 60000 });
  const save = async (name, show, occ = [], jaw = 0) => {
    const url = await page.evaluate(([s, o, j]) => window.renderPass(s, o, j), [show, occ, jaw]);
    fs.writeFileSync(path.join(OUT, name), Buffer.from(url.split(',')[1], 'base64'));
  };
  await save('full.png', ['body', 'head', 'jaw']);
  await save('body.png', ['body']);
  await save('head.png', ['head'], ['body']);
  await save('jaw.png', ['jaw'], ['body', 'head']);
  await save('open.png', ['body', 'head', 'jaw'], [], 0.45);
  const pts = await page.evaluate(() => ({ hinge: window.project('hinge'), neck: window.project('head'), beak: window.project('beak') }));
  fs.writeFileSync(path.join(OUT, 'points.json'), JSON.stringify(pts));
  console.log('rendered', JSON.stringify(pts));
  await browser.close();
})();
