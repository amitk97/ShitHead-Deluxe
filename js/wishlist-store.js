// Account-scoped wishlist cache and per-item sync. No ownership or economy writes.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ShWishlist = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function create({ storage, key = 'shithead_wishlist', max = 30, validId, onChange = () => {} } = {}) {
    let owner = null, ids, pending, revision = 0, generation = 0;
    let ref = null, handler = null, ready = false, busy = false, state = 'device', firstLoad = null;
    const valid = id => typeof id === 'string' && /^[a-z0-9-]{3,40}$/.test(id) && (!validId || validId(id));
    const cacheKey = uid => key + ':v2:' + (uid || 'guest');
    const read = name => { try { return JSON.parse(storage?.getItem(name) || 'null'); } catch (_) { return null; } };
    function cached(uid) {
      const data = read(cacheKey(uid));
      // Old unscoped lists remain available to guests, but are not silently
      // attributed to the next account that signs in on a shared device.
      const list = data?.ids || (!uid ? read(key) : []) || [];
      const kept = new Set((Array.isArray(list) ? list : []).filter(valid));
      const journal = {};
      for (const [id, change] of Object.entries(data?.pending || {})) {
        if (!valid(id) || typeof change?.value !== 'boolean' || !Number.isSafeInteger(change.revision)) continue;
        journal[id] = change; revision = Math.max(revision, change.revision);
      }
      return { ids: kept, pending: journal };
    }
    function persist() {
      try { storage?.setItem(cacheKey(owner), JSON.stringify({ ids: [...ids], pending })); } catch (_) {}
    }
    function emit() { onChange(new Set(ids), state); }
    function detach() {
      if (ref && handler) ref.off?.('value', handler);
      ref = null; handler = null; ready = false; busy = false; firstLoad = null; generation++;
    }
    function setAccount(uid = null) {
      uid = uid || null;
      if (uid === owner) return;
      persist();
      const next = cached(uid);
      let room = max - next.ids.size;
      const guestAdds = owner === null && uid ? Object.entries(pending).filter(([id, v]) => v.value && (next.ids.has(id) || room-- > 0)).map(([id]) => id) : [];
      if (guestAdds.length) {
        guestAdds.forEach(id => { ids.delete(id); delete pending[id]; });
        persist(); // transfer explicit guest additions once, never into a second account
      }
      detach(); owner = uid;
      ({ ids, pending } = next);
      for (const id of guestAdds) {
        if (ids.size >= max && !ids.has(id)) break;
        ids.add(id); pending[id] = { value: true, revision: ++revision };
      }
      state = owner ? 'local' : 'device'; persist(); emit();
    }
    function fail(token) {
      if (token !== generation) return;
      busy = false; state = 'error'; persist(); emit();
    }
    function flush() {
      if (!owner || !ref || !ready || busy) return Promise.resolve(false);
      const sent = { ...pending }, entries = Object.entries(sent);
      if (!entries.length) { if (state !== 'synced') { state = 'synced'; emit(); } return Promise.resolve(true); }
      const token = generation, target = ref;
      const updates = Object.fromEntries(entries.map(([id, change]) => [id, change.value ? true : null]));
      busy = true; state = 'saving'; emit();
      return Promise.resolve().then(() => token === generation ? target.update(updates) : false).then(() => {
        if (token !== generation) return false;
        for (const [id, change] of entries) if (pending[id]?.revision === change.revision) delete pending[id];
        busy = false; state = Object.keys(pending).length ? 'pending' : 'synced'; persist(); emit();
        if (Object.keys(pending).length) return flush();
        return true;
      }).catch(() => { fail(token); return false; });
    }
    function connect(uid, target, force = false) {
      if (!uid) { setAccount(null); return Promise.resolve(true); }
      setAccount(uid);
      if (ref && !force) return firstLoad || Promise.resolve(ready);
      detach(); ref = target; state = 'loading'; emit();
      const token = generation;
      let settle;
      firstLoad = new Promise(resolve => { settle = resolve; });
      handler = snap => {
        if (token !== generation) return;
        const remote = snap.val() || {};
        // The existing rules have no server-side count cap. Preserve valid
        // choices from simultaneous devices; cap only new additions below.
        ids = new Set(Object.keys(remote).filter(id => remote[id] === true && valid(id)));
        for (const [id, change] of Object.entries(pending)) change.value ? ids.add(id) : ids.delete(id);
        ready = true; state = Object.keys(pending).length ? 'pending' : 'synced'; persist(); emit();
        settle(true); void flush();
      };
      const error = () => { if (token === generation) { ready = false; fail(token); settle(false); } };
      try {
        if (typeof target.on === 'function') target.on('value', handler, error);
        else Promise.resolve(target.once('value')).then(handler, error);
      } catch (_) { error(); }
      return firstLoad;
    }
    function toggle(id) {
      if (!valid(id)) return 'invalid';
      const add = !ids.has(id);
      if (add && ids.size >= max) return 'full';
      add ? ids.add(id) : ids.delete(id);
      if (owner || add) pending[id] = { value: add, revision: ++revision };
      else delete pending[id];
      state = owner ? (state === 'error' ? 'error' : 'pending') : 'device'; persist(); emit(); void flush();
      return add ? 'added' : 'removed';
    }
    function retry() {
      if (!ref) return Promise.resolve(false);
      if (!ready) return connect(owner, ref, true);
      return flush();
    }
    ({ ids, pending } = cached(null));
    return { get ids() { return new Set(ids); }, get owner() { return owner; }, get status() { return state; },
      setAccount, connect, toggle, retry, persist, stop: detach };
  }
  return { create };
});
