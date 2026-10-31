import { sb } from '../config.js';
import { t, SPECIES, speciesName } from '../i18n.js';
import { $, $$, esc, fmtDate, toast, icon, openModal, closeModal, slugify, errText } from '../ui.js';
import { go } from '../app.js';

export async function render(el, _p, ctx) {
  if (!ctx.isAdmin) { go('/'); return; }
  const [{ data: lakes }, { data: comps }, { data: sugg }, { data: claims }, { data: msgs }, { data: st }] = await Promise.all([
    sb.from('lakes').select('id, slug, name, place, status, plan, created_at, owner_id').order('created_at', { ascending: false }),
    sb.from('competitions').select('*, lakes(name)').eq('status', 'pending').order('date_start'),
    sb.from('lake_suggestions').select('*, profiles(display_name)').order('created_at', { ascending: false }),
    sb.from('lake_claims').select('*, lakes(name, slug), profiles(display_name)').eq('status', 'pending').order('created_at'),
    sb.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(50),
    sb.rpc('admin_stats')
  ]);
  const S = st || {};
  const card = (label, val, sub, warn) => `<div class="stat"><small>${esc(label)}</small><b>${val ?? '—'}</b>${sub ? `<em class="${warn ? 'w' : ''}">${esc(sub)}</em>` : ''}</div>`;
  const pend = (lakes || []).filter(l => l.status === 'pending');
  el.innerHTML = `
  <div class="page narrow">
    <div class="page-head"><h1>${esc(t('admin_title'))}</h1><button class="btn lake" id="qaBtn">${icon('plus', 18)}${esc(t('quick_add'))}</button></div>
    <div class="section" style="margin-top:0"><h2>${esc(t('adm_stats'))}</h2>
      <div class="adm-stats">
        ${card(t('adm_users'), S.users, S.users_7d ? `+${S.users_7d} ${t('adm_new7')}` : '')}
        ${card(t('adm_owners'), S.owners)}
        ${card(t('adm_anglers'), S.anglers)}
        ${card(t('adm_lakes'), S.lakes, S.lakes_pending ? `${S.lakes_pending} ${t('adm_pending')}` : '', true)}
        ${card(t('adm_catches'), S.catches, S.catches_7d ? `+${S.catches_7d} ${t('adm_new7')}` : '')}
        ${card(t('adm_comps'), S.competitions)}
        ${card(t('adm_reviews'), S.reviews)}
        ${card(t('adm_spots'), S.spots)}
        ${card(t('adm_views7'), S.views_7d)}
        ${card(t('adm_storage'), S.storage_mb != null ? Number(S.storage_mb).toLocaleString('sr-RS', { maximumFractionDigits: 1 }) + ' / 1024' : null, S.storage_mb > 800 ? '!' : '', true)}
      </div></div>
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
    <div class="section"><h2>${esc(t('claims'))}</h2>
      <div class="card">${(claims || []).length ? claims.map(c => `
        <div class="list-item" style="align-items:flex-start"><div class="grow"><b>${esc(c.profiles?.display_name || '')}</b> → <a href="#/jezero/${esc(c.lakes?.slug || '')}">${esc(c.lakes?.name || '')}</a>
          <div class="small">${esc(c.phone || '')}</div>${c.message ? `<div class="small muted">${esc(c.message)}</div>` : ''}<div class="small muted">${esc(fmtDate(c.created_at))}</div></div>
        <button class="btn lake sm" data-cl="${c.id}">${esc(t('approve'))}</button>
        <button class="btn danger sm" data-clr="${c.id}">${esc(t('reject'))}</button></div>`).join('') : `<div class="muted">${esc(t('nothing_pending'))}</div>`}</div>
    </div>
    <div class="section"><h2>${esc(t('messages'))}</h2>
      <div class="card">${(msgs || []).length ? msgs.map(m => `
        <div class="list-item" style="align-items:flex-start"><div class="grow"><b>${esc(m.name)}</b> · <a href="mailto:${esc(m.email)}">${esc(m.email)}</a><div class="small muted">${esc(fmtDate(m.created_at))}</div><p class="prose small" style="margin-top:4px">${esc(m.message)}</p></div>
        <button class="btn danger sm" data-msg="${m.id}">${esc(t('delete'))}</button></div>`).join('') : `<div class="muted">${esc(t('nothing_pending'))}</div>`}</div>
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
  $('#qaBtn').onclick = () => quickAdd(again);
  $$('[data-lk]').forEach(b => b.onclick = async () => { const { error } = await sb.from('lakes').update({ status: b.dataset.st }).eq('id', b.dataset.lk); error ? toast(t('error'), 'err') : again(); });
  $$('[data-cp]').forEach(b => b.onclick = async () => { const { error } = await sb.from('competitions').update({ status: b.dataset.st }).eq('id', b.dataset.cp); error ? toast(t('error'), 'err') : again(); });
  $$('[data-sg]').forEach(b => b.onclick = async () => { if (confirm(t('confirm_delete'))) { await sb.from('lake_suggestions').delete().eq('id', b.dataset.sg); again(); } });
  $$('[data-cl]').forEach(b => b.onclick = async () => { const { error } = await sb.rpc('approve_claim', { p_claim: Number(b.dataset.cl) }); error ? toast(t('error'), 'err') : (toast(t('saved')), again()); });
  $$('[data-clr]').forEach(b => b.onclick = async () => { const { error } = await sb.from('lake_claims').update({ status: 'rejected' }).eq('id', b.dataset.clr); error ? toast(t('error'), 'err') : again(); });
  $$('[data-msg]').forEach(b => b.onclick = async () => { if (confirm(t('confirm_delete'))) { await sb.from('contact_messages').delete().eq('id', b.dataset.msg); again(); } });
  $$('[data-plan]').forEach(s => s.onchange = async () => { const { error } = await sb.from('lakes').update({ plan: s.value }).eq('id', s.dataset.plan); toast(error ? t('error') : t('saved'), error ? 'err' : 'ok'); });
}

// Koordináták kiolvasása Google Maps linkből vagy „lat, lng” szövegből
export function parseLatLng(str) {
  const s = decodeURIComponent(String(str || '')).trim();
  const ok = (a, b) => { const la = Number(a), ln = Number(b); return isFinite(la) && isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180 ? [la, ln] : null; };
  let m = s.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);   // pontos hely (helyjelölő)
  if (m) return ok(m[1], m[2]);
  m = s.match(/[?&](?:q|query|ll|destination|center)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  if (m) return ok(m[1], m[2]);
  m = s.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);           // térkép közepe
  if (m) return ok(m[1], m[2]);
  m = s.match(/^\s*(-?\d+(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d+(?:[.,]\d+)?)\s*$/);
  if (m) return ok(m[1].replace(',', '.'), m[2].replace(',', '.'));
  return null;
}

function quickAdd(done) {
  const body = openModal(t('quick_add'), `
    <p class="small muted req-note"><b class="req">*</b> ${esc(t('required_note'))}</p>
    <label class="field"><span>${esc(t('lake_name'))} <b class="req">*</b></span><input id="qaName" maxlength="120"></label>
    <label class="field"><span>${esc(t('qa_maps'))} <b class="req">*</b></span><input id="qaMap" placeholder="${esc(t('qa_maps_ph'))}" autocomplete="off">
      <small class="muted" id="qaLL">${esc(t('qa_maps_help'))}</small></label>
    <div class="grid2">
      <label class="field"><span>${esc(t('place'))}</span><input id="qaPlace" maxlength="80"></label>
      <label class="field"><span>${esc(t('phone'))}</span><input id="qaPhone" type="tel" maxlength="40"></label>
    </div>
    <div class="grid2">
      <label class="field"><span>${esc(t('price_day'))}</span><input id="qaPrice" type="number" min="0" inputmode="numeric"></label>
      <label class="check" style="align-self:end;margin-bottom:14px"><input type="checkbox" id="qaNight">${esc(t('f_night'))}</label>
    </div>
    <div class="field"><span>${esc(t('species'))}</span><div class="pick" id="qaSp">${SPECIES.map(x => `<label><input type="checkbox" value="${x.key}"><span>${esc(speciesName(x.key))}</span></label>`).join('')}</div></div>
    <div class="err" id="qaErr"></div>
    <div class="row"><button class="btn ghost" id="qaCancel">${esc(t('cancel'))}</button><button class="btn lake grow" id="qaSave">${esc(t('save'))}</button></div>`);
  const llBox = $('#qaLL', body);
  $('#qaMap', body).addEventListener('input', () => {
    const ll = parseLatLng($('#qaMap', body).value);
    llBox.textContent = ll ? `✓ ${ll[0].toFixed(5)}, ${ll[1].toFixed(5)}` : t('qa_maps_help');
    llBox.style.color = ll ? 'var(--ok)' : '';
  });
  $('#qaCancel', body).onclick = closeModal;
  $('#qaSave', body).onclick = async () => {
    const name = $('#qaName', body).value.trim();
    const raw = $('#qaMap', body).value.trim();
    const ll = parseLatLng(raw);
    $$('.field.bad', body).forEach(f => f.classList.remove('bad'));
    const err = $('#qaErr', body);
    if (name.length < 2) { $('#qaName', body).closest('.field').classList.add('bad'); err.textContent = t('err_required'); return; }
    if (!ll) { $('#qaMap', body).closest('.field').classList.add('bad'); err.textContent = /goo\.gl|maps\.app/.test(raw) || raw ? t('qa_bad_link') : t('err_required'); return; }
    const price = $('#qaPrice', body).value;
    const row = { name, lat: ll[0], lng: ll[1], place: $('#qaPlace', body).value.trim() || null, phone: $('#qaPhone', body).value.trim() || null,
      price_day: price === '' ? null : Math.max(0, parseInt(price, 10) || 0), night_fishing: $('#qaNight', body).checked,
      species: $$('#qaSp input:checked', body).map(i => i.value), status: 'approved', owner_id: null };
    const btn = $('#qaSave', body); btn.disabled = true;
    const base = slugify(name) || 'jezero';
    let res;
    for (let i = 0; i < 6; i++) {
      res = await sb.from('lakes').insert({ ...row, slug: i ? `${base.slice(0, 55)}-${i + 1}` : base }).select('id, slug').single();
      if (!res.error || res.error.code !== '23505') break;
    }
    if (res.error) { console.error(res.error); err.textContent = errText(res.error); btn.disabled = false; return; }
    closeModal(); toast(t('qa_ok')); done();
  };
}
