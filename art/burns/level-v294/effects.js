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
      if(el.animate) { const a=el.animate(frames,{duration:ms,delay,fill:'both',easing:'linear'}); animations.push(a); return a; }
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
    // A shared lit ground plane makes every moving layer belong to the pile.
    const gold=i===4||i===5, hot=gold?'#ffc94d':i===1||i===3?'#ff5538':'#ff9b32';
    const ring=svg(`<ellipse cx="128" cy="184" rx="111" ry="34" fill="none" stroke="${hot}" stroke-width="7" opacity=".25"/><ellipse cx="128" cy="184" rx="111" ry="34" fill="none" stroke="#fff0c2" stroke-width="2"/>`);
    for(let n=0;n<(i===5?3:2);n++) add(ring,0,-48,240,[{opacity:0,transform:'scale(.15)'},{opacity:.85,transform:'scale(.55)',offset:.18},{opacity:0,transform:'scale(1.12)'}],650,start+n*150);
    // Directional streaks have hot heads and tapered tails, rather than floating icons.
    const streak=svg(`<defs><linearGradient id="st"><stop stop-color="${hot}" stop-opacity="0"/><stop offset=".7" stop-color="${hot}"/><stop offset="1" stop-color="#fffbe5"/></linearGradient></defs><path d="M14 128Q130 110 242 126Q130 140 14 128" fill="url(#st)"/>`);
    for(let n=0;n<(i===0?30:16);n++) {
      const a=n*2.399, r=72+(n%5)*13, deg=a*180/Math.PI;
      add(streak,0,-8,30+n%4*6,[{opacity:0,transform:`rotate(${deg}deg) scaleX(.2)`},{opacity:1,transform:`translate(${Math.cos(a)*r*.3*k}px,${Math.sin(a)*r*.19*k}px) rotate(${deg}deg)`,offset:.16},{opacity:0,transform:`translate(${Math.cos(a)*r*k}px,${Math.sin(a)*r*.62*k}px) rotate(${deg}deg) scaleX(.25)`}],480+n%4*70,start+n%5*22);
    }
    // Ash/smoke trails are staggered and continue after the main flash.
    for(let n=0;n<6;n++) add(sprite(1),(n-2.5)*16,-12,42+n%3*12,[{opacity:0,transform:'scale(.3)'},{opacity:i===1?.5:.18,offset:.25},{opacity:0,transform:`translate(${(n-2.5)*8*k}px,${-65*k}px) scale(1.35)`}],700,start+200+n*55);
    if(i===3||i===5) {
      // True helix paths pass behind and in front of the central subject.
      for(let n=0;n<14;n++) {
        const frames=Array.from({length:17},(_,j)=>{const t=j/16,a=n*2.4+t*Math.PI*3.4,r=(i===5?35+35*t:65-30*t)*k;return {opacity:j===0||j===16?0:.85,transform:`translate(${Math.cos(a)*r}px,${(-125*t+Math.sin(a)*13)*k}px) rotate(${a*180/Math.PI}deg) scale(${.65+Math.sin(a)*.2})`,zIndex:Math.sin(a)>0?3:0};});
        add(n%4===0?card(n):streak,0,-5,n%4===0?24:48,frames,1150,start+n*24);
      }
    }
    if(i===4) {
      // Gold shafts grow from the pile into the crown, with a delayed fire payoff.
      for(let n=0;n<5;n++) {
        const beam=svg('<defs><linearGradient id="shaft" x2="0" y2="1"><stop stop-color="#ffdc71" stop-opacity="0"/><stop offset=".6" stop-color="#ffe19a" stop-opacity=".45"/><stop offset="1" stop-color="#fff5d3" stop-opacity="0"/></linearGradient></defs><path d="M100 10H156L140 246H116Z" fill="url(#shaft)"/>');
        add(beam,(n-2)*21,-62,185,[{opacity:0,transform:'scaleY(.1)'},{opacity:.8,transform:'scaleY(1)',offset:.28},{opacity:.55,offset:.7},{opacity:0,transform:'scaleY(1.05) scaleX(.4)'}],1400,start-100+n*25);
      }
    }
    const glow=svg('<defs><radialGradient id="warm"><stop stop-color="#fff0b3" stop-opacity=".6"/><stop offset=".4" stop-color="#fb8317" stop-opacity=".25"/><stop offset="1" stop-color="#fb8317" stop-opacity="0"/></radialGradient></defs><circle cx="128" cy="128" r="128" fill="url(#warm)"/>');
    add(glow,0,-22,240,[{opacity:0,transform:'scale(.35)'},{opacity:.65,transform:'scale(1)',offset:.3},{opacity:0,transform:'scale(1.05)'}]);
    // Cards are separate from the effect artwork: burn, eject or ascend.
    for(let n=0;n<4;n++) {
      const rot=(n-1.5)*13, spiral=i===3||i===5;
      add(card(n),(n-1.5)*9,-4-n*3,52,[
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
      for(let n=0;n<7;n++) add(sprite(1),(n-3)*15,-12-(n%3)*12,100,[{opacity:0,transform:'scale(.15)'},{opacity:.9,transform:'scale(.85)',offset:.22},{opacity:0,transform:`translate(${(n-3)*14*k}px,${-55*k}px) scale(1.2)`}],end-start-n*35,start+n*35);
    } else if(i===2) {
      // A hot head travels once around a foreshortened ring, igniting its wake.
      for(let n=0;n<12;n++) {
        const a=n/12*Math.PI*2, dx=Math.cos(a)*77, dy=Math.sin(a)*28;
        const flame=add(sprite(2),dx,dy-16,72,[{opacity:0,transform:'scale(.15)'},{opacity:.95,transform:`rotate(${n*30}deg) scale(.85)`,offset:.2},{opacity:.65,transform:`translateY(${-16*k}px) rotate(${n*30+35}deg) scale(1)`,offset:.65},{opacity:0,transform:`translateY(${-30*k}px) scale(.4)`}],750,start+n*42);
        flame.style.zIndex=Math.sin(a)>0?3:0;
      }
    } else if(i===3) {
      add(sprite(3),0,-55,220,[{opacity:0,transform:'translateY(25px) scale(.25)'},{opacity:1,transform:'translateY(0) scale(1)',offset:.3},{opacity:.85,transform:'translateY(-8px) scale(1.04)',offset:.72},{opacity:0,transform:'translateY(-20px) scale(.45)'}],1500,start);
      for(let n=0;n<3;n++) add(sprite(2),0,-15-n*32,95+n*20,[{opacity:0,transform:`rotate(${n*60}deg) scale(.3)`},{opacity:.7,offset:.25},{opacity:0,transform:`rotate(${240+n*60}deg) scale(1.1)`}],1200,start+n*60);
    } else {
      if(i===5) {
        const storm=add(sprite(3),0,-36,195,[{opacity:0,transform:'scale(.2)'},{opacity:.95,transform:'scale(.9)',offset:.2},{opacity:1,transform:'scale(1.05)',offset:.65},{opacity:0,transform:'translateY(-18px) scale(.65)'}],end-start,start);
        storm.style.filter='hue-rotate(28deg) saturate(.75)';
      }
      // Gold flame arcs behind the separately lit crown/mascot.
      for(let n=0;n<5;n++) {
        const flame=add(sprite(2),(n-2)*23,-8-n%2*18,130+n%2*24,[{opacity:0,transform:`rotate(${n*80}deg) scale(.2)`},{opacity:.8,offset:.3},{opacity:0,transform:`rotate(${200+n*80}deg) scale(1.1)`}],end-start-100,start+n*25);
        flame.style.filter='hue-rotate(25deg) saturate(.85)';
      }
      const hero=add(sprite(i),0,i===4?-92:-96,145,[{opacity:0,transform:'translateY(25px) scale(.4)'},{opacity:1,transform:'translateY(-4px) scale(1.04)',offset:.18},{opacity:1,transform:'translateY(0) scale(1)',offset:.7},{opacity:0,transform:'translateY(-16px) scale(.85)'}],end-start,start);
      hero.style.zIndex='2';
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
    // Secondary impacts share the ring/wake delays in play().
    if(i===0) noise({at:at+.15,dur:.08,type:'highpass',f0:2400,level:.10});
    if(i===1) noise({at:at+.28,dur:.45,type:'lowpass',f0:650,f1:120,level:.12});
    if(i===2) [0,.17,.34,.5].forEach(d=>noise({at:at+d,dur:.22,type:'bandpass',f0:750+d*2200,f1:1800,level:.09}));
    if(i===3) [.2,.5,.8].forEach(d=>noise({at:at+d,dur:.25,type:'bandpass',f0:450,f1:1500,level:.08}));
    if(i===4) tone({at:at+.15,dur:.32,type:'triangle',f0:330,f1:165,level:.10});
    if(i===5) [.15,.3].forEach(d=>{tone({at:at+d,dur:.18,f0:90,f1:45,level:.12});noise({at:at+d,dur:.16,f0:1100,f1:350,level:.08});});
    const tail=Math.min(duration[i]/1000-.25,at+1.05);
    for(let n=0;n<7;n++) {
      const t=at+.12+n*(tail-at-.12)/7;
      if(i===4)tone({at:t,dur:.18,type:'triangle',f0:2100+n*170,level:.045});
      else noise({at:t,dur:.022,type:'highpass',f0:2800+n*180,level:i===0?.16:.08});
    }
  }
  window.ShLevelBurns={index,icon,play,clear,sound,impact,duration};
})();
