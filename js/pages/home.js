import { sb, MAP_CENTER, MAP_ZOOM } from '../config.js';
import { t, SPECIES, speciesName } from '../i18n.js';
import { $, $$, esc, icon, fmtMoney, lakePhotoUrl, spinner, toast } from '../ui.js';
import { listWeather, wxInfo, wxIcon, trendArrow, renderWeatherCard } from '../weather.js';
import { MAP_CENTER as REGION } from '../config.js';

let LAKES = [];
const F = { q: '', species: '', night: false, acc: false, food: false, boat: false, fav: false, view: 'list' };
let WX = {};

export async function render(el, _p, ctx) {
  el.innerHTML = `
  <div class="page">
    <div class="hero"><h1>${esc(t('nav_lakes'))}</h1><p>${esc(t('tagline'))}</p></div>
    <div class="card wx-card wx-wide" id="homeWx"></div>
    <div class="filters">
      <label class="search"><span class="sr-only">${esc(t('search_ph'))}</span>
        <input class="input" id="q" type="search" placeholder="${esc(t('search_ph'))}" value="${esc(F.q)}" autocomplete="off"></label>
      <div class="filter-row">
        <select id="fSpecies" aria-label="${esc(t('species'))}">
          <option value="">${esc(t('all_species'))}</option>
          ${SPECIES.map(s => `<option value="${s.key}" ${F.species === s.key ? 'selected' : ''}>${esc(speciesName(s.key))}</option>`).join('')}
        </select>
        <div class="pick">
          ${ctx.user ? `<label><input type="checkbox" id="fFav" ${F.fav ? 'checked' : ''}><span>${icon('heart', 15)}&nbsp;${esc(t('only_favs'))}</span></label>` : ''}
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

  // Időjárás a főoldalon: mentett hely, saját helyzet vagy egy tó
  const wxBox = $('#homeWx');
  const getLoc = () => { try { return JSON.parse(localStorage.getItem('ripple_wx_loc') || 'null'); } catch (e) { return null; } };
  const setLoc = l => { try { localStorage.setItem('ripple_wx_loc', JSON.stringify(l)); } catch (e) {} };
  let lakeOpts = [];
  const drawWx = () => {
    const loc = getLoc() || { kind: 'region', lat: REGION[0], lng: REGION[1] };
    const sel = loc.kind === 'lake' ? 'lake:' + loc.id : loc.kind;
    const head = `<div class="wx-head"><h2>${esc(t('wx_today'))}</h2>
      <label class="wx-loc"><span class="sr-only">${esc(t('loc_label'))}</span>${icon('pin', 16)}
        <select id="wxLoc">
          <option value="region" ${sel === 'region' ? 'selected' : ''}>${esc(t('loc_region'))}</option>
          <option value="mine" ${sel === 'mine' ? 'selected' : ''}>${esc(t('my_location'))}</option>
          ${lakeOpts.map(l => `<option value="lake:${l.id}" ${sel === 'lake:' + l.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}
        </select></label></div>`;
    wxBox.innerHTML = head + spinner();
    renderWeatherCard(wxBox, loc.lat, loc.lng, { head }).then(() => bindLoc());
    bindLoc();
  };
  const bindLoc = () => {
    const s = $('#wxLoc'); if (!s) return;
    s.onchange = () => {
      const v = s.value;
      if (v === 'region') { setLoc({ kind: 'region', lat: REGION[0], lng: REGION[1] }); drawWx(); }
      else if (v === 'mine') {
        if (!navigator.geolocation) { toast(t('loc_denied'), 'err'); return; }
        navigator.geolocation.getCurrentPosition(p => { setLoc({ kind: 'mine', lat: +p.coords.latitude.toFixed(3), lng: +p.coords.longitude.toFixed(3) }); drawWx(); },
          () => { toast(t('loc_denied'), 'err'); drawWx(); }, { timeout: 10000, maximumAge: 600000 });
      } else { const l = lakeOpts.find(x => 'lake:' + x.id === v); if (l) { setLoc({ kind: 'lake', id: l.id, lat: l.lat, lng: l.lng }); drawWx(); } }
    };
  };
  drawWx();

  const map = L.map('map', { scrollWheelZoom: true }).setView(MAP_CENTER, MAP_ZOOM);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap' }).addTo(map);
  const layer = L.layerGroup().addTo(map);

  const { data, error } = await sb.from('lakes')
    .select('id, slug, name, place, lat, lng, price_day, price_night, species, night_fishing, accommodation, food, boat, plan, lake_photos(path, sort)')
    .eq('status', 'approved').order('name');
  if (error) { $('#list').innerHTML = `<div class="empty">${esc(t('error'))}</div>`; return; }
  LAKES = (data || []).map(l => ({ ...l, photo: (l.lake_photos || []).sort((a, b) => a.sort - b.sort)[0]?.path || null }));
  lakeOpts = LAKES.filter(l => l.lat && l.lng);
  if (lakeOpts.length) { const s = $('#wxLoc'); if (s && !s.querySelector('option[value^="lake:"]')) drawWx(); }
  let FAVS = new Set();
  if (ctx.user) { const { data: fv } = await sb.from('favorites').select('lake_id').eq('user_id', ctx.user.id); FAVS = new Set((fv || []).map(f => f.lake_id)); }

  const apply = () => {
    const q = F.q.trim().toLowerCase();
    const list = LAKES.filter(l =>
      (!q || (l.name + ' ' + (l.place || '')).toLowerCase().includes(q)) &&
      (!F.species || (l.species || []).includes(F.species)) &&
      (!F.fav || FAVS.has(l.id)) && (!F.night || l.night_fishing) && (!F.acc || l.accommodation) && (!F.food || l.food) && (!F.boat || l.boat)
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
          <div class="meta">${l.place ? `<span>${esc(l.place)}</span>` : ''}<span class="wx-mini" data-wx="${l.id}">${wxMini(l.id)}</span>${l.price_day ? `<span><b>${esc(fmtMoney(l.price_day))}</b> / ${esc(t('per_day'))}</span>` : ''}</div>
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
  if ($('#fFav')) $('#fFav').onchange = e => { F.fav = e.target.checked; apply(); };
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
  // Időjárás a kártyákra (háttérben, nem lassítja a listát)
  listWeather(LAKES.map(l => ({ id: l.id, lat: l.lat, lng: l.lng }))).then(w => {
    WX = w; $$('[data-wx]').forEach(s => { s.innerHTML = wxMini(s.dataset.wx); });
  }).catch(() => {});
}

function wxMini(id) {
  const w = WX[id]; if (!w) return '';
  const tr = trendArrow(w.trend);
  return `${wxIcon(wxInfo(w.code).icon, 16)}${Math.round(w.temp)}° <span class="tr tr-${tr.k}" title="${esc(t('wx_pressure') + ': ' + t('p_' + tr.k))}">${tr.a}</span>`;
}
