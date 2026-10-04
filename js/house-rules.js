(function(g){'use strict';
const RANKS=['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const POWERS=['burn','dropBase','evens','none','odds','pickUp','playLower','reset','reverse','skip','transparent'];
const LABEL={burn:'Burn',dropBase:'Drop to Base',evens:'Evens',none:'No Power',odds:'Odds',pickUp:'Pick Up',playLower:'Play Lower',reset:'Reset',reverse:'Reverse',skip:'Skip',transparent:'Transparent'};
const JOKER=['burn','dropBase','off','pickUp','reset','transparent'];
const CLASSIC={name:'ShitHead Deluxe',cards:{'2':'reset','3':'transparent','4':'none','5':'dropBase','6':'evens','7':'playLower','8':'skip','9':'reverse','10':'burn','J':'odds','Q':'none','K':'none','A':'none'},joker:'pickUp',fourKind:'burns'};
function fresh(){return {name:'Custom',cards:Object.fromEntries(RANKS.map(r=>[r,''])),joker:'',fourKind:''};}
function allowed(rank,power){
 if(!POWERS.includes(power)) return false;
 if(power==='playLower'&&['2','3','4'].includes(rank)) return false;
 if(power==='evens'&&['3','5','7','9','J','K'].includes(rank)) return false;
 if(power==='odds'&&['2','4','6','8','10','Q','A'].includes(rank)) return false;
 return true;
}
function counts(rules){const out={}; RANKS.forEach(r=>{const p=rules.cards?.[r];if(p&&p!=='none')out[p]=(out[p]||0)+1;});if(rules.joker&&rules.joker!=='off')out[rules.joker]=(out[rules.joker]||0)+1;return out;}
function validate(rules){
 const errors=[],warnings=[],c=counts(rules||{});
 RANKS.forEach(r=>{const p=rules?.cards?.[r]||'';if(!p)errors.push(r+' needs a selection');else if(!allowed(r,p))errors.push(r+' cannot use '+(LABEL[p]||p));});
 if(!rules?.joker)errors.push('Joker needs a selection'); else if(!JOKER.includes(rules.joker))errors.push('Invalid Joker power');
 if(!rules?.fourKind)errors.push('4 of a Kind needs a selection'); else if(!['burns','none'].includes(rules.fourKind))errors.push('Invalid 4 of a Kind rule');
 Object.entries(c).forEach(([p,n])=>{if(n>2)errors.push((LABEL[p]||p)+' can only be assigned to 2 ranks');});
 ['burn','transparent','pickUp'].forEach(p=>{if((c[p]||0)===2)warnings.push((LABEL[p]||p)+' is assigned twice; this can make the match unusually chaotic.');});
 return {valid:!errors.length,errors,warnings,counts:c};
}
function power(rules,rank){if(rank==='JOKER')return rules?.joker||'pickUp';return rules?.cards?.[rank]||null;}
function saveVariant(uid,rules){
 if(!uid) return {ok:false,error:'Sign in to save House Rules.'};
 const v=validate(rules); if(!v.valid)return {ok:false,error:v.errors[0]};
 let all=[];try{all=JSON.parse(localStorage.getItem('shithead_house_rules_'+uid)||'[]');}catch(e){}
 const clean={name:String(rules.name||'My House Rules').trim().slice(0,24)||'My House Rules',cards:{...rules.cards},joker:rules.joker,fourKind:rules.fourKind};
 const i=all.findIndex(x=>x.name.toLowerCase()===clean.name.toLowerCase()); if(i>=0)all[i]=clean;else if(all.length>=3)return {ok:false,error:'You can save up to 3 House Rules variants.'};else all.push(clean);
 localStorage.setItem('shithead_house_rules_'+uid,JSON.stringify(all));return {ok:true,variants:all};
}
function loadVariants(uid){if(!uid)return[];try{return JSON.parse(localStorage.getItem('shithead_house_rules_'+uid)||'[]').slice(0,3);}catch(e){return[];}}
g.ShHouseRules={RANKS,POWERS,LABEL,JOKER,CLASSIC,fresh,allowed,counts,validate,power,saveVariant,loadVariants};
})(window);