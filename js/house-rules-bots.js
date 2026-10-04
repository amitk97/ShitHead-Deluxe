(function(g){'use strict';
const VALUE={burn:150,pickUp:130,transparent:75,reset:85,dropBase:70,skip:90,reverse:55,evens:65,odds:65,playLower:70,none:0,off:0};
const ACC={easy:.25,medium:.55,hard:.85,boss:.97};
function score(ctx){
 const p=g.ShHouseRules?.power(ctx.rules,ctx.rank)||'none';let s=(VALUE[p]||0)+(ctx.count||1)*18;
 if(p==='burn')s+=(ctx.pileSize||0)*18;
 if(p==='pickUp')s+=(ctx.nextOpponentCards<=3?75:25);
 if(['skip','reverse','evens','odds','playLower','dropBase'].includes(p)&&ctx.nextOpponentCards<=3)s+=45;
 if(p==='transparent'&&ctx.hasAlternatives)s-=ctx.difficulty==='boss'?35:15;
 if(ctx.hasAlternatives&&['burn','pickUp','reset'].includes(p))s-=ctx.difficulty==='boss'?25:10;
 if(ctx.rank==='JOKER'&&ctx.rules?.joker==='off')return -Infinity;
 return s;
}
function choose(contexts,difficulty){
 if(!contexts?.length)return null;const d=ACC[difficulty]!=null?difficulty:'medium';
 const ranked=contexts.map(x=>({x,s:score({...x,difficulty:d})})).sort((a,b)=>b.s-a.s);
 if(ranked.length===1||Math.random()<ACC[d])return ranked[0].x;
 const mistakes=ranked.slice(1);return mistakes[Math.floor(Math.random()*mistakes.length)].x;
}
g.ShHouseRulesBots={score,choose,accuracy:ACC};
})(window);