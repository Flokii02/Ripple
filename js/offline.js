// Offline fogásmentés: ha nincs net, a fogás (fotóval együtt) a telefonon marad (IndexedDB),
// és amint újra van internet, automatikusan feltöltődik.
import { sb } from './config.js';
import { randomName } from './ui.js';
import { weatherAt } from './weather.js';

const DB = 'ripple', STORE = 'catchQueue';

function open() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'qid', autoIncrement: true });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx(mode, fn) {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => res(out?.result ?? out);
    t.onerror = () => rej(t.error);
  });
}

export async function queueCatch(item) {
  return tx('readwrite', s => s.add({ ...item, queuedAt: Date.now() }));
}
export async function pendingCatches(userId) {
  try {
    const all = await tx('readonly', s => s.getAll());
    return (all || []).filter(x => !userId || x.userId === userId);
  } catch (e) { return []; }
}
async function remove(qid) { return tx('readwrite', s => s.delete(qid)); }

// Hálózati hiba-e (nem jogosultsági / adat hiba)
export function isNetErr(e) {
  const m = String(e?.message || e || '');
  return !navigator.onLine || e instanceof TypeError || /Failed to fetch|NetworkError|Load failed|network/i.test(m);
}

let flushing = false;
export async function flushQueue(ctx, onDone) {
  if (flushing || !ctx?.user || !navigator.onLine) return 0;
  flushing = true;
  let n = 0;
  try {
    const items = await pendingCatches(ctx.user.id);
    for (const it of items) {
      try {
        const row = { ...it.row, user_id: ctx.user.id };
        if (it.photo) {
          const name = randomName();
          const path = `${ctx.user.id}/${name}`;
          const up = await sb.storage.from('catch-photos').upload(path, it.photo, { contentType: 'image/jpeg' });
          if (up.error) throw up.error;
          row.photo_path = path;
          if (it.thumb) {
            const tp = `${ctx.user.id}/t_${name}`;
            const ut = await sb.storage.from('catch-photos').upload(tp, it.thumb, { contentType: 'image/jpeg' });
            if (!ut.error) row.thumb_path = tp;
          }
        }
        if (it.point && row.wx_pressure == null) {
          const wx = await weatherAt(it.point[0], it.point[1], row.caught_at).catch(() => null);
          if (wx) Object.assign(row, wx);
        }
        const res = await sb.from('catches').insert(row);
        if (res.error) {
          if (isNetErr(res.error)) throw res.error;
          console.error(res.error); // adat hiba: ne ragadjon be örökre
          if (row.photo_path) await sb.storage.from('catch-photos').remove([row.photo_path, row.thumb_path].filter(Boolean));
          if (/rate_limit/.test(res.error.message || '')) break;
        }
        await remove(it.qid);
        n++;
      } catch (e) { console.warn('offline flush', e); break; }
    }
  } finally { flushing = false; }
  if (n && onDone) onDone(n);
  return n;
}
