/* Full responsive scenes. No scene-sized source image and no safe-area icon.
   World coordinates equal the host's CSS dimensions. Every feature uses one
   uniform scale; terrain is constructed across the actual width. */
(function(){
'use strict';
const themes={
 candyfloss:['#633754','#b66f8c','#f8c5e0'],desert:['#9a6136','#e3ad66','#fff1bd'],jungle:['#021912','#124f39','#74c9a0'],devilish:['#0a0004','#480708','#ee6044'],angelic:['#244361','#6386a2','#ffedbf'],neon:['#090b25','#362345','#fc62b5'],aurora:['#061323','#103849','#67efb4'],space:['#070a1e','#232547','#beadff'],lunar:['#300813','#721522','#e6b665'],valentine:['#220619','#67182f','#f18ca9'],ramadan:['#060f2c','#173854','#e7d59e'],easter:['#254841','#6c9d79','#f9dbb8'],summer:['#13424f','#278c9a','#f6da98'],halloween:['#100d26','#372137','#f4b668'],diwali:['#241135','#713657','#f4c766'],christmas:['#160d12','#593027','#efce80'],newyear:['#080e26','#1e2748','#f7df9e'],casino:['#061c19','#16553f','#d4ae59'],winter:['#122c44','#4c7591','#d4efff'],midnight:['#050918','#172642','#d7def1'],royal:['#1d0d31','#492653','#e5bf62'],wood:['#382010','#79532e','#c09a62'],felt:['#071c17','#184735','#87b69a']};
const names={candyfloss:'Candyfloss',desert:'Desert',jungle:'Jungle',devilish:'Devilish',angelic:'Angelic',neon:'Neon City',aurora:'Northern Lights',space:'Deep Space',lunar:'Lantern Festival',valentine:'Candlelit Dinner',ramadan:'Crescent Night',easter:'Spring Meadow',summer:'Beach Day',halloween:'Haunted Graveyard',diwali:'Rangoli',christmas:'Fireside',newyear:'Midnight Skyline',casino:'Casino',winter:'Winter',midnight:'Midnight',royal:'Royal',wood:'Oak Wood',felt:'Classic Felt'};
let serial=0;
const F=n=>Number(n.toFixed(2));
function scene(id,W,H){
 const key=id.replace('table-',''),p=themes[key]; if(!p)return '';
 const u=Math.min(W,H),pad=u*.025,uid='ts'+(++serial)+'-',url=s=>`url(#${uid+s})`,c=p[2],pieces=[],features=[];
 const path=(d,fill,stroke='',sw=1,opacity=1)=>`<path d="${d}" fill="${fill}"${stroke?` stroke="${stroke}" stroke-width="${sw}"`:''} opacity="${opacity}"/>`;
 const circle=(x,y,r,fill,opacity=1)=>`<circle cx="${F(x)}" cy="${F(y)}" r="${F(r)}" fill="${fill}" opacity="${opacity}"/>`;
 const rect=(x,y,w,h,fill,rx=0)=>`<rect x="${F(x)}" y="${F(y)}" width="${F(w)}" height="${F(h)}" rx="${rx}" fill="${fill}"/>`;
 const defs=`<defs><linearGradient id="${uid}sky" x2="0" y2="1"><stop stop-color="${p[0]}"/><stop offset=".55" stop-color="${p[1]}"/><stop offset="1" stop-color="${p[0]}"/></linearGradient><linearGradient id="${uid}metal" x2=".7" y2="1"><stop stop-color="#fff0b9"/><stop offset=".26" stop-color="#d9ad51"/><stop offset=".56" stop-color="#705026"/><stop offset=".8" stop-color="#e5c77b"/><stop offset="1" stop-color="#48301b"/></linearGradient><linearGradient id="${uid}leaf" x2="1" y2=".8"><stop stop-color="#60b87c"/><stop offset=".44" stop-color="#216247"/><stop offset="1" stop-color="#092a22"/></linearGradient><linearGradient id="${uid}wing" x2=".8" y2="1"><stop stop-color="#9c3832"/><stop offset=".45" stop-color="#400f1b"/><stop offset="1" stop-color="#100916"/></linearGradient><linearGradient id="${uid}feather" x2=".8" y2="1"><stop stop-color="#fff8dc"/><stop offset=".46" stop-color="#cbdbe8"/><stop offset="1" stop-color="#7790b0"/></linearGradient><filter id="${uid}depth" x="-5%" y="-5%" width="110%" height="110%"><feDropShadow dx=".9" dy="1.6" stdDeviation="1.4" flood-color="#030617" flood-opacity=".45"/></filter><radialGradient id="${uid}moon" cx=".28" cy=".24" r=".78"><stop stop-color="#f1f1e7"/><stop offset=".6" stop-color="#b5c3ce"/><stop offset="1" stop-color="#5a6c88"/></radialGradient><radialGradient id="${uid}planet" cx=".27" cy=".22" r=".83"><stop stop-color="#b2b0cd"/><stop offset=".45" stop-color="#687d9e"/><stop offset="1" stop-color="#19263f"/></radialGradient><radialGradient id="${uid}lantern" cx=".35" cy=".35" r=".7"><stop stop-color="#dd8c66"/><stop offset=".45" stop-color="#a83c43"/><stop offset="1" stop-color="#401421"/></radialGradient><linearGradient id="${uid}wax" x2="1"><stop stop-color="#99765b"/><stop offset=".4" stop-color="#f1d4a8"/><stop offset=".7" stop-color="#e5c092"/><stop offset="1" stop-color="#8b654e"/></linearGradient><radialGradient id="${uid}cloud"><stop stop-color="#fff4dd" stop-opacity=".68"/><stop offset=".58" stop-color="#e9e9ef" stop-opacity=".3"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><radialGradient id="${uid}enamel"><stop stop-color="#ffdc99"/><stop offset=".55" stop-color="#d89b64"/><stop offset="1" stop-color="#8b4661"/></radialGradient><radialGradient id="${uid}lamp"><stop stop-color="${c}" stop-opacity=".3"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient><radialGradient id="${uid}vignette"><stop offset=".46" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".34"/></radialGradient><linearGradient id="${uid}ground" x2="0" y2="1"><stop stop-color="${p[1]}"/><stop offset="1" stop-color="${p[0]}"/></linearGradient><pattern id="${uid}weave" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 0L8 8M8 0L0 8" stroke="${c}" opacity=".045" stroke-width=".6"/></pattern></defs>`;
 pieces.push(rect(0,0,W,H,url('sky')),rect(0,0,W,H,url('weave')));
 function feature(name,art,x,y,w,h,minimum=.12){
  // Art uses a 100 by 100 local square, or an explicitly supplied aspect.
  features.push(name);
  pieces.push(`<g ${minimum>=.12?`data-scene-feature="${name}" data-min-unit="${minimum}"`:`data-scene-detail="${name}"`} data-feature-box="${[x,y,w,h].map(F)}" transform="translate(${F(x)} ${F(y)}) scale(${F(w/100)})" filter="${url('depth')}">${art}</g>`);
 }
 function place(name,art,fx,fy,size,ratio=1,minimum=.12){
  const w=size*u,h=w*ratio,x=pad+(W-2*pad-w)*fx,y=pad+(H-2*pad-h)*fy;
  feature(name,art,x,y,w,h,minimum);
 }
 function terrain(y,col,amp=.06,seed=0){
  const step=u*.7,n=Math.ceil(W/step),start=H*y;
  let d=`M0 ${F(start)}`;
  for(let i=0;i<n;i++){const x=i*step,yy=start+Math.sin(i*1.7+seed)*u*amp;d+=` Q${F(x+step*.5)} ${F(yy-u*amp)} ${F(Math.min(W,x+step))} ${F(yy)}`;}
  pieces.push(path(d+` L${W} ${H} L0 ${H}Z`,col),path(d,'none',c,u*.003,.22));
 }
 function stars(amount=80,col=c,kind='star'){
  const count=Math.min(400,Math.ceil(amount*W*H/(u*u)));
  for(let i=0;i<count;i++){
   const x=pad+(W-2*pad)*((i*.61803399+.17)%1),y=pad+(H-2*pad)*((i*.41421356+.21)%1),r=u*(.0018+(i%5)*.00055);
   if(kind==='petal')pieces.push(`<ellipse cx="${F(x)}" cy="${F(y)}" rx="${F(r*2.5)}" ry="${F(r)}" fill="${col}" opacity=".22" transform="rotate(${i*37} ${F(x)} ${F(y)})"/>`);
   else pieces.push(circle(x,y,r,col,.18+(i%4)*.12));
  }
 }
 function glow(x,y,r){pieces.push(circle(x,y,r,url('lamp')));}
 function orb(moon=false){return circle(50,50,47,url('lamp'))+circle(50,50,29,moon?url('moon'):'#fff0c1',.86)+(!moon?'':circle(40,40,4,'#adb6ca',.3)+circle(58,55,7,'#adb6ca',.3));}
 function wing(angel=false,right=false){
  let s='';if(angel){
   // Tapered overlapping flight feathers fan from an anatomical shoulder.
   for(let i=0;i<17;i++){
    const t=i/16,tx=8+Math.sin(t*Math.PI)*6,ty=7+t*81,bx=88-t*9,by=68+t*14;
    s+=path(`M${bx} ${by}Q${52-t*17} ${24+t*52} ${tx} ${ty}Q${tx-3} ${ty+5} ${tx+4} ${ty+9}Q${45-t*10} ${53+t*28} ${bx-3} ${by+7}Z`,url('feather'),'#91a8bf',.65)
      +path(`M${bx-5} ${by+2}Q${48-t*16} ${40+t*42} ${tx+2} ${ty+4}`,'none','#fff5d6',.5,.72);
   }
   for(let i=0;i<8;i++)s+=path(`M${78-i*3} ${72+i*1.8}Q${45-i*2} ${41+i*5} ${24+i*4} ${30+i*6}Q${49-i*2} ${58+i*5} ${76-i*3} ${78+i*1.8}Z`,url('feather'),'#bacbd5',.35);
  }else{s=path('M5 90Q8 16 94 7L82 37Q68 27 65 59Q44 37 40 80Q24 53 5 90Z',url('wing'),'#ae5549',1.2)+path('M5 90L94 7M5 90L65 59M5 90L40 80','none','#b1574b',.8,.65);}
  return right?`<g transform="translate(100 0) scale(-1 1)">${s}</g>`:s;
 }
 function tree(palm=false,dead=false){
  if(palm){let s=path('M48 99Q52 58 45 35L54 33Q65 65 61 99Z','#84512d','#d9ad65',1);for(let i=0;i<8;i++){let dx=(i<4?-1:1)*(32+(i%4)*5),dy=12+(i%4)*8;s+=path(`M50 35Q${50+dx*.5} ${12+(i%4)*7} ${50+dx} ${dy+22}Q${50+dx*.7} ${dy+18} 50 35Z`,url('leaf'),'#62916b',.5);}return s;}
  let s=path('M45 99L48 25L54 25L60 99Z',dead?'#100c19':'#5f3925');
  if(dead){for(let i=0;i<8;i++)s+=path(`M51 ${30+i*7}L${i%2?92:8} ${5+i*8}l${i%2?-8:9} -12`,'none','#1b1221',3);}
  else {for(let i=0;i<8;i++)s+=`<ellipse cx="${19+i*9}" cy="${29+Math.sin(i)*4}" rx="22" ry="9" fill="${i%2?'#373529':'#464731'}"/>`;}
  return s;
 }
 const cactus=path('M44 95V22Q44 8 57 8Q68 8 68 22V95Z',url('leaf'),'#27462c',1.5)+path('M45 58H24Q16 58 16 49V35Q16 23 28 24V44H45M67 48H82V24Q82 14 91 17V49Q91 62 68 62',url('leaf'),'#27462c',1.5)+path('M52 22V90M60 22V90','none','#9ec979',.7,.4);
 function flower(col='#edacbe'){let s='';for(let i=0;i<8;i++)s+=`<ellipse cx="50" cy="29" rx="10" ry="22" transform="rotate(${i*45} 50 50)" fill="${col}" stroke="#f8dfc5" stroke-width=".5"/>`;return s+circle(50,50,12,url('metal'));}
 function lantern(){return path('M35 8H65L70 17H30Z',url('metal'))+`<ellipse cx="50" cy="46" rx="29" ry="32" fill="${url('lantern')}" stroke="#e6b765" stroke-width="2"/>`+path('M35 18Q20 47 36 73M50 17V76M65 18Q80 47 64 73','none','#f6bf7a',1.5,.6)+rect(33,73,34,7,url('metal'),2)+path('M50 81V96M43 87V96M57 87V96','none','#d5a64c',1.4)+circle(45,37,12,url('lamp'));}
 function candle(){return rect(40,39,21,47,url('wax'),3)+path('M50 4Q70 24 52 36Q32 28 50 4Z','#ffe1a0')+path('M50 17Q59 30 50 33Q43 28 50 17Z','#fff6d9')+path('M20 88Q50 72 80 88L73 96H27Z',url('metal'));}
 function pine(snow=false){let s=rect(46,76,9,24,'#4a3027');for(let i=0;i<4;i++){s+=path(`M50 ${3+i*17}L${17-i*3} ${37+i*17}H${83+i*3}Z`,snow?'#38576a':url('leaf'),snow?'#c4dfef':'#77a885',.8);if(snow)s+=path(`M50 ${3+i*17}L${39-i*2} ${17+i*17}H${60+i*2}Z`,'#d4e8ef');}return s;}
 function egg(col){return `<ellipse cx="50" cy="53" rx="32" ry="43" fill="${col}" stroke="#fff0c5" stroke-width="1.2"/>`+path('M18 46H82M21 68L30 61L40 68L50 61L60 68L70 61L80 68','none','#ffe7b2',3)+circle(37,30,11,'#fff',.15);}
 function pumpkin(){return `<ellipse cx="50" cy="56" rx="46" ry="35" fill="#c56827" stroke="#f4ad57"/><ellipse cx="50" cy="56" rx="31" ry="35" fill="#d78232"/><ellipse cx="50" cy="56" rx="17" ry="35" fill="#e69b45"/>`+path('M46 21L51 6L60 9L56 25','#51512b')+path('M26 42L39 53H24ZM73 42L60 53H76ZM29 67L41 71L48 63L55 74L70 65L61 81L42 83Z','#fff0b4');}
 function snowflake(){let s='';for(let i=0;i<6;i++)s+=`<g transform="rotate(${i*60} 50 50)"><path d="M50 50V5M50 18L40 12M50 18L60 12M50 32L35 23M50 32L65 23" stroke="#d6f1ff" stroke-width="1.3" fill="none"/></g>`;return s;}
 function crown(){return path('M9 32L26 48L34 15L51 44L67 15L75 48L93 32L80 84H22Z',url('metal'),'#f4dc9c',1)+rect(21,81,60,12,url('metal'),3)+circle(51,65,7,'#85c7da')+circle(34,13,4,'#f2d594')+circle(67,13,4,'#f2d594');}
 function skyline(y,colour,lights=true){
  const bw=u*.065;for(let i=0;i<Math.ceil(W/bw);i++){
   const hh=u*(.10+((i*7)%13)*.012),x=i*bw,yy=H*y-hh;
   pieces.push(rect(x,yy,bw*.92,H-yy,colour));if(lights)for(let a=0;a<3;a++)for(let b=0;b<Math.ceil(hh/(u*.025));b++)pieces.push(rect(x+bw*(.13+a*.26),yy+u*.015+b*u*.025,bw*.11,u*.007,i%3===0?'#e793a5':c));
  }
 }
 function wreathArt(){let s='';for(let i=0;i<24;i++)s+=`<g transform="rotate(${i*15} 50 50)">${path('M48 10Q29 1 25 17Q44 24 48 10',url('leaf'))}${circle(48,9,2,'#c04644')}</g>`;return s;}
 function borderPattern(kind='diamonds'){
  const step=u*.14;
  for(let x=step*.5;x<W;x+=step){let sz=step*.3;pieces.push(path(`M${x} ${pad}l${sz} ${sz}l-${sz} ${sz}l-${sz} -${sz}Z`,'none',c,u*.0018,.35),path(`M${x} ${H-pad}l${sz} -${sz}l-${sz} -${sz}l-${sz} ${sz}Z`,'none',c,u*.0018,.35));}
 }
 function cloud(x,y,w){let a='';for(let i=0;i<7;i++)a+=circle(x+w*i*.10,y-Math.sin(i/6*Math.PI)*w*.13,w*(.24+(i%3)*.025),url('cloud'));pieces.push(`<g opacity=".60">${a}</g>`);}
 function rangoli(){let s=circle(50,50,48,'#412744');
  for(let r of [47,44,36,26,15])s+=`<circle cx="50" cy="50" r="${r}" fill="none" stroke="#e1bc73" stroke-width=".55"/>`;
  for(let ring=0;ring<3;ring++)for(let i=0;i<24;i++){
   const top=7+ring*11,bottom=28+ring*6;
   s+=`<g transform="rotate(${i*15+ring*7.5} 50 50)">${path(`M50 ${top}Q${43+ring} ${top+8} 50 ${bottom}Q${57-ring} ${top+8} 50 ${top}Z`,ring===1?'#af508a':url('enamel'),'#f4dba5',.4)}${path(`M50 ${top+4}V${bottom-4}`,'none','#ffe6b2',.32,.65)}</g>`;
  }
  for(let i=0;i<96;i++){const a=i*Math.PI/48;s+=circle(50+Math.cos(a)*46,50+Math.sin(a)*46,.45,'#f1c475');}
  return s+flower('#c7779c').replaceAll('rx="10"','rx="3"').replaceAll('ry="22"','ry="7"').replaceAll('cy="29"','cy="44"')+circle(50,50,5,url('metal'));
 }
 function firework(col){let s='';for(let i=0;i<40;i++){const a=i*Math.PI/20,xx=50+Math.cos(a)*42,yy=50+Math.sin(a)*42;s+=path(`M${50+Math.cos(a)*12} ${50+Math.sin(a)*12}L${xx} ${yy}`,'none',col,.8,.7)+circle(xx,yy,1,col);}return s;}
 function classicPattern(royal){
  const spacing=(royal?22:18)*Math.SQRT2,stroke=(royal?1:2),opacity=royal?.07:.035;
  const lines=`M${-spacing} 0L${spacing} ${spacing*2}M0 0L${spacing} ${spacing}M0 ${-spacing}L${spacing*2} ${spacing}`+(royal?`M0 ${spacing}L${spacing} 0M${-spacing} ${spacing}L${spacing} ${-spacing}M0 ${spacing*2}L${spacing*2} 0`:'');
  pieces.length=0;
  pieces.push(`<defs><linearGradient id="${uid}classic-sky" x2="0" y2="1"><stop stop-color="${royal?'#1e0b3d':'#071a17'}"/><stop offset="${royal?.50:.48}" stop-color="${royal?'#3b0764':'#064e3b'}"/><stop offset="1" stop-color="${royal?'#1e0b3d':'#031713'}"/></linearGradient><radialGradient id="${uid}classic-light" cx=".5" cy=".45" r="${royal?.55:.48}"><stop stop-color="${royal?'#a78bfa':'#10b981'}" stop-opacity="${royal?.28:.30}"/><stop offset="1" stop-color="${royal?'#a78bfa':'#10b981'}" stop-opacity="0"/></radialGradient><pattern id="${uid}classic-lines" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse"><path d="${lines}" fill="none" stroke="#fbbf24" stroke-width="${stroke}" opacity="${opacity}"/></pattern></defs>`,rect(0,0,W,H,url('classic-sky')),rect(0,0,W,H,url('classic-lines')),rect(0,0,W,H,url('classic-light')));
 }
 switch(key){
 case 'desert':
  glow(W*.75,H*.21,u*.45);place('sun',orb(),.84,.17,.34,1,.24);
  terrain(.40,'#c78b51',.06);terrain(.57,'#d6a35f',.11,2);terrain(.72,'#b98148',.07,4);terrain(.90,'#925f34',.04,3);
  place('acacia',tree(),.98,.70,.34,1,.24);place('cactus',cactus,.06,.86,.21,1,.16);
  for(let i=0;i<22;i++){const x=(i*.618%1)*W,y=H*.6+(i*.414%1)*H*.35;pieces.push(path(`M${x} ${y}q${u*.07} -${u*.03} ${u*.17} 0`,'none','#e3bb82',u*.002,.26));}break;
 case 'devilish':
  terrain(.60,'#370915',.14);terrain(.79,'#210610',.10,3);
  place('left-wing',wing(),0,.44,.48,1,.38);place('right-wing',wing(false,true),1,.44,.48,1,.38);
  place('left-horn',path('M12 92Q15 26 83 6Q43 38 47 89Z','#17070e','#734135',1),0,0,.23,1,.17);
  place('right-horn',`<g transform="translate(100 0) scale(-1 1)">${path('M12 92Q15 26 83 6Q43 38 47 89Z','#17070e','#734135',1)}</g>`,1,0,.23,1,.17);
  for(let x=0;x<W;x+=u*.12)pieces.push(path(`M${x} ${H}Q${x+u*.02} ${H-u*.19} ${x+u*.06} ${H-u*.28}Q${x+u*.10} ${H-u*.08} ${x+u*.15} ${H}Z`,'#2c0810','#863629',u*.0015));stars(50,'#ec9852');break;
 case 'angelic':
  for(let x=-u*.15;x<W;x+=u*.25)cloud(x,H*.89,u*.35);
  place('left-wing',wing(true),0,.40,.46,1,.36);place('right-wing',wing(true,true),1,.40,.46,1,.36);
  place('halo',`<ellipse cx="50" cy="50" rx="44" ry="20" fill="none" stroke="#fce8b5" stroke-width="3"/><ellipse cx="50" cy="50" rx="44" ry="20" fill="none" stroke="#fff7df" stroke-width=".8"/>`,.50,.13,.40,1,.28);
  for(let x=-u*.2;x<W;x+=u*.32)cloud(x,H*.11,u*.27);stars(45,'#f7e8c1');break;
 case 'jungle': {
  // A continuous forest: distant trunks, overlapping canopy, rooted foreground
  // trees and fern beds. Extend the forest across any screen shape.
  glow(W*.50,H*.34,u*.68);
  for(let layer=0;layer<3;layer++){
   const step=u*(.12+layer*.045),col=['#214f42','#123c30','#092a22'][layer];
   for(let i=0;i<Math.ceil(W/step)+1;i++){
    const x=i*step,y=H*(.12+layer*.07),base=H*(.80+layer*.065),tw=u*(.014+layer*.01);
    pieces.push(path(`M${x-tw} ${base}Q${x+tw} ${H*.5} ${x-tw*.4} ${y}L${x+tw*.5} ${y}Q${x+tw*.3} ${H*.6} ${x+tw*2} ${base}Z`,col));
    for(let j=0;j<4;j++)pieces.push(`<ellipse cx="${x+(j-1.5)*step*.28}" cy="${y+Math.sin(i*2+j)*u*.045}" rx="${step*.64}" ry="${u*(.065+layer*.015)}" fill="${col}"/>`);
    pieces.push(path(`M${x} ${H*.48}Q${x-step*.5} ${H*.3} ${x-step*.7} ${H*.26}M${x} ${H*.58}Q${x+step*.3} ${H*.38} ${x+step*.7} ${H*.35}`,'none',col,tw*.7));
   }
  }
  terrain(.87,'#08291e',.025);terrain(.96,'#051d17',.02,4);
  const rootedTree=path('M41 28Q56 39 43 78L18 96L45 87L53 96L59 86L86 98L64 77Q57 37 61 28Z','#173c2b','#436247',.7)+path('M50 34Q58 52 52 83M57 42L80 28M49 48L23 33','none','#6b7650',1,.45)+`<ellipse cx="28" cy="28" rx="23" ry="15" fill="${url('leaf')}"/><ellipse cx="70" cy="27" rx="24" ry="17" fill="${url('leaf')}"/><ellipse cx="48" cy="20" rx="29" ry="18" fill="${url('leaf')}"/>`;
  place('left-rooted-tree',rootedTree,0,.55,.52,1,.38);place('right-rooted-tree',rootedTree,1,.67,.48,1,.35);
  for(let x=u*.035;x<W;x+=u*.15){
   pieces.push(path(`M${x} 0Q${x+u*.06} ${H*.12} ${x+u*.02} ${H*.31}`,'none','#446345',u*.003,.65));
   for(let j=0;j<7;j++){
    const y=H-u*(.015+j*.012),spread=u*(.055-j*.005);
    pieces.push(path(`M${x} ${y}q-${spread} -${u*.055} -${spread*1.2} -${u*.025}Q${x-spread*.4} ${y} ${x} ${y}q${spread} -${u*.055} ${spread*1.2} -${u*.025}Q${x+spread*.4} ${y} ${x} ${y}`,'#23503a'));
   }
  }
  break;
 }
 case 'candyfloss':
  terrain(.71,'#9c6987',.12);terrain(.89,'#b286a3',.08,3);
  for(let i=0;i<18;i++)cloud((i*.618%1)*W,(i*.414%1)*H,u*(.18+(i%3)*.07));
  const lol=circle(50,36,31,'#eec4dc')+path('M50 36Q18 24 40 12Q75 -1 79 32Q82 56 56 65Q25 74 18 48Q10 19 40 15Q62 14 62 36Q59 54 40 46Q25 37 50 36','none','#b574a3',5)+rect(47,65,6,32,'#e2baae',2);
  place('left-lollipop',lol,0,.78,.28,1,.20);place('right-lollipop',lol,1,.37,.28,1,.20);stars(70,'#fff0d7','petal');break;
 case 'neon':
  glow(W*.82,H*.27,u*.5);place('neon-moon',orb(true),.87,.17,.28,1,.20);skyline(.66,'#141b33');skyline(.90,'#111a29');
  for(let i=0;i<Math.ceil(W/(u*.2));i++){let x=i*u*.2;pieces.push(path(`M${x} ${H*.72}V${H}M${x} ${H*.87}H${x+u*.13}`,'none',i%2?'#59b6c9':'#af4f93',u*.003,.36));}stars(40,'#9bceec');break;
 case 'aurora':
  for(let i=0;i<28;i++)pieces.push(path(`M${W*i/28} ${H*.08}Q${W*(i/28+.08)} ${H*.21} ${W*(i/28+.13)} ${H*.36}`,'none',i%2?'#70d5bb':'#759bcc',u*.025,.045));
  for(let i=0;i<6;i++)pieces.push(path(`M0 ${H*(.12+i*.045)}Q${W*.24} ${H*(.03+i*.05)} ${W*.50} ${H*(.24+i*.05)}T${W} ${H*(.16+i*.045)}`,'none',i%2?'#65d4a6':'#7193c9',u*.025,.20));
  terrain(.76,'#152b3c',.18);terrain(.90,'#091c2d',.07,2);place('moon',orb(true),.8,.13,.21,1,.14);
  place('left-pine',pine(),0,.92,.27,1,.20);place('right-pine',pine(),1,.86,.32,1,.23);stars(70,'#c4e7e0');break;
 case 'space':
  for(let i=0;i<10;i++)glow(W*(i*.618%1),H*(i*.414%1),u*(.20+(i%3)*.10));stars(120,'#d2d0e8');
  place('planet',circle(50,50,43,url('planet'))+path('M12 47Q48 29 90 41M16 66Q56 48 89 65','none','#9b91b5',8,.5)+circle(36,29,12,'#e1def6',.15),0,.20,.34,1,.25);
  place('ringed-planet',`<ellipse cx="50" cy="50" rx="47" ry="12" transform="rotate(-24 50 50)" fill="none" stroke="#b0a8d6" stroke-width="6"/>${circle(50,50,25,url('planet'))}<path d="M8 68Q54 77 94 28" fill="none" stroke="#d8c9dd" stroke-width="3"/>`,1,.62,.40,1,.29);terrain(.94,'#141626',.10);break;
 case 'lunar':
  borderPattern();for(let i=0,n=Math.max(2,Math.floor(W/(u*.23)));i<n;i++){const x=pad+u*.07+i*(W-2*pad-u*.14)/(n-1);pieces.push(path(`M${x} 0V${u*.07}`,'none',c,u*.003));feature('lantern-'+i,lantern(),x-u*.07,u*.065,u*.14,u*.14,.10);}
  place('left-lantern',lantern(),0,.32,.25,1,.18);place('right-lantern',lantern(),1,.55,.25,1,.18);
  skyline(.92,'#3b1820',false);for(let x=0;x<W;x+=u*.28)pieces.push(path(`M${x-u*.04} ${H*.85}Q${x+u*.12} ${H*.79} ${x+u*.28} ${H*.85}`,'none','#bd985a',u*.015,.5));stars(45,'#e2bd78');break;
 case 'valentine':
  for(let side=0;side<2;side++){let x=side?W-u*.20:0;pieces.push(path(`M${x} 0H${x+u*.20}Q${x+u*.08} ${H*.4} ${x+u*.20} ${H}H${x}Z`,'#481226'));for(let j=0;j<5;j++)pieces.push(path(`M${x+j*u*.035} 0Q${x+u*.12} ${H*.5} ${x+j*u*.035} ${H}`,'none','#a34b60',u*.003,.25));}
  terrain(.86,'#341523',.04);place('left-candle',candle(),.04,.62,.22,1,.16);place('right-candle',candle(),.96,.62,.22,1,.16);break;
 case 'ramadan':
  place('crescent',path('M65 7A43 43 0 1 0 65 93A48 48 0 0 1 65 7Z','#e8d2a1'),0,.15,.32,1,.24);place('lantern',lantern(),1,.22,.24,1,.17);stars(90,'#e6d9ba');
  skyline(.94,'#0a2237',false);
  for(let x=0;x<W;x+=u*.32)pieces.push(path(`M${x} ${H}V${H-u*.20}Q${x+u*.1} ${H-u*.44} ${x+u*.2} ${H-u*.20}V${H}Z`,'#0a2338','#557075',u*.002,.8));borderPattern();break;
 case 'easter':
  terrain(.49,'#66896d',.10);terrain(.69,'#3e7257',.09,3);terrain(.89,'#2a5b47',.06,1);
  for(let i=0;i<20;i++){const x=(i*.618%1)*W,y=H*.59+(i*.414%1)*H*.36;feature('flower-'+i,flower(i%2?'#d8bccb':'#edd19c'),x,y,u*.06,u*.06,.03);}
  place('left-egg',egg('#b9a5ca'),0,.70,.24,1,.17);place('right-egg',egg('#d9b0ad'),1,.87,.28,1,.20);place('cloud-sun',orb(),.8,.09,.25,1,.18);stars(45,'#e3d9b6','petal');break;
 case 'summer':
  place('sun',orb(),.8,.12,.28,1,.20);terrain(.42,'#367f8b',.025);terrain(.54,'#257481',.03);terrain(.70,'#bda079',.05);terrain(.90,'#a88b66',.025);
  for(let i=0;i<5;i++)pieces.push(path(`M0 ${H*(.51+i*.035)}Q${W*.3} ${H*(.50+i*.035)} ${W*.6} ${H*(.51+i*.035)}T${W} ${H*(.51+i*.035)}`,'none','#afcecb',u*.002,.35));
  place('left-palm',tree(true),0,.76,.38,1,.28);place('right-palm',tree(true),1,.58,.34,1,.25);stars(32,'#ead5b4');break;
 case 'halloween':
  place('moon',orb(true),.85,.16,.31,1,.23);terrain(.65,'#27182d',.10);terrain(.87,'#160e1f',.06,3);place('left-dead-tree',tree(false,true),0,.43,.35,1,.26);place('right-dead-tree',tree(false,true),1,.55,.35,1,.26);
  place('pumpkin',pumpkin(),0,.92,.29,1,.21);place('gravestone',path('M25 97V39Q25 8 50 8Q77 8 77 39V97Z','#5b5462','#8b8190',1)+path('M50 32V74M37 45H63','none','#211d2c',4),1,.92,.24,1,.18);stars(55,'#d7b486');break;
 case 'diwali':
  // One large complete circle in the scene, independent of card geometry.
  place('rangoli',rangoli(),.5,.59,.83,1,.68);borderPattern();
  for(let x=pad;x+u*.11<W-pad;x+=u*.18)feature('diya-top-'+Math.round(x),candle(),x, pad,u*.11,u*.11,.075);
  place('left-diya',candle(),0,.90,.20,1,.14);place('right-diya',candle(),1,.90,.20,1,.14);stars(65,'#efcc83','petal');break;
 case 'christmas':
  // Warm panelled room, straight skirting and timber floor; no outdoor imagery.
  pieces.push(rect(0,H*.82,W,H*.18,'#312421'));
  for(let x=0;x<W;x+=u*.18)pieces.push(path(`M${x} ${H*.17}V${H*.81}`,'none','#9c7350',u*.002,.22));
  pieces.push(path(`M0 ${H*.82}H${W}`,'none','#a37b55',u*.009,.65));
  for(let y=H*.86;y<H;y+=u*.07)pieces.push(path(`M0 ${y}H${W}`,'none','#79513b',u*.002,.35));
  place('wall-wreath',wreathArt(),.5,.17,.32,1,.23);
  const fire=rect(9,19,82,72,'#4e322e',3)+rect(18,29,64,52,'#120d16',2)+path('M29 74Q23 49 43 40Q34 61 48 56Q54 34 60 30Q74 56 69 74Z','#cf8750')+path('M42 74Q38 60 51 53Q55 65 62 74Z','#edce82')+rect(5,17,90,8,url('metal'),2)+rect(5,89,90,7,'#826248',2);
  place('fireplace',fire,.52,.94,.58,1,.44);break; // v274 (owner): no row of wreaths along the top
 case 'newyear':
  skyline(.88,'#10192d');skyline(.98,'#080f20');place('left-firework',firework('#e6c477'),0,.18,.40,1,.30);place('right-firework',firework('#cb9fc6'),1,.36,.34,1,.25);stars(90,'#efd8a4');break;
 case 'casino':
  classicPattern(false);break;
 case 'winter':
  terrain(.71,'#69899d',.14);terrain(.87,'#92aebe',.06,4);terrain(.96,'#55768a',.03);place('left-pine',pine(true),0,.72,.34,1,.25);place('right-pine',pine(true),1,.87,.39,1,.28);place('snowflake',snowflake(),.84,.15,.27,1,.20);stars(110,'#d4e9f3');break;
 case 'midnight':
  terrain(.78,'#162335',.14);terrain(.91,'#0a1527',.06,4);place('moon',orb(true),.88,.13,.32,1,.23);place('left-pine',pine(),0,.89,.29,1,.21);stars(130,'#c8d8eb');break;
 case 'royal':
  classicPattern(true);break;
 case 'wood':
  // Actual seamless texture, fixed 640px CSS repeat, plus extended plank joints.
  pieces.push(`<defs><pattern id="${uid}tile" width="640" height="640" patternUnits="userSpaceOnUse"><image href="art/tables/wood-tile.jpg" width="640" height="640"/></pattern></defs>`,rect(0,0,W,H,url('tile')));
  for(let x=0;x<W;x+=u*.25)pieces.push(path(`M${x} 0V${H}`,'none','#281809',u*.003,.25));break;
 case 'felt':
  pieces.push(`<defs><pattern id="${uid}tile" width="640" height="640" patternUnits="userSpaceOnUse"><image href="art/tables/felt-tile.jpg" width="640" height="640"/></pattern></defs>`,rect(0,0,W,H,url('tile')));borderPattern();break;
 }
 // Contrast is a screen-sized translucent light treatment, not a box that
 // reserves a tiny place for art. It never hides the landscape or scales art.
 pieces.push(rect(0,0,W,H,url('vignette')));
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${F(W)} ${F(H)}" width="${F(W)}" height="${F(H)}" preserveAspectRatio="xMidYMid meet" data-full-scene="${id}" aria-hidden="true">${defs}${pieces.join('')}</svg>`;
}
function draw(host,id){
 if(!host || !themes[id?.replace('table-','')]){host?.querySelector(':scope > .responsive-scene')?.remove();return;}
 const W=host.clientWidth,H=host.clientHeight;if(W<=0||H<=0)return;
 let layer=host.querySelector(':scope > .responsive-scene');if(!layer){layer=document.createElement('div');layer.className='responsive-scene';host.prepend(layer);}
 const stamp=id+':'+W+':'+H;if(layer.dataset.stamp===stamp)return;layer.dataset.stamp=stamp;layer.innerHTML=scene(id,W,H);
}
const tracked=new WeakSet();let pending=false;
const resize=new ResizeObserver(()=>queue());
function refresh(){
 pending=false;
 document.querySelectorAll('#gameTable,#homeBackdrop,.mini-table').forEach(host=>{
  if(!tracked.has(host)){tracked.add(host);resize.observe(host);}
  const id=host.matches('.mini-table')?host.dataset.tablePreview:host.id==='homeBackdrop'?host.dataset.table:document.body.dataset.equippedTableTheme;
  draw(host,id);
 });
}
function queue(){if(!pending){pending=true;requestAnimationFrame(refresh);}}
window.ShTableScenes={scene,draw,refresh,queue,themes,names};
window.addEventListener('resize',queue);window.visualViewport?.addEventListener('resize',queue);
document.addEventListener('DOMContentLoaded',()=>{new MutationObserver(queue).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-equipped-table-theme','data-table','class','style']});queue();});
})();
