import { sb } from '../config.js';
import { t, speciesName } from '../i18n.js';
import { esc, icon, fmtDate, lakePhotoUrl, todayStr } from '../ui.js';
import { go } from '../app.js';

export async function render(el, _p, ctx) {
  if (!ctx.user) { go('/prijava'); return; }
  const { data: favs } = await sb.from('favorites').select('lake_id, lakes(id, slug, name, place, status, lake_photos(path, sort))').eq('user_id', ctx.user.id).order('created_at', { ascending: false });
  const lakes = (favs || []).map(f => f.lakes).filter(l => l && l.status === 'approved');
  const ids = lakes.map(l => l.id);
  let stock = [], comps = [];
  if (ids.length) {
    [{ data: stock }, { data: comps }] = await Promise.all([
      sb.from('stockings').select('lake_id, date, species, quantity_kg').in('lake_id', ids).order('date', { ascending: false }).limit(100),
      sb.from('competitions').select('lake_id, title, date_start').in('lake_id', ids).eq('status', 'approved').gte('date_start', todayStr()).order('date_start').limit(100)
    ]);
  }
  el.innerHTML = `
  <div class="page narrow">
    <div class="page-head"><h1>${esc(t('favs'))}</h1></div>
    ${lakes.length ? `<div class="lake-list">${lakes.map(l => {
      const ph = (l.lake_photos || []).sort((a, b) => a.sort - b.sort)[0];
      const s = (stock || []).find(x => x.lake_id === l.id);
      const c = (comps || []).find(x => x.lake_id === l.id);
      return `<a class="lake-card" href="#/jezero/${esc(l.slug)}">
        <div class="thumb">${ph ? `<img src="${esc(lakePhotoUrl(ph.path))}" alt="" loading="lazy">` : icon('lake', 36)}</div>
        <div><h3>${esc(l.name)}</h3><div class="meta">${esc(l.place || '')}</div>
          ${s ? `<div class="small">${icon('fish', 14)} ${esc(t('last_stock'))}: <b>${esc(speciesName(s.species))}</b>${s.quantity_kg ? ` ${esc(Number(s.quantity_kg).toLocaleString('sr-RS'))} kg` : ''} · ${esc(fmtDate(s.date))}</div>` : ''}
          ${c ? `<div class="small">${icon('trophy', 14)} ${esc(t('next_comp'))}: <b>${esc(c.title)}</b> · ${esc(fmtDate(c.date_start))}</div>` : ''}
        </div></a>`; }).join('')}</div>`
      : `<div class="empty">${icon('heart', 44)}<p>${esc(t('favs_empty'))}</p><a class="btn lake" href="#/">${esc(t('nav_lakes'))}</a></div>`}
  </div>`;
}
