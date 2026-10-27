'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {create}=require('../js/wishlist-store');
const tick=()=>new Promise(r=>setImmediate(r));
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};};
function backend(initial={}) {
  let value={...initial};const listeners=new Set();
  const api={fail:false,hold:false,readFail:false,calls:[],queue:[],
    on(_,cb,error){listeners.add(cb);queueMicrotask(()=>api.readFail?error(new Error('offline')):cb({val:()=>({...value})}));},
    off(_,cb){listeners.delete(cb);},
    update(updates){api.calls.push({...updates});return new Promise((resolve,reject)=>{
      const finish=()=>{if(api.fail)return reject(new Error('offline'));for(const [k,v]of Object.entries(updates))v===null?delete value[k]:value[k]=v;api.emit();resolve();};
      api.hold?api.queue.push(finish):finish();
    });},
    emit(){for(const cb of listeners)cb({val:()=>({...value})});},
    replace(next){value={...next};api.emit();},
    get value(){return {...value};},get subscriptions(){return listeners.size;}
  };return api;
}
const make=(storage=memory(),more={})=>create({storage,validId:id=>/^back-[a-z]+$/.test(id),...more});
test('guest choices survive reload; invalid IDs and the cap are enforced',()=>{
 const storage=memory(),a=make(storage,{max:2});
 assert.equal(a.toggle('bad'),'invalid');assert.equal(a.toggle('back-a'),'added');a.toggle('back-b');assert.equal(a.toggle('back-c'),'full');
 assert.deepEqual([...make(storage).ids],['back-a','back-b']);
});
test('legacy unscoped data is preserved for guests, never silently imported into an account',async()=>{
 const storage=memory();storage.setItem('shithead_wishlist',JSON.stringify(['back-legacy']));
 const a=make(storage),cloud=backend({'back-own':true});assert(a.ids.has('back-legacy'));
 await a.connect('alice',cloud);await tick();assert.deepEqual([...a.ids],['back-own']);assert.equal(cloud.calls.length,0);
 a.setAccount(null);assert(a.ids.has('back-legacy'));
});
test('explicit guest additions transfer once and do not follow the next account',async()=>{
 const a=make(),alice=backend(),bob=backend();a.toggle('back-a');await a.connect('alice',alice);await tick();
 assert.equal(alice.value['back-a'],true);await a.connect('bob',bob);await tick();assert.equal(a.ids.size,0);assert.equal(bob.calls.length,0);
 a.setAccount(null);assert.equal(a.ids.size,0);
});
test('a full account does not discard guest items it cannot accept',()=>{
 const storage=memory();storage.setItem('shithead_wishlist:v2:alice',JSON.stringify({ids:['back-own'],pending:{}}));
 const a=make(storage,{max:1});a.toggle('back-guest');a.setAccount('alice');assert(a.ids.has('back-own'));a.setAccount(null);assert(a.ids.has('back-guest'));
});
test('authoritative snapshots remove stale account entries instead of resurrecting them',async()=>{
 const storage=memory();storage.setItem('shithead_wishlist:v2:alice',JSON.stringify({ids:['back-removed'],pending:{}}));
 const a=make(storage),cloud=backend({'back-keep':true});await a.connect('alice',cloud);assert.deepEqual([...a.ids],['back-keep']);assert.equal(cloud.calls.length,0);
});
test('offline removal remains removed locally and is retried after reload',async()=>{
 const storage=memory(),cloud=backend({'back-a':true}),a=make(storage);await a.connect('alice',cloud);cloud.fail=true;
 a.toggle('back-a');await tick();assert.equal(a.status,'error');assert(!a.ids.has('back-a'));assert.equal(cloud.value['back-a'],true);a.stop();
 cloud.fail=false;const reloaded=make(storage);await reloaded.connect('alice',cloud);await tick();
 assert(!reloaded.ids.has('back-a'));assert.equal(cloud.value['back-a'],undefined);assert.equal(reloaded.status,'synced');
});
test('per-item writes preserve another device’s choices; live snapshots follow remote removals',async()=>{
 const cloud=backend(),a=make(),b=make();await a.connect('alice',cloud);await b.connect('alice',cloud);
 a.toggle('back-a');b.toggle('back-b');await tick();assert.deepEqual(cloud.value,{'back-a':true,'back-b':true});
 a.toggle('back-a');await tick();assert.deepEqual(cloud.value,{'back-b':true});assert.deepEqual([...b.ids],['back-b']);
 assert.deepEqual(cloud.calls[0],{'back-a':true});
});
test('a rapid second toggle is not cleared by the first write completing',async()=>{
 const cloud=backend(),a=make();await a.connect('alice',cloud);cloud.hold=true;
 a.toggle('back-a');await tick();a.toggle('back-a');cloud.queue.shift()();await tick();assert(!a.ids.has('back-a'));assert.equal(cloud.queue.length,1);
 cloud.queue.shift()();await tick();assert.deepEqual(cloud.value,{});assert.equal(a.status,'synced');
});
test('concurrent additions at the cap remain visible on both devices and in offline caches',async()=>{
 const cloud=backend({'back-a':true}),storage=memory(),a=make(storage,{max:2}),b=make(memory(),{max:2});
 await a.connect('alice',cloud);await b.connect('alice',cloud);
 a.toggle('back-b');b.toggle('back-c');await tick();
 assert.deepEqual([...a.ids].sort(),['back-a','back-b','back-c']);
 assert.deepEqual([...b.ids].sort(),['back-a','back-b','back-c']);
 assert.equal(a.toggle('back-d'),'full');
 const offline=make(storage,{max:2});offline.setAccount('alice');assert.equal(offline.ids.size,3,'existing server choices are not truncated on reload');
});
test('switching accounts cancels undispatched work and detaches the previous listener',async()=>{
 const a=make(),alice=backend(),bob=backend({'back-b':true});await a.connect('alice',alice);a.toggle('back-a');await a.connect('bob',bob);await tick();
 assert.equal(alice.calls.length,0);assert.equal(alice.subscriptions,0);assert.deepEqual([...a.ids],['back-b']);
 alice.replace({'back-old':true});assert.deepEqual([...a.ids],['back-b']);
});
test('a late read from a previous account cannot change the current account',async()=>{
 let late;const stale={on:(_,cb)=>{late=cb;},off(){},update(){throw Error('unexpected write');}};
 const a=make();void a.connect('alice',stale);await a.connect('bob',backend({'back-b':true}));late({val:()=>({'back-a':true})});assert.deepEqual([...a.ids],['back-b']);
});
test('retry after a failed initial read reconnects and saves the pending edit',async()=>{
 const a=make(),cloud=backend();cloud.readFail=true;assert.equal(await a.connect('alice',cloud),false);
 a.toggle('back-a');assert.equal(a.status,'error','editing does not hide retry after a failed read');cloud.readFail=false;await a.retry();await tick();
 assert.equal(cloud.value['back-a'],true);assert.equal(a.status,'synced');assert.equal(cloud.subscriptions,1);
});
test('malformed cache and unavailable localStorage never crash a wishlist',()=>{
 const storage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
 const a=make(storage);assert.equal(a.toggle('back-a'),'added');assert(a.ids.has('back-a'));
});
