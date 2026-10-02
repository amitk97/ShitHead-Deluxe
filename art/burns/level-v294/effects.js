/* Level reward burns: layered art, bounded motion and sound on one clock. */
(() => {
  'use strict';
  const base = 'art/burns/level-v294/';
  const names = ['spark-snap','smoke-burst','inferno-sweep','hellfire-spiral','royal-incineration','shitstorm'];
  const impact = [.12,.20,.24,.28,.38,.32];
  const duration = [1250,1550,1650,1850,1950,2050];
  const index = id => names.indexOf(String(id).replace('burn-lvl-',''));
  const atlas = new Image(); atlas.src = base + 'layers.webp';
  const svg = (body, box = '0 0 256 256') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" width="100%" height="100%" aria-hidden="true" style="display:block;overflow:hidden">${body}</svg>`;
  const sprite = i => svg(`<image href="${base}layers.webp" width="1536" height="1024"/>`, `${i%3*512} ${Math.floor(i/3)*512} 512 512`);
  // Each portrait is a crop of the approved concept, not a frame animated in play.
  const crops = [[41,107,435,383],[512,107,420,383],[975,107,435,383],[41,607,435,383],[512,607,420,383],[975,607,435,383]];
  const icon = id => {
    const i = index(id); if(i < 0) return '';
    const [x,y,w,h] = crops[i];
    return svg(`<image href="${base}concepts.webp" width="1448" height="1086"/>`, `${x} ${y} ${w} ${h}`);
  };
  const card = i => svg(`<defs><linearGradient id="paper"><stop stop-color="#fff9df"/><stop offset=".55" stop-color="#eee5d0"/><stop offset="1" stop-color="#9f8b6a"/></linearGradient></defs><rect x="49" y="24" width="164" height="208" rx="14" fill="#5c432c"/><rect x="43" y="18" width="164" height="208" rx="14" fill="url(#paper)" stroke="#fff4cc" stroke-width="3"/><text x="56" y="55" font-family="Georgia" font-size="34" font-weight="bold" fill="${i%2?'#a71824':'#151c28'}">A</text><text x="125" y="161" text-anchor="middle" font-size="96" fill="${i%2?'#a71824':'#151c28'}">${['♠','♥','♣','♦'][i%4]}</text>`);
  const active = new Set();
  function play(id, host, x, y, scale = 1, calm = false) {
    const i = index(id); if(i < 0 || !host || document.hidden) return false;
    // Limit footprint to the visible stage, including short inline previews.
    const w = host.clientWidth || 240, h = host.clientHeight || 160;
    const k = Math.max(.1, Math.min(scale, w/310, h/255));
    x = Math.max(145*k, Math.min(w-145*k,x));
    y = Math.max(170*k, Math.min(h-60*k,y));
    const start = impact[i]*1000, end = duration[i];
    const root = document.createElement('div');
    root.className = 'bfx lb294-root';
    root.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden';
    root.dataset.levelBurn = id;
    host.appendChild(root);
    const animations = [];
    const core = host.querySelector('.shop-burn-core');
    if(core) { core.style.visibility='hidden'; root._core=core; }
    let timer;
    const cleanup = () => {
      clearTimeout(timer); animations.forEach(a => a.cancel()); root.remove(); active.delete(cleanup);
      if(core && !host.querySelector('.lb294-root')) core.style.visibility='';
    };
    cleanup.host = host; active.add(cleanup);
    const animate = (el, frames, ms, delay=0) => {
      if(el.animate) { const a=el.animate(frames,{duration:ms,delay,fill:'both',easing:'ease-in-out'}); animations.push(a); return a; }
      return null;
    };
    // Root owns lifetime; children have independent material/action trajectories.
    const clock=animate(root,[{opacity:1},{opacity:1}],end);
    if(clock) clock.onfinish=cleanup;
    timer=setTimeout(cleanup,end+100);
    const add = (html,dx,dy,size,frames,ms=end,delay=0) => {
      const el=document.createElement('div'); el.className='bfx lb294-piece';
      el.style.cssText=`position:absolute;pointer-events:none;width:${size*k}px;height:${size*k}px;left:${x+(dx-size/2)*k}px;top:${y+(dy-size/2)*k}px`;
      el.innerHTML=html; root.appendChild(el); animate(el,frames,ms,delay); return el;
    };
    const fade=[{opacity:0},{opacity:1,offset:.25},{opacity:1,offset:.65},{opacity:0}];
    if(calm) { add(sprite(i),0,-35,160,fade,750); if(clock) clock.effect.updateTiming({duration:750}); clearTimeout(timer); timer=setTimeout(cleanup,850); return true; }
    const glow=svg('<defs><radialGradient id="warm"><stop stop-color="#fff0b3" stop-opacity=".6"/><stop offset=".4" stop-color="#fb8317" stop-opacity=".25"/><stop offset="1" stop-color="#fb8317" stop-opacity="0"/></radialGradient></defs><circle cx="128" cy="128" r="128" fill="url(#warm)"/>');
    add(glow,0,-22,240,[{opacity:0,transform:'scale(.35)'},{opacity:.65,transform:'scale(1)',offset:.3},{opacity:0,transform:'scale(1.05)'}]);
    // Cards are separate from the effect artwork: burn, eject or ascend.
    for(let n=0;n<4;n++) {
      const rot=(n-1.5)*13, spiral=i===3||i===5;
      add(card(n),(n-1.5)*12,-4-n*3,65,[
        {opacity:0,transform:`rotate(${rot}deg) scale(.9)`},
        {opacity:1,transform:`rotate(${rot}deg) scale(1)`,offset:.12},
        {opacity:1,transform:`translate(${(n-1.5)*12*k}px,${-20*k}px) rotate(${rot+20}deg)`,offset:.55},
        {opacity:0,transform:`translate(${(n-1.5)*(spiral?35:22)*k}px,${(spiral?-120:22)*k}px) rotate(${rot+(spiral?130:35)}deg) scale(.15)`,filter:'brightness(.3) sepia(.8)'}
      ],Math.min(1250,end-250),0);
    }
    if(i===0) {
      add(sprite(0),0,-16,220,[{opacity:0,transform:'scale(.15)'},{opacity:1,transform:'scale(.8)',offset:.2},{opacity:.8,transform:'scale(1)',offset:.55},{opacity:0,transform:'scale(1.1)'}],950,start);
    } else if(i===1) {
      // Separate plumes expand and drift, not one flat smoke picture.
      for(let n=0;n<4;n++) add(sprite(1),(n-1.5)*24,-12,125,[{opacity:0,transform:'scale(.15)'},{opacity:.9,transform:'scale(.85)',offset:.22},{opacity:0,transform:`translate(${(n-1.5)*17*k}px,${-55*k}px) scale(1.2)`}],end-start-n*35,start+n*35);
    } else if(i===2) {
      for(let n=0;n<3;n++) add(sprite(2),0,-26,220-n*24,[{opacity:0,transform:`rotate(${-100+n*30}deg) scale(.4)`},{opacity:.95,transform:`rotate(${n*30}deg) scale(.95)`,offset:.35},{opacity:0,transform:`rotate(${120+n*30}deg) scale(1.08)`}],1100,start+n*65);
    } else if(i===3) {
      add(sprite(3),0,-55,220,[{opacity:0,transform:'translateY(25px) scale(.25)'},{opacity:1,transform:'translateY(0) scale(1)',offset:.3},{opacity:.85,transform:'translateY(-8px) scale(1.04)',offset:.72},{opacity:0,transform:'translateY(-20px) scale(.45)'}],1500,start);
      for(let n=0;n<3;n++) add(sprite(2),0,-15-n*32,125+n*20,[{opacity:0,transform:`rotate(${n*60}deg) scale(.3)`},{opacity:.7,offset:.25},{opacity:0,transform:`rotate(${240+n*60}deg) scale(1.1)`}],1200,start+n*60);
    } else {
      // Gold flame arcs behind the separately lit crown/mascot.
      for(let n=0;n<3;n++) {
        const flame=add(sprite(2),0,-5-n*20,180-n*18,[{opacity:0,transform:`rotate(${n*80}deg) scale(.2)`},{opacity:.8,offset:.3},{opacity:0,transform:`rotate(${200+n*80}deg) scale(1.1)`}],end-start-100,start+n*25);
        flame.style.filter='hue-rotate(18deg) saturate(.7)';
      }
      add(sprite(i),0,-78,160,[{opacity:0,transform:'translateY(25px) scale(.4)'},{opacity:1,transform:'translateY(-4px) scale(1.04)',offset:.26},{opacity:1,transform:'translateY(0) scale(1)',offset:.7},{opacity:0,transform:'translateY(-16px) scale(.85)'}],end-start,start);
      if(i===4) add(sprite(0),0,-8,165,[{opacity:0,transform:'scale(.2)'},{opacity:.8,offset:.25},{opacity:0,transform:'scale(1.1)'}],650,start+200);
    }
    // Modest bounded particle budget. Five-point sparks, not plus signs.
    for(let n=0;n<18;n++) {
      const a=n/18*Math.PI*2, r=65+(n%4)*13, rising=i===3||i===5;
      const dx=Math.cos(a)*r*k, dy=(rising?-45-(n%6)*15:Math.sin(a)*r*.55)*k;
      const shape=n%3===0 ? svg('<path d="M128 16 153 94 236 96 169 145 191 226 128 178 65 226 87 145 20 96 103 94Z" fill="#fff3b0"/>') : svg('<path d="M70 40 184 55 166 158 114 212 60 130Z" fill="#b85019" stroke="#ffca61" stroke-width="14"/>');
      add(shape,0,-10,n%3===0?9:7,[{opacity:0,transform:'scale(.2)'},{opacity:1,offset:.12},{opacity:.8,transform:`translate(${dx*.75}px,${dy}px) rotate(${n*25}deg)`,offset:.65},{opacity:0,transform:`translate(${dx}px,${dy+(rising?-20:25)*k}px) rotate(${n*40}deg) scale(.2)`}],Math.min(900,end-start-160),start+(n%5)*25);
    }
    return true;
  }
  function clear(host) { for(const cleanup of [...active]) if(!host||cleanup.host===host) cleanup(); }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
  // Sound beats use the exact same anticipation/impact clock as the art.
  function sound(id,k) {
    const i=index(id); if(i<0)return;
    const at=impact[i], gain=[.68,.68,.88,.82,.86,.68][i];
    const tone=p=>k.tone({...p,level:(p.level||.1)*gain});
    const noise=p=>k.noise({...p,level:(p.level||.1)*gain});
    noise({dur:at,type:'bandpass',f0:500+i*130,f1:1400,q:.7,level:.13,attack:at*.55});
    if(i===0) {
      noise({at,dur:.065,type:'highpass',f0:3600,level:.38});
      tone({at,dur:.16,type:'triangle',f0:1900,f1:700,level:.17});
    } else if(i===1) {
      tone({at,dur:.3,f0:105,f1:42,level:.42});
      noise({at,dur:.85,type:'lowpass',f0:1500,f1:180,level:.38,attack:.025});
    } else if(i===2) {
      noise({at,dur:.9,type:'bandpass',f0:400,f1:2200,q:.8,level:.38,attack:.12});
      tone({at,dur:.55,f0:80,f1:130,level:.24,attack:.06});
      noise({at:at+.65,dur:.5,f0:1800,f1:250,level:.16});
    } else if(i===3) {
      tone({at,dur:1.3,f0:65,f1:110,vibrato:6,level:.28,attack:.18});
      noise({at,dur:1.35,type:'bandpass',f0:260,f1:2100,q:.8,level:.34,attack:.28});
      tone({at:at+.8,dur:.4,type:'triangle',f0:200,f1:60,level:.12});
    } else if(i===4) {
      [523,659,784].forEach((f,n)=>tone({at:at+n*.035,dur:1.05,type:'triangle',f0:f,level:.085,attack:.03}));
      tone({at:at+.2,dur:.75,f0:1568,level:.13});
      noise({at:at+.2,dur:.65,f0:1300,f1:260,level:.28});
    } else {
      noise({at,dur:1.25,type:'bandpass',f0:280,f1:1700,q:.7,level:.3,attack:.1});
      tone({at,dur:.35,f0:110,f1:45,level:.35});
      // Three playful voiced chuckles follow the mascot's reveal.
      [.25,.43,.61].forEach((d,n)=>tone({at:at+d,dur:.14,type:'triangle',f0:260-n*28,f1:125-n*10,vibrato:12,level:.15}));
    }
    const tail=Math.min(duration[i]/1000-.25,at+1.05);
    for(let n=0;n<7;n++) {
      const t=at+.12+n*(tail-at-.12)/7;
      if(i===4)tone({at:t,dur:.18,type:'triangle',f0:2100+n*170,level:.045});
      else noise({at:t,dur:.022,type:'highpass',f0:2800+n*180,level:i===0?.16:.08});
    }
  }
  window.ShLevelBurns={index,icon,play,clear,sound,impact,duration};
})();
