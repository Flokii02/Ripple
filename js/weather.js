// Időjárás az Open-Meteo ingyenes szolgáltatásából (kulcs nélkül), 30 perces gyorsítótárral
import { lang, t } from './i18n.js';
import { esc, icon } from './ui.js';
import { forecast, BITE_SPECIES } from './bite.js';
import { speciesName } from './i18n.js';

const API = 'https://api.open-meteo.com/v1/forecast';
const TTL = 30 * 60 * 1000;

function cacheGet(k) {
  try { const v = JSON.parse(sessionStorage.getItem(k) || 'null'); return v && Date.now() - v.at < TTL ? v.data : null; } catch (e) { return null; }
}
function cacheSet(k, data) { try { sessionStorage.setItem(k, JSON.stringify({ at: Date.now(), data })); } catch (e) {} }

// Egy tó részletes időjárása
export async function lakeWeather(lat, lng) {
  const key = `wx2:${lat.toFixed(3)},${lng.toFixed(3)}`;
  const hit = cacheGet(key); if (hit) return hit;
  const u = `${API}?latitude=${lat}&longitude=${lng}&timezone=Europe%2FBelgrade&forecast_days=5&past_days=5`
    + '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,precipitation,cloud_cover'
    + '&hourly=temperature_2m,surface_pressure,wind_speed_10m,cloud_cover,weather_code'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset';
  const r = await fetch(u);
  if (!r.ok) throw new Error('weather');
  const d = await r.json();
  const out = {
    now: d.current,
    hourly: d.hourly,
    trend: pressureTrend(d.hourly, d.current.time),
    trend12: pressureTrend(d.hourly, d.current.time, 12),
    daily: d.daily.time.map((day, i) => ({
      day, code: d.daily.weather_code[i], max: d.daily.temperature_2m_max[i], min: d.daily.temperature_2m_min[i],
      rain: d.daily.precipitation_probability_max[i], wind: d.daily.wind_speed_10m_max[i],
      sunrise: d.daily.sunrise[i], sunset: d.daily.sunset[i]
    })).filter(x => x.day >= d.current.time.slice(0, 10))
  };
  cacheSet(key, out);
  return out;
}

// Több tó rövid időjárása a listához (egy kérésben)
export async function listWeather(points) {
  const pts = points.filter(p => p.lat && p.lng).slice(0, 60);
  if (!pts.length) return {};
  const key = 'wxl:' + pts.map(p => `${p.lat.toFixed(2)},${p.lng.toFixed(2)}`).join('|');
  const hit = cacheGet(key); if (hit) return hit;
  const u = `${API}?latitude=${pts.map(p => p.lat).join(',')}&longitude=${pts.map(p => p.lng).join(',')}`
    + '&timezone=Europe%2FBelgrade&current=temperature_2m,weather_code,surface_pressure&hourly=surface_pressure&past_days=1&forecast_days=1';
  const r = await fetch(u);
  if (!r.ok) throw new Error('weather');
  let d = await r.json();
  if (!Array.isArray(d)) d = [d];
  const out = {};
  pts.forEach((p, i) => { const x = d[i]; if (x?.current) out[p.id] = { temp: x.current.temperature_2m, code: x.current.weather_code, trend: pressureTrend(x.hourly, x.current.time) }; });
  cacheSet(key, out);
  return out;
}

// Légnyomás változása az elmúlt 3 órában (hPa)
function pressureTrend(hourly, nowIso, span = 3) {
  if (!hourly?.time) return 0;
  const hour = nowIso.slice(0, 13);
  const i = hourly.time.findIndex(x => x.slice(0, 13) === hour);
  if (i < span) return 0;
  return Math.round((hourly.surface_pressure[i] - hourly.surface_pressure[i - span]) * 10) / 10;
}

// Időjárás-kód -> ikon és szöveg
export function wxInfo(code) {
  const groups = [
    [[0], 'sun', 'Vedro', 'Derült'], [[1, 2], 'cloudSun', 'Delimično oblačno', 'Részben felhős'], [[3], 'cloud', 'Oblačno', 'Borult'],
    [[45, 48], 'fog', 'Magla', 'Köd'], [[51, 53, 55, 56, 57], 'rain', 'Rosulja', 'Szitálás'], [[61, 63, 65, 66, 67, 80, 81, 82], 'rain', 'Kiša', 'Eső'],
    [[71, 73, 75, 77, 85, 86], 'snow', 'Sneg', 'Havazás'], [[95, 96, 99], 'storm', 'Grmljavina', 'Zivatar']
  ];
  const g = groups.find(x => x[0].includes(code)) || groups[2];
  return { icon: g[1], text: lang() === 'hu' ? g[3] : g[2] };
}

const WI = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  cloudSun: '<path d="M12 4v1M5.6 6.6l.7.7M4 12h1M18.4 6.6l-.7.7"/><path d="M8.5 11.5a3.5 3.5 0 0 1 6.6-1.7"/><path d="M7 20h10a4 4 0 0 0 0-8 5 5 0 0 0-9.6 1.5A3.3 3.3 0 0 0 7 20Z"/>',
  cloud: '<path d="M7 19h10a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.5 2A3.6 3.6 0 0 0 7 19Z"/>',
  fog: '<path d="M7 13a5 5 0 0 1 9.6-1.5A3.5 3.5 0 0 1 17 18H7M4 21h16M6 16h4"/>',
  rain: '<path d="M7 15h10a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.5 1.8A3.2 3.2 0 0 0 7 15Z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>',
  snow: '<path d="M7 14h10a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.5 1.8A3.2 3.2 0 0 0 7 14Z"/><path d="M8 18h.01M12 20h.01M16 18h.01M10 22h.01M14 22h.01"/>',
  storm: '<path d="M7 14h10a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.5 1.8A3.2 3.2 0 0 0 7 14Z"/><path d="m12 15-2 4h4l-2 4"/>'
};
export function wxIcon(name, size = 22) {
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${WI[name] || WI.cloud}</svg>`;
}

// Holdfázis (0 = újhold, 0.5 = telihold)
export function moonPhase(date = new Date()) {
  const synodic = 29.530588853;
  const ref = Date.UTC(2000, 0, 6, 18, 14);
  const days = (date.getTime() - ref) / 864e5;
  return ((days % synodic) + synodic) % synodic / synodic;
}
export function moonName(p) {
  const n = lang() === 'hu'
    ? ['Újhold', 'Növekvő sarló', 'Első negyed', 'Növekvő hold', 'Telihold', 'Fogyó hold', 'Utolsó negyed', 'Fogyó sarló']
    : ['Mlad mesec', 'Rastući srp', 'Prva četvrt', 'Rastući mesec', 'Pun mesec', 'Opadajući mesec', 'Poslednja četvrt', 'Opadajući srp'];
  return n[Math.round(p * 8) % 8];
}

// Kapás-esély becslése (egyszerű szabályok, nem tudományos előrejelzés)
export function biteChance({ trend, wind, temp, code }) {
  let s = 50;
  if (trend <= -0.5 && trend >= -3) s += 15;        // lassan csökkenő légnyomás: jó
  else if (trend < -3) s -= 5;                       // gyors esés (front): bizonytalan
  else if (trend >= 2) s -= 15;                      // gyorsan emelkedő: gyengébb
  else if (Math.abs(trend) < 0.5) s += 5;            // stabil
  if (wind >= 5 && wind <= 20) s += 10; else if (wind > 30) s -= 15;
  if (temp >= 12 && temp <= 26) s += 10; else if (temp < 4 || temp > 32) s -= 15;
  if ([95, 96, 99].includes(code)) s -= 25;
  if ([1, 2, 3, 51, 53, 61].includes(code)) s += 5;  // felhős, enyhe eső: gyakran jó
  const p = moonPhase(); const nearNewFull = Math.min(Math.abs(p - 0), Math.abs(p - 0.5), Math.abs(p - 1)) < 0.07;
  if (nearNewFull) s += 5;
  s = Math.max(5, Math.min(95, s));
  return { score: s, level: s >= 65 ? 'good' : s >= 45 ? 'mid' : 'low' };
}

export function trendArrow(tr) {
  if (tr >= 1) return { a: '↑', k: 'up' };
  if (tr <= -1) return { a: '↓', k: 'down' };
  return { a: '→', k: 'flat' };
}
export function fmtTime(iso) { return iso ? iso.slice(11, 16) : ''; }
export function dayName(iso) {
  return new Date(iso + 'T12:00').toLocaleDateString(lang() === 'hu' ? 'hu-HU' : 'sr-Latn-RS', { weekday: 'short' });
}

// Teljes időjárás-kártya (tó oldal és főoldal)
export async function renderWeatherCard(box, lat, lng, opts = {}) {
  try {
    const w = await lakeWeather(lat, lng);
    const n = w.now, info = wxInfo(n.weather_code), tr = trendArrow(w.trend);
    const mp = moonPhase();
    let spKey = 'general'; try { spKey = localStorage.getItem('ripple_bite_sp') || 'general'; } catch (e) {}
    if (!BITE_SPECIES[spKey]) spKey = 'general';
    const fc = forecast(w, lat, lng, spKey);
    const bite = fc.current || { score: 50, level: 'mid' };
    const hm = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const dayLbl = d => { const td = new Date(); return d.toDateString() === td.toDateString() ? t('today') : t('tomorrow'); };
    const spName = k => k === 'general' ? t('sp_general') : speciesName(k);
    const today = w.daily[0] || {};
    const r1 = v => Math.round(v);
    let open = true;
    if (opts.collapsible) { try { open = localStorage.getItem('ripple_wx_open') === '1'; } catch (e) { open = false; } }
    box.classList.toggle('wx-collapsed', !!opts.collapsible && !open);
    box.classList.toggle('wx-collapsible', !!opts.collapsible);
    box.innerHTML = `
      ${opts.head ?? `<h2>${esc(t('wx_title'))}</h2>`}
      ${opts.collapsible ? `<button class="wx-sum" aria-expanded="${open}">
        <span class="wx-sum-ic">${wxIcon(info.icon, 28)}</span><b class="wx-sum-t">${r1(n.temperature_2m)}°</b>
        <span class="chip bite-chip bite-${bite.level}">${esc(t('bite_' + bite.level))}</span>
        <span class="wx-sum-p">${r1(n.surface_pressure)} hPa <span class="tr tr-${tr.k}">${tr.a}</span></span>
        <span class="wx-sum-more">${esc(open ? t('less') : t('more'))}<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></span>
      </button>` : ''}
      <div class="wx-now">
        <div class="wx-ic">${wxIcon(info.icon, 44)}</div>
        <div><div class="wx-temp">${r1(n.temperature_2m)}°</div><div class="small muted">${esc(info.text)} · ${esc(t('wx_feels'))} ${r1(n.apparent_temperature)}°</div></div>
      </div>
      <div class="bite bite-${bite.level}">
        <div class="bite-sp" role="group" aria-label="${esc(t('bite_for'))}">${Object.keys(BITE_SPECIES).map(k => `<button class="${k === spKey ? 'on' : ''}" data-bsp="${k}" aria-pressed="${k === spKey}">${esc(spName(k))}</button>`).join('')}</div>
        <div class="row" style="justify-content:space-between"><b>${esc(t('bite_now'))}</b><span class="bite-lvl">${esc(t('bite_' + bite.level))} · ${bite.score}%</span></div>
        <div class="bite-bar"><span style="width:${bite.score}%"></span></div>
        <div class="bite-hours" role="img" aria-label="${esc(t('bite_hourly'))}">${fc.hours.map(x => `<span class="bh-${x.level} ${x === fc.current ? 'now' : ''}" style="height:${Math.max(8, x.score)}%" title="${esc(dayLbl(x.t))} ${hm(x.t)}: ${x.score}%"></span>`).join('')}</div>
        <div class="bite-axis">${fc.hours.filter((x, i) => i % 6 === 0).map(x => `<span>${hm(x.t)}</span>`).join('')}</div>
        ${fc.best.length ? `<div class="bite-best"><b>${esc(t('bite_best'))}</b>${fc.best.map(b => `<div class="bb"><span>${esc(dayLbl(b.from))} ${hm(b.from)}–${hm(b.to)}</span><span class="small">${b.reasons.filter(r => ['dawn', 'major', 'minor', 'p_fall', 'temp_good', 'night'].includes(r)).slice(0, 3).map(r => esc(t('r_' + r))).join(' · ')}</span><em>${b.score}%</em></div>`).join('')}</div>` : ''}
        <div class="small" style="opacity:.8;margin-top:8px">${esc(t('bite_note2'))}</div>
      </div>
      <div class="wx-grid">
        <div>${icon('wind', 18)}<small>${esc(t('wx_wind'))}</small><b>${r1(n.wind_speed_10m)} km/h</b></div>
        <div>${icon('gauge', 18)}<small>${esc(t('wx_pressure'))}</small><b>${r1(n.surface_pressure)} hPa <span class="tr tr-${tr.k}" title="${esc(t('p_' + tr.k))}">${tr.a}</span></b><span class="small muted">${esc(t('p_' + tr.k))}${w.trend ? ` (${w.trend > 0 ? '+' : ''}${String(w.trend).replace('.', ',')}/3h)` : ''}${w.trend12 ? `, ${w.trend12 > 0 ? '+' : ''}${String(w.trend12).replace('.', ',')}/12h` : ''}</span></div>
        <div>${icon('moonph', 18)}<small>${esc(t('wx_moon'))}</small><b>${esc(moonName(mp))}</b>${fc.solunar.major.length ? `<span class="small muted">${esc(t('sol_major'))}: ${fc.solunar.major.map(p => hm(p.from) + '–' + hm(p.to)).join(', ')}</span>` : ''}${fc.solunar.minor.length ? `<span class="small muted">${esc(t('sol_minor'))}: ${fc.solunar.minor.map(p => hm(p.from) + '–' + hm(p.to)).join(', ')}</span>` : ''}</div>
        ${fc.water != null ? `<div>${icon('lake', 18)}<small>${esc(t('water_est'))}</small><b>~${Math.round(fc.water)}°</b><span class="small muted">${esc(t('water_est_note'))}</span></div>` : ''}
        <div>${icon('sunrise', 18)}<small>${esc(t('wx_sunrise'))} / ${esc(t('wx_sunset'))}</small><b>${fmtTime(today.sunrise)} – ${fmtTime(today.sunset)}</b></div>
      </div>
      <div class="wx-days">${w.daily.slice(0, 5).map(d => { const i = wxInfo(d.code); return `
        <div class="wx-day"><small>${esc(dayName(d.day))}</small>${wxIcon(i.icon, 24)}<b>${r1(d.max)}°</b><span>${r1(d.min)}°</span>${d.rain ? `<em>${d.rain}%</em>` : '<em>&nbsp;</em>'}</div>`; }).join('')}</div>
      <div class="small muted" style="margin-top:8px">Open-Meteo</div>`;
  } catch (e) {
    console.error(e);
    box.innerHTML = `${opts.head ?? `<h2>${esc(t('wx_title'))}</h2>`}<p class="muted small">${esc(t('wx_err'))}</p>`;
    return;
  }
  box.querySelectorAll('[data-bsp]').forEach(b => b.onclick = () => {
    try { localStorage.setItem('ripple_bite_sp', b.dataset.bsp); } catch (e) {}
    const wasOpen = !box.classList.contains('wx-collapsed');
    renderWeatherCard(box, lat, lng, opts).then(() => { if (opts.collapsible && wasOpen) { box.classList.remove('wx-collapsed'); } });
  });
  const sum = box.querySelector('.wx-sum');
  if (sum) sum.onclick = () => {
    const nowOpen = box.classList.contains('wx-collapsed');
    box.classList.toggle('wx-collapsed', !nowOpen);
    sum.setAttribute('aria-expanded', nowOpen);
    sum.querySelector('.wx-sum-more').firstChild.textContent = nowOpen ? t('less') : t('more');
    try { localStorage.setItem('ripple_wx_open', nowOpen ? '1' : '0'); } catch (e) {}
  };
}

// Időjárás egy adott időpontban (fogáshoz): utolsó 3 óra légnyomás-változással
function belgradeHour(d) {
  const p = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Belgrade', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false }).format(d);
  return p.replace(' ', 'T').slice(0, 13) + ':00';
}
export async function weatherAt(lat, lng, iso) {
  const at = new Date(iso);
  if (isNaN(at) || at > new Date(Date.now() + 3600e3)) return null;
  const end = belgradeHour(at), start = belgradeHour(new Date(at.getTime() - 3 * 3600e3));
  const vars = 'temperature_2m,surface_pressure,wind_speed_10m,weather_code';
  const ageDays = (Date.now() - at.getTime()) / 864e5;
  const u = ageDays < 85
    ? `${API}?latitude=${lat}&longitude=${lng}&timezone=Europe%2FBelgrade&past_days=92&forecast_days=1&hourly=${vars}&start_hour=${start}&end_hour=${end}`
    : `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&timezone=Europe%2FBelgrade&start_date=${start.slice(0, 10)}&end_date=${end.slice(0, 10)}&hourly=${vars}`;
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 7000);
  try {
    const r = await fetch(u, { signal: ctl.signal });
    if (!r.ok) return null;
    const d = await r.json(); const h = d.hourly; if (!h?.time?.length) return null;
    let i = h.time.indexOf(end); if (i < 0) i = h.time.length - 1;
    const j = h.time.indexOf(start);
    const p = h.surface_pressure[i], p0 = j >= 0 ? h.surface_pressure[j] : null;
    if (p == null) return null;
    return { wx_temp: h.temperature_2m[i], wx_pressure: Math.round(p * 10) / 10, wx_trend: p0 == null ? null : Math.round((p - p0) * 10) / 10,
      wx_wind: h.wind_speed_10m[i], wx_code: h.weather_code[i], moon: Math.round(moonPhase(at) * 1000) / 1000 };
  } catch (e) { return null; } finally { clearTimeout(to); }
}
