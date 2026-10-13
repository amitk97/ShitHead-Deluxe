// Finds candidate puzzles: random Hands and Piles with exactly one or two winning lines.
// node tools/puzzle-search.js  → prints the hardest, writes /tmp/found.json. Curate by hand.
const E=require('../js/puzzle-engine.js');
function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const found=[];
for(let seed=1;seed<=400000;seed++){
 const r=rng(seed), R=E.ORDER;
 const pool=[];R.forEach(x=>{for(let i=0;i<4;i++)pool.push(x)});
 const pick=()=>pool.splice(Math.floor(r()*pool.length),1)[0];
 // pile by simulation
 let pos={hand:[],pile:[],constraint:null,base:null};
 const pl=Math.floor(r()*5);
 for(let i=0;i<pl;i++){const c=R.filter(x=>x!=='10'&&E.legal(x,pos));const x=c[Math.floor(r()*c.length)];const q=E.play(pos,x,1);if(q.burn)break;pool.splice(pool.indexOf(x),1);pos=q.pos;}
 // 'again' on opponent plays doesn't matter; constraint stays as left by last play
 const hs=5+Math.floor(r()*4);pos.hand=[];for(let i=0;i<hs;i++)pos.hand.push(pick());
 const {solutions,nodes}=E.solve(pos,5);
 if(solutions.length>=1&&solutions.length<=2) found.push({seed,pos,sol:solutions,nodes,len:solutions[0].length});
}
console.log(found.length);
found.sort((a,b)=>b.nodes-a.nodes);
for(const f of found.slice(0,15))console.log(f.seed,f.nodes,f.len,f.sol.length,f.pos.hand.join(' '),'| pile',f.pos.pile.join(' '),f.pos.constraint||'',f.pos.base||'', JSON.stringify(f.sol[0].map(m=>m.n+'x'+m.rank)));
require('fs').writeFileSync('/tmp/found.json',JSON.stringify(found));
