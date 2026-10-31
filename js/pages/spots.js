// Saját (privát) horgászhelyek: Tisza-part, Duna, csatorna… csak a felhasználó látja
import { sb, MAP_CENTER, MAP_ZOOM } from '../config.js';
import { t } from '../i18n.js';
import { $, $$, esc, icon, openModal, closeModal, toast, errText, spinner } from '../ui.js';
import { renderWeatherCard } from '../weather.js';

const WATERS = ['Tisa', 'Dunav', 'Begej', 'Tamiš', 'Kanal DTD', 'Mrtva Tisa', 'Zlatica', 'Krivaja', 'Jegrička', 'Čik', 'Palić', 'Ludaš', 'Sava'];

export async function render(el, _p, ctx) {
  if (!ctx.user) {
    el.innerHTML = `<div class="page narrow"><div class="empty">${icon('spot', 44)}<p>${esc(t('spots_login'))}</p><a class="btn lake" href="#/prijava">${esc(t('login'))}</a></div></div>`;
    return;
  }
  el.innerHTML = `
  <div class="page">
    <div class="page-head"><h1>${esc(t('spots_title'))}</h1>
      <div class="row"><button class="btn ghost" id="spHere">${icon('nav', 18)}${esc(t('spot_here'))}</button><button class="btn lake" id="spAdd">${icon('plus', 18)}${esc(t('spot_add'))}</button></div></div>
    <p class="muted" style="margin-top:-6px">${icon('shield', 16)} ${esc(t('spots_intro'))}</p>
    <div class="map spots-map" id="spMap"></div>
    <p class="small muted" style="margin:6px 0 18px">${esc(t('spot_map_hint'))}</p>
    <div id="spList">${spinner()}</div>
  </div>`;

  const map = L.map('spMap', { scrollWheelZoom: true }).setView(MAP_CENTER, MAP_ZOOM);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap' }).addTo(map);
  const pin = L.divIcon({ className: '', html: '<div class="pin spot"></div>', iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28] });
  const layer = L.layerGroup().addTo(map);
  setTimeout(() => map.invalidateSize(), 100);

  let spots = [], counts = {};
  const load = async () => {
    const [a, b] = await Promise.all([
      sb.from('spots').select('*').eq('user_id', ctx.user.id).order('name'),
      sb.from('catches').select('spot_id').eq('user_id', ctx.user.id).not('spot_id', 'is', null)
    ]);
    spots = a.data || [];
    counts = {}; (b.data || []).forEach(r => { counts[r.spot_id] = (counts[r.spot_id] || 0) + 1; });
    try { localStorage.setItem('ripple_spots_cache', JSON.stringify(spots.map(({ id, name, water, lat, lng }) => ({ id, name, water, lat, lng })))); } catch (e) {}
    draw();
  };

  const draw = () => {
    layer.clearLayers();
    spots.forEach(s => L.marker([s.lat, s.lng], { icon: pin }).addTo(layer)
      .bindPopup(`<b>${esc(s.name)}</b>${s.water ? '<br>' + esc(s.water) : ''}`));
    if (spots.length) map.fitBounds(L.latLngBounds(spots.map(s => [s.lat, s.lng])).pad(0.3), { maxZoom: 13 });
    $('#spList').innerHTML = spots.length ? `<div class="spot-grid">${spots.map(s => `
      <div class="card spot-card">
        <div class="row" style="align-items:flex-start"><span class="spot-ic">${icon('spot', 22)}</span>
          <div class="grow"><h3>${esc(s.name)}</h3><div class="small muted">${[s.water, counts[s.id] ? `${counts[s.id]} ${t('catches_n')}` : ''].filter(Boolean).map(esc).join(' · ')}</div>
          ${s.note ? `<p class="small" style="margin:6px 0 0">${esc(s.note)}</p>` : ''}</div></div>
        <div class="row spot-actions">
          <button class="btn ghost sm" data-wx="${s.id}">${icon('cloud', 16)}${esc(t('weather'))}</button>
          <a class="btn ghost sm" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}">${icon('nav', 16)}${esc(t('directions'))}</a>
          <span class="grow"></span>
          <button class="icon-btn" data-ed="${s.id}" aria-label="${esc(t('edit'))}">${icon('edit', 18)}</button>
          <button class="icon-btn" data-del="${s.id}" aria-label="${esc(t('delete'))}">${icon('trash', 18)}</button>
        </div>
      </div>`).join('')}</div>`
      : `<div class="empty">${icon('spot', 44)}<p>${esc(t('spots_empty'))}</p></div>`;
    $$('[data-ed]').forEach(b => b.onclick = () => form(spots.find(s => s.id == b.dataset.ed)));
    $$('[data-del]').forEach(b => b.onclick = async () => {
      if (!confirm(t('confirm_delete'))) return;
      const { error } = await sb.from('spots').delete().eq('id', b.dataset.del);
      if (error) { toast(errText(error), 'err'); return; }
      load();
    });
    $$('[data-wx]').forEach(b => b.onclick = () => {
      const s = spots.find(x => x.id == b.dataset.wx);
      const body = openModal(s.name, `<div id="spWx"></div>`);
      renderWeatherCard($('#spWx', body), s.lat, s.lng, { head: s.water || s.name });
    });
  };

  const form = (s, ll) => {
    const pos = s ? [s.lat, s.lng] : ll ? [ll.lat, ll.lng] : null;
    const body = openModal(s ? t('edit') : t('spot_add'), `
      <p class="small muted req-note"><b class="req">*</b> ${esc(t('required_note'))}</p>
      <label class="field"><span>${esc(t('spot_name'))} <b class="req">*</b></span><input id="spName" maxlength="80" required placeholder="${esc(t('spot_name_ph'))}" value="${esc(s?.name || '')}"></label>
      <label class="field"><span>${esc(t('spot_water'))}</span><input id="spWater" maxlength="80" list="spWaters" placeholder="Tisa" value="${esc(s?.water || '')}">
        <datalist id="spWaters">${WATERS.map(w => `<option value="${esc(w)}">`).join('')}</datalist></label>
      <div class="field"><span>${esc(t('spot_pos'))} <b class="req">*</b></span>
        <div class="map pick-map" id="spPick"></div>
        <div class="row small" style="margin-top:6px"><span class="muted grow" id="spLL">${pos ? `${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}` : esc(t('spot_pick'))}</span>
        <button class="btn ghost sm" id="spMe" type="button">${icon('nav', 16)}${esc(t('my_location'))}</button></div></div>
      <label class="field"><span>${esc(t('note'))}</span><textarea id="spNote" maxlength="500" placeholder="${esc(t('spot_note_ph'))}">${esc(s?.note || '')}</textarea></label>
      <div class="err" id="spErr"></div>
      <div class="row"><button class="btn ghost" id="spCancel">${esc(t('cancel'))}</button><button class="btn lake grow" id="spSave">${esc(t('save'))}</button></div>`);
    let p = pos;
    const pm = L.map($('#spPick', body)).setView(p || map.getCenter(), p ? 15 : map.getZoom());
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap' }).addTo(pm);
    let mk = null;
    const set = latlng => {
      p = [Number(latlng.lat.toFixed(6)), Number(latlng.lng.toFixed(6))];
      if (!mk) { mk = L.marker(p, { icon: pin, draggable: true }).addTo(pm); mk.on('dragend', e => set(e.target.getLatLng())); } else mk.setLatLng(p);
      $('#spLL', body).textContent = `${p[0].toFixed(5)}, ${p[1].toFixed(5)}`;
      $('#spPick', body).closest('.field').classList.remove('bad');
    };
    if (p) set({ lat: p[0], lng: p[1] });
    pm.on('click', e => set(e.latlng));
    setTimeout(() => pm.invalidateSize(), 120);
    $('#spMe', body).onclick = () => locate(ll2 => { set(ll2); pm.setView(p, 15); });
    $('#spCancel', body).onclick = closeModal;
    $('#spSave', body).onclick = async () => {
      const name = $('#spName', body).value.trim();
      $$('.field.bad', body).forEach(f => f.classList.remove('bad'));
      const bad = [];
      if (name.length < 2) bad.push($('#spName', body).closest('.field'));
      if (!p) bad.push($('#spPick', body).closest('.field'));
      if (bad.length) { bad.forEach(f => f.classList.add('bad')); $('#spErr', body).textContent = t('err_required'); return; }
      const row = { name, water: $('#spWater', body).value.trim() || null, note: $('#spNote', body).value.trim() || null, lat: p[0], lng: p[1] };
      const btn = $('#spSave', body); btn.disabled = true;
      const { error } = s ? await sb.from('spots').update(row).eq('id', s.id) : await sb.from('spots').insert({ ...row, user_id: ctx.user.id });
      if (error) { console.error(error); $('#spErr', body).textContent = errText(error); btn.disabled = false; return; }
      closeModal(); toast(t('saved')); load();
    };
  };

  const locate = cb => {
    if (!navigator.geolocation) { toast(t('loc_denied'), 'err'); return; }
    toast(t('loading'));
    navigator.geolocation.getCurrentPosition(g => cb({ lat: g.coords.latitude, lng: g.coords.longitude }),
      () => toast(t('loc_denied'), 'err'), { enableHighAccuracy: true, timeout: 12000 });
  };

  map.on('click', e => form(null, e.latlng));
  $('#spAdd').onclick = () => form(null, null);
  $('#spHere').onclick = () => locate(ll => form(null, ll));
  load();
}
