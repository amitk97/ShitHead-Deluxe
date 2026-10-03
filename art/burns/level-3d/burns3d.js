/* 3D level burns (v296). Each burn is one small WebGL scene made of small
   parts: the real top Pile card as a lit, curling mesh, flame tongues, ember
   streaks, card shards, smoke and a floor shockwave, all on one clock.
   Only the top card burns (the 10, or the four-of-a-kind card); no extra
   cards are invented. Without WebGL the caller falls back to ShLevelBurns. */
(() => {
  'use strict';
  const EFFECTS = {
    // Default Burn (everyone's burn until they equip one): the owner's fire bursting up out of the coals.
    'default': { dur: 1.9, box: [5, 5.4, .5, .6], tile: 'art/burns/default/tile.webp', art: 'art/burns/default/layers.webp?v=1', layout: [4.4, 402 / 498, .45, .6] },
    // Inferno Sweep (Lvl 40): the owner's swirl of fire, swept across by a whip of flame; the rubble in front.
    'burn-lvl-inferno-sweep': { dur: 2.0, box: [5, 5, .5, .6], tile: 'art/burns/inferno-sweep/tile.webp', art: 'art/burns/inferno-sweep/layers.webp?v=1', layout: [5, 413 / 437, .5, .55] },
    // Spark Snap (Lvl 5): the owner's spark explosion, snapping out from the card; the rubble in front.
    'burn-lvl-spark-snap': { dur: 1.9, box: [5, 5.4, .5, .55], tile: 'art/burns/spark-snap/tile.webp', art: 'art/burns/spark-snap/layers.webp?v=1', layout: [4.4, 412 / 434, .615, .525] },
    // Painted-art burns: the owner's approved tile cut into two layers (tools/make-burn-layers.py),
    // brought to life in WebGL. layout: art width in card heights, height/width, where the Pile sits.
    // Ghost Flames (seasonal Halloween): a ghost layer and a fire layer; every pile card burns.
    'burn-halloween': { dur: 2.0, box: [6.4, 5.8, .55, .78] /* previews */, tile: 'art/burns/ghost-flames/tile.webp', art: 'art/burns/ghost-flames/layers.webp?v=1', cards: 'all', layout: [5.6, 288 / 395, .58, .74] },
    // Smoke Burst (Lvl 20): the cloud and its front puffs; only the top card shows (the rest hide).
    'burn-lvl-smoke-burst': { dur: 2.0, box: [6, 6.2, .5, .52], tile: 'art/burns/smoke-burst/tile.webp', art: 'art/burns/smoke-burst/layers.webp?v=1', layout: [4.8, 404 / 439, .5, .52] },
    // Royal Incineration (Lvl 80): the crown (whole, its own layer) and the golden fire burst under it.
    'burn-lvl-royal-incineration': { dur: 2.0, box: [5, 5.4, .5, .66], tile: 'art/burns/royal-incineration/tile.webp', art: 'art/burns/royal-incineration/layers.webp?v=1', layout: [4.2, 436 / 432, .49, .68] },
    // Hellfire Spiral (Lvl 60): the magma tornado (cards painted out) and the rubble at its base in front.
    'burn-lvl-hellfire-spiral': { dur: 2.0, box: [5, 5.6, .5, .8], tile: 'art/burns/hellfire-spiral/tile.webp', art: 'art/burns/hellfire-spiral/layers.webp?v=2', layout: [4.6, 444 / 434, .5, .8] },
    // The ShitStorm (Lvl 99): the spinning storm (cards painted out) and the face, exactly as painted, on its own layer.
    'burn-lvl-shitstorm': { dur: 2.0, box: [5, 5.6, .5, .82], tile: 'art/burns/shitstorm/tile.webp', art: 'art/burns/shitstorm/layers.webp?v=1', layout: [4.6, 442 / 434, .5, .82] }
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
  vec3 col=mix(tex*v_col.rgb,vec3(.07,.03,.015),.2+.55*(1.-heat));
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
  float gl=step(5.,v_loc.y),sw=v_loc.y-10.*gl; // swirl amount; +10 adds the spin gloss
  uv.x+=sw*.022*sin(uv.y*24.-t*9.)*(.25+uv.y); // swirl: bands travel round the funnel
  if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.)discard;
  vec4 c=texture2D(u_tex2,vec2((uv.x+v_k.y)*.5,uv.y));
  float fld=fbm(v_uv*5.+vec2(0.,t*.5))*.62+(1.-v_uv.y)*.38;
  if(v_loc.x>1.5)fld=fbm(v_uv*5.+vec2(0.,t*.5))*.3+v_uv.x*.75+abs(v_uv.y-.55)*.12; // sweep: left to right
  else if(v_loc.x>.5)fld=fbm(v_uv*5.+vec2(0.,t*.5))*.55+length(v_uv-.5)*.9; // radial: the centre first
  float m=smoothstep(fld-.1,fld+.02,v_k.z*1.18);
  if(v_loc.x>1.5)m*=1.-smoothstep(fld-.1,fld+.02,(v_loc.x-2.)*1.18); // ...and burns out behind it
  float detail=.78+.5*fbm(v_uv*vec2(13.,17.)+vec2(t*.3,-t*1.5));
  vec3 col=c.rgb*detail+v_col.rgb*m*(1.-m)*3.*c.a;
  col+=gl*vec3(1.,.84,.5)*pow(max(0.,sin((uv.x*1.7-t*2.8)*6.2832+uv.y*3.)),10.)*.6*c.a; // highlights sweeping round: it spins
  float o=c.a*m; // v_col.a above 1 makes a layer fully opaque (solid magma)
  gl_FragColor=vec4(col*o*min(v_col.a,1.),o*min(1.,.8*v_col.a));
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
    const kind = { 'burn-halloween': 'ghost', 'burn-lvl-smoke-burst': 'smoke', 'burn-lvl-royal-incineration': 'royal', 'burn-lvl-hellfire-spiral': 'spiral', 'burn-lvl-shitstorm': 'spiral', 'burn-lvl-spark-snap': 'snap', 'default': 'blaze' }[opts.id] || 'inferno', ghost = kind === 'ghost', smoke = kind === 'smoke', royal = kind === 'royal', spiral = kind === 'spiral', snap = kind === 'snap', blaze = kind === 'blaze';
    const n = cards.length, T = smoke ? .2 : royal ? .42 : spiral ? .3 : snap ? .26 : blaze ? .16 : .62, storm = opts.id === 'burn-lvl-shitstorm';
    const S = { t: 0, kind, storm, ghost, T, slots: n + 1, layout: (EFFECTS[opts.id] || {}).layout, artK: opts.artK || 1, calm: !!opts.calm, flames: [], embers: [], smoke: [], shards: [], acc: {}, n, ar: top.W / top.H,
      cards: cards.map((c, i) => ({ i, ar: c.W / c.H, rot0: -c.rot * Math.PI / 180, ox: (c.dx || 0) / top.H, oy: -(c.dy || 0) / top.H, last: -.3,
        side: n === 1 ? .55 : i === n - 1 ? .45 : (i % 2 ? 1 : -1) * (.9 + .2 * i) })) };
    const hw = S.ar / 2;
    S.waveX = t => t < .26 ? -1.5 + (t / .26) * (1.5 - hw) : t < .9 ? -hw + (t - .26) / .64 * (hw * 2 + .15) : hw + .15 + (t - .9) / .3 * 1.6;
    S.front = (c, t) => S.calm ? -.25 + clamp(t / .7) * 1.45
      : ghost ? -.25 + clamp((t - T - .03 - c.i * .06) / .75) * 1.45
      : smoke ? -.25 + clamp((t - .78) / .7) * 1.45 : royal ? -.25 + clamp((t - .9) / .62) * 1.45 : spiral ? -.25 + clamp((t - .85) / .62) * 1.45 : snap ? -.25 + clamp((t - .62) / .62) * 1.45 : blaze ? -.25 + clamp((t - .72) / .72) * 1.45 : -.25 + clamp((t - .24) / .66) * 1.45;
    S.pose = (c, t) => {
      if (S.calm) return { rx: 0, ry: 0, rz: c.rot0, tx: c.ox, ty: c.oy, tz: 0, heat: clamp(t / .3) };
      if (smoke) {
        // Trembles with heat, is lifted by the blast and hangs in the cloud, rocking, as it burns.
        const tr = smooth(0, T, t), e = ease((t - T) / .5), w = Math.sin(t * 7) * .06 * e;
        if (t < T) return { rx: 0, ry: 0, rz: c.rot0 + Math.sin(t * 50) * .02 * tr, tx: c.ox, ty: c.oy, tz: .03 * tr, heat: .5 * tr };
        return { rx: -.2 * e + w, ry: .35 * Math.sin(t * 3.2) * e, rz: c.rot0 + .1 * Math.sin(t * 2.4) * e, tx: c.ox, ty: c.oy + .14 * e, tz: .45 * e, heat: 1 };
      }
      if (snap) {
        // Fizzes as the charge builds, then the snap kicks it back and spins it (its back flashes past).
        const tr = smooth(0, T, t), e = ease((t - T) / .35), u = Math.max(0, t - T);
        if (t < T) return { rx: 0, ry: 0, rz: c.rot0 + Math.sin(t * 70) * .03 * tr, tx: c.ox, ty: c.oy, tz: .03 * tr, heat: .6 * tr };
        return { rx: -.35 * e, ry: 2.2 * u + .8 * u * u, rz: c.rot0 - .25 * e, tx: c.ox, ty: c.oy + .06 * e, tz: .4 * e, heat: 1 };
      }
      if (blaze) {
        // Trembles over the glowing coals, then the updraft lifts it into the flames, where it sways as it burns.
        const tr = smooth(0, T, t), e = ease((t - T) / .55), w = Math.sin(t * 9) * .05 * e;
        if (t < T) return { rx: 0, ry: 0, rz: c.rot0 + Math.sin(t * 60) * .02 * tr, tx: c.ox, ty: c.oy, tz: .03 * tr, heat: .5 * tr };
        return { rx: -.18 * e + w, ry: .22 * Math.sin(t * 2.6) * e, rz: c.rot0 + .06 * Math.sin(t * 3.1) * e, tx: c.ox, ty: c.oy + .12 * e, tz: .38 * e, heat: 1 };
      }
      if (spiral) {
        // Shudders as the vortex wakes, then is lifted and spun by it (its back turns to us).
        const tr = smooth(0, T, t), e = ease((t - T) / .5), u = Math.max(0, t - T);
        if (t < T) return { rx: 0, ry: 0, rz: c.rot0 + Math.sin(t * 52) * .025 * tr, tx: c.ox, ty: c.oy, tz: .04 * tr, heat: .5 * tr };
        return { rx: -.12 * e, ry: 1.1 * u + 1.3 * u * u, rz: c.rot0 + .1 * Math.sin(t * 5) * e, tx: c.ox, ty: c.oy + .1 * e, tz: .36 * e, heat: 1 };
      }
      if (royal) {
        // Trembles as the crown comes down, then rises toward it on the strike and hangs in the fire.
        const tr = smooth(0, T, t), e = ease((t - T) / .45);
        if (t < T) return { rx: 0, ry: 0, rz: c.rot0 + Math.sin(t * 46) * .022 * tr, tx: c.ox, ty: c.oy, tz: .04 * tr, heat: .5 * tr };
        return { rx: -.16 * e + Math.sin(t * 6) * .04 * e, ry: .28 * Math.sin(t * 2.7) * e, rz: c.rot0 + .07 * Math.sin(t * 2.1) * e, tx: c.ox, ty: c.oy + .05 * e, tz: .38 * e, heat: 1 };
      }
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
      if (blaze) { const g = (smooth(.02, .3, t) * (1 - smooth(1.4, 1.85, t)) + .8 * smooth(T - .02, T, t) * (1 - smooth(T, T + .3, t))) * (.86 + .14 * Math.sin(t * 23)); return [1 + 1 * g, 1 + .45 * g, 1 + .08 * g]; }
      if (smoke) { const g = smooth(.05, .3, t) * (1 - smooth(1.4, 1.9, t)); return [1 + .8 * g, 1 + .3 * g, 1 + .1 * g]; }
      if (snap) { const g = smooth(.02, T, t) * (1 - smooth(1.3, 1.8, t)) + 1.4 * smooth(T - .02, T, t) * (1 - smooth(T, T + .25, t)); return [1 + .9 * g, 1 + .75 * g, 1 + .35 * g]; }
      if (spiral) { const g = smooth(.05, .35, t) * (1 - smooth(1.4, 1.9, t)) + .7 * smooth(T - .03, T, t) * (1 - smooth(T, T + .3, t)); return storm ? [1 + .85 * g, 1 + .6 * g, 1 + .2 * g] : [1 + .9 * g, 1 + .32 * g, 1 + .08 * g]; }
      if (royal) { const g = smooth(.05, .4, t) * (1 - smooth(1.4, 1.9, t)) + .8 * smooth(T - .03, T, t) * (1 - smooth(T, T + .3, t)); return [1 + .8 * g, 1 + .6 * g, 1 + .22 * g]; }
      const f = S.calm ? .25 * pose.heat : 1.1 * Math.exp(-Math.pow(p[0] - S.waveX(t), 2) / .3) * pose.heat;
      return [1 + .9 * f, 1 + .38 * f, 1 + .05 * f];
    };
    S.cardZ = t => ghost ? .3 : smoke || royal || spiral || snap || blaze ? .35 : S.pose(S.cards[0], t).tz;
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
        if (smoke) {
          // Heat shimmer before the blast; then a ring of fragments, embers and billowing smoke.
          if (t > T && t < T + .03) for (let i = 0; i < 34; i++) {
            const a = R(0, 6.28), sp = R(1.2, 2.8);
            S.embers.push({ p: [0, .05, .3], v: [Math.cos(a) * sp, Math.sin(a) * sp * .8 + .4, R(-.6, .9)], age: 0, life: R(.5, 1), size: R(2, 4.6), seed: rand() * 6.28 });
            if (i % 2) S.shards.push({ c: n - 1, p: [Math.cos(a) * .25, .05 + Math.sin(a) * .25, R(0, .4)], uv: [R(.1, .9), R(.1, .9)], v: [Math.cos(a) * sp * .8, Math.sin(a) * sp * .6 + .6, R(-.4, .9)], a: [R(0, 6), R(0, 6), R(0, 6)], w: [R(-9, 9), R(-9, 9), R(-6, 6)], s: R(.06, .11), age: 0, life: R(.8, 1.2), seed: rand() });
          }
          if (t > T && t < 1.5) emit('puff', 22, dt, () => { const a = R(0, 6.28), r = R(.4, 1.5); S.smoke.push({ col: [.52, .47, .52], p: [Math.cos(a) * r, .05 + Math.sin(a) * r * .8, R(-.5, .2)], v: [Math.cos(a) * .3, .25 + Math.sin(a) * .2, 0], age: 0, life: R(.9, 1.3), size: R(.45, .8), seed: rand() }); });
          if (t > T && t < 1.6) emit('ember', 45, dt, () => S.embers.push({ p: [R(-1, 1), R(-.4, .8), R(-.3, .6)], v: [R(-.3, .3), R(.4, 1.1), R(-.1, .2)], age: 0, life: R(.5, .9), size: R(1.6, 3.4), seed: rand() * 6.28 }));
          S.cards.forEach(c => burnCard(c, t, dt));
        } else if (blaze) {
          // The coals smoulder and spit sparks; then the fire whooshes up: a burst of embers and ash
          // thrown upward, tall flame tongues rising from the coals all round the card (in front of it
          // and behind it), sparks streaming up, dark smoke rolling off the top, ash drifting late.
          if (t < T) emit('spit', 40, dt, () => S.embers.push({ p: [R(-.8, .8), FLOOR + R(0, .1), R(-.4, .5)], v: [R(-.2, .2), R(.5, 1.1), 0], age: 0, life: R(.3, .5), size: R(1.4, 2.6), seed: rand() * 6.28 }));
          if (t > T && t < T + .03) for (let i = 0; i < 40; i++) {
            const a = R(-.65, .65) + Math.PI / 2, sp = R(1.4, 3.2);
            S.embers.push({ p: [R(-.3, .3), FLOOR + .1, R(-.2, .5)], v: [Math.cos(a) * sp, Math.sin(a) * sp, R(-.4, .7)], age: 0, life: R(.5, 1), size: R(2, 4.6), seed: rand() * 6.28 });
            if (i % 3 === 0) S.shards.push({ c: n - 1, p: [R(-.5, .5), FLOOR + .1, R(-.2, .5)], uv: [R(.1, .9), R(.1, .9)], v: [Math.cos(a) * sp * .5, Math.sin(a) * sp * .55, R(-.3, .6)], a: [R(0, 6), R(0, 6), R(0, 6)], w: [R(-9, 9), R(-9, 9), R(-7, 7)], s: R(.03, .055), age: 0, life: R(.7, 1.1), seed: rand(), char: .6 });
          }
          if (t > T - .02 && t < 1.42) emit('flame', 46, dt, () => {
            const x = R(-1.25, 1.25), near = Math.exp(-x * x / .5);
            S.flames.push({ x, y: FLOOR, z: R(-.6, .7), w: R(.24, .4) * (1 + .35 * near), h: R(.55, 1.05) * (1 + .5 * near) * (.75 + .25 * ease((t - T) / .3)), age: 0, life: R(.35, .6), seed: rand(), lean: R(-.07, .07) - x * .04 });
          });
          if (t > T && t < 1.5) emit('ember', 95, dt, () => S.embers.push({ p: [R(-1.1, 1.1), FLOOR + R(0, .5), R(-.5, .6)], v: [R(-.25, .25), R(.9, 2), R(-.15, .25)], age: 0, life: R(.5, .95), size: R(1.6, 3.8), seed: rand() * 6.28 }));
          if (t > T + .1 && t < 1.45) emit('smoke', 11, dt, () => S.smoke.push({ col: [.13, .1, .09], p: [R(-.9, .9), R(.9, 1.5), R(-.5, .1)], v: [R(-.1, .1), R(.4, .7), 0], age: 0, life: R(.8, 1.2), size: R(.4, .7), seed: rand() }));
          if (t > .8 && t < 1.5) emit('ash', 8, dt, () => S.shards.push({ c: n - 1, p: [R(-.8, .8), R(.2, 1), R(-.3, .5)], uv: [R(.1, .9), R(.1, .9)], v: [R(-.2, .2), R(.3, .7), R(-.1, .2)], a: [R(0, 6), R(0, 6), R(0, 6)], w: [R(-6, 6), R(-6, 6), R(-5, 5)], s: R(.025, .045), age: 0, life: R(.6, .9), seed: rand(), char: .7 }));
          S.cards.forEach(c => burnCard(c, t, dt));
        } else if (snap) {
          // Sparks are sucked in to the card as the charge builds; on the snap a sphere of white-gold
          // spark streaks and charred fragments blasts out, and sparks keep fizzing out of the burst.
          if (t < T) emit('charge', 60, dt, () => { const a = R(0, 6.28), r = R(.8, 1.6), p = [Math.cos(a) * r, Math.sin(a) * r * .8, R(-.3, .4)]; S.embers.push({ pal: 2, p, v: p.map(q => -q * 3.2), age: 0, life: .3, size: R(1.4, 2.6), seed: rand() * 6.28 }); });
          if (t > T && t < T + .03) for (let i = 0; i < 70; i++) {
            const a = R(0, 6.28), e = R(-.7, .7), sp = R(2.2, 5);
            S.embers.push({ pal: 2, p: [0, .05, .3], v: [Math.cos(a) * Math.cos(e) * sp, Math.sin(a) * Math.cos(e) * sp * .85, Math.sin(e) * sp * .6], age: 0, life: R(.35, .8), size: R(2, 5), seed: rand() * 6.28 });
            if (i % 3 === 0) S.shards.push({ c: n - 1, p: [Math.cos(a) * .2, .05 + Math.sin(a) * .2, R(0, .4)], uv: [R(.1, .9), R(.1, .9)], v: [Math.cos(a) * sp * .45, Math.sin(a) * sp * .35 + .5, R(-.4, .9)], a: [R(0, 6), R(0, 6), R(0, 6)], w: [R(-12, 12), R(-12, 12), R(-8, 8)], s: R(.03, .06), age: 0, life: R(.6, 1), seed: rand(), char: .3 });
          }
          if (t > T && t < 1.3) emit('fizz', 55, dt, () => { const a = R(0, 6.28), sp = R(1, 2.6); S.embers.push({ pal: 2, p: [R(-.3, .3), R(-.2, .3), R(0, .4)], v: [Math.cos(a) * sp, Math.sin(a) * sp * .8, R(-.2, .4)], age: 0, life: R(.3, .6), size: R(1.4, 3), seed: rand() * 6.28 }); });
          S.cards.forEach(c => burnCard(c, t, dt));
        } else if (spiral) {
          // Sparks, embers and charred fragments are drawn in round the funnel and carried up it
          // (orbits: in front of the card on the near side, behind it on the far side); dark smoke
          // rolls off its edges; on the ignition a ring of sparks bursts out across the floor.
          const orbit = (o, fast) => ({ r: o ? R(.25, .55) : R(.9, 1.4), a: R(0, 6.28), w: (fast ? 1.3 : 1) * (storm ? 1.5 : 1) * R(5, 8), y: FLOOR + R(0, .2), vy: R(.9, 1.7), pull: o ? 0 : R(1.2, 2) });
          if (t > T - .1 && t < 1.55) emit('helix', storm ? 95 : 70, dt, () => S.embers.push({ pal: storm ? 2 : 0, orb: orbit(rand() < .5, true), p: [0, 0, 0], v: [0, 0, 0], age: 0, life: R(.5, .9), size: R(1.6, 3.6), seed: rand() * 6.28 }));
          if (t > T && t < 1.35) emit('debris', 11, dt, () => S.shards.push({ c: n - 1, orb: orbit(false), p: [0, 0, 0], uv: [R(.1, .9), R(.1, .9)], v: [0, 0, 0], a: [R(0, 6), R(0, 6), R(0, 6)], w: [R(-9, 9), R(-9, 9), R(-7, 7)], s: R(.03, .055), age: 0, life: R(.7, 1), seed: rand(), char: .3 }));
          if (t > T && t < 1.45) emit('smoke', 10, dt, () => { const sd = rand() < .5 ? -1 : 1; S.smoke.push({ col: storm ? [.2, .13, .07] : [.12, .07, .07], p: [sd * R(1, 1.7), R(-.2, 1.6), R(-.5, .1)], v: [sd * R(.1, .3), R(.2, .5), 0], age: 0, life: R(.8, 1.2), size: R(.4, .7), seed: rand() }); });
          if (t > T && t < T + .03) for (let i = 0; i < 30; i++) { const a = R(0, 6.28), sp = R(1.2, 2.6); S.embers.push({ pal: storm ? 2 : 0, p: [0, FLOOR + .05, .2], v: [Math.cos(a) * sp, R(.2, .9), Math.sin(a) * sp * .6], age: 0, life: R(.4, .8), size: R(2, 4.4), seed: rand() * 6.28 }); }
          S.cards.forEach(c => burnCard(c, t, dt));
        } else if (royal) {
          // Gold sparks rise toward the descending crown; on the strike a ring of golden sparks and
          // charred fragments bursts out, gold flames lick up round the card and embers drift.
          if (t < T) emit('rise', 46, dt, () => S.embers.push({ pal: 2, p: [R(-.9, .9), FLOOR + R(0, .3), R(-.3, .5)], v: [R(-.15, .15), R(.9, 1.8), 0], age: 0, life: R(.4, .7), size: R(1.4, 2.8), seed: rand() * 6.28 }));
          if (t > T && t < T + .03) for (let i = 0; i < 40; i++) {
            const a = R(0, 6.28), sp = R(1.3, 3);
            S.embers.push({ pal: i % 3 ? 2 : 0, p: [0, .05, .3], v: [Math.cos(a) * sp, Math.sin(a) * sp * .8 + .5, R(-.6, .9)], age: 0, life: R(.5, 1.05), size: R(2, 4.8), seed: rand() * 6.28 });
            if (i % 2) S.shards.push({ c: n - 1, p: [Math.cos(a) * .22, .05 + Math.sin(a) * .22, R(0, .4)], uv: [R(.1, .9), R(.1, .9)], v: [Math.cos(a) * sp * .75, Math.sin(a) * sp * .55 + .6, R(-.4, .9)], a: [R(0, 6), R(0, 6), R(0, 6)], w: [R(-10, 10), R(-10, 10), R(-7, 7)], s: R(.035, .07), age: 0, life: R(.7, 1.1), seed: rand(), char: .25 });
          }
          if (t > T && t < 1.4) emit('flame', 30, dt, () => S.flames.push({ x: R(-.75, .75), y: FLOOR, z: R(-.35, .6), w: R(.22, .36), h: R(.4, .8), age: 0, life: R(.35, .6), seed: rand(), lean: R(-.12, .12) }));
          if (t > T && t < 1.6) emit('ember', 48, dt, () => S.embers.push({ pal: rand() < .6 ? 2 : 0, p: [R(-1.1, 1.1), R(-.4, .9), R(-.3, .6)], v: [R(-.3, .3), R(.4, 1.1), R(-.1, .2)], age: 0, life: R(.5, .9), size: R(1.4, 3.2), seed: rand() * 6.28 }));
          if (t > T + .1 && t < 1.3) emit('frag', 6, dt, () => S.shards.push({ c: n - 1, p: [R(-.9, .9), R(.6, 1.2), R(-.2, .5)], uv: [R(.1, .9), R(.1, .9)], v: [R(-.3, .3), R(-.2, .2), R(-.1, .3)], a: [R(0, 6), R(0, 6), R(0, 6)], w: [R(-8, 8), R(-8, 8), R(-6, 6)], s: R(.03, .05), age: 0, life: R(.6, .9), seed: rand(), char: .35 }));
          S.cards.forEach(c => burnCard(c, t, dt));
        } else if (ghost) {
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
          // The whip strikes the card: a blast of fragments and sparks thrown the way it travels.
          if (S.layout && t > .5 && t < .53) for (let i = 0; i < 26; i++) {
            const a = R(-.9, .9), sp = R(1.4, 3.4);
            S.embers.push({ p: [0, 0, .3], v: [Math.cos(a) * sp, Math.sin(a) * sp * .7 + .3, R(-.3, .6)], age: 0, life: R(.4, .8), size: R(2, 4.6), seed: rand() * 6.28 });
            if (i % 2) S.shards.push({ c: n - 1, p: [R(-.2, .2), R(-.3, .3), R(0, .4)], uv: [R(.1, .9), R(.1, .9)], v: [Math.cos(a) * sp * .6, Math.sin(a) * sp * .4 + .4, R(-.3, .8)], a: [R(0, 6), R(0, 6), R(0, 6)], w: [R(-11, 11), R(-11, 11), R(-8, 8)], s: R(.035, .065), age: 0, life: R(.6, 1), seed: rand(), char: .25 });
          }
          burnCard(S.cards[0], t, dt);
        }
      }
      for (const f of S.flames) f.age += dt;
      const orbitStep = o => {
        const b = o.orb, prev = o.p, first = !o.age;
        o.age += dt; b.a += b.w * dt; b.y += b.vy * dt; b.r = Math.max(.12, b.r - b.pull * b.r * dt) * (1 + .35 * dt);
        o.p = [Math.cos(b.a) * b.r * (1 + .45 * (b.y - FLOOR)), b.y, Math.sin(b.a) * b.r * .6];
        o.v = first ? [0, 0, 0] : o.p.map((q, i) => (q - prev[i]) / dt);
      };
      for (const o of [...S.embers, ...S.shards]) if (o.orb) orbitStep(o);
      for (const e of S.embers) {
        if (e.orb) continue;
        e.age += dt; e.v[0] += Math.sin(t * 9 + e.seed) * .9 * dt; e.v[1] -= .25 * dt;
        e.v.forEach((_, i) => { e.v[i] *= 1 - .9 * dt; e.p[i] += e.v[i] * dt; });
      }
      for (const m of S.smoke) { m.age += dt; m.p[0] += m.v[0] * dt; m.p[1] += m.v[1] * dt; }
      for (const s of S.shards) {
        if (s.orb) continue;
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
    const { gl, U } = R, t = S.t, out = { art: [], back: [], mid: [], artFront: [], front: [] };
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
    // The owner's art as depth layers (S.layout: width in card heights, height/width, Pile u/v).
    const [LW, LR, PU, PV] = S.layout || [1, 1, .5, .5], K = S.artK, AW = LW * K, AH = AW * LR;
    const layer = (arr, slot, z, s, dy, reveal, flow, glow, radial, alpha = 1, swirl = 0, sx = 1, sh = 0, dx = 0) => {
      const P = [[0, 0], [1, 0], [1, 1], [0, 1]], L = [radial === true ? 1 : radial || 0, swirl];
      quad(arr, P.map(([u, v]) => proj((u - PU) * AW * s * sx + sh * (PV - v) * AH * s + dx, (PV - v) * AH * s + dy, z)), P, [L, L, L, L], [...glow, alpha], [7, slot, reveal, flow]);
    };
    const artAt = (u, v, s, dy, z) => [(u - PU) * AW * s, (PV - v) * AH * s + dy, z];
    const vol = (arr, x0, x1, y0, y1, z, inten, seed) => {
      const P = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => proj(x, y, z));
      quad(arr, P, Z4, UP, [1, 1, 1, 1], [8, seed, 0, inten]);
    };
    if (S.kind === 'smoke' && !S.calm) {
      // Heat builds under the card, then the blast: a flash, a floor ring and the painted cloud
      // bursting out from the card, rolling and lit by its fire, with puffs in front; it thins away.
      const T = S.T, grow = .3 + .66 * ease((t - T + .02) / .5) + .05 * Math.max(0, t - T), out1 = 1 - smooth(1.4, 1.95, t);
      glowAt(out.back, [0, 0, 0], .9, [1, .45, .15, .7 * smooth(0, T, t) * (1 - smooth(T, T + .25, t))]);
      if (R.art) {
        layer(out.art, 0, -.4, grow, .04 * (t - T), smooth(T - .02, T + .3, t) * out1, 1.7, [1, .55, .2], true);
        layer(out.artFront, 1, .7, grow * 1.04, -.05, smooth(T + .05, T + .4, t) * out1, 1.9, [1, .55, .2], true);
      }
      const flash = bump(T - .03, T + .02, T + .3);
      if (flash > 0) glowAt(out.back, [0, .05, 0], 1.6, [1, .85, .6, flash]);
      glowAt(out.back, [0, 0, -.2], 1.5 * K, [1, .35, .1, .45 * smooth(T, T + .2, t) * out1 * (.8 + .2 * Math.sin(t * 23))]);
      for (const [d, col] of [[0, [.95, .9, .9]], [.1, [1, .5, .2]]]) { const rt = (t - T - d) / .6; if (rt > 0 && rt < 1) ring(FLOOR, .2 + 1.8 * ease(rt), (1 - rt) * .8, col); }
    } else if (S.kind === 'blaze' && !S.calm) {
      // The coals glow up under the card; the whoosh: a flash, the painted fire shooting up out of
      // the coals (it grows from the floor, bottom first) and flickering, a column of heat behind the
      // card, the coals in front of it, a floor ring; then it dies down into the coals.
      const T = S.T, out1 = 1 - smooth(1.4, 1.9, t), fl = 1 + .035 * Math.sin(t * 17) + .02 * Math.sin(t * 29);
      const st = (.5 + .5 * ease((t - T + .02) / .45)) * fl * (1 - .25 * smooth(1.3, 1.9, t)), sdy = (PV - 1) * AH * (1 - st);
      glowAt(out.back, [0, FLOOR + .05, 0], 1.1 * K, [1, .4, .1, .75 * smooth(0, T, t) * (1 - .5 * smooth(T, T + .4, t)) * out1]);
      if (R.art) {
        layer(out.art, 0, -.35, st, sdy, smooth(T - .03, T + .32, t) * out1, 1.8, [1, .5, .12], false, 1.2, 0, 1 / st);
        layer(out.artFront, 1, .6, 1, 0, smooth(0, .14, t) * (1 - smooth(1.5, 1.9, t)), .7, [1, .45, .1], false, 1.15);
      }
      const flash = bump(T - .03, T + .02, T + .3);
      if (flash > 0) glowAt(out.back, [0, .1, 0], 1.7, [1, .78, .45, flash]);
      for (let i = 0; i < 4; i++) glowAt(out.back, [0, (.1 + i * .55) * K * st, -.4], (.85 - i * .12) * K, [1, .42 + i * .06, .1, .38 * smooth(T, T + .25, t) * out1 * (.82 + .18 * Math.sin(t * 19 + i))]);
      for (const [d, col] of [[0, [1, .75, .4]], [.1, [1, .45, .12]]]) { const rt = (t - T - d) / .6; if (rt > 0 && rt < 1) ring(FLOOR, .2 + 1.8 * ease(rt), (1 - rt) * .8, col); }
    } else if (S.kind === 'snap' && !S.calm) {
      // The charge glows and tightens; the snap: a white-gold flash, the painted burst exploding
      // out from the card, spinning light beams in every direction, floor rings; then it fades.
      const T = S.T, out1 = 1 - smooth(1.3, 1.85, t), grow = .3 + .72 * ease((t - T + .02) / .3) + .05 * Math.max(0, t - T);
      glowAt(out.back, [0, 0, 0], .5 + .5 * smooth(0, T, t), [1, .85, .45, .9 * smooth(0, T, t) * (1 - smooth(T, T + .2, t))]);
      if (R.art) {
        layer(out.art, 0, -.3, grow, 0, smooth(T - .02, T + .22, t) * out1, 1.1, [1, .9, .55], true, 1.25);
        layer(out.artFront, 1, .6, 1, 0, smooth(T, T + .25, t) * out1, .6, [1, .8, .4], true, 1.25);
      }
      const flash = bump(T - .03, T + .01, T + .3);
      if (flash > 0) glowAt(out.back, [0, .05, 0], 2.2, [1, .95, .8, flash]);
      glowAt(out.back, [0, 0, -.2], 1.2 * K, [1, .7, .25, .5 * smooth(T, T + .1, t) * out1 * (.75 + .25 * Math.sin(t * 31))]);
      const [ox, oy, os] = proj(0, 0, -.2), beam = smooth(T - .02, T + .06, t) * (1 - smooth(1.0, 1.6, t));
      if (beam > 0) for (let i = 0; i < 14; i++) {
        const a = i * .449 + .5 * Math.sin(i * 3.7) + .35 * (t - T), L = F * os * K * (2.6 + 1.2 * Math.sin(i * 2.1)) * (.4 + .6 * ease((t - T) / .3));
        const w0 = F * os * .015, w1 = F * os * K * (.05 + .04 * (i % 3)), dx = Math.cos(a), dy = Math.sin(a), ex = ox + dx * L, ey = oy + dy * L;
        quad(out.back, [[ox + dy * w0, oy - dx * w0], [ox - dy * w0, oy + dx * w0], [ex - dy * w1, ey + dx * w1], [ex + dy * w1, ey - dx * w1]], Z4, [[0, -1], [0, 1], [.5, 1], [.5, -1]],
          [1, .82, .4, beam * (.6 + .3 * Math.sin(t * 11 + i * 2.3))], [2, 0, 0, 0]);
      }
      for (const [d, col] of [[0, [1, .95, .7]], [.08, [1, .7, .25]]]) { const rt = (t - T - d) / .5; if (rt > 0 && rt < 1) ring(FLOOR, .2 + 2 * ease(rt), (1 - rt) * .9, col); }
    } else if (S.kind === 'spiral' && !S.calm) {
      // The magma vortex rears up out of the card (bottom first) and keeps turning: its painted
      // bands travel round it, a hot core glows up its axis, the rubble at its base sits in front
      // of the card, the floor rings on ignition; then it burns out from the top down.
      const T = S.T, out1 = 1 - smooth(1.45, 1.95, t), rise = .55 + .45 * ease((t - T + .05) / .55);
      const reveal = smooth(T - .08, T + .45, t) * out1, flick = .85 + .15 * Math.sin(t * 19);
      glowAt(out.back, [0, 0, 0], .9, [1, .4, .1, .7 * smooth(0, T, t) * (1 - smooth(T, T + .3, t))]);
      if (R.art && S.storm) {
        // The ShitStorm: the whole storm whirls (highlights sweep round it, its coils travel, it
        // pulses and leans as it spins); the painted face rides on it unwarped and grins on the strike.
        const sh = .07 * Math.sin(t * 9) * reveal, sx = 1 + .04 * Math.sin(t * 18), grin = 1 + .06 * bump(T + .1, T + .2, T + .5);
        layer(out.art, 0, -.3, rise, 0, reveal, 1.2, [1, .75, .3], false, 1.25, 11.6, sx, sh);
        // The face moves with the storm (lifted, leaning with it) but is never skewed or stretched.
        const fv = .4, fs = rise * grin, fdy = (PV - fv) * AH * (rise - fs);
        layer(out.artFront, 1, -.3, fs, fdy, smooth(T + .05, T + .35, t) * out1, 0, [1, .8, .4], false, 1.25, 0, 1, 0, sh * (PV - fv) * AH * rise);
      } else if (R.art) {
        layer(out.art, 0, -.3, rise, 0, reveal, 1.5, [1, .45, .12], false, 1.25, 1);
        layer(out.artFront, 1, .6, 1, 0, smooth(T, T + .3, t) * out1, .6, [1, .45, .12], false, 1.25, .4);
      }
      const coreCol = S.storm ? [1, .7, .25] : [1, .32, .08];
      for (let i = 0; i < 4; i++) glowAt(out.back, [0, (.3 + i * .75) * K * rise, -.4], (.7 - i * .1) * K, [coreCol[0], coreCol[1] + i * .04, coreCol[2], .4 * reveal * flick]);
      const flash = bump(T - .03, T + .02, T + .3);
      if (flash > 0) glowAt(out.back, [0, .05, 0], 1.5, [1, .6, .3, flash]);
      for (const [d, col] of S.storm ? [[0, [1, .85, .45]], [.12, [1, .6, .2]]] : [[0, [1, .55, .2]], [.12, [1, .25, .08]]]) { const rt = (t - T - d) / .6; if (rt > 0 && rt < 1) ring(FLOOR, .2 + 1.9 * ease(rt), (1 - rt) * .85, col); }
    } else if (S.kind === 'royal' && !S.calm) {
      // The crown materialises high up and comes down; on the strike it lands (a pulse of light
      // through its gold), the painted fire bursts out from the card, gold light rays fan out
      // behind the crown, its jewels glint in turn and the floor rings; then it all burns away.
      const T = S.T, out1 = 1 - smooth(1.45, 1.95, t), land = ease((t - .02) / (T - .02));
      const strike = bump(T - .03, T + .02, T + .32), cs = 1 + .045 * strike;
      const cdy = 1.3 * (1 - land) + .03 * Math.sin((t - T) * 5.5) * smooth(T, T + .25, t) + .3 * smooth(1.45, 1.95, t);
      const grow = .35 + .65 * ease((t - T + .02) / .45) + .04 * Math.max(0, t - T);
      const CU = .49, CV = .2, cc = artAt(CU, CV, cs, cdy, -.3), core = artAt(CU, .5, 1, 0, -.3);
      glowAt(out.back, [0, 0, 0], .9, [1, .7, .25, .6 * smooth(0, T, t) * (1 - smooth(T, T + .3, t))]);
      glowAt(out.back, cc, 1.5 * K, [1, .62, .18, (.25 + .3 * strike) * land * out1]);
      if (R.art) {
        layer(out.art, 1, -.35, grow, 0, smooth(T - .02, T + .28, t) * out1, 1.6, [1, .75, .3], true);
        layer(out.artFront, 0, -.3, cs, cdy, smooth(0, .26, t) * (1 - smooth(1.5, 1.95, t)), .12, [1, .8, .35]);
        // Light running through the gold as it lands, and once more as the card catches.
        const shine = .55 * strike + .22 * bump(.95, 1.1, 1.35);
        if (shine > 0) layer(out.front, 0, -.3, cs, cdy, 1, .12, [1, .8, .35], false, shine);
      }
      // Light rays: long soft beams from the heart of the fire, slowly turning.
      const [ox, oy, os] = proj(...core), rayA = (.18 * land + .82 * smooth(T - .05, T + .2, t)) * out1;
      if (rayA > 0) for (let i = 0; i < 16; i++) {
        const a = -Math.PI / 2 + (i - 7.5) * .21 + .05 * Math.sin(t * .9 + i) + (i % 2 ? .04 : -.04) * t;
        const L = F * os * K * (3.4 + 1.1 * Math.sin(i * 2.3) + .6 * strike) * (.6 + .4 * grow), w0 = F * os * .02, w1 = F * os * K * (.1 + .06 * (i % 3));
        const dx = Math.cos(a), dy = Math.sin(a), ex = ox + dx * L, ey = oy + dy * L;
        quad(out.back, [[ox + dy * w0, oy - dx * w0], [ox - dy * w0, oy + dx * w0], [ex - dy * w1, ey + dx * w1], [ex + dy * w1, ey - dx * w1]], Z4, [[0, -1], [0, 1], [.5, 1], [.5, -1]],
          [1, .72, .28, rayA * (.55 + .25 * Math.sin(t * 7 + i * 1.7))], [2, 0, 0, 0]);
      }
      // The jewels glint one after another once the crown has landed (and again as it leaves).
      [[.491, .197], [.236, .255], [.75, .255], [.491, .048], [.194, .105], [.792, .105]].forEach(([u, v], i) => {
        const g = bump(T + .04 + i * .1, T + .12 + i * .1, T + .38 + i * .1) + .7 * bump(1.2 + i * .05, 1.27 + i * .05, 1.45 + i * .05);
        if (g <= 0) return;
        const p = artAt(u, v, cs, cdy, -.3), [px, py, ps] = proj(...p), r = (i < 3 ? .5 : .35) * F * ps * K * g, h = .022 * F * ps;
        glowAt(out.front, p, (i < 3 ? .2 : .14) * K, [1, .45, .4, g]);
        for (const [ux, uy] of [[1, 0], [0, 1]]) quad(out.front, [[px - ux * r - uy * h, py - uy * r - ux * h], [px + ux * r - uy * h, py + uy * r - ux * h], [px + ux * r + uy * h, py + uy * r + ux * h], [px - ux * r + uy * h, py - uy * r + ux * h]], Z4, [[-1, 0], [1, 0], [1, 0], [-1, 0]], [1, .9, .75, g], [2, 0, 0, 0]);
      });
      if (strike > 0) glowAt(out.back, [0, .05, 0], 1.7, [1, .85, .55, strike]);
      glowAt(out.back, [0, FLOOR + .1, 0], 1.4 * K, [1, .55, .15, .5 * smooth(T, T + .2, t) * out1 * (.8 + .2 * Math.sin(t * 21))]);
      for (const [d, col] of [[0, [1, .9, .6]], [.1, [1, .6, .2]]]) { const rt = (t - T - d) / .6; if (rt > 0 && rt < 1) ring(FLOOR, .2 + 1.9 * ease(rt), (1 - rt) * .85, col); }
    } else if (S.ghost && !S.calm) {
      // The owner's art in two depth layers: the fire bank, and the wraith above it,
      // which rises, lunges at the Pile on the strike and drifts apart.
      const lunge = bump(.46, .62, 1.0);
      const gs = 1 + .12 * lunge, gdy = -.7 * (1 - ease((t - .08) / .6)) - .2 * lunge + .7 * smooth(1.25, 1.95, t);
      if (R.art) {
        layer(out.art, 1, -.5, 1, 0, smooth(0, .4, t) * (1 - smooth(1.45, 1.95, t)), 1.4, [.55, .9, 1]);
        layer(out.art, 0, -.7, gs, gdy, smooth(.12, .62, t) * (1 - smooth(1.3, 1.85, t)), 1, [.55, .9, 1]);
      }
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
      if (R.art) {
        // The owner's fire swirl is swept in left to right behind the whip and burns out behind it.
        const sweepIn = smooth(.02, .85, t), sweepOut = smooth(.6, 1.9, t);
        layer(out.art, 0, -.3, 1, 0, sweepIn, 1.6, [1, .5, .12], 2 + sweepOut, 1.25, .5);
        layer(out.artFront, 1, .6, 1, 0, smooth(.45, .75, t) * (1 - smooth(1.45, 1.95, t)), .6, [1, .5, .12], false, 1.25);
        // The whip: a lash of fire cracking across in an arc, its head blazing white-hot.
        const lash = (x, z) => [x, .17 * x * x - .08, z];
        for (let i = 0; i < 46; i++) {
          const f = i / 45, x = X - 2.6 * K * (1 - f), w = (.1 + .26 * f * f) * K, a = (.35 + .65 * f) * smooth(0, .12, t) * (1 - smooth(1.05, 1.4, t));
          if (a <= 0) continue;
          const p = lash(x, .25 * Math.sin(x * 1.3 + t * 4)), q = projW(p), r2 = w * F * q[2];
          quad(out.front, [[q[0] - r2 * 1.6, q[1] - r2], [q[0] + r2 * 1.6, q[1] - r2], [q[0] + r2 * 1.6, q[1] + r2], [q[0] - r2 * 1.6, q[1] + r2]], Z4, LOC,
            f > .88 ? [1, .92, .65, a] : [1, .38 + .4 * f, .08, a * (.85 + .15 * Math.sin(i * 1.7 + t * 30))], [2, 0, 0, 0]);
          if (i % 3 === 0) glowAt(out.back, p, w * 2.4, [1, .4, .08, a * .35]);
        }
        const hit = bump(.48, .53, .8);
        if (hit > 0) glowAt(out.front, [0, 0, .3], 1.4, [1, .7, .3, hit]);
      }
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
        // A quad turned away from the viewer shows the burning player's card back.
        const [a, b, , d] = id.map(v => pp[v]), slot = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]) < 0 ? S.n : c.i;
        for (const q of [0, 1, 2, 0, 2, 3]) {
          const v = id[q], p = pp[v], col = N[v];
          out.mid.push(p[0], p[1], (v % (GX + 1)) / GX, Math.floor(v / (GX + 1)) / GY, 0, 0, col[0], col[1], col[2], 1, 0, slot, S.slots, front);
        }
      }
    }
    // Shards: small pieces of the real cards, tumbling in 3D as they burn out.
    for (const s of S.shards) {
      const a = s.age / s.life, heat = clamp(1 - a / .7 - (s.char || 0) * .5), alpha = 1 - smooth(.65, 1, a), sz = s.s * (1 - .35 * a);
      const [ax, ay, az] = s.a, cxr = Math.cos(ax), sxr = Math.sin(ax), cyr = Math.cos(ay), syr = Math.sin(ay), czr = Math.cos(az), szr = Math.sin(az);
      const corner = ([lx, ly]) => {
        let x = lx * sz, y = ly * sz, z = 0;
        [x, y] = [x * czr - y * szr, x * szr + y * czr]; [y, z] = [y * cxr - z * sxr, y * sxr + z * cxr]; [x, z] = [x * cyr + z * syr, -x * syr + z * cyr];
        const w = s.p, vy = w[1] * CP - w[2] * SP, vz = w[1] * SP + w[2] * CP;
        return proj(w[0] + x, vy + y, vz + z);
      };
      const P = LOC.map(corner), tu = sz / S.ar, tv = sz;
      // A shard flipped over shows the card back.
      const ci = (P[1][0] - P[0][0]) * (P[3][1] - P[0][1]) - (P[1][1] - P[0][1]) * (P[3][0] - P[0][0]) > 0 ? S.n : s.c || 0;
      const uv = LOC.map(([lx, ly]) => [(ci + clamp(s.uv[0] + lx * tu)) / S.slots, clamp(s.uv[1] - ly * tv)]);
      quad(out.mid, P, uv, LOC, [1, 1, 1, alpha], [4, s.seed, 0, heat]);
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
      const col = e.pal === 2 ? (a < .35 ? [1, .95, .72] : a < .7 ? [1, .78, .3] : [1, .5, .12]) : e.pal ? (a < .4 ? [.75, .95, 1] : a < .7 ? [.5, .62, 1] : [.62, .32, .95]) : a < .35 ? [1, .78, .35] : a < .7 ? [1, .45, .1] : [.85, .18, .04];
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
    draw(out.art, false); draw(out.back, true); draw(out.mid, false); draw(out.artFront, false); draw(out.front, true);
  }

  // The burning player's equipped card back, read from the game's own card-back styling.
  function drawBack(card, cls, onImage) {
    const FH = 320, FW = Math.round(card.W * FH / card.H), cv = document.createElement('canvas');
    cv.width = FW; cv.height = FH;
    const probe = document.createElement('div');
    probe.className = `custom-card-back ${cls || ''}`;
    probe.style.cssText = `position:fixed;left:-9999px;top:0;width:${card.W}px;height:${card.H}px`;
    document.body.appendChild(probe);
    const cs = getComputedStyle(probe), url = (cs.backgroundImage.match(/url\(["']?([^"')]+)/) || [])[1];
    const g = cv.getContext('2d');
    g.fillStyle = cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ? cs.backgroundColor : '#1e293b'; g.fillRect(0, 0, FW, FH);
    probe.remove();
    if (url) { const img = new Image(); img.onload = () => { g.drawImage(img, 0, 0, FW, FH); onImage && onImage(); }; img.src = url; }
    return cv;
  }
  // All card faces side by side in one texture (card i at slot i), then the card back.
  function faceAtlas(cards, onChange, backCls) {
    const atlas = document.createElement('canvas'), faces = [];
    const paint = () => {
      atlas.width = faces.reduce((w, f) => w + f.width, 0); atlas.height = faces[0].height;
      let x = 0; const g = atlas.getContext('2d');
      faces.forEach(f => { g.drawImage(f, x, 0); x += f.width; });
      onChange && onChange();
    };
    cards.forEach(c => faces.push(drawFace(c, () => paint())));
    faces.push(drawBack(cards[cards.length - 1], backCls, () => paint()));
    onChange = null; paint();
    return { atlas, setOnChange: fn => { onChange = fn; } };
  }

  const active = new Set();
  // host: positioned layer; x/y: the top card centre in host pixels;
  // opts.cardEls: the real pile cards on the table (top card last).
  function play(id, host, x, y, scale = 1, calm = false, opts = {}) {
    const fx = EFFECTS[id]; if (!fx || !host || document.hidden) return false;
    const pileEls = (opts.cardEls || []).filter(el => el && el.offsetWidth), els = pileEls.slice(fx.cards === 'all' ? -3 : -1);
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
    // The painted scene fits the screen width and the room above the Pile (under the header), so its
    // top is never cut off; the cards stay their real size.
    const hw = host.clientWidth || 390, hh = host.clientHeight || 844, [LW, LR, , LV] = fx.layout || [];
    const LU = (fx.layout || [])[2], artK = fx.art ? Math.min(1, hw * .98 / (LW * H * 2 * Math.max(LU, 1 - LU)), Math.max(0, y - 52) / (LW * LR * LV * H)) : 1;
    // A painted scene gets the whole layer, so its smoke is never cut by a canvas edge.
    const [bw, bh, bx, by] = fx.box, x0 = fx.art ? 0 : Math.max(0, x - H * bw * bx), y0 = fx.art ? 0 : Math.max(0, y - H * bh * by);
    const ox = Math.round(x0), oy = Math.round(y0), cw = Math.round(fx.art ? hw : Math.min(hw, x + H * bw * (1 - bx)) - ox), ch = Math.round(fx.art ? hh : Math.min(hh, y + H * bh * (1 - by)) - oy);
    const canvas = document.createElement('canvas');
    canvas.className = 'bfx lb3d-canvas'; canvas.dataset.levelBurn = id;
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    canvas.style.cssText = `position:absolute;left:${ox}px;top:${oy}px;width:${cw}px;height:${ch}px;pointer-events:none;z-index:2`;
    const faces = faceAtlas(cards, null, opts.backClass);
    let R;
    try { R = makeRenderer(canvas, faces.atlas, artFor(id)); } catch (e) { R = null; }
    if (!R) return false;
    faces.setOnChange(() => R.upload());
    host.appendChild(canvas);
    const core = host.querySelector('.shop-burn-core'); if (core) core.style.visibility = 'hidden';
    // The real cards hide while their 3D copies burn (by id: re-renders keep them hidden).
    // Smoke Burst: only the top card is seen, so every pile card under it hides too.
    const ids = (fx.layout && fx.cards !== 'all' ? pileEls : els).map(el => el.dataset.cardId).filter(Boolean);
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
    // Default Burn: coals hissing and spitting (0–0.16), the whoosh as the fire goes up at 0.16 (a soft
    // deep thump and a rushing burst), the fire roaring with crackles and pops, the card crackling as
    // it burns away (0.75–1.45), sparks ticking, and the roar dying into a hiss.
    'default': k => {
      k.noise({ dur: .18, type: 'highpass', f0: 2600, f1: 4200, level: .06, attack: .12 });
      [.03, .08, .12].forEach((at, n) => k.noise({ at, dur: .018, type: 'bandpass', f0: 3000 + n * 400, q: 3, level: .07 }));
      k.tone({ at: .16, dur: .45, f0: 70, f1: 34, level: .34 });
      k.noise({ at: .14, dur: .42, type: 'bandpass', f0: 250, f1: 1400, q: .7, level: .34, attack: .05 });
      k.noise({ at: .22, dur: 1.25, type: 'bandpass', f0: 600, f1: 380, q: .5, level: .17, attack: .12 });
      k.tone({ at: .22, dur: 1.1, type: 'sawtooth', f0: 58, f1: 66, vibrato: 6, level: .035, attack: .1 });
      [.3, .37, .46, .52, .61, .69].forEach((at, n) => k.noise({ at, dur: .022, type: 'bandpass', f0: 2600 + (n % 3) * 500, q: 3, level: .1 }));
      [.76, .83, .9, .97, 1.05, 1.13, 1.21, 1.29, 1.38, 1.45].forEach((at, n) => k.noise({ at, dur: .028, type: 'bandpass', f0: 2200 + n * 130, q: 3, level: .13 }));
      [.58, 1.0].forEach(at => k.tone({ at, dur: .1, f0: 140, f1: 80, level: .07, attack: .005 }));
      k.noise({ at: 1.35, dur: .55, type: 'bandpass', f0: 3200, f1: 1600, q: .8, level: .05, attack: .12 });
    },
    // Rising rush, ignition at the card, roar and crackle while it burns, floor thump, cooling embers.
    'burn-lvl-inferno-sweep': k => {
      k.noise({ dur: .3, type: 'bandpass', f0: 300, f1: 1500, q: .7, level: .106, attack: .22 });
      k.noise({ at: .26, dur: .16, type: 'lowpass', f0: 2200, f1: 400, level: .277, attack: .008 });
      k.tone({ at: .26, dur: .3, f0: 110, f1: 46, level: .264 });
      k.noise({ at: .3, dur: .75, type: 'bandpass', f0: 500, f1: 1700, q: .6, level: .198, attack: .06 });
      k.tone({ at: .3, dur: .65, type: 'sawtooth', f0: 62, f1: 78, vibrato: 7, level: .040, attack: .08 });
      [.34, .41, .47, .55, .6, .68, .74, .81, .88].forEach((at, n) => k.noise({ at, dur: .028, type: 'highpass', f0: 2600 + n * 160, level: .132 }));
      k.tone({ at: .52, dur: .34, f0: 82, f1: 38, level: .224 });
      k.noise({ at: .5, dur: .045, type: 'highpass', f0: 2200, level: .14 }); // the whip cracks on the card
      k.tone({ at: .5, dur: .14, type: 'sawtooth', f0: 900, f1: 160, level: .04, attack: .002 });
      k.noise({ at: .52, dur: .4, type: 'lowpass', f0: 900, f1: 160, level: .158 });
      k.noise({ at: .9, dur: .5, type: 'highpass', f0: 3200, f1: 1800, level: .046, attack: .05 });
      [1, 1.12, 1.21, 1.33, 1.44].forEach((at, n) => k.noise({ at, dur: .02, type: 'bandpass', f0: 3600 - n * 200, q: 3, level: .066 - n * .008 }));
    },
    // Smoke Burst: heat hiss building under the card (0–0.2), the blast at 0.2 (deep boom,
    // cracking burst, floor ring), the cloud rolling out, crackles as the card burns
    // away (0.8–1.45), embers ticking, and a soft hiss as the smoke thins.
    'burn-lvl-smoke-burst': k => {
      k.noise({ dur: .22, type: 'highpass', f0: 2500, f1: 5000, level: .07, attack: .18 });
      k.tone({ at: .2, dur: .55, f0: 72, f1: 30, level: .36 });
      k.noise({ at: .2, dur: .45, type: 'lowpass', f0: 2400, f1: 180, level: .34, attack: .005 });
      k.noise({ at: .2, dur: .05, type: 'highpass', f0: 3000, level: .22 });
      k.noise({ at: .26, dur: 1.2, type: 'bandpass', f0: 700, f1: 160, q: .6, level: .14, attack: .12 });
      k.tone({ at: .3, dur: .3, f0: 120, f1: 60, level: .1 });
      [.82, .9, .97, 1.05, 1.12, 1.2, 1.28, 1.36, 1.44].forEach((at, n) => k.noise({ at, dur: .028, type: 'bandpass', f0: 2200 + n * 140, q: 3, level: .15 }));
      [.5, .63, .74, 1.55, 1.68].forEach((at, n) => k.noise({ at, dur: .02, type: 'highpass', f0: 3600 - n * 150, level: .08 }));
      k.noise({ at: 1.35, dur: .6, type: 'highpass', f0: 3000, f1: 1500, level: .05, attack: .15 });
    },
    // Royal Incineration: a shimmering rise and a choir swell as the crown comes down (0–0.42);
    // the landing at 0.42 (deep boom, a bright metal clang, a short brass fanfare), the fire
    // roaring out, three glass chimes as the jewels glint (0.46, 0.56, 0.66), crackles as the
    // card burns away (0.9–1.5), a second shimmer as it catches (1.0) and a soft fading tail.
    'burn-lvl-royal-incineration': k => {
      k.noise({ dur: .42, type: 'bandpass', f0: 600, f1: 3200, q: 1.2, level: .09, attack: .35 });
      [523, 659, 784].forEach((f0, n) => k.tone({ at: .04 + n * .03, dur: .5, type: 'triangle', f0, f1: f0, level: .045, attack: .3, vibrato: 5 }));
      k.tone({ at: .42, dur: .55, f0: 74, f1: 30, level: .36 });
      k.noise({ at: .42, dur: .4, type: 'lowpass', f0: 2600, f1: 200, level: .3, attack: .004 });
      [1319, 1976, 2637].forEach((f0, n) => k.tone({ at: .42, dur: .55 - n * .1, f0, f1: f0 * .995, level: .07 - n * .015, attack: .003 }));
      [196, 294, 392].forEach((f0, n) => k.tone({ at: .43, dur: .42, type: 'sawtooth', f0, f1: f0, level: .03 - n * .006, attack: .02 }));
      k.noise({ at: .46, dur: 1.05, type: 'bandpass', f0: 900, f1: 260, q: .6, level: .15, attack: .1 });
      [2637, 3136, 3520].forEach((f0, n) => k.tone({ at: .46 + n * .1, dur: .3, f0, f1: f0, level: .05, attack: .004 }));
      [.92, .99, 1.06, 1.13, 1.2, 1.28, 1.36, 1.44].forEach((at, n) => k.noise({ at, dur: .028, type: 'bandpass', f0: 2300 + n * 140, q: 3, level: .14 }));
      k.noise({ at: .95, dur: .45, type: 'bandpass', f0: 1800, f1: 4200, q: 1, level: .05, attack: .1 });
      [1.2, 1.25, 1.3].forEach((at, n) => k.tone({ at, dur: .3, f0: 3136 - n * 400, f1: 3100 - n * 400, level: .03, attack: .004 }));
      k.noise({ at: 1.45, dur: .5, type: 'highpass', f0: 3200, f1: 1600, level: .05, attack: .12 });
    },
    // Hellfire Spiral: a low rumble and hiss as the vortex wakes (0–0.3), the ignition boom at
    // 0.3, a spinning roar with a whoosh for every lap (0.5, 0.72, 0.94, 1.16, 1.38), magma
    // gulps, crackles as the card burns away (0.88–1.45) and a fading wind as it burns out.
    'burn-lvl-hellfire-spiral': k => {
      k.tone({ dur: 1.5, f0: 38, f1: 52, level: .16, attack: .25, vibrato: 4 });
      k.noise({ dur: .32, type: 'bandpass', f0: 300, f1: 900, q: .8, level: .1, attack: .25 });
      k.tone({ at: .3, dur: .5, f0: 80, f1: 32, level: .34 });
      k.noise({ at: .3, dur: .4, type: 'lowpass', f0: 2000, f1: 220, level: .3, attack: .005 });
      k.noise({ at: .34, dur: 1.15, type: 'bandpass', f0: 420, f1: 700, q: .5, level: .15, attack: .15 });
      [.5, .72, .94, 1.16, 1.38].forEach((at, n) => k.noise({ at, dur: .2, type: 'bandpass', f0: 500 + n * 60, f1: 1500 + n * 80, q: 1.4, level: .13 - n * .012, attack: .09 }));
      [.62, 1.05].forEach(at => k.tone({ at, dur: .16, f0: 120, f1: 70, level: .1, attack: .02 }));
      [.88, .95, 1.02, 1.09, 1.17, 1.25, 1.33, 1.41].forEach((at, n) => k.noise({ at, dur: .028, type: 'bandpass', f0: 2100 + n * 150, q: 3, level: .14 }));
      k.noise({ at: 1.45, dur: .5, type: 'bandpass', f0: 900, f1: 300, q: .7, level: .07, attack: .1 });
    },
    // The ShitStorm: wind winding up (0–0.3), a wet thump as it bursts up at 0.3, a fast spinning
    // whoosh every 0.18s while it whirls, cheeky squelches (0.55, 0.9, 1.2), golden sparkle chimes,
    // crackles as the card burns away (0.88–1.45) and the wind dying off.
    'burn-lvl-shitstorm': k => {
      k.noise({ dur: .34, type: 'bandpass', f0: 250, f1: 1100, q: .9, level: .12, attack: .28 });
      k.tone({ dur: 1.4, f0: 44, f1: 58, level: .12, attack: .2, vibrato: 6 });
      k.tone({ at: .3, dur: .4, f0: 95, f1: 42, level: .32 });
      k.noise({ at: .3, dur: .3, type: 'lowpass', f0: 900, f1: 160, level: .3, attack: .004 });
      [.4, .58, .76, .94, 1.12, 1.3, 1.48].forEach((at, n) => k.noise({ at, dur: .15, type: 'bandpass', f0: 600 + n * 50, f1: 1900 + n * 60, q: 1.6, level: .12 - n * .01, attack: .07 }));
      [.55, .9, 1.2].forEach((at, n) => k.tone({ at, dur: .12, type: 'triangle', f0: 190 - n * 15, f1: 90, level: .09, attack: .01, vibrato: 30 }));
      [.46, .63, .81, 1.0, 1.25].forEach((at, n) => k.tone({ at, dur: .22, f0: 2637 + n * 220, f1: 2600 + n * 220, level: .035, attack: .004 }));
      [.88, .95, 1.02, 1.09, 1.17, 1.25, 1.33, 1.41].forEach((at, n) => k.noise({ at, dur: .028, type: 'bandpass', f0: 2100 + n * 150, q: 3, level: .13 }));
      k.noise({ at: 1.45, dur: .5, type: 'bandpass', f0: 800, f1: 260, q: .7, level: .07, attack: .1 });
    },
    // Spark Snap: a fizzing, rising crackle as the charge builds (0–0.26), the SNAP at 0.26 (a
    // sharp electric crack, a bright zap and a deep thump), sizzling sparks raining out, crackles as
    // the card burns away (0.65–1.25) and a fading hiss.
    'burn-lvl-spark-snap': k => {
      k.noise({ dur: .26, type: 'highpass', f0: 2500, f1: 6000, level: .08, attack: .22 });
      [.06, .11, .15, .19, .22].forEach((at, n) => k.noise({ at, dur: .015, type: 'highpass', f0: 4000 + n * 300, level: .05 + n * .015 }));
      k.noise({ at: .26, dur: .06, type: 'highpass', f0: 2500, level: .38 });
      k.tone({ at: .26, dur: .22, type: 'sawtooth', f0: 1600, f1: 220, level: .1, attack: .002 });
      k.tone({ at: .26, dur: .4, f0: 90, f1: 38, level: .3 });
      k.noise({ at: .27, dur: .35, type: 'lowpass', f0: 3000, f1: 300, level: .22, attack: .004 });
      [.34, .39, .45, .5, .57, .63, .7, .78].forEach((at, n) => k.noise({ at, dur: .02, type: 'highpass', f0: 3200 + (n % 3) * 500, level: .1 - n * .007 }));
      [.68, .75, .83, .91, .99, 1.07, 1.16, 1.24].forEach((at, n) => k.noise({ at, dur: .028, type: 'bandpass', f0: 2300 + n * 140, q: 3, level: .12 }));
      k.noise({ at: 1.2, dur: .55, type: 'highpass', f0: 3600, f1: 1800, level: .05, attack: .1 });
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
