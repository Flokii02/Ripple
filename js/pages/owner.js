import { sb } from '../config.js';
import { t } from '../i18n.js';
import { esc, icon, lakePhotoUrl } from '../ui.js';
import { go } from '../app.js';
import { isOwner, openSuggest, ownersOnlyHTML } from '../suggest.js';

export async function render(el, _p, ctx) {
  if (!ctx.user) { go('/prijava'); return; }
  if (!isOwner(ctx)) { el.innerHTML = ownersOnlyHTML(ctx); el.querySelector('#sgOpen').onclick = () => openSuggest(ctx); return; }
  const { data } = await sb.from('lakes').select('id, slug, name, place, status, plan, lake_photos(path, thumb_path, sort)').eq('owner_id', ctx.user.id).order('created_at');
  const list = data || [];
  const badge = s => `<span class="chip ${s === 'approved' ? 'ok' : s === 'rejected' ? 'bad' : 'warn'}">${esc(t(s))}</span>`;
  el.innerHTML = `
  <div class="page narrow">
    <div class="page-head"><h1>${esc(t('my_lakes'))}</h1><a class="btn lake" href="#/moja-jezera/novo">${icon('plus', 18)}${esc(t('add_lake'))}</a></div>
    ${list.length ? `<div class="lake-list">${list.map(l => {
      const ph = (l.lake_photos || []).sort((a, b) => a.sort - b.sort)[0];
      return `<a class="lake-card" href="#/moja-jezera/${l.id}">
        <div class="thumb">${ph ? `<img src="${esc(lakePhotoUrl(ph.thumb_path || ph.path))}" alt="" loading="lazy">` : icon('lake', 36)}</div>
        <div><h3>${esc(l.name)}</h3><div class="meta">${esc(l.place || '')}</div><div class="chips">${badge(l.status)}${l.plan !== 'free' ? `<span class="chip sand">${esc(t('featured'))}</span>` : ''}</div></div>
      </a>`; }).join('')}</div>`
      : `<div class="empty">${icon('lake', 44)}<p>${esc(t('my_lakes_empty'))}</p><a class="btn lake" href="#/moja-jezera/novo">${esc(t('add_lake'))}</a></div>`}
  </div>`;
}
