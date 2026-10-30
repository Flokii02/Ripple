import { sb } from '../config.js';
import { t, SPECIES, speciesName } from '../i18n.js';
import { $, $$, esc, icon, fmtDate, openModal, closeModal, toast, catchPhotoUrls, compressImage, randomName } from '../ui.js';
import { weatherAt, wxInfo, wxIcon, trendArrow, moonName } from '../weather.js';
import { MAP_CENTER } from '../config.js';
import { catchWarning } from '../seasons.js';

export async function render(el, _p, ctx) {
  if (!ctx.user) {
    el.innerHTML = `<div class="page narrow"><div class="empty">${icon('book', 44)}<p>${esc(t('log_login'))}</p><a class="btn lake" href="#/prijava">${esc(t('login'))}</a></div></div>`;
    return;
  }
  el.innerHTML = `
  <div class="page">
    <div class="page-head"><h1>${esc(t('log_title'))}</h1><button class="btn lake" id="addCatch">${icon('plus', 18)}${esc(t('log_add'))}</button></div>
    <div class="stats" id="stats"></div>
    <div id="insights"></div>
    <div id="list"></div>
  </div>`;

  const { data } = await sb.from('catches').select('*, lakes(name, slug)').eq('user_id', ctx.user.id).order('caught_at', { ascending: false });
  const list = data || [];
  const urls = await catchPhotoUrls(list.map(c => c.photo_path));

  // Statisztika
  const biggest = list.filter(c => c.weight_kg).sort((a, b) => b.weight_kg - a.weight_kg)[0];
  const counts = {}; list.forEach(c => { counts[c.species] = (counts[c.species] || 0) + 1; });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const waters = new Set(list.map(c => c.lake_id ? 'l' + c.lake_id : (c.water_name || '').toLowerCase()).filter(Boolean));
  $('#stats').innerHTML = `
    <div class="stat"><small>${esc(t('st_total'))}</small><b>${list.length}</b></div>
    <div class="stat"><small>${esc(t('st_biggest'))}</small><b>${biggest ? esc(Number(biggest.weight_kg).toLocaleString('sr-RS')) + ' ' + esc(t('kg')) : '—'}</b>${biggest ? `<div class="small muted">${esc(speciesName(biggest.species))}</div>` : ''}</div>
    <div class="stat"><small>${esc(t('st_top'))}</small><b>${top ? esc(speciesName(top[0])) : '—'}</b>${top ? `<div class="small muted">${top[1]}×</div>` : ''}</div>
    <div class="stat"><small>${esc(t('st_waters'))}</small><b>${waters.size}</b></div>`;
  $('#insights').innerHTML = insightsHTML(list);

  $('#list').innerHTML = list.length ? `<div class="catch-grid">${list.map(c => `
    <div class="catch-card">
      <div class="ph">${c.photo_path && urls[c.photo_path] ? `<img src="${esc(urls[c.photo_path])}" alt="${esc(speciesName(c.species))}" loading="lazy">` : icon('fish', 40)}</div>
      <div class="cb">
        <h3><span>${esc(speciesName(c.species))}</span>${c.weight_kg ? `<span class="w">${esc(Number(c.weight_kg).toLocaleString('sr-RS'))} ${esc(t('kg'))}</span>` : ''}</h3>
        <div class="small muted">${esc(fmtDate(c.caught_at))} · ${c.lakes ? `<a href="#/jezero/${esc(c.lakes.slug)}">${esc(c.lakes.name)}</a>` : esc(c.water_name || '')}</div>
        <div class="small muted">${[c.length_cm ? Number(c.length_cm).toLocaleString('sr-RS') + ' ' + t('cm') : '', c.bait, c.method].filter(Boolean).map(esc).join(' · ')}</div>
        ${c.wx_pressure != null ? `<div class="catch-wx"><span>${wxIcon(wxInfo(c.wx_code).icon, 15)}${Math.round(c.wx_temp)}°</span><span>${Math.round(c.wx_pressure)} hPa <b class="tr tr-${trendArrow(c.wx_trend || 0).k}">${trendArrow(c.wx_trend || 0).a}</b></span>${c.moon != null ? `<span>${icon('moonph', 13)}${esc(moonName(Number(c.moon)))}</span>` : ''}</div>` : ''}
        <div class="chips" style="margin-top:4px">${c.is_public ? `<span class="chip">${esc(t('public_catch').split(' (')[0])}</span>` : ''}${c.released ? `<span class="chip ok">${esc(t('released'))}</span>` : ''}</div>
      </div>
      <div class="actions">
        <button class="icon-btn" data-edit="${c.id}" aria-label="${esc(t('edit'))}">${icon('edit', 18)}</button>
        <button class="icon-btn" data-del="${c.id}" aria-label="${esc(t('delete'))}">${icon('trash', 18)}</button>
      </div>
    </div>`).join('')}</div>`
    : `<div class="empty">${icon('fish', 44)}<p>${esc(t('log_empty'))}</p></div>`;

  const again = () => render(el, _p, ctx);
  $('#addCatch').onclick = () => openCatchForm(ctx, null, again);
  $$('[data-edit]').forEach(b => b.onclick = () => openCatchForm(ctx, list.find(c => c.id == b.dataset.edit), again));
  $$('[data-del]').forEach(b => b.onclick = async () => {
    if (!confirm(t('confirm_delete'))) return;
    const c = list.find(x => x.id == b.dataset.del);
    const { error } = await sb.from('catches').delete().eq('id', c.id);
    if (error) { toast(t('error'), 'err'); return; }
    if (c.photo_path) await sb.storage.from('catch-photos').remove([c.photo_path]);
    again();
  });
}

function localInput(d) {
  const x = d ? new Date(d) : new Date();
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 16);
}

async function openCatchForm(ctx, c, done) {
  const { data: lakes } = await sb.from('lakes').select('id, name, place, lat, lng').eq('status', 'approved').order('name');
  const body = openModal(c ? t('edit') : t('log_add'), `
    <label class="field"><span>${esc(t('species'))}</span><select id="kSpecies">
      ${SPECIES.map(s => `<option value="${s.key}" ${c?.species === s.key ? 'selected' : ''}>${esc(speciesName(s.key))}</option>`).join('')}</select></label>
    <div class="grid2">
      <label class="field"><span>${esc(t('weight'))}</span><input id="kW" type="text" inputmode="decimal" autocomplete="off" value="${c?.weight_kg ?? ''}"></label>
      <label class="field"><span>${esc(t('length'))}</span><input id="kL" type="text" inputmode="decimal" autocomplete="off" value="${c?.length_cm ?? ''}"></label>
    </div>
    <label class="field"><span>${esc(t('water'))}</span><select id="kLake"><option value="">${esc(t('choose_lake'))}</option>
      ${(lakes || []).map(l => `<option value="${l.id}" ${c?.lake_id === l.id ? 'selected' : ''}>${esc(l.name)}${l.place ? ' – ' + esc(l.place) : ''}</option>`).join('')}</select></label>
    <label class="field"><span>${esc(t('water_other'))}</span><input id="kWater" maxlength="120" value="${esc(c?.water_name || '')}"></label>
    <div class="grid2">
      <label class="field"><span>${esc(t('bait'))}</span><input id="kBait" maxlength="120" value="${esc(c?.bait || '')}"></label>
      <label class="field"><span>${esc(t('method'))}</span><input id="kMethod" maxlength="120" value="${esc(c?.method || '')}"></label>
    </div>
    <label class="field"><span>${esc(t('when'))}</span><input id="kWhen" type="datetime-local" value="${localInput(c?.caught_at)}"></label>
    <label class="field"><span>${esc(t('photo'))}</span><input id="kPhoto" type="file" accept="image/*"></label>
    <label class="field"><span>${esc(t('note'))}</span><textarea id="kNote" maxlength="1000">${esc(c?.note || '')}</textarea></label>
    <label class="check"><input type="checkbox" id="kRel" ${c?.released ? 'checked' : ''}>${esc(t('released'))}</label>
    <label class="check"><input type="checkbox" id="kPub" ${c?.is_public ? 'checked' : ''}>${esc(t('public_catch'))}</label>
    <div class="notice" id="kWarn" hidden></div>
    <div class="err" id="kErr"></div>
    <div class="row"><button class="btn ghost" id="kCancel">${esc(t('cancel'))}</button><button class="btn lake grow" id="kSave">${esc(t('save'))}</button></div>`);
  $('#kCancel', body).onclick = closeModal;
  const checkWarn = () => {
    const w = catchWarning($('#kSpecies', body).value, $('#kWhen', body).value || new Date().toISOString(), String($('#kL', body).value).replace(',', '.'));
    const box = $('#kWarn', body); box.hidden = !w; box.textContent = w ? t('warn_' + w) : '';
  };
  ['#kSpecies', '#kWhen', '#kL'].forEach(id => { $(id, body).addEventListener('change', checkWarn); $(id, body).addEventListener('input', checkWarn); });
  checkWarn();
  $('#kSave', body).onclick = async () => {
    const btn = $('#kSave', body); btn.disabled = true;
    const num = v => { const x = Number(String(v).trim().replace(',', '.')); return String(v).trim() === '' || !isFinite(x) || x < 0 ? null : x; };
    const lakeId = $('#kLake', body).value;
    const row = {
      species: $('#kSpecies', body).value,
      weight_kg: num($('#kW', body).value), length_cm: num($('#kL', body).value),
      lake_id: lakeId ? Number(lakeId) : null, water_name: $('#kWater', body).value.trim() || null,
      bait: $('#kBait', body).value.trim() || null, method: $('#kMethod', body).value.trim() || null,
      caught_at: new Date($('#kWhen', body).value || Date.now()).toISOString(),
      note: $('#kNote', body).value.trim() || null,
      released: $('#kRel', body).checked, is_public: $('#kPub', body).checked
    };
    try {
      const file = $('#kPhoto', body).files[0];
      let oldPath = null;
      if (file) {
        const blob = await compressImage(file);
        const path = `${ctx.user.id}/${randomName()}`;
        const up = await sb.storage.from('catch-photos').upload(path, blob, { contentType: 'image/jpeg' });
        if (up.error) throw up.error;
        oldPath = c?.photo_path || null;
        row.photo_path = path;
      }
      // Időjárás a fogás pillanatában (tó helye, különben a főoldalon választott hely)
      const changed = !c || c.wx_pressure == null || c.caught_at !== row.caught_at || c.lake_id !== row.lake_id;
      if (changed) {
        const lk = (lakes || []).find(l => l.id === row.lake_id && l.lat && l.lng);
        let pt = lk ? [lk.lat, lk.lng] : null;
        if (!pt) { try { const sv = JSON.parse(localStorage.getItem('ripple_wx_loc') || 'null'); if (sv?.lat) pt = [sv.lat, sv.lng]; } catch (e) {} }
        if (!pt && row.water_name) pt = MAP_CENTER;
        const wx = pt ? await weatherAt(pt[0], pt[1], row.caught_at) : null;
        if (wx) Object.assign(row, wx);
      }
      const res = c ? await sb.from('catches').update(row).eq('id', c.id) : await sb.from('catches').insert({ ...row, user_id: ctx.user.id });
      if (res.error) throw res.error;
      if (oldPath) await sb.storage.from('catch-photos').remove([oldPath]);
      closeModal(); toast(t('saved')); done && done();
    } catch (e) {
      console.error(e); $('#kErr', body).textContent = t('error'); btn.disabled = false;
    }
  };
}

// "Mikor kap a legjobban": a fogások időjárásából
function insightsHTML(list) {
  const w = list.filter(c => c.wx_pressure != null);
  if (w.length < 3) return list.length ? `<div class="notice info" style="margin-bottom:18px">${esc(t('ins_need'))}</div>` : '';
  const group = (fn, keys) => { const m = Object.fromEntries(keys.map(k => [k, 0])); w.forEach(c => { const k = fn(c); if (k in m) m[k]++; }); return m; };
  const pr = group(c => trendArrow(c.wx_trend || 0).k, ['down', 'flat', 'up']);
  const tp = group(c => { const x = Number(c.wx_temp); return x < 10 ? '<10°' : x < 15 ? '10–15°' : x < 20 ? '15–20°' : x < 25 ? '20–25°' : '25°+'; }, ['<10°', '10–15°', '15–20°', '20–25°', '25°+']);
  const hourOf = c => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Belgrade', hour: '2-digit', hour12: false }).format(new Date(c.caught_at)));
  const td = group(c => { const h = hourOf(c); return h >= 4 && h < 10 ? 'morning' : h < 16 && h >= 10 ? 'day' : h >= 16 && h < 21 ? 'evening' : 'night'; }, ['morning', 'day', 'evening', 'night']);
  const mn = group(c => c.moon == null ? '' : String(Math.round(Number(c.moon) * 4) % 4), ['0', '1', '2', '3']);
  const box = (title, m, label) => {
    const max = Math.max(1, ...Object.values(m)); const best = Object.entries(m).sort((a, b) => b[1] - a[1])[0];
    return `<div class="ins"><h3>${esc(title)}</h3>${Object.entries(m).map(([k, v]) => `<div class="bar"><span>${esc(label(k))}</span><i class="${k === best[0] && v ? 'top' : ''}" style="width:${Math.round(v / max * 100)}%"></i><span>${v}</span></div>`).join('')}
      ${best[1] ? `<div class="best">${esc(t('ins_best'))}: <b>${esc(label(best[0]))}</b></div>` : ''}</div>`;
  };
  return `<div class="section" style="margin-top:0"><h2>${esc(t('ins_title'))}</h2><div class="ins-grid">
    ${box(t('ins_pressure'), pr, k => t('p_' + k))}
    ${box(t('ins_temp'), tp, k => k)}
    ${box(t('ins_time'), td, k => t('tod_' + k))}
    ${box(t('ins_moon'), mn, k => moonName(Number(k) / 4))}
  </div></div>`;
}
