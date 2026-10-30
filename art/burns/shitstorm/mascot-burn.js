/* Approved Shitstorm mascot: an offline render of the genuine rig, with live card debris.
   The source rig and capture recipe are documented in docs/shitstorm-mascot-burn.md.
   No audio, game-state mutation, account IO or Three.js dependency at runtime. */
(() => {
  'use strict';
  const ROOT = new URL('.', document.currentScript.src), TAU = Math.PI * 2, DURATION = 2;
  const clamp = x => Math.max(0, Math.min(1, x));
  const sm = (a, b, t) => { const q = clamp((t - a) / (b - a)); return q * q * (3 - 2 * q); };
  const active = new Set();
  let atlas, poster, meta, loading, failureAt = 0;
  function image(name) {
    return new Promise((resolve, reject) => {
      const img = new Image(); img.onload = () => resolve(img); img.onerror = reject;
      img.src = new URL(name, ROOT).href;
    });
  }
  function preload() {
    if (atlas) return Promise.resolve(true);
    if (loading) return loading;
    if (failureAt && performance.now() - failureAt < 10000) return Promise.resolve(false);
    loading = Promise.all([image('mascot-atlas-v2.webp'), image('mascot-poster.webp'),
      fetch(new URL('mascot-atlas-v2.json', ROOT)).then(r => { if (!r.ok) throw Error('atlas metadata'); return r.json(); })
    ]).then(([a, p, m]) => { atlas = a; poster = p; meta = m; return true; }).catch(() => {
      failureAt = performance.now(); return false;
    }).finally(() => { loading = null; });
    return loading;
  }
  // The rig's spin is baked into the atlas (one turn over frames 25-41, constant size), so a faster spin
  // re-uses those frames: SPIN_TURNS turns across 0.83-1.83s (the rig's own turn and a half), the frame
  // nearest the wanted angle is drawn, and the shrink into the pile is a scale about the tip.
  const SPIN_TURNS = 4, SPIN_FROM = .83, SPIN_TO = 1.83, LOOP_FROM = 25, LOOP_TO = 41;
  function spin(t) { return TAU * SPIN_TURNS * sm(SPIN_FROM, SPIN_TO, t); }
  function loopFrame(t) {
    const want = spin(t) % TAU; let best = LOOP_FROM, gap = 9;
    for (let f = LOOP_FROM; f <= LOOP_TO; f++) {
      const a = TAU * sm(.88, 1.48, f / 30 * 1.06), d = Math.abs(((a - want + Math.PI * 3) % TAU) - Math.PI);
      if (d < gap) { gap = d; best = f; }
    }
    return best;
  }
  function size(t) {
    const s = t * 1.06;
    return (.06 + .94 * sm(.12, .56, s)) * (1 - .997 * sm(1.48, 1.94, s));
  }
  function seeded(seed) { return () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; }; }
  function particles() {
    const rnd = seeded(7391);
    return Array.from({ length: 42 }, (_, i) => ({
      type: i % 7 < 4 ? 'paper' : i % 7 < 6 ? 'goo' : 'ember',
      u: .18 + rnd() * .40, theta: rnd() * TAU, release: .90 + rnd() * .31,
      speed: .48 + rnd() * .35, turn: rnd() * TAU, roll: (rnd() - .5) * 12,
      w: (i % 7 === 0 ? .050 : .024) + rnd() * .020, h: (i % 7 === 0 ? .075 : .045) + rnd() * .028,
      uv: [rnd() * .70, rnd() * .66, .20 + rnd() * .12, .22 + rnd() * .10],
      skew: rnd() * .25
    }));
  }
  function layout(w, h, x, y, card, scale, opts = {}) {
    const b = meta.bounds, tip = meta.tip;
    // Coordinates stay within the host; the page's header is outside its burn layer.
    const top = opts.topInset ?? (h > 420 ? 52 : 8);
    const baseY = Math.max(top + 24, Math.min(h - 8, y - card.H * .12));
    const bh = b[3] - b[1], maxBodyH = Math.max(24, Math.min(card.H * 3.15, baseY - top, w * .82));
    const S = maxBodyH / bh;
    const left = x - tip[0] * S, upper = baseY - tip[1] * S;
    return { w, h, x, y, S, left, upper, baseY, bodyH: bh * S, card, scale };
  }
  function radius(u) {
    const p = meta.radius, at = clamp(u) * (p.length - 1), i = Math.floor(at);
    return p[i] + ((p[Math.min(i + 1, p.length - 1)] || 0) - p[i]) * (at - i);
  }
  function particleAt(p, t, l) {
    const age = t - p.release;
    if (age < -.10 || age > .80) return null;
    const theta = p.theta + spin(age < 0 ? t : p.release);
    const k = size(age < 0 ? t : p.release);
    const r = radius(p.u) * l.S * k, h = p.u * l.bodyH * k;
    let x = Math.sin(theta) * r, z = Math.cos(theta) * r, y = -h;
    if (age > 0) {
      const v = l.bodyH * p.speed;
      x += Math.cos(theta) * v * age;
      z -= Math.sin(theta) * v * age;
      y -= l.bodyH * (.35 * age - .22 * age * age);
    }
    // Same front/back convention as the source camera (+Z); emission stays below the face.
    return { p, age, x: l.x + x, y: l.baseY + y + z * .055, z,
      alpha: sm(-.10, .02, age) * (1 - sm(.48, .80, age)) * (1 - sm(1.80, 2, t)) };
  }
  function path(g, w, h, skew) {
    g.beginPath(); g.moveTo(-w * .5, -h * .43); g.lineTo(w * .4, -h * .5);
    g.lineTo(w * .5, -h * .10); g.lineTo(w * (.18 + skew), h * .02);
    g.lineTo(w * .43, h * .37); g.lineTo(-w * .26, h * .5);
    g.lineTo(-w * .48, h * .14); g.closePath();
  }
  function drawParticle(g, q, l, face, back) {
    const { p, age } = q, unit = l.bodyH;
    const w = Math.max(2, p.w * unit), h = Math.max(3, p.h * unit);
    g.save(); g.translate(q.x, q.y); g.rotate(p.turn + Math.max(0, age) * p.roll);
    g.globalAlpha = q.alpha;
    if (p.type === 'paper') {
      const flip = Math.cos(p.turn + Math.max(0, age) * 10);
      g.scale(Math.max(.14, Math.abs(flip)), 1);
      path(g, w, h, p.skew); g.save(); g.clip();
      const texture = flip >= 0 ? face : back;
      if (texture) {
        const [u,v,uw,vh] = p.uv;
        g.drawImage(texture, u * texture.width, v * texture.height, uw * texture.width, vh * texture.height, -w/2, -h/2, w, h);
      } else { g.fillStyle = '#e5d6b7'; g.fillRect(-w/2,-h/2,w,h); }
      const heat = g.createLinearGradient(0,-h/2,0,h/2);
      heat.addColorStop(0,'rgba(255,176,79,.04)'); heat.addColorStop(1,'rgba(221,99,15,.38)');
      g.fillStyle = heat; g.fillRect(-w/2,-h/2,w,h); g.restore();
      g.strokeStyle = '#684024'; g.lineWidth = .65; g.stroke();
    } else if (p.type === 'goo') {
      const r = w * .42;
      g.beginPath(); g.moveTo(0,-r * (1.6 + Math.max(0, age)));
      g.bezierCurveTo(r,-r*.35,r*1.15,r*.80,0,r);g.bezierCurveTo(-r*1.2,r*.8,-r,-r*.2,0,-r*1.6);
      const wet = g.createRadialGradient(-r*.35,-r*.25,.1,0,0,r*1.4);
      wet.addColorStop(0,'#b87a43'); wet.addColorStop(.28,'#824019'); wet.addColorStop(1,'#2c1309');
      g.fillStyle = wet; g.fill();
      g.strokeStyle = '#d89a57'; g.lineWidth = .6; g.beginPath();g.moveTo(-r*.6,0);g.quadraticCurveTo(-r*.4,-r*.7,0,-r*.8);g.stroke();
      g.fillStyle = '#ffe6bccc';g.beginPath();g.ellipse(-r*.3,-r*.25,.45,r*.26,-.35,0,TAU);g.fill();
    } else {
      g.fillStyle = '#ffc16c';g.beginPath();g.ellipse(0,0,Math.max(.6,w*.16),Math.max(1,w*.35),0,0,TAU);g.fill();
    }
    g.restore();
  }
  function ground(g, t, l) {
    const a = sm(0,.20,t) * (1-sm(1.65,2,t)); if (!a) return;
    g.save();g.translate(l.x,l.baseY+5);g.scale(1,.26);g.globalAlpha=a;
    const r=l.bodyH*.47,grad=g.createRadialGradient(0,0,1,0,0,r);
    grad.addColorStop(0,'rgba(255,188,74,.40)');grad.addColorStop(.42,'rgba(240,119,30,.20)');grad.addColorStop(1,'rgba(240,119,30,0)');
    g.fillStyle=grad;g.beginPath();g.arc(0,0,r,0,TAU);g.fill();
    g.lineWidth=1.2;g.strokeStyle='rgba(244,178,76,.50)';
    for(let i=0;i<2;i++){g.beginPath();g.ellipse(0,0,r*(.52+i*.20),r*(.52+i*.20),0,t*5+i*3,t*5+i*3+2.0);g.stroke();}
    g.restore();
  }
  function cardPose(t) { const p=sm(.28,.58,t);return {alpha:1-sm(.48,.60,t),scale:1-.94*p,angle:-.11*p,y:-.16*p}; }
  function paint(g, t, l, data, calm) {
    g.clearRect(0,0,l.w,l.h);
    if (calm) {
      g.globalAlpha = sm(0,.12,t)*(1-sm(.50,.80,t));
      g.drawImage(poster,l.left,l.upper,l.S,l.S);g.globalAlpha=1;return;
    }
    ground(g,t,l);
    if (!data.clone && data.face) {
      const q=cardPose(t);g.save();g.translate(l.x,l.y+q.y*l.card.H);g.rotate((l.card.rot||0)*Math.PI/180+q.angle);
      g.scale(q.scale,q.scale);g.globalAlpha=q.alpha;g.drawImage(data.face,-l.card.W/2,-l.card.H/2,l.card.W,l.card.H);g.restore();
    }
    const qs=data.particles.map(p=>particleAt(p,t,l)).filter(Boolean).sort((a,b)=>a.z-b.z);
    for(const q of qs)if(q.z<0)drawParticle(g,q,l,data.face,data.back);
    const spinning = t >= SPIN_FROM, frame = spinning ? loopFrame(t) : Math.min(59, Math.max(0, Math.floor(t * 30)));
    const k = spinning ? size(t) : 1, tx = l.left + meta.tip[0] * l.S, ty = l.upper + meta.tip[1] * l.S;
    // Exactly one draw for the animated character; all its facial motion is from the approved rig.
    g.save(); g.imageSmoothingQuality = 'high'; g.translate(tx, ty); g.scale(k, k); g.translate(-tx, -ty);
    const slot = meta.index[frame], cell = meta.cell, pitch = cell + meta.gutter;
    g.drawImage(atlas,(slot%meta.columns)*pitch,Math.floor(slot/meta.columns)*pitch,cell,cell,l.left,l.upper,l.S,l.S); g.restore();
    for(const q of qs)if(q.z>=0)drawParticle(g,q,l,data.face,data.back);
  }
  function loadSnapshot(url, data, key) {
    if (!url) return;
    const img=new Image(); img.onload=()=>{if(!data.disposed)data[key]=img;};img.src=url;
  }
  function play(host,x,y,scale=1,calm=false,opts={}) {
    preload(); if(!atlas||!host?.isConnected||document.hidden)return false;
    clear(host);
    const card=opts.card||{W:56,H:80,rot:0}, els=(opts.cardEls||[]).filter(e=>e?.isConnected);
    const hr=host.getBoundingClientRect(), top=els.at(-1);
    if(top){const r=top.getBoundingClientRect();x=r.x+r.width/2-hr.x;y=r.y+r.height/2-hr.y;}
    const w=host.clientWidth||hr.width,h=host.clientHeight||hr.height;
    if(!w||!h)return false;
    const topInset=host.id==='burnFxLayer'?Math.max(8,(document.querySelector('header')?.getBoundingClientRect().bottom||44)-hr.top+10):8;
    const l=layout(w,h,x,y,card,scale,{...opts,topInset}),dpr=Math.min(devicePixelRatio||1,window.FxLoad?.lite?1.25:2);
    const canvas=document.createElement('canvas');canvas.className='bfx lb3d-canvas shitstorm-mascot';canvas.dataset.levelBurn='burn-lvl-shitstorm';
    canvas.width=Math.ceil(w*dpr);canvas.height=Math.ceil(h*dpr);canvas.style.cssText=`position:absolute;inset:0;width:${w}px;height:${h}px;pointer-events:none;z-index:2`;
    const g=canvas.getContext('2d');if(!g)return false;g.setTransform(dpr,0,0,dpr,0,0);
    const data={face:opts.face,back:opts.back,particles:particles(),clone:null,disposed:false};
    loadSnapshot(opts.faceUrl,data,'face');loadSnapshot(opts.backUrl,data,'back');
    const clone=top?.cloneNode(true);
    if(clone&&!calm){clone.removeAttribute('id');clone.removeAttribute('data-card-id');clone.querySelectorAll('[id],[data-card-id]').forEach(e=>{e.removeAttribute('id');e.removeAttribute('data-card-id');});
      clone.classList.add('shitstorm-card-copy');clone.style.cssText+=`;position:absolute!important;left:${x-card.W/2}px!important;top:${y-card.H/2}px!important;width:${card.W}px!important;height:${card.H}px!important;margin:0!important;visibility:visible!important;pointer-events:none!important;z-index:1!important;transition:none!important;animation:none!important;`;host.appendChild(clone);data.clone=clone;}
    host.appendChild(canvas);
    const core=host.querySelector('.shop-burn-core'),coreVisibility=core?.style.visibility;if(core)core.style.visibility='hidden';
    let hide=null;const ids=els.map(e=>e.dataset.cardId).filter(Boolean);
    if(ids.length){hide=document.createElement('style');hide.dataset.shitstormHide='';hide.textContent=ids.map(id=>`#discardCardsWrapper [data-card-id="${CSS.escape(id)}"]`).join(',')+'{visibility:hidden!important;transition:none!important}';document.head.appendChild(hide);}
    let raf=0,timer=0,done=false;const start=performance.now(),dur=calm?.8:DURATION;
    function cleanup(){if(done)return;done=true;data.disposed=true;cancelAnimationFrame(raf);clearTimeout(timer);canvas.remove();clone?.remove();hide?.remove();if(core)core.style.visibility=coreVisibility;active.delete(cleanup);}
    cleanup.host=host;active.add(cleanup);timer=setTimeout(cleanup,3000);
    function tick(){if(!host.isConnected||!canvas.isConnected||document.hidden||(host.id==='burnFxLayer'&&document.body.classList.contains('lobby-open')))return cleanup();
      clearTimeout(timer);timer=setTimeout(cleanup,3000);
      const t=Math.max(0,window.__burnT!=null?Number(window.__burnT):(performance.now()-start)/1000);
      if(t>=dur)return cleanup();
      paint(g,t,l,data,calm);
      if(data.clone){const q=cardPose(t);clone.style.opacity=String(q.alpha);clone.style.transform=`translateY(${q.y*card.H}px) rotate(${(card.rot||0)+q.angle*180/Math.PI}deg) scale(${q.scale})`;}
      raf=requestAnimationFrame(tick);
    }
    tick();return true;
  }
  function still(canvas,t,opts={}) {
    if(!atlas)return false;
    const g=canvas.getContext('2d'),card=opts.card||{W:56,H:80,rot:0};if(!g)return false;
    const l=layout(canvas.width,canvas.height,opts.cx??canvas.width*.5,opts.cy??canvas.height*.78,card,1,{topInset:8});
    paint(g,t,l,{face:opts.face,back:opts.back,clone:null,particles:particles()},!!opts.calm);return true;
  }
  function clear(host){for(const c of [...active])if(!host||c.host===host)c();}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
  addEventListener('pagehide',()=>clear());
  addEventListener('resize',()=>clear());
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>clear());
  window.ShitstormBurn={preload,play,still,clear,get ready(){return!!atlas;},get activeCount(){return active.size;},duration:DURATION};
  // Decode once while the player is on the home screen, before a burn can be triggered.
  if('requestIdleCallback'in window)requestIdleCallback(preload,{timeout:1500});else setTimeout(preload,0);
})();
