/* Three account-scoped slots. Cloud transactions preserve edits to other slots. */
(() => {
  'use strict';
  let account='', loading=null, loaded=false, selected='classic', saving=false, returnFocus=null;
  const key=uid=>'shithead_house_rules_'+uid;
  const clean=values=>Array.from({length:3},(_,i)=>{
    const v=values?.[i];
    return v && ShHouseRules.validate(v).valid ? {name:String(v.name||`Custom Rule ${i+1}`).slice(0,24),cards:{...v.cards},joker:v.joker,fourKind:v.fourKind}:null;
  });
  const signature=r=>JSON.stringify([ShHouseRules.RANKS.map(n=>r?.cards?.[n]),r?.joker,r?.fourKind]);
  const cache=(uid,values)=>{try{localStorage.setItem(key(uid),JSON.stringify(clean(values)));}catch(e){/* Cloud remains authoritative when browser storage is unavailable. */}};
  let memory=[];
  function load() {
    const uid=currentUser?.uid||'';
    if(account!==uid) {account=uid;loaded=false;loading=null;selected='classic';memory=uid?clean(ShHouseRules.loadVariants(uid)):[];close();}
    if(!uid || loaded || loading)return loading;
    const request=db.ref(`users/${uid}/settings/houseRulesVariants`).once('value').then(snapshot=>{
      if(currentUser?.uid!==uid || account!==uid)return;
      memory=clean(snapshot.val());cache(uid,memory);loaded=true;renderHouseRulesPanel();
    }).catch(()=>{if(account===uid)notifyBanner('Saved rules could not load. Reopen Custom Rules to retry.');}).finally(()=>{if(loading===request)loading=null;});
    loading=request;return request;
  }
  const modal=document.createElement('div');
  modal.id='houseNameModal';modal.className='pf-modal hidden';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','houseNameTitle');
  modal.innerHTML=`<form class="pf-name-card"><div class="pf-config-heading"><button type="button" class="pf-back" id="houseNameBack" aria-label="Back to Custom Rules"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg></button><h2 id="houseNameTitle">Save Custom Rules</h2></div><label for="houseNameSlot">Save to slot</label><select id="houseNameSlot"><option value="0">Custom Rule 1</option><option value="1">Custom Rule 2</option><option value="2">Custom Rule 3</option></select><label for="houseNameInput">Ruleset name</label><input id="houseNameInput" maxlength="24" required autocomplete="off" placeholder="Custom Rule 1"><p id="houseNameError" role="status" aria-live="polite"></p><div class="pf-ready-row"><button type="button" id="houseNameCancel" class="pf-secondary">Cancel</button><button type="submit" id="houseNameSave" class="pf-primary">Save ruleset</button></div></form>`;
  document.body.append(modal);
  const $=id=>document.getElementById(id);
  function close() {
    if(saving)return;
    const wasOpen=!modal.classList.contains('hidden');modal.classList.add('hidden');
    $('friendsConfigModal').inert=false;
    if(wasOpen)(returnFocus?.isConnected?returnFocus:$('houseSaveBtn'))?.focus({preventScroll:true});
  }
  async function open() {
    if(!currentUser){notifyBanner('Sign in to save your three custom rulesets.');return;}
    if(!state.isHost || state.phase!=='LOBBY' || seriesIsActive(seriesState))return;
    const v=ShHouseRules.validate(state.houseRules||{});if(!v.valid){notifyBanner(v.errors[0]);return;}
    await load();
    if(!loaded || account!==currentUser?.uid){notifyBanner('Load your saved rules before saving. Reopen Custom Rules to retry.');return;}
    returnFocus=document.activeElement;
    const empty=memory.findIndex(v=>!v), slot=selected==='classic'?Math.max(0,empty):Number(selected);
    $('houseNameSlot').value=String(slot);$('houseNameInput').value=memory[slot]?.name||`Custom Rule ${slot+1}`;
    $('houseNameError').textContent='';modal.classList.remove('hidden');$('friendsConfigModal').inert=true;
    $('houseNameInput').focus();$('houseNameInput').select();
  }
  $('houseNameSlot').addEventListener('change',()=>{const i=Number($('houseNameSlot').value);$('houseNameInput').value=memory[i]?.name||`Custom Rule ${i+1}`;});
  $('houseNameBack').addEventListener('click',close);$('houseNameCancel').addEventListener('click',close);
  modal.addEventListener('click',e=>{if(e.target===modal)close();});
  modal.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();}
    if(e.key==='Tab'){
      const items=[...modal.querySelectorAll('input,select,button')].filter(e=>!e.disabled);
      if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1).focus();}
      else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0].focus();}
    }
  });
  modal.querySelector('form').addEventListener('submit',async e=>{
    e.preventDefault();if(saving)return;
    const uid=currentUser?.uid, slot=Number($('houseNameSlot').value),name=$('houseNameInput').value.trim();
    if(!uid || !state.isHost || state.phase!=='LOBBY' || seriesIsActive(seriesState) || !name){$('houseNameError').textContent='Enter a name while signed in as the host.';return;}
    const rules=clean([{...state.houseRules,name}])[0];if(!rules)return;
    saving=true;$('houseNameError').textContent='Saving…';
    modal.querySelectorAll('input,select,button').forEach(e=>e.disabled=true);
    try {
      const result=await db.ref(`users/${uid}/settings/houseRulesVariants`).transaction(values=>{
        const slots=clean(values);slots[slot]=rules;return slots;
      });
      if(!result.committed)throw new Error('Save not committed');
      cache(uid,result.snapshot.val());
      if(currentUser?.uid===uid){memory=clean(result.snapshot.val());loaded=true;selected=String(slot);renderHouseRulesPanel();notifyBanner('Custom ruleset saved to your account.');}
      saving=false;close();
    }catch(err){$('houseNameError').textContent='Could not save. Your name and rules are kept here—try again.';}
    finally{saving=false;modal.querySelectorAll('input,select,button').forEach(e=>e.disabled=false);}
  });
  function bind(el,host) {
    if(!el.querySelector('[data-house-preset]'))return;
    const saved=clean(memory.length?memory:currentUser?ShHouseRules.loadVariants(currentUser.uid):[]);
    const same=r=>signature(r)===signature(state.houseRules);
    if(selected==='classic' && !same(ShHouseRules.CLASSIC))selected=String(Math.max(0,saved.findIndex(v=>!v)));
    el.querySelectorAll('[data-house-preset]').forEach(btn=>{
      const id=btn.dataset.housePreset,v=id==='classic'?ShHouseRules.CLASSIC:saved[Number(id)];
      btn.setAttribute('aria-pressed',String(id===selected));
      if(id!=='classic'){btn.textContent=v?.name||`Custom Rule ${Number(id)+1}`;btn.title=btn.textContent;}
      btn.addEventListener('click',async()=>{
        if(!host)return;
        if(id!=='classic'&&!currentUser){notifyBanner('Sign in to save and use custom rulesets.');return;}
        if(id!=='classic'){await load();if(!loaded){notifyBanner('Saved rules are unavailable. Please try again.');return;}}
        const next=id==='classic'?ShHouseRules.CLASSIC:memory[Number(id)];
        if(next && !await publishHouseRules('house',next))return;
        selected=id;renderHouseRulesPanel();
      });
    });
  }
  window.ShHousePresets={load,bind,open,close,resetSelection:()=>{selected='classic';},isOpen:()=>!modal.classList.contains('hidden')};
  // Auth transitions must clear account-specific slot selection, including A → logout → A.
  if(typeof auth!=='undefined' && auth?.onAuthStateChanged)auth.onAuthStateChanged(()=>{loaded=false;load();});
})();
