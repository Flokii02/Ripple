import { sb, MAP_CENTER, MAP_ZOOM } from '../config.js';
import { t, SPECIES, speciesName } from '../i18n.js';
import { $, $$, esc, icon, fmtMoney, lakePhotoUrl, spinner, toast } from '../ui.js';
import { listWeather, wxInfo, wxIcon, trendArrow, renderWeatherCard } from '../weather.js';
import { MAP_CENTER as REGION } from '../config.js';
import { isOwner, openSuggest } from '../suggest.js';
import { SEASONS, seasonName, inSeason, daysUntil } from '../seasons.js';

let LAKES = [];
const F = { q: '', species: '', night: false, acc: false, food: false, boat: false, fav: false, view: 'list' };
let WX = {};
// Települések a helyválasztóhoz (ha a telefon nem adja meg a helyzetet)
const TOWNS = [['Ada', 45.80, 20.13], ['Bačka Topola', 45.81, 19.63], ['Bečej', 45.62, 20.03], ['Kanjiža', 46.07, 20.05], ['Kikinda', 45.83, 20.47], ['Novi Bečej', 45.60, 20.13],
  ['Novi Kneževac', 46.05, 20.10], ['Novi Sad', 45.27, 19.83], ['Pančevo', 44.87, 20.64], ['Senta', 45.93, 20.08], ['Sombor', 45.77, 19.11], ['Subotica', 46.10, 19.67],
  ['Temerin', 45.41, 19.89], ['Vršac', 45.12, 21.30], ['Zrenjanin', 45.38, 20.39]];

export async function render(el, _p, ctx) {
  el.innerHTML = `
  <div class="page">
    <section class="lake-hero">
      <div class="lh-text"><span class="lh-kicker">${icon('fish', 16)} Ripple</span><h1>${esc(t('nav_lakes'))}</h1><p>${esc(t('tagline'))}</p></div>
      <svg class="lh-reeds" viewBox="0 0 200 160" aria-hidden="true"><g fill="none" stroke-linecap="round">
        <path class="reed" d="M30 160 C 32 110 28 70 36 20" stroke-width="3"/><path class="reed d2" d="M48 160 C 50 120 54 90 50 45" stroke-width="3"/>
        <path class="reed d3" d="M64 160 C 62 125 66 100 72 60" stroke-width="2.5"/><path class="reed d2" d="M150 160 C 152 120 148 95 156 50" stroke-width="3"/>
        <path class="reed" d="M168 160 C 166 130 170 110 176 80" stroke-width="2.5"/></g>
        <g fill="#7A5A2E"><rect class="reed" x="32" y="18" width="7" height="26" rx="3.5"/><rect class="reed d2" x="46" y="44" width="7" height="22" rx="3.5"/><rect class="reed d2" x="152" y="48" width="7" height="24" rx="3.5"/></g></svg>
      <svg class="lh-fish" viewBox="0 0 60 24" aria-hidden="true"><path d="M2 12c8-10 26-10 36 0-10 10-28 10-36 0Z M38 12l14-8v16Z" fill="currentColor"/></svg>
      <svg class="lh-waves" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true">
        <path class="w1" d="M0 40 C 240 0 480 80 720 40 S 1200 0 1440 40 V90 H0Z"/>
        <path class="w2" d="M0 60 C 240 20 480 100 720 60 S 1200 20 1440 60 V90 H0Z"/>
      </svg>
    </section>
    <div class="card wx-card wx-wide" id="homeWx"></div>
    ${seasonCard()}
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
  let spotOpts = [];
  if (ctx?.user) { try { spotOpts = JSON.parse(localStorage.getItem('ripple_spots_cache') || '[]'); } catch (e) {} }
  let wxSeq = 0;
  const drawWx = () => {
    const my = ++wxSeq;
    const loc = getLoc() || { kind: 'region', lat: REGION[0], lng: REGION[1] };
    const sel = loc.kind === 'lake' ? 'lake:' + loc.id : loc.kind === 'town' ? 'town:' + loc.id : loc.kind === 'spot' ? 'spot:' + loc.id : loc.kind;
    const head = `<div class="wx-head"><h2>${esc(t('wx_today'))}</h2>
      <label class="wx-loc"><span class="sr-only">${esc(t('loc_label'))}</span>${icon('pin', 16)}
        <select id="wxLoc">
          <option value="region" ${sel === 'region' ? 'selected' : ''}>${esc(t('loc_region'))}</option>
          <option value="mine" ${sel === 'mine' ? 'selected' : ''}>${esc(t('my_location'))}</option>
          ${spotOpts.length ? `<optgroup label="${esc(t('spots_title'))}">${spotOpts.map(x => `<option value="spot:${x.id}" ${sel === 'spot:' + x.id ? 'selected' : ''}>${esc(x.name)}${x.water ? ' – ' + esc(x.water) : ''}</option>`).join('')}</optgroup>` : ''}
          <optgroup label="${esc(t('place'))}">${TOWNS.map(x => `<option value="town:${x[0]}" ${sel === 'town:' + x[0] ? 'selected' : ''}>${esc(x[0])}</option>`).join('')}</optgroup>
          ${lakeOpts.length ? `<optgroup label="${esc(t('nav_lakes'))}">${lakeOpts.map(l => `<option value="lake:${l.id}" ${sel === 'lake:' + l.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</optgroup>` : ''}
        </select></label></div>`;
    wxBox.innerHTML = head + spinner();
    renderWeatherCard(wxBox, loc.lat, loc.lng, { head, collapsible: window.innerWidth < 860, isCurrent: () => my === wxSeq && document.body.contains(wxBox) }).then(() => bindLoc());
    bindLoc();
  };
  const bindLoc = () => {
    const s = $('#wxLoc'); if (!s) return;
    s.onchange = () => {
      const v = s.value;
      if (v === 'region') { setLoc({ kind: 'region', lat: REGION[0], lng: REGION[1] }); drawWx(); }
      else if (v === 'mine') {
        if (!navigator.geolocation) { toast(t('loc_denied'), 'err'); return; }
        wxBox.querySelector('.wx-head')?.insertAdjacentHTML('afterend', `<p class="small muted" id="wxLocWait">${esc(t('loading'))}</p>`);
        navigator.geolocation.getCurrentPosition(p => { setLoc({ kind: 'mine', lat: +p.coords.latitude.toFixed(3), lng: +p.coords.longitude.toFixed(3) }); drawWx(); },
          err => { drawWx(); setTimeout(() => showLocHelp(err && err.code === 1 ? 'loc_help_denied' : 'loc_denied'), 50); },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
      } else if (v.startsWith('town:')) { const tw = TOWNS.find(x => 'town:' + x[0] === v); if (tw) { setLoc({ kind: 'town', id: tw[0], lat: tw[1], lng: tw[2] }); drawWx(); } }
      else if (v.startsWith('spot:')) { const x = spotOpts.find(o => 'spot:' + o.id === v); if (x) { setLoc({ kind: 'spot', id: x.id, lat: x.lat, lng: x.lng }); drawWx(); } }
      else { const l = lakeOpts.find(x => 'lake:' + x.id === v); if (l) { setLoc({ kind: 'lake', id: l.id, lat: l.lat, lng: l.lng }); drawWx(); } }
    };
  };
  const showLocHelp = key => {
    const h = wxBox.querySelector('.wx-head');
    if (h && !$('#wxHelp')) h.insertAdjacentHTML('afterend', `<div class="notice" id="wxHelp" style="grid-column:1/-1">${esc(t(key))}</div>`);
  };
  drawWx();
  // Saját helyek frissítése a háttérben (újrarajzolás nélkül)
  if (ctx?.user) sb.from('spots').select('id, name, water, lat, lng').eq('user_id', ctx.user.id).order('name').then(({ data: sp }) => {
    if (!sp) return;
    try { localStorage.setItem('ripple_spots_cache', JSON.stringify(sp)); } catch (e) {}
    const s = $('#wxLoc');
    if (!sp.length || !s || s.querySelector('option[value^="spot:"]')) return;
    spotOpts = sp;
    s.querySelector('option[value="mine"]').insertAdjacentHTML('afterend', `<optgroup label="${esc(t('spots_title'))}">${sp.map(x => `<option value="spot:${x.id}">${esc(x.name)}${x.water ? ' – ' + esc(x.water) : ''}</option>`).join('')}</optgroup>`);
  });

  const map = L.map('map', { scrollWheelZoom: true }).setView(MAP_CENTER, MAP_ZOOM);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap' }).addTo(map);
  const layer = L.layerGroup().addTo(map);

  const { data, error } = await sb.from('lakes')
    .select('id, slug, name, place, lat, lng, price_day, price_night, species, night_fishing, accommodation, food, boat, plan, lake_photos(path, thumb_path, sort)')
    .eq('status', 'approved').order('name');
  if (error) { $('#list').innerHTML = `<div class="empty">${esc(t('error'))}</div>`; return; }
  LAKES = (data || []).map(l => ({ ...l, photo: (l.lake_photos || []).sort((a, b) => a.sort - b.sort)[0] })).map(l => ({ ...l, photo: l.photo ? (l.photo.thumb_path || l.photo.path) : null }));
  lakeOpts = LAKES.filter(l => l.lat && l.lng);
  // A tavakat a választóhoz adjuk hozzá újrarajzolás nélkül (hogy ne ugorjon vissza a választás)
  if (lakeOpts.length) {
    const s = $('#wxLoc');
    if (s && !s.querySelector('option[value^="lake:"]')) {
      s.insertAdjacentHTML('beforeend', `<optgroup label="${esc(t('nav_lakes'))}">${lakeOpts.map(l => `<option value="lake:${l.id}">${esc(l.name)}</option>`).join('')}</optgroup>`);
      const loc = getLoc(); if (loc?.kind === 'lake') s.value = 'lake:' + loc.id;
    }
  }
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
    const cta = isOwner(ctx)
      ? `<div class="owner-cta"><div><h3>${esc(t('owner_cta_t'))}</h3><p>${esc(t('owner_cta'))}</p></div><a class="btn" href="#/moja-jezera/novo">${icon('plus', 18)}${esc(t('add_lake'))}</a></div>`
      : `<div class="owner-cta"><div><h3>${esc(t('owner_cta_t'))}</h3><p>${esc(t('owner_cta_angler'))}</p></div><div class="row"><button class="btn" data-suggest>${icon('plus', 18)}${esc(t('suggest_lake'))}</button>${ctx.user ? '' : `<a class="btn ghost" style="color:#fff;border-color:#4A6574" href="#/prijava">${esc(t('owner_register'))}</a>`}</div></div>`;
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

  $('#list').addEventListener('click', e => { if (e.target.closest('[data-suggest]')) openSuggest(ctx); });
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

function seasonCard() {
  const act = SEASONS.filter(s => inSeason(s));
  const soon = SEASONS.filter(s => !inSeason(s) && daysUntil(s) !== null && daysUntil(s) <= 14);
  return `<a class="season-home" href="#/lovostaj">
    <span class="sh-ic">${icon('shield', 20)}</span>
    <span class="sh-body"><b>${esc(t('ss_home'))}</b>
      <span class="chips">${act.length ? act.map(s => `<span class="chip bad">${esc(seasonName(s))}</span>`).join('') : `<span class="small muted">${esc(t('ss_none'))}</span>`}${soon.map(s => `<span class="chip warn">${esc(seasonName(s))} · ${daysUntil(s)}d</span>`).join('')}</span></span>
    <span class="sh-more">${esc(t('ss_all'))} ›</span></a>`;
}
