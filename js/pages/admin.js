import { sb } from '../config.js';
import { t } from '../i18n.js';
import { $, $$, esc, fmtDate, toast } from '../ui.js';
import { go } from '../app.js';

export async function render(el, _p, ctx) {
  if (!ctx.isAdmin) { go('/'); return; }
  const [{ data: lakes }, { data: comps }, { data: sugg }] = await Promise.all([
    sb.from('lakes').select('id, slug, name, place, status, plan, created_at, owner_id').order('created_at', { ascending: false }),
    sb.from('competitions').select('*, lakes(name)').eq('status', 'pending').order('date_start'),
    sb.from('lake_suggestions').select('*, profiles(display_name)').order('created_at', { ascending: false })
  ]);
  const pend = (lakes || []).filter(l => l.status === 'pending');
  el.innerHTML = `
  <div class="page narrow">
    <div class="page-head"><h1>${esc(t('admin_title'))}</h1></div>
    <div class="section"><h2>${esc(t('nav_lakes'))} · ${esc(t('pending'))}</h2>
      <div class="card">${pend.length ? pend.map(l => `
        <div class="list-item"><div class="grow"><b>${esc(l.name)}</b><div class="small muted">${esc(l.place || '')} · ${esc(fmtDate(l.created_at))}</div></div>
        <a class="btn ghost sm" href="#/moja-jezera/${l.id}">${esc(t('edit'))}</a>
        <button class="btn lake sm" data-lk="${l.id}" data-st="approved">${esc(t('approve'))}</button>
        <button class="btn danger sm" data-lk="${l.id}" data-st="rejected">${esc(t('reject'))}</button></div>`).join('') : `<div class="muted">${esc(t('nothing_pending'))}</div>`}</div>
    </div>
    <div class="section"><h2>${esc(t('nav_comp'))} · ${esc(t('pending'))}</h2>
      <div class="card">${(comps || []).length ? comps.map(c => `
        <div class="list-item"><div class="grow"><b>${esc(c.title)}</b><div class="small muted">${esc(fmtDate(c.date_start))} · ${esc(c.lakes?.name || c.place || '')}</div>${c.description ? `<div class="small">${esc(c.description)}</div>` : ''}</div>
        <button class="btn lake sm" data-cp="${c.id}" data-st="approved">${esc(t('approve'))}</button>
        <button class="btn danger sm" data-cp="${c.id}" data-st="rejected">${esc(t('reject'))}</button></div>`).join('') : `<div class="muted">${esc(t('nothing_pending'))}</div>`}</div>
    </div>
    <div class="section"><h2>${esc(t('suggestions'))}</h2>
      <div class="card">${(sugg || []).length ? sugg.map(s => `
        <div class="list-item" style="align-items:flex-start"><div class="grow"><b>${esc(s.name)}</b>${s.place ? ` · ${esc(s.place)}` : ''}
          <div class="small muted">${esc(s.profiles?.display_name || '')} · ${esc(fmtDate(s.created_at))}</div>
          ${s.contact ? `<div class="small">${esc(s.contact)}</div>` : ''}${s.note ? `<div class="small">${esc(s.note)}</div>` : ''}</div>
        <button class="btn danger sm" data-sg="${s.id}">${esc(t('delete'))}</button></div>`).join('') : `<div class="muted">${esc(t('nothing_pending'))}</div>`}</div>
    </div>
    <div class="section"><h2>${esc(t('all_lakes'))}</h2>
      <div class="card">${(lakes || []).map(l => `
        <div class="list-item"><div class="grow"><a href="#/jezero/${esc(l.slug)}"><b>${esc(l.name)}</b></a><div class="small muted">${esc(t(l.status))}</div></div>
        <label class="sr-only" for="pl${l.id}">${esc(t('plan'))}</label>
        <select class="input" style="width:auto;min-height:38px" id="pl${l.id}" data-plan="${l.id}">${['free', 'featured', 'pro'].map(p => `<option ${l.plan === p ? 'selected' : ''}>${p}</option>`).join('')}</select></div>`).join('')}</div>
    </div>
  </div>`;
  const again = () => render(el, _p, ctx);
  $$('[data-lk]').forEach(b => b.onclick = async () => { const { error } = await sb.from('lakes').update({ status: b.dataset.st }).eq('id', b.dataset.lk); error ? toast(t('error'), 'err') : again(); });
  $$('[data-cp]').forEach(b => b.onclick = async () => { const { error } = await sb.from('competitions').update({ status: b.dataset.st }).eq('id', b.dataset.cp); error ? toast(t('error'), 'err') : again(); });
  $$('[data-sg]').forEach(b => b.onclick = async () => { if (confirm(t('confirm_delete'))) { await sb.from('lake_suggestions').delete().eq('id', b.dataset.sg); again(); } });
  $$('[data-plan]').forEach(s => s.onchange = async () => { const { error } = await sb.from('lakes').update({ plan: s.value }).eq('id', s.dataset.plan); toast(error ? t('error') : t('saved'), error ? 'err' : 'ok'); });
}
