import { sb, MAP_CENTER, MAP_ZOOM } from '../config.js';
import { t, SPECIES, speciesName } from '../i18n.js';
import { $, $$, esc, icon, toast, slugify, lakePhotoUrl, compressImage, randomName, fmtDate, todayStr } from '../ui.js';
import { go } from '../app.js';
import { openCompForm } from './competitions.js';
import { isOwner, openSuggest, ownersOnlyHTML } from '../suggest.js';

export async function render(el, [idParam], ctx) {
  if (!ctx.user) { go('/prijava'); return; }
  const isNew = idParam === 'novo';
  if (isNew && !isOwner(ctx)) { el.innerHTML = ownersOnlyHTML(ctx); el.querySelector('#sgOpen').onclick = () => openSuggest(ctx); return; }
  let lake = { species: [] };
  if (!isNew) {
    const { data } = await sb.from('lakes').select('*').eq('id', idParam).maybeSingle();
    if (!data || (data.owner_id !== ctx.user.id && !ctx.isAdmin)) { el.innerHTML = `<div class="page narrow"><div class="empty">${esc(t('not_found'))}</div></div>`; return; }
    lake = data;
  }
  const v = k => esc(lake[k] ?? '');
  el.innerHTML = `
  <div class="page narrow">
    <div class="page-head">
      <div><a href="#/moja-jezera" class="small">← ${esc(t('my_lakes'))}</a><h1 style="margin-top:6px">${isNew ? esc(t('add_lake')) : esc(lake.name)}</h1></div>
      ${!isNew && lake.status === 'approved' ? `<a class="btn ghost sm" href="#/jezero/${esc(lake.slug)}">${esc(t('view_page'))}</a>` : ''}
    </div>
    ${!isNew && lake.status !== 'approved' ? `<div class="notice">${icon('shield', 18)}${esc(t('status_pending_lake'))}</div>` : ''}

    <div class="card">
      <label class="field"><span>${esc(t('lake_name'))} *</span><input id="lName" maxlength="120" value="${v('name')}"></label>
      <div class="grid2">
        <label class="field"><span>${esc(t('place'))}</span><input id="lPlace" maxlength="80" value="${v('place')}"></label>
        <label class="field"><span>${esc(t('address'))}</span><input id="lAddr" maxlength="160" value="${v('address')}"></label>
      </div>
      <div class="field"><span>${esc(t('location'))}</span>
        <div class="pick-map" id="pickMap"></div>
        <div class="row" style="justify-content:space-between"><span class="small muted" id="lLoc">${lake.lat ? `${Number(lake.lat).toFixed(5)}, ${Number(lake.lng).toFixed(5)}` : esc(t('location_hint'))}</span>
        <button class="btn ghost sm" id="lMyLoc" type="button">${icon('nav', 16)}${esc(t('my_location'))}</button></div>
      </div>
      <div class="grid2">
        <label class="field"><span>${esc(t('price_day'))} (${esc(t('rsd'))})</span><input id="lPDay" type="number" min="0" inputmode="numeric" value="${v('price_day')}"></label>
        <label class="field"><span>${esc(t('price_night'))} (${esc(t('rsd'))})</span><input id="lPNight" type="number" min="0" inputmode="numeric" value="${v('price_night')}"></label>
      </div>
      <div class="field"><span>${esc(t('species'))}</span>
        <div class="pick" id="lSpecies">${SPECIES.map(s => `<label><input type="checkbox" value="${s.key}" ${(lake.species || []).includes(s.key) ? 'checked' : ''}><span>${esc(speciesName(s.key))}</span></label>`).join('')}</div>
      </div>
      <div class="grid2">
        <label class="check"><input type="checkbox" id="lNight" ${lake.night_fishing ? 'checked' : ''}>${esc(t('f_night'))}</label>
        <label class="check"><input type="checkbox" id="lAcc" ${lake.accommodation ? 'checked' : ''}>${esc(t('f_acc'))}</label>
        <label class="check"><input type="checkbox" id="lFood" ${lake.food ? 'checked' : ''}>${esc(t('f_food'))}</label>
        <label class="check"><input type="checkbox" id="lBoat" ${lake.boat ? 'checked' : ''}>${esc(t('f_boat'))}</label>
        <label class="check"><input type="checkbox" id="lCR" ${lake.catch_release ? 'checked' : ''}>${esc(t('catch_release'))}</label>
      </div>
      <label class="field"><span>${esc(t('description'))}</span><textarea id="lDesc" maxlength="4000">${v('description')}</textarea></label>
      <label class="field"><span>${esc(t('rules'))}</span><textarea id="lRules" maxlength="4000">${v('rules')}</textarea></label>
      <label class="field"><span>${esc(t('opening'))}</span><input id="lOpen" maxlength="160" value="${v('opening')}"></label>
      <div class="grid2">
        <label class="field"><span>${esc(t('phone'))}</span><input id="lPhone" type="tel" maxlength="40" value="${v('phone')}"></label>
        <label class="field"><span>${esc(t('website'))}</span><input id="lWeb" maxlength="200" value="${v('website')}"></label>
        <label class="field"><span>${esc(t('facebook'))}</span><input id="lFb" maxlength="200" value="${v('facebook')}"></label>
        <label class="field"><span>${esc(t('instagram'))}</span><input id="lIg" maxlength="200" value="${v('instagram')}"></label>
      </div>
      <div class="err" id="lErr"></div>
      <button class="btn lake block" id="lSave">${esc(t('save'))}</button>
    </div>

    ${isNew ? `<div class="notice info" style="margin-top:14px">${esc(t('save_first'))}</div>` : `
    <div class="section"><h2>${esc(t('stats'))}</h2><div class="card" id="statsBox"></div></div>
    <div class="section"><h2>${esc(t('photos'))}</h2>
      <div class="card">
        <div class="photo-grid" id="photos"></div>
        <label class="btn ghost upload-btn" style="margin-top:12px">${icon('camera', 18)}${esc(t('upload_photos'))}<input type="file" id="phUp" accept="image/*" multiple></label>
      </div>
    </div>
    <div class="section"><h2>${esc(t('stockings'))}</h2>
      <div class="card">
        <div class="grid3">
          <label class="field"><span>${esc(t('date'))}</span><input id="sDate" type="date" value="${todayStr()}"></label>
          <label class="field"><span>${esc(t('species'))}</span><select id="sSpecies">${SPECIES.map(s => `<option value="${s.key}">${esc(speciesName(s.key))}</option>`).join('')}</select></label>
          <label class="field"><span>${esc(t('qty_kg'))}</span><input id="sQty" type="text" inputmode="decimal" autocomplete="off"></label>
        </div>
        <label class="field"><span>${esc(t('note'))}</span><input id="sNote" maxlength="500"></label>
        <button class="btn lake" id="sAdd">${icon('plus', 18)}${esc(t('stock_add'))}</button>
        <div id="stockList" style="margin-top:14px"></div>
      </div>
    </div>
    <div class="section"><h2>${esc(t('nav_comp'))}</h2>
      <div class="card row"><span class="grow muted small">${esc(t('pending_note'))}</span><button class="btn ghost" id="cAdd">${icon('trophy', 18)}${esc(t('comp_add'))}</button></div>
    </div>
    <div class="section"><button class="btn danger" id="lDel">${icon('trash', 18)}${esc(t('delete'))}</button></div>`}
  </div>`;

  // Térképes helyválasztó
  let pos = lake.lat ? [lake.lat, lake.lng] : null;
  const map = L.map('pickMap').setView(pos || MAP_CENTER, pos ? 13 : MAP_ZOOM);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap' }).addTo(map);
  const pinIcon = L.divIcon({ className: '', html: '<div class="pin"></div>', iconSize: [30, 30], iconAnchor: [15, 30] });
  let marker = pos ? L.marker(pos, { icon: pinIcon, draggable: true }).addTo(map) : null;
  const setPos = ll => {
    pos = [Number(ll.lat.toFixed(6)), Number(ll.lng.toFixed(6))];
    if (!marker) { marker = L.marker(pos, { icon: pinIcon, draggable: true }).addTo(map); marker.on('dragend', e => setPos(e.target.getLatLng())); }
    else marker.setLatLng(pos);
    $('#lLoc').textContent = `${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}`;
  };
  if (marker) marker.on('dragend', e => setPos(e.target.getLatLng()));
  map.on('click', e => setPos(e.latlng));
  $('#lMyLoc').onclick = () => navigator.geolocation?.getCurrentPosition(p => { setPos({ lat: p.coords.latitude, lng: p.coords.longitude }); map.setView(pos, 14); }, () => toast(t('error'), 'err'));
  setTimeout(() => map.invalidateSize(), 100);

  $('#lSave').onclick = async () => {
    const name = $('#lName').value.trim();
    if (name.length < 2) { $('#lErr').textContent = t('lake_name'); $('#lName').focus(); return; }
    const num = id => { const x = $(id).value; return x === '' ? null : Math.max(0, parseInt(x, 10) || 0); };
    const row = {
      name, place: $('#lPlace').value.trim() || null, address: $('#lAddr').value.trim() || null,
      lat: pos ? pos[0] : null, lng: pos ? pos[1] : null,
      price_day: num('#lPDay'), price_night: num('#lPNight'),
      species: $$('#lSpecies input:checked').map(i => i.value),
      night_fishing: $('#lNight').checked, accommodation: $('#lAcc').checked, food: $('#lFood').checked, boat: $('#lBoat').checked, catch_release: $('#lCR').checked,
      description: $('#lDesc').value.trim() || null, rules: $('#lRules').value.trim() || null, opening: $('#lOpen').value.trim() || null,
      phone: $('#lPhone').value.trim() || null, website: $('#lWeb').value.trim() || null, facebook: $('#lFb').value.trim() || null, instagram: $('#lIg').value.trim() || null
    };
    $('#lSave').disabled = true; $('#lErr').textContent = '';
    if (isNew) {
      const base = slugify(name) || 'jezero';
      let res;
      for (let i = 0; i < 6; i++) {
        const slug = i ? `${base.slice(0, 55)}-${i + 1}` : base;
        res = await sb.from('lakes').insert({ ...row, slug }).select('id').single();
        if (!res.error || res.error.code !== '23505') break;
      }
      $('#lSave').disabled = false;
      if (res.error) { console.error(res.error); $('#lErr').textContent = t('error'); return; }
      toast(t('saved')); go('/moja-jezera/' + res.data.id);
    } else {
      const { error } = await sb.from('lakes').update(row).eq('id', lake.id);
      $('#lSave').disabled = false;
      if (error) { console.error(error); $('#lErr').textContent = t('error'); return; }
      Object.assign(lake, row); toast(t('saved'));
    }
  };
  if (isNew) return;

  // Statisztika az elmúlt 30 napról
  (async () => {
    const from = new Date(); from.setDate(from.getDate() - 29);
    const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`;
    const { data } = await sb.from('lake_stats').select('day, kind, n').eq('lake_id', lake.id).gte('day', fromStr);
    const rows = data || [];
    const box = $('#statsBox');
    if (!rows.length) { box.innerHTML = `<div class="muted small">${esc(t('stats_empty'))}</div>`; return; }
    const sum = k => rows.filter(r => r.kind === k).reduce((a, r) => a + r.n, 0);
    const days = [...Array(30)].map((_, i) => { const d = new Date(from); d.setDate(from.getDate() + i); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
    const views = days.map(d => rows.filter(r => r.day === d && r.kind === 'view').reduce((a, r) => a + r.n, 0));
    const max = Math.max(1, ...views);
    box.innerHTML = `
      <div class="stat-row">${['view', 'call', 'directions', 'website', 'social', 'share'].map(k => `<div class="stat-mini"><small>${esc(t('st_' + k))}</small><b>${sum(k)}</b></div>`).join('')}</div>
      <div class="mini-chart" role="img" aria-label="${esc(t('st_view'))}">${views.map((v, i) => `<span title="${days[i]}: ${v}" style="height:${Math.max(3, Math.round(v / max * 100))}%" class="${v ? '' : 'zero'}"></span>`).join('')}</div>
      <div class="row small muted" style="justify-content:space-between"><span>${esc(fmtDate(days[0]))}</span><span>${esc(fmtDate(days[29]))}</span></div>`;
  })();

  // Fotók
  const loadPhotos = async () => {
    const { data } = await sb.from('lake_photos').select('*').eq('lake_id', lake.id).order('sort').order('id');
    $('#photos').innerHTML = (data || []).map(p => `<div class="ph"><img src="${esc(lakePhotoUrl(p.path))}" alt="" loading="lazy"><button data-ph="${p.id}" data-path="${esc(p.path)}" aria-label="${esc(t('delete'))}">${icon('trash', 16)}</button></div>`).join('');
    $$('#photos [data-ph]').forEach(b => b.onclick = async () => {
      if (!confirm(t('confirm_delete'))) return;
      await sb.from('lake_photos').delete().eq('id', b.dataset.ph);
      await sb.storage.from('lake-photos').remove([b.dataset.path]);
      loadPhotos();
    });
    return data || [];
  };
  let current = await loadPhotos();
  $('#phUp').onchange = async e => {
    const files = [...e.target.files].slice(0, 12);
    if (!files.length) return;
    toast(t('loading'));
    let sort = current.length;
    for (const f of files) {
      try {
        const blob = await compressImage(f);
        const path = `${lake.id}/${randomName()}`;
        const up = await sb.storage.from('lake-photos').upload(path, blob, { contentType: 'image/jpeg' });
        if (up.error) throw up.error;
        const ins = await sb.from('lake_photos').insert({ lake_id: lake.id, path, sort: sort++ });
        if (ins.error) throw ins.error;
      } catch (err) { console.error(err); toast(t('error'), 'err'); }
    }
    e.target.value = '';
    current = await loadPhotos(); toast(t('saved'));
  };

  // Haltelepítés
  const loadStock = async () => {
    const { data } = await sb.from('stockings').select('*').eq('lake_id', lake.id).order('date', { ascending: false }).limit(20);
    $('#stockList').innerHTML = (data || []).map(s => `<div class="list-item"><div class="grow"><b>${esc(speciesName(s.species))}</b>${s.quantity_kg ? ` · ${esc(Number(s.quantity_kg).toLocaleString('sr-RS'))} ${esc(t('kg'))}` : ''}<div class="small muted">${esc(fmtDate(s.date))}${s.note ? ' · ' + esc(s.note) : ''}</div></div><button class="icon-btn" data-st="${s.id}" aria-label="${esc(t('delete'))}">${icon('trash', 18)}</button></div>`).join('');
    $$('#stockList [data-st]').forEach(b => b.onclick = async () => { if (confirm(t('confirm_delete'))) { await sb.from('stockings').delete().eq('id', b.dataset.st); loadStock(); } });
  };
  loadStock();
  $('#sAdd').onclick = async () => {
    const q = $('#sQty').value;
    const { error } = await sb.from('stockings').insert({ lake_id: lake.id, date: $('#sDate').value || todayStr(), species: $('#sSpecies').value, quantity_kg: q.trim() === "" || isNaN(Number(q.replace(",", "."))) ? null : Number(q.replace(",", ".")), note: $('#sNote').value.trim() || null });
    if (error) { toast(t('error'), 'err'); return; }
    $('#sQty').value = ''; $('#sNote').value = ''; toast(t('saved')); loadStock();
  };
  $('#cAdd').onclick = () => openCompForm(ctx, lake.id, null);
  $('#lDel').onclick = async () => {
    if (!confirm(t('confirm_delete'))) return;
    const { data: ph } = await sb.from('lake_photos').select('path').eq('lake_id', lake.id);
    if ((ph || []).length) await sb.storage.from('lake-photos').remove(ph.map(p => p.path));
    const { error } = await sb.from('lakes').delete().eq('id', lake.id);
    if (error) { toast(t('error'), 'err'); return; }
    go('/moja-jezera');
  };
}
