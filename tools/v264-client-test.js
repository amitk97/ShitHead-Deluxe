// Execute the real client functions with isolated DOM/animation adapters.
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=require('./read-client-source')(require('node:path').join(__dirname,'../index.html'));
function between(a,b){return html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));}
let animations=[],sounds=[];
const ctx={console,Math,Number,setTimeout:()=>0,OWNER_VICTORY_MS:2000,OWNER_VICTORY_SPEED:2.1,
 audio:{playEffectClip:(...args)=>sounds.push(args)},vfxSize:()=>[390,844],bfxRand:(a,b)=>(a+b)/2,bfxStar4:()=>'<star/>',OFX_GEM:()=>'<gem/>',
 bfxAdd:(root,text)=>({style:{},text,dataset:{},closest:()=>root,animate:(frames,options)=>{const result={frames,options};animations.push(result);return result;},remove:()=>{}})};
ctx.ofxLayer=(root,name)=>ctx.bfxAdd(root,name);vm.createContext(ctx);
vm.runInContext(between('    const OWNER_FX_LAYOUT =','    const OWNER_FX_FILES =')+between('    const ofxEase =','    // A soft dark pool')+between('    function ofxVignette(','    // A cut gem')+between('    function bfxAnimate(','    function bfxLightning(')+between('    function vfxLion(','    // Fireworks (')+between('    const FIREWORK_BURSTS =','    function playShapeVictoryEffect('),ctx);
for(const name of ['vfxLion','vfxFireworks']){animations=[];sounds=[];ctx[name]({dataset:{}});assert(animations.length>20);assert(Math.max(...animations.map(a=>a.options.duration+(a.options.delay||0)))<=2000.001);assert.equal(sounds.length,1);assert.equal(sounds[0][0],name==='vfxLion'?'lion-roar':'fireworks');assert(animations.filter(a=>(a.options.delay||0)>0).every(a=>a.frames[0].opacity===0),'delayed layers start hidden, no empty placeholders');}
assert(!html.includes('fireworks-gold-art'),'cutout overlay removed');assert(html.includes('fireworks-gold-complete-v264'),'complete gold artwork used');
const hidden=new Set(['tutorialHubScreen']);
const nodes={lobbyScreen:{classList:{contains:()=>hidden.has('lobbyScreen')}},tutorialHubScreen:{classList:{contains:()=>hidden.has('tutorialHubScreen')}}};
let promptCalls=[],checks=0;
Object.assign(ctx,{document:{getElementById:id=>nodes[id]},state:{phase:'LOBBY',roomCode:null,isMultiplayer:false},tutorialActive:false,isAnyOverlayOpen:()=>false,devTestSuiteRunning:false,showUpdatePrompt:v=>promptCalls.push(v),checkForNewVersion:()=>checks++});
vm.runInContext(between('    function updatePromptAllowed()','    function refreshUpdatePrompt()')+between('    function updateToLatestVersion(','    // § Home screen:'),ctx);
assert(ctx.updatePromptAllowed());for(const phase of ['SWAP','PLAY','FINISHED']){ctx.state.phase=phase;assert(!ctx.updatePromptAllowed());ctx.updateToLatestVersion('ignored','v999');}assert.deepEqual(promptCalls,['v999','v999','v999'],'mismatch only queues updates through home-gated prompt');
ctx.state.phase='LOBBY';ctx.state.isMultiplayer=true;assert(!ctx.updatePromptAllowed());ctx.state.isMultiplayer=false;ctx.state.spectating=true;assert(!ctx.updatePromptAllowed());ctx.state.spectating=false;hidden.add('lobbyScreen');assert(!ctx.updatePromptAllowed());hidden.delete('lobbyScreen');ctx.tutorialActive=true;assert(!ctx.updatePromptAllowed());ctx.tutorialActive=false;ctx.updateToLatestVersion('ignored');assert.equal(checks,1);
assert(!between('    function updateToLatestVersion(','    // § Home screen:').includes('reloadCleanly'),'version mismatch cannot force a reload');
for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){if(!/src=|application\//.test(m[1]))new Function(m[2]);}
console.log('PASS client: shortened effect clocks, hidden delayed layers, matched sounds, complete firework source, home-only update eligibility, no forced mismatch reload, script syntax.');
