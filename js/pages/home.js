import { sb, MAP_CENTER, MAP_ZOOM } from '../config.js';
import { t, SPECIES, speciesName } from '../i18n.js';
import { $, esc, icon, fmtMoney, lakePhotoUrl, spinner } from '../ui.js';

let LAKES = [];
const F = { q: '', species: '', night: false, acc: false, food: false, boat: false, view: 'list' };

export async function render(el) {
  el.innerHTML = `
  <div class="page">
    <div class="hero"><h1>${esc(t('nav_lakes'))}</h1><p>${esc(t('tagline'))}</p></div>
    <div class="filters">
      <label class="search"><span class="sr-only">${esc(t('search_ph'))}</span>
        <input class="input" id="q" type="search" placeholder="${esc(t('search_ph'))}" value="${esc(F.q)}" autocomplete="off"></label>
      <div class="filter-row">
        <select id="fSpecies" aria-label="${esc(t('species'))}">
          <option value="">${esc(t('all_species'))}</option>
          ${SPECIES.map(s => `<option value="${s.key}" ${F.species === s.key ? 'selected' : ''}>${esc(speciesName(s.key))}</option>`).join('')}
        </select>
        <div class="pick">
          <label><input type="checkbox" id="fNight" ${F.night ? 'checked' : ''}><span>${esc(t('f_night'))}</span></label>
          <label><input type="checkbox" id="fAcc" ${F.acc ? 'checked' : ''}><span>${esc(t('f_acc'))}</span></label>
          <label><input type="checkbox" id="fFood" ${F.food ? 'checked' : ''}><span>${esc(t('f_food'))}</span></label>
          <label><input type="checkbox" id="fBoat" ${F.boat ? 'checked' : ''}><span>${esc(t('f_boat'))}</span></label>
        </div>
      </div>
    </div>
    <div class="view-toggle" role="group">
      <button id="vList" class="${F.view === 'list' ? 'on' : ''}" aria-pressed="${F.view === 'list'}">${esc(t('view_list'))}</button>
      <button id="vMap" class="${F.view === 'map' ? 'on' : ''}" aria-pressed="${F.view === 'map'}">${esc(t('view_map'))}</button>
    </div>
    <div class="home-split" id="split" data-view="${F.view}">
      <div class="lake-list" id="list">${spinner()}</div>
      <div class="home-map-wrap"><div class="home-map" id="map" aria-label="${esc(t('view_map'))}"></div></div>
    </div>
  </div>`;

  const map = L.map('map', { scrollWheelZoom: true }).setView(MAP_CENTER, MAP_ZOOM);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap' }).addTo(map);
  const layer = L.layerGroup().addTo(map);

  const { data, error } = await sb.from('lakes')
    .select('id, slug, name, place, lat, lng, price_day, price_night, species, night_fishing, accommodation, food, boat, plan, lake_photos(path, sort)')
    .eq('status', 'approved').order('name');
  if (error) { $('#list').innerHTML = `<div class="empty">${esc(t('error'))}</div>`; return; }
  LAKES = (data || []).map(l => ({ ...l, photo: (l.lake_photos || []).sort((a, b) => a.sort - b.sort)[0]?.path || null }));

  const apply = () => {
    const q = F.q.trim().toLowerCase();
    const list = LAKES.filter(l =>
      (!q || (l.name + ' ' + (l.place || '')).toLowerCase().includes(q)) &&
      (!F.species || (l.species || []).includes(F.species)) &&
      (!F.night || l.night_fishing) && (!F.acc || l.accommodation) && (!F.food || l.food) && (!F.boat || l.boat)
    ).sort((a, b) => (b.plan !== 'free') - (a.plan !== 'free') || a.name.localeCompare(b.name));
    renderList(list);
    renderMarkers(list);
  };

  const renderList = list => {
    const cta = `<div class="owner-cta"><div><h3>${esc(t('owner_cta_t'))}</h3><p>${esc(t('owner_cta'))}</p></div><a class="btn" href="#/moja-jezera/novo">${icon('plus', 18)}${esc(t('add_lake'))}</a></div>`;
    if (!list.length) { $('#list').innerHTML = `<div class="empty">${icon('lake', 40)}<p>${esc(t('no_lakes'))}</p></div>${cta}`; return; }
    $('#list').innerHTML = list.map(l => `
      <a class="lake-card" href="#/jezero/${esc(l.slug)}">
        <div class="thumb">${l.photo ? `<img src="${esc(lakePhotoUrl(l.photo))}" alt="" loading="lazy">` : icon('lake', 36)}</div>
        <div>
          ${l.plan !== 'free' ? `<span class="chip sand" style="font-size:11px;padding:2px 8px">${esc(t('featured'))}</span>` : ''}
          <h3>${esc(l.name)}</h3>
          <div class="meta">${l.place ? `<span>${esc(l.place)}</span>` : ''}${l.price_day ? `<span><b>${esc(fmtMoney(l.price_day))}</b> / ${esc(t('per_day'))}</span>` : ''}</div>
          <div class="chips">${(l.species || []).slice(0, 4).map(s => `<span class="chip">${esc(speciesName(s))}</span>`).join('')}${l.night_fishing ? `<span class="chip gray">${icon('moon', 13)}${esc(t('f_night'))}</span>` : ''}</div>
        </div>
      </a>`).join('') + cta;
  };

  const renderMarkers = list => {
    layer.clearLayers();
    const pts = [];
    list.filter(l => l.lat && l.lng).forEach(l => {
      const m = L.marker([l.lat, l.lng], { icon: L.divIcon({ className: '', html: `<div class="pin ${l.plan !== 'free' ? 'feat' : ''}"></div>`, iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28] }) });
      m.bindPopup(`<a class="pop" href="#/jezero/${esc(l.slug)}">${esc(l.name)}</a><div class="small muted">${esc(l.place || '')}${l.price_day ? ' · ' + esc(fmtMoney(l.price_day)) : ''}</div>`);
      m.addTo(layer); pts.push([l.lat, l.lng]);
    });
    if (pts.length > 1) map.fitBounds(pts, { padding: [40, 40], maxZoom: 12 });
    else if (pts.length === 1) map.setView(pts[0], 12);
  };

  $('#q').addEventListener('input', e => { F.q = e.target.value; apply(); });
  $('#fSpecies').onchange = e => { F.species = e.target.value; apply(); };
  [['fNight', 'night'], ['fAcc', 'acc'], ['fFood', 'food'], ['fBoat', 'boat']].forEach(([id, k]) => { $('#' + id).onchange = e => { F[k] = e.target.checked; apply(); }; });
  const setView = v => {
    F.view = v; $('#split').dataset.view = v;
    $('#vList').classList.toggle('on', v === 'list'); $('#vMap').classList.toggle('on', v === 'map');
    $('#vList').setAttribute('aria-pressed', v === 'list'); $('#vMap').setAttribute('aria-pressed', v === 'map');
    if (v === 'map') setTimeout(() => map.invalidateSize(), 50);
  };
  $('#vList').onclick = () => setView('list');
  $('#vMap').onclick = () => setView('map');
  apply();
  setTimeout(() => map.invalidateSize(), 100);
}
