// Two real browser clients against the isolated database emulator.
'use strict';
for(const key of ['HTTP_PROXY','http_proxy','HTTPS_PROXY','https_proxy'])delete process.env[key];
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),esbuild=require('esbuild');
const {initializeTestEnvironment}=require('@firebase/rules-unit-testing');
process.env.FIREBASE_DATABASE_EMULATOR_HOST='127.0.0.1:9000';
const admin=require('../functions/node_modules/firebase-admin');
admin.initializeApp({projectId:'demo-shithead-security',databaseURL:'https://demo-shithead-security.firebaseio.com'});
const ranked=require('../functions/ranked');
const root=path.join(__dirname,'..');
(async()=>{
 let inside=false,escaped=false,rules='';for(const c of fs.readFileSync(path.join(root,'database.rules.json'),'utf8')){if(c==='"'&&!escaped)inside=!inside;rules+=c==='\n'&&inside?' ':c;escaped=c==='\\'&&!escaped;}
 const env=await initializeTestEnvironment({projectId:'demo-shithead-security',database:{host:'127.0.0.1',port:9000,rules}});
 const firebasePath=path.dirname(require.resolve('firebase/package.json'));
 const bundle=await esbuild.build({stdin:{contents:`import firebase from '${firebasePath}/compat/app/dist/esm/index.esm.js'; import '${firebasePath}/compat/database/dist/esm/index.esm.js'; import '${firebasePath}/compat/auth/dist/esm/index.esm.js'; import '${firebasePath}/compat/functions/dist/esm/index.esm.js'; window.firebase=firebase;`,resolveDir:root},bundle:true,write:false,platform:'browser'});
 let html=fs.readFileSync(process.env.SH_BASELINE_INDEX||path.join(root,'index.html'),'utf8').replace(/<script src="https:\/\/www.gstatic.com\/firebasejs\/[^\"]+"><\/script>/g,'');
 html=html.replace('</head>','<script src="/firebase-bundle.js"></script></head>');
 html=html.replace('firebase.initializeApp(firebaseConfig);',"firebaseConfig.projectId='demo-shithead-security';firebaseConfig.databaseURL='https://demo-shithead-security.firebaseio.com';firebase.initializeApp(firebaseConfig);firebase.database().useEmulator('127.0.0.1',9000,{mockUserToken:{sub:new URLSearchParams(location.search).get('uid'),user_id:new URLSearchParams(location.search).get('uid')}});");
 html=html.replace('// § Page start-up',`if(new URLSearchParams(location.search).get('dev-tests')==='1'){const r={set:()=>Promise.resolve(),update:()=>Promise.resolve(),push:()=>({key:'test'}),once:()=>Promise.resolve({val:()=>null,exists:()=>false}),on:()=>{},off:()=>{},remove:()=>Promise.resolve(),child:()=>r,transaction:(fn,cb)=>{if(cb)cb(null,false,{val:()=>null});return Promise.resolve({committed:false,snapshot:{val:()=>null}});},onDisconnect:()=>({remove:()=>{},set:()=>{},cancel:()=>{}})};db={ref:()=>r};}\n    // § Page start-up`);
 const fonts = Object.fromEntries([['Outfit','outfit'],['Cinzel','cinzel'],['Plus Jakarta Sans','plus-jakarta-sans']].map(([name,id])=>[id,{name,file:path.join(path.dirname(firebasePath),'@fontsource-variable',id,'files',`${id}-latin-wght-normal.woff2`)}]));
 if(Object.values(fonts).every(f=>fs.existsSync(f.file)))html=html.replace(/@import url\('https:\/\/fonts.googleapis.com[^']+'\);/,Object.entries(fonts).map(([id,f])=>`@font-face{font-family:'${f.name}';font-style:normal;font-weight:100 900;src:url('/test-font-${id}.woff2') format('woff2');}`).join('\n'));
 const server=http.createServer((req,res)=>{const font=req.url.match(/^\/test-font-(.+)\.woff2$/);if(font&&fonts[font[1]]){res.setHeader('Content-Type','font/woff2');res.end(fs.readFileSync(fonts[font[1]].file));return;}if(req.url.startsWith('/firebase-bundle.js')){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);return;}if(req.url.startsWith('/?')){res.setHeader('Content-Type','text/html');res.end(html);return;}if(req.url.startsWith('/dev-tests.js')){res.setHeader('Content-Type','text/javascript');let source=fs.readFileSync(process.env.SH_BASELINE_TESTS||path.join(root,'dev-tests.js'),'utf8').replace('function renderDevTestReport(results) {','function renderDevTestReport(results) { window.__suiteResults=results;');if(process.env.SH_TEST_FILTER)source=source.replace('async function test(name, fn) {',`async function test(name, fn) { if(!new RegExp(${JSON.stringify(process.env.SH_TEST_FILTER)}).test(name))return;`);res.end(source);return;}const file=path.join(root,req.url.split('?')[0]);if(file.startsWith(root)&&fs.existsSync(file)&&fs.statSync(file).isFile())res.end(fs.readFileSync(file));else{res.statusCode=404;res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.SH_CHROMIUM||'/tmp/sh-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
 try{
  if(!process.env.SH_BASELINE_INDEX){
  const now=Date.now(),code='765432';await admin.database().ref().set({users:{alice:{username:'Alice',rating:500},bob:{username:'Bob',rating:500}},rooms:{[code]:{isRanked:true,phase:'LOBBY',clientVersion:'v262',players:[{id:'p_host',uid:'alice',name:'Alice'},{id:'p_room1',uid:'bob',name:'Bob'}]}},rankedMembers:{[code]:{alice:now,bob:now}}});
  const pages=[];const errors=[];
  for(const uid of ['alice','bob']){
   const context=await browser.newContext({serviceWorkers:'block'});const page=await context.newPage();pages.push(page);
   page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',uid,e.message);});
   await page.route('https://**/*',route=>route.abort());
   await page.exposeFunction('rankedBackend',async(action,data)=>{if(action==='rankedStart')return ranked.start({uid,data});if(action==='rankedMove'){try{return await ranked.move({uid,data});}catch(e){console.log('MOVE ERROR',uid,data.op,e.message);throw e;}}return {};});
   console.log('Opening',uid);await page.goto(`http://127.0.0.1:${server.address().port}/?uid=${uid}`);console.log('Loaded',uid);await page.waitForFunction(()=>typeof state!=='undefined'&&typeof render==='function');
   await page.evaluate(({uid,code})=>{currentUser={uid};callEconomy=(action,data)=>window.rankedBackend(action,data);state.isMultiplayer=true;state.isRanked=true;state.roomCode=code;state.phase='LOBBY';state.localPlayerId=uid==='alice'?'p_host':'p_room1';state.isHost=uid==='alice';ensureRankedView(code);},{uid,code});
  }
  console.log('Clients ready');const result=await ranked.start({uid:'alice',data:{roomCode:code}});
  await pages[0].evaluate(view=>applyRankedView(view),result.view);
  console.log('Started');for(const page of pages){await page.waitForFunction(()=>state.phase==='SWAP');assert.equal(await page.evaluate(()=>state.players.find(p=>p.id===state.localPlayerId).hand.filter(c=>!c.hidden).length),3);assert.equal(await page.evaluate(()=>state.players.find(p=>p.id!==state.localPlayerId).hand.every(c=>c.hidden)),true);assert.equal(await page.evaluate(()=>state.players.every(p=>p.faceDown.every(c=>c.hidden))),true);}
  for(const page of pages){console.log('Ready',await page.evaluate(()=>({phase:state.phase,uid:currentUser.uid,busy:rankedMoveBusy,disabled:document.getElementById('finishSwapBtn').disabled})));await page.evaluate(()=>document.getElementById('finishSwapBtn').click());}
  for(const page of pages)await page.waitForFunction(()=>state.phase==='PLAY');
  const acting=await pages[0].evaluate(()=>state.players[state.currentTurnIndex].uid==='alice')?pages[0]:pages[1];
  const before=await acting.evaluate(()=>state.stateVersion);
  await acting.evaluate(()=>{const p=state.players.find(p=>p.id===state.localPlayerId);executePlayCards(p.id,[p.hand[0]]);});
  for(const page of pages)await page.waitForFunction(v=>state.stateVersion>v,before);
  assert.equal(await pages[0].evaluate(()=>state.stateVersion),await pages[1].evaluate(()=>state.stateVersion));
  await pages[1].evaluate(()=>{rankedViewRef.off();rankedViewRef=null;state.serverAuthority=0;state.phase='LOBBY';ensureRankedView(state.roomCode);});
  await pages[1].waitForFunction(()=>state.serverAuthority===1&&state.phase==='PLAY');
  await pages[0].evaluate(()=>leaveMultiplayerRoom());
  for(const page of pages)await page.waitForFunction(()=>state.phase==='FINISHED');
  assert.deepEqual(errors,[]);console.log('PASS: two browser private hands, masked hidden cards, Ready controls, move synchronization, resubscription and concession');
  }
  if(process.env.SH_DEV_SUITE){
  const suite=await browser.newPage({viewport:{width:390,height:844}});await suite.route('https://**/*',route=>route.abort());await suite.goto(`http://127.0.0.1:${server.address().port}/?uid=dev&dev-tests=1`);await suite.waitForFunction(()=>document.body.innerText.includes('passed')&&document.body.innerText.includes('Rule Engine Test Suite'),{},{timeout:180000});
  const results=await suite.evaluate(()=>window.__suiteResults);fs.writeFileSync(process.env.SH_REPORT_PATH||'/tmp/sh-dev-test-results.json',JSON.stringify(results,null,2));const failures=results.filter(r=>!r.pass);console.log(JSON.stringify({total:results.length,failures},null,2));assert.equal(failures.length,0);
  }
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));await env.cleanup();await admin.app().delete();}
})().catch(e=>{console.error(e);process.exitCode=1;});
