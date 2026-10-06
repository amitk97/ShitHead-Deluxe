'use strict';
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.mp3':'audio/mpeg','.wav':'audio/wav','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://127.0.0.1'); let p=decodeURIComponent(u.pathname);
  if(p==='/'||p==='')p='/index.html';
  const file=path.resolve(root,'.'+p);
  if(!file.startsWith(root)){res.writeHead(403);return res.end();}
  fs.readFile(process.env.SH_BASELINE_INDEX && p === '/index.html' ? process.env.SH_BASELINE_INDEX : file,(err,data)=>{if(err){res.writeHead(404);return res.end('not found');}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(data);});
});
(async()=>{
  await new Promise(r=>server.listen(4173,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true, ...(process.env.SH_CHROMIUM_EXECUTABLE ? {executablePath:process.env.SH_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process']} : {})});
  const page=await browser.newPage({viewport:{width:Number(process.env.SH_TEST_WIDTH)||390,height:Number(process.env.SH_TEST_HEIGHT)||844}});
  // Optional local SDK copies keep browser tests independent of CDN availability.
  if (process.env.SH_VIDEO_DEPS) {
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      const sdk = url.pathname.match(/firebasejs\/[\d.]+\/(firebase-[a-z-]+\.js)$/);
      if (sdk) return route.fulfill({body:fs.readFileSync(path.join(process.env.SH_VIDEO_DEPS,'node_modules/firebase',sdk[1])),contentType:'application/javascript'});
      if (url.pathname.includes('canvas-confetti')) return route.fulfill({body:fs.readFileSync(path.join(process.env.SH_VIDEO_DEPS,'node_modules/canvas-confetti/dist/confetti.browser.js')),contentType:'application/javascript'});
      if (url.pathname === '/dev-tests.js' && (process.env.SH_TEST_PROGRESS || process.env.SH_TEST_NAMES)) return route.fulfill({body:fs.readFileSync(path.join(root,'dev-tests.js'),'utf8').replace('function renderDevTestReport(results) {', 'function renderDevTestReport(results) { window.__suiteResults=results;').replace('async function test(name, fn) {', 'async function test(name, fn) { window.__suiteProgress = {name, completed: results.length};' + (process.env.SH_TEST_NAMES ? 'if (!' + JSON.stringify(process.env.SH_TEST_NAMES.split('|')) + '.some(part => name.includes(part))) return;' : '')),contentType:'application/javascript'});
      if (url.hostname !== '127.0.0.1') return route.abort();
      return route.continue();
    });
  }
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error') console.error('[browser]',m.text());});
  const progressTimer = process.env.SH_TEST_PROGRESS ? setInterval(() => page.evaluate(() => window.__suiteProgress || {ready:typeof runDevTestSuite, errors:window.__devLoadError}).then(v=>console.log('Suite progress:',v)).catch(()=>{}),15000) : null;
  try{
    await page.goto('http://127.0.0.1:4173/?dev-tests=1',{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>document.body?.innerText?.includes('Rule Engine Test Suite'),null,{timeout:360000});
    const report=await page.locator('body').innerText();
    const summary=(report.match(/(\d+)\s*\/\s*(\d+) passed(?:\s*—\s*(\d+) FAILING)?/)||[]);
    if(!summary.length)throw new Error('Developer test report summary was not found.');
    console.log(summary[0]);
    const recorded=await page.evaluate(()=>window.__suiteResults || null);
    const failures=recorded ? recorded.filter(r=>!r.pass).map(r=>r.name+'\n'+r.error) : await page.locator('body > div:nth-of-type(2) > div').evaluateAll(rows=>rows.filter(r=>r.textContent.trim().startsWith('❌')).map(r=>r.innerText));
    if(failures.length)console.error('\nFAILED BROWSER TESTS:\n'+failures.map((x,i)=>`${i+1}. ${x}`).join('\n\n'));
    if(Number(summary[3]||0)>0)throw new Error(summary[3]+' browser regression test(s) failed.');
    if(errors.length)console.warn('Page errors observed:',errors.join(' | '));
  }finally{if(progressTimer)clearInterval(progressTimer);await browser.close();server.close();}
})().catch(e=>{console.error(e.stack||e);server.close();process.exit(1);});