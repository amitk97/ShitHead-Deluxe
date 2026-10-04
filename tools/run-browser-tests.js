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
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end('not found');}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(data);});
});
(async()=>{
  await new Promise(r=>server.listen(4173,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error') console.error('[browser]',m.text());});
  try{
    await page.goto('http://127.0.0.1:4173/?dev-tests=1',{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>document.body?.innerText?.includes('Rule Engine Test Suite'),null,{timeout:180000});
    const report=await page.locator('body').innerText();
    const summary=(report.match(/(\d+)\s*\/\s*(\d+) passed(?:\s*—\s*(\d+) FAILING)?/)||[]);
    if(!summary.length)throw new Error('Developer test report summary was not found.');
    console.log(summary[0]);
    const failures=await page.locator('body > div:nth-of-type(2) > div').evaluateAll(rows=>rows.filter(r=>r.textContent.trim().startsWith('❌')).map(r=>r.innerText));
    if(failures.length)console.error('\nFAILED BROWSER TESTS:\n'+failures.map((x,i)=>`${i+1}. ${x}`).join('\n\n'));
    if(Number(summary[3]||0)>0)throw new Error(summary[3]+' browser regression test(s) failed.');
    if(errors.length)console.warn('Page errors observed:',errors.join(' | '));
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e.stack||e);server.close();process.exit(1);});