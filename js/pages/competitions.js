import { sb } from '../config.js';
import { t } from '../i18n.js';
import { catchPhotoUrls } from '../ui.js';
import { speciesName } from '../i18n.js';
import { $, $$, esc, icon, fmtDate, fmtMonth, fmtMoney, todayStr, openModal, closeModal, toast, spinner, share, shareUrl, errText } from '../ui.js';
import { go } from '../app.js';

let mode = 'upcoming';

export async function render(el, _p, ctx) {
  el.innerHTML = `
  <div class="page narrow">
    <div class="page-head">
      <div><h1>${esc(t('comp_title'))}</h1></div>
      <button class="btn lake" id="addComp">${icon('plus', 18)}${esc(t('comp_add'))}</button>
    </div>
    <div class="tabs" role="group">
      <button id="tUp" class="${mode === 'upcoming' ? 'on' : ''}">${esc(t('comp_upcoming'))}</button>
      <button id="tPast" class="${mode === 'past' ? 'on' : ''}">${esc(t('comp_past'))}</button>
    </div>
    <div id="mine"></div>
    <div id="list">${spinner()}</div>
    <div class="section" id="cotmSec"><h2>${icon('trophy', 22)} ${esc(t('cotm_title'))} · ${esc(fmtMonth(todayStr()))}</h2>
      <p class="small muted" style="margin-top:-6px">${esc(t('cotm_note'))}</p><div id="cotm">${spinner()}</div></div>
  </div>`;
  loadCotm();

  const load = async () => {
    const today = todayStr();
    let q = sb.from('competitions').select('*, lakes(name, slug, place)').eq('status', 'approved');
    q = mode === 'upcoming' ? q.gte('date_start', today).order('date_start') : q.lt('date_start', today).order('date_start', { ascending: false }).limit(50);
    const { data } = await q;
    const list = data || [];
    if (!list.length) { $('#list').innerHTML = `<div class="empty">${icon('trophy', 40)}<p>${esc(t('comp_none'))}</p></div>`; return; }
    let month = '', html = '';
    list.forEach(c => {
      const m = c.date_start.slice(0, 7);
      if (m !== month) { month = m; html += `<div class="month-h">${esc(fmtMonth(c.date_start))}</div>`; }
      html += compCard(c);
    });
    $('#list').innerHTML = html;
    $$('[data-sharecomp]').forEach(b => b.onclick = () => { const [title, d] = b.dataset.sharecomp.split('|'); share({ title, text: `${title} – ${fmtDate(d)} | Ripple`, url: shareUrl('takmicenja') }); });
  };

  // A saját, még jóváhagyásra váró versenyek
  if (ctx.user) {
    const { data: mine } = await sb.from('competitions').select('*, lakes(name, slug, place)').eq('organizer_id', ctx.user.id).neq('status', 'approved').order('date_start');
    if ((mine || []).length) $('#mine').innerHTML = `<div class="month-h">${esc(t('pending'))}</div>` + mine.map(c => compCard(c, true)).join('');
  }

  $('#tUp').onclick = () => { mode = 'upcoming'; render(el, _p, ctx); };
  $('#tPast').onclick = () => { mode = 'past'; render(el, _p, ctx); };
  $('#addComp').onclick = () => ctx.user ? openCompForm(ctx, null, () => render(el, _p, ctx)) : (toast(t('need_login'), 'err'), go('/prijava'));
  await load();
}

function compCard(c, mine = false) {
  const d = new Date(c.date_start + 'T12:00');
  const where = c.lakes ? `<a href="#/jezero/${esc(c.lakes.slug)}">${esc(c.lakes.name)}</a>${c.lakes.place ? ', ' + esc(c.lakes.place) : ''}` : esc(c.place || '');
  return `<div class="comp-card">
    <div class="date-badge"><b>${d.getDate()}</b><small>${esc(fmtMonth(c.date_start).split(' ')[0].slice(0, 3))}</small></div>
    <div class="cbody">
      <h3>${esc(c.title)}</h3>
      <div class="small muted">${esc(fmtDate(c.date_start))}${c.date_end && c.date_end !== c.date_start ? ' – ' + esc(fmtDate(c.date_end)) : ''}${where ? ' · ' + where : ''}</div>
      <div class="row" style="margin-top:6px">${c.entry_fee ? `<span class="chip sand">${esc(fmtMoney(c.entry_fee))}</span>` : ''}${mine ? `<span class="chip ${c.status === 'rejected' ? 'bad' : 'warn'}">${esc(t(c.status))}</span>` : ''}</div>
      ${c.description ? `<p>${esc(c.description)}</p>` : ''}
      ${c.contact ? `<p>${icon('phone', 14)} ${esc(c.contact)}</p>` : ''}
      ${mine ? '' : `<button class="btn ghost sm" style="margin-top:8px" data-sharecomp="${esc(c.title)}|${esc(c.date_start)}">${icon('share', 15)}${esc(t('share'))}</button>`}
    </div></div>`;
}

export async function openCompForm(ctx, presetLakeId, done) {
  const { data: lakes } = await sb.from('lakes').select('id, name, place').eq('status', 'approved').order('name');
  const body = openModal(t('comp_add'), `
    <div class="notice info">${esc(t('pending_note'))}</div>
    <label class="field"><span>${esc(t('comp_name'))}</span><input id="cTitle" maxlength="160"></label>
    <div class="grid2">
      <label class="field"><span>${esc(t('date_start'))}</span><input id="cStart" type="date" min="${todayStr()}"></label>
      <label class="field"><span>${esc(t('date_end'))}</span><input id="cEnd" type="date" min="${todayStr()}"></label>
    </div>
    <label class="field"><span>${esc(t('lake'))}</span><select id="cLake"><option value="">${esc(t('choose_lake'))}</option>
      ${(lakes || []).map(l => `<option value="${l.id}" ${String(presetLakeId) === String(l.id) ? 'selected' : ''}>${esc(l.name)}${l.place ? ' – ' + esc(l.place) : ''}</option>`).join('')}</select></label>
    <label class="field"><span>${esc(t('other_place'))}</span><input id="cPlace" maxlength="120"></label>
    <div class="grid2">
      <label class="field"><span>${esc(t('entry_fee'))}</span><input id="cFee" type="number" min="0" inputmode="numeric"></label>
      <label class="field"><span>${esc(t('contact'))}</span><input id="cContact" maxlength="120"></label>
    </div>
    <label class="field"><span>${esc(t('description'))}</span><textarea id="cDesc" maxlength="4000"></textarea></label>
    <div class="err" id="cErr"></div>
    <div class="row"><button class="btn ghost" id="cCancel">${esc(t('cancel'))}</button><button class="btn lake grow" id="cSave">${esc(t('save'))}</button></div>`);
  $('#cCancel', body).onclick = closeModal;
  $('#cSave', body).onclick = async () => {
    const title = $('#cTitle', body).value.trim(), start = $('#cStart', body).value, end = $('#cEnd', body).value || null;
    const lakeId = $('#cLake', body).value || null, place = $('#cPlace', body).value.trim();
    if (title.length < 3 || !start || (!lakeId && !place)) { $('#cErr', body).textContent = t('fill_all').split('(')[0]; return; }
    if (end && end < start) { $('#cErr', body).textContent = t('date_end'); return; }
    const fee = $('#cFee', body).value;
    $('#cSave', body).disabled = true;
    const { error } = await sb.from('competitions').insert({
      title, date_start: start, date_end: end, lake_id: lakeId ? Number(lakeId) : null, place: place || null,
      entry_fee: fee === '' ? null : Math.max(0, parseInt(fee, 10) || 0),
      contact: $('#cContact', body).value.trim() || null, description: $('#cDesc', body).value.trim() || null
    });
    $('#cSave', body).disabled = false;
    if (error) { console.error(error); $('#cErr', body).textContent = errText(error); return; }
    closeModal(); toast(t('pending_note')); done && done();
  };
}

// A hónap fogása: a hónap legnehezebb nyilvános fogásai
async function loadCotm() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { data } = await sb.from('catches')
    .select('id, species, weight_kg, length_cm, caught_at, photo_path, thumb_path, released, water_name, lakes(name, slug), profiles!catches_user_profile_fk(display_name)')
    .eq('is_public', true).gte('caught_at', from).not('weight_kg', 'is', null)
    .order('weight_kg', { ascending: false }).limit(10);
  const box = document.getElementById('cotm'); if (!box) return;
  const list = data || [];
  if (!list.length) { box.innerHTML = `<div class="empty small">${icon('fish', 36)}<p>${esc(t('cotm_empty'))}</p></div>`; return; }
  const urls = await catchPhotoUrls(list.map(c => c.thumb_path || c.photo_path));
  box.innerHTML = `<div class="cotm">${list.map((c, i) => `
    <div class="cotm-row"><span class="rk">${i + 1}</span>
      <span class="ph">${urls[c.thumb_path || c.photo_path] ? `<img src="${esc(urls[c.thumb_path || c.photo_path])}" alt="" loading="lazy">` : icon('fish', 26)}</span>
      <div class="grow" style="min-width:0"><b>${esc(speciesName(c.species))}</b>
        <div class="small muted">${esc(c.profiles?.display_name || '')} · ${c.lakes ? `<a href="#/jezero/${esc(c.lakes.slug)}">${esc(c.lakes.name)}</a>` : esc(c.water_name || '')}</div>
        <div class="small muted">${esc(fmtDate(c.caught_at))}${c.released ? ' · ' + esc(t('released')) : ''}</div></div>
      <span class="wt">${esc(Number(c.weight_kg).toLocaleString('sr-RS'))} ${esc(t('kg'))}</span></div>`).join('')}</div>`;
}
