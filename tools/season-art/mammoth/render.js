// Renders the woolly mammoth with three.js in headless Chromium.
//   NODE_PATH=$(npm root -g) THREE_DIR=/path/to/node_modules/three node tools/season-art/mammoth/render.js <view> <size> <out.png>
// views: head (avatar), side (full body, facing left)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const HERE = __dirname, THREE_DIR = process.env.THREE_DIR;
const VIEWS = {
  head: { cam: [2.3, 3.2, 10.8], target: [0.1, 1.95, 2.6], fov: 34, light: [-.55, .75, .7], rimLight: [.9, .35, -.5], density: 1, cull: -0.35 },
  side: { cam: [14, 2.6, 1.0], target: [0, 1.9, 0.6], fov: 26, light: [.6, .8, .5], rimLight: [-.2, .5, -.8], density: .8, cull: -0.4 }
};
(async () => {
  const [name = 'head', size = '1024', out = path.join(HERE, name + '.png')] = process.argv.slice(2);
  const view = { ...VIEWS[name], ...(process.env.VIEW ? JSON.parse(process.env.VIEW) : {}) };
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: +size, height: +size } });
  page.on('pageerror', e => console.error('page error', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error(m.text()); });
  await page.route('**/*', (route) => {
    const u = new URL(route.request().url()); let file = null;
    if (u.pathname === '/scene.html') file = path.join(HERE, 'scene.html');
    else if (u.pathname === '/three.module.js') file = path.join(THREE_DIR, 'build/three.module.js');
    else if (u.pathname === '/three.core.js') file = path.join(THREE_DIR, 'build/three.core.js');
    else if (u.pathname.startsWith('/addons/')) file = path.join(THREE_DIR, 'examples/jsm', u.pathname.slice(8));
    if (file && fs.existsSync(file)) return route.fulfill({ body: fs.readFileSync(file), contentType: file.endsWith('.html') ? 'text/html' : 'text/javascript' });
    return route.fulfill({ status: 404, body: '' });
  });
  await page.goto('http://mammoth.local/scene.html');
  await page.waitForFunction(() => window.ready === true, null, { timeout: 60000 });
  const t0 = Date.now();
  const url = await page.evaluate(([v, s]) => window.render(v, s), [view, +size]);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  console.log('rendered', out, Date.now() - t0, 'ms', JSON.stringify(await page.evaluate(() => window.stats)));
  await browser.close();
})();
