/* 3D level burns (v296). Each burn is one small WebGL scene made of small
   parts: the real top Pile card as a lit, curling mesh, flame tongues, ember
   streaks, card shards, smoke and a floor shockwave, all on one clock.
   Only the top card burns (the 10, or the four-of-a-kind card); no extra
   cards are invented. Without WebGL the caller falls back to ShLevelBurns. */
(() => {
  'use strict';
  const EFFECTS = {
    'burn-lvl-inferno-sweep': { dur: 1.6, box: [4.8, 3.6, .5, .64], tile: 'art/burns/level-3d/inferno-sweep-tile.webp' },
    // Ghost Flames (seasonal Halloween): the owner's approved tile, cut into a ghost
    // layer and a fire layer (tools/make-ghost-flames.py), brought to life in WebGL.
    'burn-halloween': { dur: 2.0, box: [6.4, 5.8, .55, .78] /* previews */, tile: 'art/burns/ghost-flames/tile.webp', art: 'art/burns/ghost-flames/layers.webp?v=1', cards: 'all' }
  };
  const artImages = {};
  const artFor = id => { const src = EFFECTS[id].art; if (!src) return null; if (!artImages[src]) { artImages[src] = new Image(); artImages[src].src = src; } return artImages[src]; };
  const has = id => !!EFFECTS[id];
  const D = 4.2, PITCH = 22 * Math.PI / 180, CP = Math.cos(PITCH), SP = Math.sin(PITCH);
  const FLOOR = -.5 * CP - .02;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = t => 1 - Math.pow(1 - clamp(t), 3);
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const rng = seed => { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; };

  const VS = `attribute vec2 a_pos;attribute vec2 a_uv;attribute vec2 a_loc;attribute vec4 a_col;attribute vec4 a_k;
uniform vec2 u_res;varying vec2 v_uv;varying vec2 v_loc;varying vec4 v_col;varying vec4 v_k;
void main(){v_uv=a_uv;v_loc=a_loc;v_col=a_col;v_k=a_k;vec2 c=a_pos/u_res*2.-1.;gl_Position=vec4(c.x,-c.y,0.,1.);}`;
  const FS = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D u_tex;uniform sampler2D u_tex2;uniform float u_time;uniform float u_ar;
varying vec2 v_uv;varying vec2 v_loc;varying vec4 v_col;varying vec4 v_k;
float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(h1(i),h1(i+vec2(1.,0.)),f.x),mix(h1(i+vec2(0.,1.)),h1(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
vec3 fire(float x){vec3 c=mix(vec3(.45,.03,0.),vec3(1.,.38,.04),smoothstep(0.,.45,x));return mix(c,vec3(1.,.93,.7),smoothstep(.55,1.,x));}
float field(vec2 uv){return uv.x*.82+(1.-uv.y)*.16+(fbm(uv*vec2(4.,5.5))-.5)*.34;}
void main(){
 float k=v_k.x;
 if(k<.5){
  vec2 uv=v_uv;vec2 q=abs(uv-.5)*vec2(u_ar,1.);float r=.075;vec2 hb=vec2(.5*u_ar,.5)-vec2(r);
  if(length(max(q-hb,0.))>r)discard;
  float bf=field(uv)-v_k.w;if(bf<0.)discard;
  vec3 col=texture2D(u_tex,vec2((v_k.y+uv.x)/max(v_k.z,1.),uv.y)).rgb*v_col.rgb;
  float ch=1.-smoothstep(.02,.24,bf);
  col=mix(col,vec3(.08,.035,.015),ch*.93);
  col+=vec3(1.,.42,.08)*ch*ch*.45*(.55+.45*vn(uv*34.+u_time*9.));
  float rim=1.-smoothstep(0.,.07,bf);
  col=mix(col,fire(.5+.5*rim),rim);
  gl_FragColor=vec4(col,1.)*v_col.a;
 } else if(k<1.5){
  vec2 p=v_loc;float t=u_time*2.6+v_k.y*10.;
  float x=p.x+(vn(vec2(p.y*3.2-t*2.4,v_k.y*31.))-.5)*.75*p.y;
  float w=pow(1.-p.y,.85)*smoothstep(-.04,.2,p.y);
  float d=abs(x)/max(w,.001);
  float body=1.-smoothstep(.45,1.,d);
  float lick=fbm(vec2(p.x*1.7+v_k.y*5.,p.y*2.6-t*3.));
  float inten=body*smoothstep(.12,.62,lick+(1.-p.y)*.55-.22);
  float heat=inten*(.9-p.y*.55)*(1.-d*.35);
  vec3 c=fire(heat)*inten*v_k.w*.62;
  gl_FragColor=vec4(c,max(c.r,max(c.g,c.b))*.8);
 } else if(k<2.5){
  float d=length(v_loc);float core=exp(-d*d*4.5);
  vec3 c=mix(v_col.rgb,vec3(1.,.97,.85),exp(-d*d*18.))*core*v_col.a*(.45+.55*(v_loc.x*.5+.5));
  gl_FragColor=vec4(c,max(c.r,max(c.g,c.b))*.8);
 } else if(k<3.5){
  float d=length(v_loc)+(fbm(v_loc*1.7+v_k.y*7.+vec2(0.,-u_time*.7))-.5)*.75;
  float a=(1.-smoothstep(.3,1.,d))*v_col.a;
  gl_FragColor=vec4(v_col.rgb*a,a);
 } else if(k<4.5){
  float an=atan(v_loc.y,v_loc.x);float seg=floor((an+3.1416)*1.15);
  float rl=.6+.4*h1(vec2(seg,v_k.y*13.));float d=length(v_loc)/rl;if(d>1.)discard;
  float heat=v_k.w;
  vec3 tex=texture2D(u_tex,v_uv).rgb;
  vec3 col=mix(tex*v_col.rgb,vec3(.07,.03,.015),.45+.5*(1.-heat));
  col=mix(col,vec3(.32,.3,.29),smoothstep(.15,0.,heat)*.7);
  float e=smoothstep(.45,1.,d);
  col+=fire(.3+.45*e)*e*heat*.9;
  gl_FragColor=vec4(col,1.)*v_col.a;
 } else if(k<5.5){
  float d=length(v_loc);float band=exp(-pow((d-.82)/.09,2.));float inner=(1.-smoothstep(0.,.85,d))*.25;
  vec3 c=v_col.rgb*(band+inner)*v_col.a;
  gl_FragColor=vec4(c,max(c.r,max(c.g,c.b))*.8);
 } else if(k<6.5){
  float d=min(1.,length(v_loc));vec3 c=v_col.rgb*exp(-d*d*3.2)*(1.-d*d)*v_col.a;
  gl_FragColor=vec4(c,max(c.r,max(c.g,c.b))*.7);
 } else if(k<7.5){
  // Painted art layer (v_k.y: atlas slot, z: reveal 0..1, w: smoke flow): the
  // smoke keeps flowing, gains fine moving detail and dissolves in and out.
  float t=u_time;vec2 uv=v_uv;
  vec2 fl=vec2(fbm(uv*vec2(3.,4.)+vec2(v_k.y*7.,-t*.9)),fbm(uv*vec2(3.,4.)+vec2(5.2,-t*1.1)))-.5;
  uv+=fl*v_k.w*vec2(.03,.045)*(.35+uv.y);
  if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.)discard;
  vec4 c=texture2D(u_tex2,vec2((uv.x+v_k.y)*.5,uv.y));
  float fld=fbm(v_uv*5.+vec2(0.,t*.5))*.62+(1.-v_uv.y)*.38;
  float m=smoothstep(fld-.1,fld+.02,v_k.z*1.18);
  float detail=.78+.5*fbm(v_uv*vec2(13.,17.)+vec2(t*.3,-t*1.5));
  vec3 col=c.rgb*detail+vec3(.55,.9,1.)*m*(1.-m)*3.*c.a;
  float a=c.a*m*v_col.a;
  gl_FragColor=vec4(col*a,a*.8);
 } else {
  // Spectral fire volume: domain-warped noise rising, violet edges, cyan body, white core.
  vec2 p=v_loc;float t=u_time*1.5+v_k.y*9.;
  vec2 q=vec2(p.x*2.4,p.y*2.8-t*1.6);
  float w=fbm(q+(fbm(q*1.3+vec2(t*.35,0.))-.5)*1.6);
  float shape=(1.-p.y)*(1.-smoothstep(.35,1.,abs(p.x)))*smoothstep(0.,.18,p.y);
  float f=smoothstep(.3,.95,w*1.2*shape+shape*.3-p.y*.15);
  vec3 c=mix(vec3(.32,.12,.78),vec3(.3,.86,1.),smoothstep(.35,.8,f));
  c=mix(c,vec3(.94,.92,1.),smoothstep(.8,1.,f))*f*v_k.w;
  gl_FragColor=vec4(c,max(c.r,max(c.g,c.b))*.7);
 }
}`;

  // ---- The card's face, drawn to match the real pile card it replaces ----
  function readCard(el) {
    if (!el || !el.offsetWidth) return null;
    const cs = getComputedStyle(el);
    const W = el.offsetWidth, H = el.offsetHeight, br = el.getBoundingClientRect();
    const m = (el.style.transform || '').match(/rotate\((-?[\d.]+)deg\)/);
    const rot = m ? parseFloat(m[1]) : 0, th = -rot * Math.PI / 180;
    const local = child => {
      const r = child.getBoundingClientRect(), dx = r.left + r.width / 2 - (br.left + br.width / 2), dy = r.top + r.height / 2 - (br.top + br.height / 2);
      return { x: W / 2 + dx * Math.cos(th) - dy * Math.sin(th), y: H / 2 + dx * Math.sin(th) + dy * Math.cos(th) };
    };
    const parts = [];
    el.querySelectorAll('.card-corner-rank, .card-corner-suit, .card-centre-suit').forEach(s => {
      const c = getComputedStyle(s);
      parts.push({ text: s.textContent.trim(), font: `${c.fontStyle} ${c.fontWeight} ${c.fontSize} ${c.fontFamily}`, color: c.color, ...local(s) });
    });
    const icon = el.querySelector('svg.card-centre-icon');
    if (icon) {
      const c = getComputedStyle(icon), use = icon.querySelector('use'), id = use && (use.getAttribute('href') || '').slice(1), sym = id && document.getElementById(id);
      if (sym) parts.push({ svg: sym.innerHTML, box: sym.getAttribute('viewBox') || '0 0 24 24', color: c.color, w: parseFloat(c.width) || W * .5, h: parseFloat(c.height) || W * .5, ...local(icon) });
    }
    return { W, H, rot, bg: cs.backgroundColor, border: cs.borderTopColor, bw: parseFloat(cs.borderTopWidth) || 2, radius: parseFloat(cs.borderTopLeftRadius) || 10, parts };
  }
  function defaultCard(H) {
    const b = getComputedStyle(document.body), v = n => b.getPropertyValue(n).trim();
    const W = H * .7, font = b.fontFamily, red = v('--text-red') || '#ef4444';
    return { W, H, rot: 0, bg: v('--card-bg') || '#0f172a', border: v('--card-border') || '#334155', bw: 2, radius: H * .1, parts: [
      { text: '10', font: `normal 900 ${H * .17}px ${font}`, color: red, x: W * .22, y: H * .13 },
      { text: '♥', font: `normal 700 ${H * .13}px ${font}`, color: red, x: W * .2, y: H * .27 },
      { text: '♥', font: `normal 900 ${H * .38}px ${font}`, color: red, x: W * .5, y: H * .58 }] };
  }
  function drawFace(card, onIcon) {
    const FH = 320, s = FH / card.H, FW = Math.round(card.W * s);
    const cv = document.createElement('canvas'); cv.width = FW; cv.height = FH;
    const g = cv.getContext('2d');
    const paint = img => {
      g.clearRect(0, 0, FW, FH);
      g.fillStyle = card.bg; g.fillRect(0, 0, FW, FH);
      // A faint paper grain and top light so the lit mesh reads as card stock.
      const lg = g.createLinearGradient(0, 0, FW, FH); lg.addColorStop(0, 'rgba(255,255,255,.07)'); lg.addColorStop(1, 'rgba(0,0,0,.12)');
      g.fillStyle = lg; g.fillRect(0, 0, FW, FH);
      g.lineWidth = card.bw * s * 1.2; g.strokeStyle = card.border;
      const r = card.radius * s, i = g.lineWidth / 2;
      g.beginPath(); g.roundRect ? g.roundRect(i, i, FW - 2 * i, FH - 2 * i, r) : g.rect(i, i, FW - 2 * i, FH - 2 * i); g.stroke();
      g.textAlign = 'center'; g.textBaseline = 'middle';
      card.parts.forEach(p => {
        if (p.svg) { if (img) g.drawImage(img, (p.x - p.w / 2) * s, (p.y - p.h / 2) * s, p.w * s, p.h * s); return; }
        g.fillStyle = p.color; g.font = p.font.replace(/([\d.]+)px/, (_, n) => `${parseFloat(n) * s}px`);
        g.fillText(p.text, p.x * s, p.y * s + parseFloat(p.font.match(/([\d.]+)px/)?.[1] || 10) * s * .06);
      });
    };
    paint(null);
    const ic = card.parts.find(p => p.svg);
    if (ic) {
      const img = new Image();
      img.onload = () => { paint(img); onIcon && onIcon(); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ic.box}" width="${ic.w * s}" height="${ic.h * s}" style="color:${ic.color}" color="${ic.color}">${ic.svg}</svg>`);
    }
    return cv;
  }


  // ---- Simulation: deterministic, stepped at 120Hz from t = 0 ----
  // cards: the real pile cards (top card last), each with its offset from the top card.
  function makeSim(cards, opts) {
    const top = cards[cards.length - 1], rand = rng(opts.seed || 1931), R = (a, b) => a + (b - a) * rand();
    const ghost = opts.id === 'burn-halloween', n = cards.length, T = .62;
    const S = { t: 0, ghost, T, artK: opts.artK || 1, calm: !!opts.calm, flames: [], embers: [], smoke: [], shards: [], acc: {}, n, ar: top.W / top.H,
      cards: cards.map((c, i) => ({ i, ar: c.W / c.H, rot0: -c.rot * Math.PI / 180, ox: (c.dx || 0) / top.H, oy: -(c.dy || 0) / top.H, last: -.3,
        side: n === 1 ? .55 : i === n - 1 ? .45 : (i % 2 ? 1 : -1) * (.9 + .2 * i) })) };
    const hw = S.ar / 2;
    S.waveX = t => t < .26 ? -1.5 + (t / .26) * (1.5 - hw) : t < .9 ? -hw + (t - .26) / .64 * (hw * 2 + .15) : hw + .15 + (t - .9) / .3 * 1.6;
    S.front = (c, t) => S.calm ? -.25 + clamp(t / .7) * 1.45
      : ghost ? -.25 + clamp((t - T - .03 - c.i * .06) / .75) * 1.45 : -.25 + clamp((t - .24) / .66) * 1.45;
    S.pose = (c, t) => {
      if (S.calm) return { rx: 0, ry: 0, rz: c.rot0, tx: c.ox, ty: c.oy, tz: 0, heat: clamp(t / .3) };
      if (ghost) {
        // Trembles as the wraith gathers, then is ripped away and tumbles out.
        const tr = smooth(.1, .5, t), u = Math.max(0, t - T - c.i * .05);
        if (t < T + c.i * .05) return { rx: -.05 * tr, ry: 0, rz: c.rot0 + Math.sin(t * 38 + c.i * 2) * .025 * tr, tx: c.ox, ty: c.oy + .04 * tr, tz: .08 * tr, heat: .6 * tr };
        return { rx: -.05 - 2.4 * u, ry: c.side * 3.2 * u, rz: c.rot0 + c.side * 1.6 * u, tx: c.ox + c.side * 1.3 * u, ty: c.oy + .04 + 2 * u - 1.6 * u * u, tz: .08 + 1.1 * u, heat: 1 };
      }
      const e = ease((t - .2) / .55), w = Math.sin(t * 13) * .02 * e;
      return { rx: -.22 * e + w, ry: .3 * e, rz: c.rot0 - .18 * ease((t - .25) / .6), tx: .12 * e, ty: .16 * e, tz: .7 * e, heat: smooth(.12, .3, t) };
    };
    // Card light: the passing fire (Inferno) or the wraith's cold glow (Ghost).
    S.light = (p, pose, t) => {
      if (ghost) { const g = smooth(.1, .5, t) * (1 - smooth(1.4, 1.9, t)); return [1 + .2 * g, 1 + .3 * g, 1 + .75 * g]; }
      const f = S.calm ? .25 * pose.heat : 1.1 * Math.exp(-Math.pow(p[0] - S.waveX(t), 2) / .3) * pose.heat;
      return [1 + .9 * f, 1 + .38 * f, 1 + .05 * f];
    };
    S.cardZ = t => ghost ? .3 : S.pose(S.cards[0], t).tz;
    // Card local (u,v) -> view space, with the edge ahead of the fire curling.
    S.cardPoint = (c, u, v, pose, front) => {
      const fu = (front - .16 * (1 - v)) / .82, d = u - fu;
      let x = (u - .5) * c.ar, y = .5 - v;
      let z = S.calm ? 0 : pose.heat * (.42 * Math.exp(-Math.max(0, d) * 5) + .07 * Math.sin(Math.PI * v));
      let co = Math.cos(pose.rz), si = Math.sin(pose.rz); [x, y] = [x * co - y * si, x * si + y * co];
      co = Math.cos(pose.rx); si = Math.sin(pose.rx); [y, z] = [y * co - z * si, y * si + z * co];
      co = Math.cos(pose.ry); si = Math.sin(pose.ry); [x, z] = [x * co + z * si, -x * si + z * co];
      return [x + pose.tx, y + pose.ty, z + pose.tz];
    };
    const emit = (key, rate, dt, fn) => { S.acc[key] = (S.acc[key] || 0) + rate * dt; while (S.acc[key] >= 1) { S.acc[key] -= 1; fn(); } };
    const toWorld = ([x, y, z]) => [x, y * CP + z * SP, -y * SP + z * CP];
    // A burning card feeds its own small flames, embers, smoke and shards.
    const burnCard = (c, t, dt) => {
      const pose = S.pose(c, t), front = S.front(c, t);
      if (front > -.05 && front < 1.1) {
        const at = v => toWorld(S.cardPoint(c, clamp((front - .16 * (1 - v)) / .82 + .02), v, pose, front));
        emit('cflame' + c.i, 34, dt, () => { const [x, y, z] = at(R(.05, .95)); S.flames.push({ x, y: y - .05, z: z + .02, w: R(.1, .16), h: R(.14, .28), age: 0, life: R(.3, .45), seed: rand(), lean: R(.05, .2) }); });
        emit('cember' + c.i, 70, dt, () => S.embers.push({ p: at(R(0, 1)), v: [R(.2, 1.1), R(.4, 1.4), R(-.2, .6)], age: 0, life: R(.45, .85), size: R(1.6, 3.6), seed: rand() * 6.28 }));
        emit('csmoke' + c.i, 7, dt, () => S.smoke.push({ p: at(R(.1, .9)), v: [R(0, .2), R(.4, .6), 0], age: 0, life: R(.7, 1), size: R(.22, .34), seed: rand() }));
        emit('shard' + c.i, Math.max(0, front - c.last) * 46 / dt, dt, () => {
          const v = R(.04, .96), u = clamp((front - .16 * (1 - v)) / .82 + R(-.02, .04));
          S.shards.push({ c: c.i, p: toWorld(S.cardPoint(c, u, v, pose, front)), uv: [u, v], v: [R(.45, 1.3) * (ghost ? Math.sign(c.side) : 1), R(.3, 1.15), R(-.4, .6)], a: [R(0, 6), R(0, 6), R(0, 6)], w: [R(-11, 11), R(-11, 11), R(-9, 9)], s: R(.035, .07), age: 0, life: R(.55, .9), seed: rand() });
        });
      }
      c.last = front;
    };
    S.step = dt => {
      const t = S.t + dt; S.t = t;
      if (!S.calm) {
        if (ghost) {
          // Cold wisps and violet haze rise around the Pile the whole time.
          if (t < 1.5) emit('wisp', 70, dt, () => S.embers.push({ pal: 1, p: [R(-1.4, 1.4), FLOOR + R(0, .5), R(-.4, .7)], v: [R(-.3, .3), R(.5, 1.3), R(-.1, .2)], age: 0, life: R(.6, 1.1), size: R(1.6, 3.4), seed: rand() * 6.28 }));
          if (t < 1.3) emit('haze', 9, dt, () => S.smoke.push({ col: [.42, .3, .75], p: [R(-1.3, 1.3), FLOOR + R(.1, .5), R(-.4, .3)], v: [R(-.1, .1), R(.3, .55), 0], age: 0, life: R(.8, 1.2), size: R(.35, .55), seed: rand() }));
          if (t > T && t < T + .03) for (let i = 0; i < 26; i++) { const a = R(0, 6.28); S.embers.push({ pal: 1, p: [0, .1, .3], v: [Math.cos(a) * R(1, 2.4), Math.abs(Math.sin(a)) * R(.8, 2.2), R(-.4, .8)], age: 0, life: R(.5, .9), size: R(2, 4), seed: rand() * 6.28 }); }
          S.cards.forEach(c => burnCard(c, t, dt));
        } else {
          const X = S.waveX(t);
          if (t < 1.15) emit('flame', 44, dt, () => {
            const x = X + R(-.2, .05), near = Math.exp(-x * x / .25);
            S.flames.push({ x, y: FLOOR, z: R(-.55, .55), w: R(.26, .4) * (1 + .3 * near), h: R(.45, .85) * (1 + .3 * near), age: 0, life: R(.4, .62), seed: rand(), lean: R(.1, .26) });
          });
          if (t < 1.1) emit('ember', 125, dt, () => S.embers.push({ p: [X + R(-.15, .1), FLOOR + R(0, .25), R(-.5, .5)], v: [R(.3, 1.3), R(.6, 1.7), R(-.35, .35)], age: 0, life: R(.5, 1), size: R(2, 4.6), seed: rand() * 6.28 }));
          if (t < 1.2) emit('smoke', 13, dt, () => S.smoke.push({ p: [X - R(.25, .5), FLOOR + R(.1, .35), R(-.45, .35)], v: [R(.05, .25), R(.35, .6), 0], age: 0, life: R(.8, 1.15), size: R(.3, .45), seed: rand() }));
          burnCard(S.cards[0], t, dt);
        }
      }
      for (const f of S.flames) f.age += dt;
      for (const e of S.embers) {
        e.age += dt; e.v[0] += Math.sin(t * 9 + e.seed) * .9 * dt; e.v[1] -= .25 * dt;
        e.v.forEach((_, i) => { e.v[i] *= 1 - .9 * dt; e.p[i] += e.v[i] * dt; });
      }
      for (const m of S.smoke) { m.age += dt; m.p[0] += m.v[0] * dt; m.p[1] += m.v[1] * dt; }
      for (const s of S.shards) {
        s.age += dt; s.v[1] += (s.age < .35 ? .3 : -1.1) * dt;
        for (let i = 0; i < 3; i++) { s.v[i] *= 1 - .8 * dt; s.p[i] += s.v[i] * dt; s.a[i] += s.w[i] * dt; }
      }
      const live = a => a.filter(o => o.age < o.life);
      S.flames = live(S.flames); S.embers = live(S.embers); S.smoke = live(S.smoke); S.shards = live(S.shards);
    };
    S.advance = t => { while (S.t + 1 / 120 <= t) S.step(1 / 120); };
    return S;
  }

  // ---- Rendering: everything is projected on the CPU into one triangle stream ----
  function makeRenderer(canvas, faceCanvas, art) {
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true });
    if (!gl) return null;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    [['a_pos', 2, 0], ['a_uv', 2, 2], ['a_loc', 2, 4], ['a_col', 4, 6], ['a_k', 4, 10]].forEach(([n, size, off]) => {
      const l = gl.getAttribLocation(pr, n); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, 56, off * 4);
    });
    const U = n => gl.getUniformLocation(pr, n);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    const texture = (unit, src) => {
      const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
      [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(p => gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return () => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src()); };
    };
    const upload = texture(0, () => faceCanvas);
    upload();
    const R = { gl, upload, U, art: false, release() { const x = gl.getExtension('WEBGL_lose_context'); x && x.loseContext(); } };
    if (art) {
      const up = texture(1, () => art), ready = () => { up(); R.art = true; };
      if (art.complete && art.naturalWidth) ready(); else art.addEventListener('load', ready, { once: true });
    }
    gl.uniform1i(U('u_tex'), 0); gl.uniform1i(U('u_tex2'), 1); gl.enable(gl.BLEND);
    return R;
  }

  function drawFrame(R, S, cam) {
    const { gl, U } = R, t = S.t, out = { art: [], back: [], mid: [], front: [] };
    const { F, cx, cy } = cam;
    const proj = (x, y, z) => { const k = D / Math.max(.5, D - z); return [cx + F * x * k, cy - F * y * k, k]; };
    const projW = ([x, y, z]) => proj(x, y * CP - z * SP, y * SP + z * CP);
    const quad = (arr, P, uv, loc, col, k) => { for (const i of [0, 1, 2, 0, 2, 3]) arr.push(P[i][0], P[i][1], uv[i][0], uv[i][1], loc[i][0], loc[i][1], col[0], col[1], col[2], col[3], k[0], k[1], k[2], k[3]); };
    const LOC = [[-1, -1], [1, -1], [1, 1], [-1, 1]], Z4 = [[0, 0], [0, 0], [0, 0], [0, 0]], UP = [[-1, 0], [1, 0], [1, 1], [-1, 1]];
    const billboard = (arr, w, r, col, k) => { const [x, y, s] = projW(w), q = r * F * s; quad(arr, [[x - q, y - q], [x + q, y - q], [x + q, y + q], [x - q, y + q]], Z4, LOC, col, k); };
    const glowAt = (arr, [x, y, z], r, col) => { const [px, py, s] = proj(x, y, z), q = r * F * s; quad(arr, [[px - q, py - q], [px + q, py - q], [px + q, py + q], [px - q, py + q]], Z4, LOC, col, [6, 0, 0, 0]); };
    const ring = (y, r, a, col) => quad(out.back, [[-r, y, -r], [r, y, -r], [r, y, r], [-r, y, r]].map(projW), Z4, LOC, [...col, a], [5, 0, 0, 0]);
    const bump = (a, b, c) => smooth(a, b, t) * (1 - smooth(b, c, t));
    const cardZ = S.cardZ(t);
    if (S.ghost && !S.calm) {
      // The owner's art in two depth layers: the fire bank, and the wraith above it,
      // which rises, lunges at the Pile on the strike and drifts apart.
      const K = S.artK, AW = 5.6 * K, AH = AW * 288 / 395, PU = .58, PV = .74, lunge = bump(.46, .62, 1.0);
      const layer = (slot, z, s, dy, reveal, flow) => {
        const P = [[0, 0], [1, 0], [1, 1], [0, 1]];
        quad(out.art, P.map(([u, v]) => proj((u - PU) * AW * s, (PV - v) * AH * s + dy, z)), P, Z4, [1, 1, 1, 1], [7, slot, reveal, flow]);
      };
      const gs = 1 + .12 * lunge, gdy = -.7 * (1 - ease((t - .08) / .6)) - .2 * lunge + .7 * smooth(1.25, 1.95, t);
      if (R.art) {
        layer(1, -.5, 1, 0, smooth(0, .4, t) * (1 - smooth(1.45, 1.95, t)), 1.4);
        layer(0, -.7, gs, gdy, smooth(.12, .62, t) * (1 - smooth(1.3, 1.85, t)), 1);
      }
      const vol = (arr, x0, x1, y0, y1, z, inten, seed) => {
        const P = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => proj(x, y, z));
        quad(arr, P, Z4, UP, [1, 1, 1, 1], [8, seed, 0, inten]);
      };
      const env = smooth(0, .3, t) * (1 - smooth(1.3, 1.9, t));
      vol(out.back, -2.1 * K, 2.1 * K, -.6, 2.1 * K, -.3, .85 * env, .3);
      // Eyes flare as it locks on, flash on the strike, then smoulder.
      const eye = smooth(.4, .55, t) * (1 - smooth(1.2, 1.6, t)) + 1.2 * bump(.5, .58, .8);
      [[.665, .21], [.735, .21]].forEach(([u, v]) => {
        const p = [(u - PU) * AW * gs, (PV - v) * AH * gs + gdy, -.7];
        glowAt(out.back, p, .32, [.5, .92, 1, eye * .9]);
        const [px, py, s] = proj(...p), w = .55 * F * s * (.6 + .4 * eye), h = .03 * F * s;
        quad(out.back, [[px - w, py - h], [px + w, py - h], [px + w, py + h], [px - w, py + h]], Z4, [[-1, 0], [1, 0], [1, 0], [-1, 0]], [.75, .97, 1, eye * .8], [2, 0, 0, 0]);
      });
      const flash = bump(.56, .62, .9);
      if (flash > 0) glowAt(out.back, [0, .1, 0], 1.7, [.72, .68, 1, flash]);
      for (const [d, col] of [[0, [.75, .6, 1]], [.12, [.45, .9, 1]]]) { const rt = (t - S.T - d) / .6; if (rt > 0 && rt < 1) ring(FLOOR, .2 + 1.6 * ease(rt), (1 - rt) * .9, col); }
      vol(out.front, -1.7 * K, 1.7 * K, -.62, (.5 + .5 * lunge) * K, .65, (.6 + .7 * bump(.5, .62, .95)) * env, .8);
    } else if (!S.calm) {
      // Floor light that travels with the wave, the ignition flash, the floor shockwave.
      const X = S.waveX(t);
      billboard(out.back, [X, FLOOR + .15, 0], 1.0, [1, .45, .12, .55 * smooth(0, .15, t) * (1 - smooth(1, 1.4, t))], [6, 0, 0, 0]);
      const fl = bump(.22, .32, .7);
      if (fl > 0) billboard(out.back, [0, 0, 0], .9, [1, .8, .5, fl], [6, 0, 0, 0]);
      const rt = (t - .52) / .55;
      if (rt > 0 && rt < 1) ring(FLOOR, .2 + 1.3 * ease(rt), (1 - rt) * .9, [1, .57, .27]);
    }
    for (const m of S.smoke) {
      const a = m.age / m.life, alpha = .24 * smooth(0, .2, a) * (1 - smooth(.5, 1, a));
      billboard(out.mid, m.p, m.size * (1 + a * 1.3), [...(m.col || [.11, .09, .08]), alpha], [3, m.seed, 0, 0]);
    }
    // The card meshes, lit from the front-top and by the effect around them.
    const GX = 18, GY = 26, L = [-.35, .55, .76];
    for (const c of S.cards) {
      const pose = S.pose(c, t), front = S.front(c, t);
      if (front >= 1.2) continue;
      const P = [], N = [];
      for (let j = 0; j <= GY; j++) for (let i = 0; i <= GX; i++) P.push(S.cardPoint(c, i / GX, j / GY, pose, front));
      for (let j = 0; j <= GY; j++) for (let i = 0; i <= GX; i++) {
        const a = P[j * (GX + 1) + Math.min(GX, i + 1)], b = P[j * (GX + 1) + Math.max(0, i - 1)], cc = P[Math.min(GY, j + 1) * (GX + 1) + i], d = P[Math.max(0, j - 1) * (GX + 1) + i];
        const ux = [a[0] - b[0], a[1] - b[1], a[2] - b[2]], vy = [d[0] - cc[0], d[1] - cc[1], d[2] - cc[2]];
        let n = [ux[1] * vy[2] - ux[2] * vy[1], ux[2] * vy[0] - ux[0] * vy[2], ux[0] * vy[1] - ux[1] * vy[0]];
        const l = Math.hypot(...n) || 1; n = n.map(q => q / l); if (n[2] < 0) n = n.map(q => -q);
        const p = P[j * (GX + 1) + i], lit = .62 + .5 * Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]), tint = S.light(p, pose, t);
        N.push(tint.map(q => q * lit));
      }
      const pp = P.map(p => proj(...p));
      for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
        const id = [j * (GX + 1) + i, j * (GX + 1) + i + 1, (j + 1) * (GX + 1) + i + 1, (j + 1) * (GX + 1) + i];
        for (const q of [0, 1, 2, 0, 2, 3]) {
          const v = id[q], p = pp[v], col = N[v];
          out.mid.push(p[0], p[1], (v % (GX + 1)) / GX, Math.floor(v / (GX + 1)) / GY, 0, 0, col[0], col[1], col[2], 1, 0, c.i, S.n, front);
        }
      }
    }
    // Shards: small pieces of the real cards, tumbling in 3D as they burn out.
    for (const s of S.shards) {
      const a = s.age / s.life, heat = clamp(1 - a / .7), alpha = 1 - smooth(.65, 1, a), sz = s.s * (1 - .35 * a);
      const [ax, ay, az] = s.a, cxr = Math.cos(ax), sxr = Math.sin(ax), cyr = Math.cos(ay), syr = Math.sin(ay), czr = Math.cos(az), szr = Math.sin(az);
      const corner = ([lx, ly]) => {
        let x = lx * sz, y = ly * sz, z = 0;
        [x, y] = [x * czr - y * szr, x * szr + y * czr]; [y, z] = [y * cxr - z * sxr, y * sxr + z * cxr]; [x, z] = [x * cyr + z * syr, -x * syr + z * cyr];
        const w = s.p, vy = w[1] * CP - w[2] * SP, vz = w[1] * SP + w[2] * CP;
        return proj(w[0] + x, vy + y, vz + z);
      };
      const tu = sz / S.ar, tv = sz, ci = s.c || 0;
      const uv = LOC.map(([lx, ly]) => [(ci + clamp(s.uv[0] + lx * tu)) / S.n, clamp(s.uv[1] - ly * tv)]);
      quad(out.mid, LOC.map(corner), uv, LOC, [1, 1, 1, alpha], [4, s.seed, 0, heat]);
    }
    // Flames and embers in front of the cards add over them; those behind sit under them.
    for (const f of S.flames) {
      const a = f.age / f.life, env = smooth(0, .18, a) * (1 - smooth(.55, 1, a)), h = f.h * (.35 + .65 * env);
      const b = projW([f.x, f.y, f.z]), tp = projW([f.x + f.lean * h, f.y + h, f.z]), hw = f.w * F * b[2] * .5;
      const dx = tp[0] - b[0], dy = tp[1] - b[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * hw, ny = dx / l * hw;
      const arr = (f.y * SP + f.z * CP) > cardZ ? out.front : out.back;
      quad(arr, [[b[0] - nx, b[1] - ny], [b[0] + nx, b[1] + ny], [tp[0] + nx * .8, tp[1] + ny * .8], [tp[0] - nx * .8, tp[1] - ny * .8]], Z4, UP, [1, 1, 1, 1], [1, f.seed, a, env * 1.15]);
    }
    for (const e of S.embers) {
      const a = e.age / e.life, head = projW(e.p), tail = projW([e.p[0] - e.v[0] * .07, e.p[1] - e.v[1] * .07, e.p[2] - e.v[2] * .07]);
      const r = e.size * cam.px * head[2] * (1 - .5 * a), dx = head[0] - tail[0], dy = head[1] - tail[1], l = Math.hypot(dx, dy) || 1;
      const ux = dx / l, uy = dy / l, ext = l * .5 + r;
      const mx = (head[0] + tail[0]) / 2, my = (head[1] + tail[1]) / 2;
      const col = e.pal ? (a < .4 ? [.75, .95, 1] : a < .7 ? [.5, .62, 1] : [.62, .32, .95]) : a < .35 ? [1, .78, .35] : a < .7 ? [1, .45, .1] : [.85, .18, .04];
      const arr = (e.p[1] * SP + e.p[2] * CP) > cardZ ? out.front : out.back;
      quad(arr, [[mx - ux * ext + uy * r, my - uy * ext - ux * r], [mx + ux * ext + uy * r, my + uy * ext - ux * r], [mx + ux * ext - uy * r, my + uy * ext + ux * r], [mx - ux * ext - uy * r, my - uy * ext + ux * r]], Z4, LOC, [...col, 1 - smooth(.6, 1, a)], [2, e.seed, 0, 0]);
    }
    gl.viewport(0, 0, cam.w, cam.h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(U('u_res'), cam.w, cam.h); gl.uniform1f(U('u_time'), t); gl.uniform1f(U('u_ar'), S.ar);
    const draw = (arr, add) => {
      if (!arr.length) return;
      gl.blendFunc(gl.ONE, add ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STREAM_DRAW); gl.drawArrays(gl.TRIANGLES, 0, arr.length / 14);
    };
    draw(out.art, false); draw(out.back, true); draw(out.mid, false); draw(out.front, true);
  }

  // All card faces side by side in one texture (card i at slot i).
  function faceAtlas(cards, onChange) {
    const atlas = document.createElement('canvas'), faces = [];
    const paint = () => {
      atlas.width = faces.reduce((w, f) => w + f.width, 0); atlas.height = faces[0].height;
      let x = 0; const g = atlas.getContext('2d');
      faces.forEach(f => { g.drawImage(f, x, 0); x += f.width; });
      onChange && onChange();
    };
    cards.forEach(c => faces.push(drawFace(c, () => paint())));
    onChange = null; paint();
    return { atlas, setOnChange: fn => { onChange = fn; } };
  }

  const active = new Set();
  // host: positioned layer; x/y: the top card centre in host pixels;
  // opts.cardEls: the real pile cards on the table (top card last).
  function play(id, host, x, y, scale = 1, calm = false, opts = {}) {
    const fx = EFFECTS[id]; if (!fx || !host || document.hidden) return false;
    const els = (opts.cardEls || []).filter(el => el && el.offsetWidth).slice(fx.cards === 'all' ? -3 : -1);
    const hr = host.getBoundingClientRect();
    let cards = els.map(readCard);
    if (cards.length) {
      const centre = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2 - hr.left, r.top + r.height / 2 - hr.top]; };
      [x, y] = centre(els[els.length - 1]);
      cards.forEach((c, i) => { const [cx, cy] = centre(els[i]); c.dx = cx - x; c.dy = cy - y; });
    } else {
      const [bw, bh] = fx.box;
      cards = [defaultCard(opts.cardH || Math.max(30, Math.min(110, (host.clientHeight || 160) / (bh - .4), (host.clientWidth || 240) / (bw - .4))))];
    }
    const H = cards[cards.length - 1].H, dpr = Math.min(2, window.devicePixelRatio || 1);
    // The painted scene fits the screen width; the cards stay their real size.
    const hw = host.clientWidth || 390, hh = host.clientHeight || 844, artK = fx.art ? Math.min(1, hw * .98 / (5.6 * H)) : 1;
    // A painted scene gets the whole layer, so its smoke is never cut by a canvas edge.
    const [bw, bh, bx, by] = fx.box, x0 = fx.art ? 0 : Math.max(0, x - H * bw * bx), y0 = fx.art ? 0 : Math.max(0, y - H * bh * by);
    const ox = Math.round(x0), oy = Math.round(y0), cw = Math.round(fx.art ? hw : Math.min(hw, x + H * bw * (1 - bx)) - ox), ch = Math.round(fx.art ? hh : Math.min(hh, y + H * bh * (1 - by)) - oy);
    const canvas = document.createElement('canvas');
    canvas.className = 'bfx lb3d-canvas'; canvas.dataset.levelBurn = id;
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    canvas.style.cssText = `position:absolute;left:${ox}px;top:${oy}px;width:${cw}px;height:${ch}px;pointer-events:none;z-index:2`;
    const faces = faceAtlas(cards);
    let R;
    try { R = makeRenderer(canvas, faces.atlas, artFor(id)); } catch (e) { R = null; }
    if (!R) return false;
    faces.setOnChange(() => R.upload());
    host.appendChild(canvas);
    const core = host.querySelector('.shop-burn-core'); if (core) core.style.visibility = 'hidden';
    // The real cards hide while their 3D copies burn (by id: re-renders keep them hidden).
    const ids = els.map(el => el.dataset.cardId).filter(Boolean);
    let hide = null;
    if (ids.length) {
      hide = document.createElement('style');
      hide.textContent = ids.map(cid => `#discardCardsWrapper [data-card-id="${CSS.escape(cid)}"]`).join(',') + '{visibility:hidden!important}';
      document.head.appendChild(hide);
    }
    const S = makeSim(cards, { id, calm, seed: 1931, artK });
    const dur = calm ? .8 : fx.dur;
    const cam = { F: H * dpr, px: dpr, cx: (x - ox) * dpr, cy: (y - oy) * dpr, w: canvas.width, h: canvas.height };
    const start = performance.now();
    let raf = 0, done = false;
    const cleanup = () => {
      if (done) return; done = true; cancelAnimationFrame(raf); clearTimeout(timer);
      canvas.remove(); hide && hide.remove(); R.release(); active.delete(cleanup);
      if (core && !host.querySelector('.lb3d-canvas, .lb294-root')) core.style.visibility = '';
    };
    cleanup.host = host; active.add(cleanup);
    let timer = setTimeout(cleanup, 3000);
    const frame = () => {
      const t = Math.min(dur, (performance.now() - start) / 1000);
      clearTimeout(timer); timer = setTimeout(cleanup, 3000); // ends it if frames stop
      S.advance(t);
      if (calm) canvas.style.opacity = String(1 - smooth(.55, .8, t));
      drawFrame(R, S, cam);
      if (t >= dur) return cleanup();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return true;
  }
  // A still of any moment, for tiles and tests.
  function still(id, canvas, t, opts = {}) {
    const card = opts.card || defaultCard(opts.cardH || canvas.height / 3.2);
    const R = makeRenderer(canvas, faceAtlas([card]).atlas, artFor(id)); if (!R) return false;
    const S = makeSim([card], { id, seed: 1931 }); S.advance(t);
    drawFrame(R, S, { F: card.H, px: 1, cx: canvas.width * (opts.cx ?? .5), cy: canvas.height * (opts.cy ?? .62), w: canvas.width, h: canvas.height });
    return true;
  }
  function clear(host) { for (const c of [...active]) if (!host || c.host === host) c(); }
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
  const icon = id => EFFECTS[id] ? `<img src="${EFFECTS[id].tile}" alt="" draggable="false" style="display:block;width:100%;height:100%;object-fit:cover;border-radius:inherit">` : '';

  // Sounds on the same clocks as the scenes.
  const SOUNDS = {
    // Rising rush, ignition at the card, roar and crackle while it burns, floor thump, cooling embers.
    'burn-lvl-inferno-sweep': k => {
      k.noise({ dur: .3, type: 'bandpass', f0: 300, f1: 1500, q: .7, level: .106, attack: .22 });
      k.noise({ at: .26, dur: .16, type: 'lowpass', f0: 2200, f1: 400, level: .277, attack: .008 });
      k.tone({ at: .26, dur: .3, f0: 110, f1: 46, level: .264 });
      k.noise({ at: .3, dur: .75, type: 'bandpass', f0: 500, f1: 1700, q: .6, level: .198, attack: .06 });
      k.tone({ at: .3, dur: .65, type: 'sawtooth', f0: 62, f1: 78, vibrato: 7, level: .040, attack: .08 });
      [.34, .41, .47, .55, .6, .68, .74, .81, .88].forEach((at, n) => k.noise({ at, dur: .028, type: 'highpass', f0: 2600 + n * 160, level: .132 }));
      k.tone({ at: .52, dur: .34, f0: 82, f1: 38, level: .224 });
      k.noise({ at: .52, dur: .4, type: 'lowpass', f0: 900, f1: 160, level: .158 });
      k.noise({ at: .9, dur: .5, type: 'highpass', f0: 3200, f1: 1800, level: .046, attack: .05 });
      [1, 1.12, 1.21, 1.33, 1.44].forEach((at, n) => k.noise({ at, dur: .02, type: 'highpass', f0: 3600 - n * 200, level: .066 - n * .008 }));
    },
    // Ghost Flames: cold rush as the fire rises (0–0.4), a two-voice moan as the wraith
    // gathers, a glassy chime as its eyes flare (0.55), the strike (0.62: thump + tear),
    // crackling cards (0.65–1.1), the floor rings, then a hiss as it drifts apart.
    'burn-halloween': k => {
      k.noise({ dur: .45, type: 'bandpass', f0: 220, f1: 1300, q: .8, level: .2, attack: .3 });
      k.tone({ at: .18, dur: .8, type: 'triangle', f0: 294, f1: 220, level: .1, attack: .2, vibrato: 12 });
      k.tone({ at: .22, dur: .75, type: 'triangle', f0: 220, f1: 165, level: .07, attack: .2, vibrato: 9 });
      [1568, 2093].forEach((f0, n) => k.tone({ at: .54 + n * .02, dur: .5, f0, f1: f0 * .98, level: .06, attack: .01 }));
      k.tone({ at: .62, dur: .32, f0: 96, f1: 40, level: .3 });
      k.noise({ at: .62, dur: .14, type: 'highpass', f0: 1800, f1: 4200, level: .3 });
      [.66, .72, .77, .83, .88, .95, 1.02, 1.1].forEach((at, n) => k.noise({ at, dur: .03, type: 'bandpass', f0: 2400 + n * 150, q: 3, level: .16 }));
      k.noise({ at: .74, dur: .35, type: 'lowpass', f0: 700, f1: 140, level: .14 });
      k.noise({ at: 1.2, dur: .75, type: 'highpass', f0: 3200, f1: 1400, level: .06, attack: .12 });
    }
  };
  const sound = (id, k) => SOUNDS[id] && SOUNDS[id](k);
  window.ShLevel3D = { has, play, still, clear, icon, sound, effects: EFFECTS };
})();
