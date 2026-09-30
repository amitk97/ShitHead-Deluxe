// Regression: real server board writes, week rollover, metadata and account cleanup.
// Run: node tools/boards-period-test.js (npm install in functions first).
'use strict';
const assert = require('node:assert/strict');
const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));
const data = {};
const get = path => path.split('/').filter(Boolean).reduce((v,k)=>v?.[k],data) ?? null;
const put = (path,value) => { const ks=path.split('/').filter(Boolean), k=ks.pop(); let p=data; for(const key of ks) p=p[key] ||= {}; if(value==null) delete p[k]; else p[k]=clone(value); };
const snap = (value,key) => ({key,val:()=>clone(value),exists:()=>value!=null,child:k=>snap(value?.[k],k),forEach:fn=>Object.entries(value||{}).forEach(([k,v])=>fn(snap(v,k)))});
const database = () => ({ref:(path='') => {
  const ref={once:async()=>snap(get(path)),set:async v=>put(path,v),remove:async()=>put(path,null),update:async updates=>{for(const[k,v]of Object.entries(updates))put([path,k].filter(Boolean).join('/'),v);},transaction:async fn=>{const v=fn(clone(get(path)));if(v!==undefined)put(path,v);return {committed:v!==undefined,snapshot:snap(get(path))};},orderByChild:()=>ref,startAfter:()=>ref,limitToFirst:()=>ref};return ref;
}});
const adminPath=require.resolve('../functions/node_modules/firebase-admin');require(adminPath);
const realAdmin=require.cache[adminPath].exports;require.cache[adminPath].exports={...realAdmin,database};
const boards=require('../functions/boards'),xp=require('../functions/xp');
(async()=>{
 const now=Date.now(), week=xp.ukWeekKey(new Date(now)), lastWeek=xp.ukWeekKey(new Date(now-7*86400000));
 const before={username:'Alice',completedChallenges:{old:{completedAt:now-7*86400000}},gauntlet:{botsBeaten:8,week:lastWeek,weekBotsBeaten:8}};
 const after=clone(before);after.completedChallenges.new={completedAt:now};after.gauntlet={botsBeaten:9,week,weekBotsBeaten:1};
 put('publicProfiles/alice/avatar','avatar-suit-spades');
 assert.deepEqual(boards.weeklyCounts(after,week),{challenges:1,gauntlet:1});
 await boards.onUserChanged('alice',before,after);
 assert.equal(get(`boards/challengesweek_${week}/alice/count`),1);
 assert.equal(get(`boards/gauntletweek_${week}/alice/count`),1);
 assert.equal(get('boards/gauntlet/alice/count'),9);
 assert.equal(get('boards/challenges/alice/count'),2);
 assert.equal(get(`boards/gauntletweek_${week}/alice/avatar`),'avatar-suit-spades');
 assert.deepEqual(boards.weeklyCounts(after,'2099-W01'),{challenges:0,gauntlet:0});
 const legacy={username:'Legacy',gauntlet:{botsBeaten:100},completedChallenges:{a:{completedAt:now},b:{completedAt:0}}};
 await boards.onUserChanged('legacy',null,legacy,{force:true});
 assert.equal(get(`boards/challengesweek_${week}/legacy/count`),1);
 assert.equal(get(`boards/gauntletweek_${week}/legacy`),null,'no fabricated historical weekly Gauntlet wins');
 assert(boards.boardPaths('alice').includes(`boards/gauntletweek_${week}/alice`));
 assert(boards.boardPaths('alice').includes(`boards/challengesweek_${lastWeek}/alice`));
 put('users/alice',after);put('publicProfiles/alice/avatar','avatar-ghost');await boards.refreshProfile('alice');
 assert.equal(get(`boards/gauntletweek_${week}/alice/avatar`),'avatar-ghost');
 const economy = require('../functions/economy')._test.actions;
 const runUser = {username:'Runner',diamonds:0,gauntlet:{botsBeaten:8,week:lastWeek,weekBotsBeaten:8,run:{id:'run',mode:'easy',round:0,lives:3,startedAt:now,lastAt:now-60000,playing:true}}};
 put('users/runner',runUser);
 await economy.gauntlet({uid:'runner',data:{op:'result',runId:'run',won:true}});
 assert.equal(get('users/runner/gauntlet/week'),week);
 assert.equal(get('users/runner/gauntlet/weekBotsBeaten'),1,'real result resets previous week');
 assert.equal(get(`boards/gauntletweek_${week}/runner/count`),1);
 await assert.rejects(economy.gauntlet({uid:'runner',data:{op:'result',runId:'run',won:true}}));
 assert.equal(get('users/runner/gauntlet/weekBotsBeaten'),1,'duplicate result never counts twice');
 console.log('PASS: weekly writes, all-time totals, UK rollover, backfill, profile sync and deletion paths');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{require.cache[adminPath].exports=realAdmin;});
