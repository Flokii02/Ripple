// Túratervező: melyik nap, mikor menjek, tilalom alatt van-e, mit vigyek
import { t, speciesName } from './i18n.js';
import { $, $$, esc, icon, openModal, fmtMoney, share, shareUrl, spinner } from './ui.js';
import { lakeWeather, wxInfo, wxIcon, dayName } from './weather.js';
import { forecast, BITE_SPECIES } from './bite.js';
import { catchWarning } from './seasons.js';

const hm = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export async function openTripPlanner(lake) {
  const body = openModal(t('trip_plan'), spinner());
  let w;
  try { w = await lakeWeather(lake.lat, lake.lng); }
  catch (e) { body.innerHTML = `<p class="muted">${esc(t('wx_err'))}</p>`; return; }
  const days = w.daily.slice(0, 5);
  let spKey = 'general'; try { spKey = localStorage.getItem('ripple_bite_sp') || 'general'; } catch (e) {}
  if (!BITE_SPECIES[spKey]) spKey = 'general';
  let di = 0;
  let checked = new Set();
  try { checked = new Set(JSON.parse(localStorage.getItem('ripple_trip_check') || '[]')); } catch (e) {}
  const items = t('trip_items').split('|');

  const draw = () => {
    const d = days[di];
    const [y, m, dd] = d.day.split('-').map(Number);
    const from = new Date(y, m - 1, dd, 0, 0), to = new Date(y, m - 1, dd, 23, 59);
    const fc = forecast(w, lake.lat, lake.lng, spKey, { from, to });
    const wins = fc.best;
    const noon = new Date(y, m - 1, dd, 12).toISOString();
    // Tilalom: a választott hal, vagy „általános” esetén a tó halai közül, amelyek tilalom alatt vannak
    const check = spKey === 'general' ? (lake.species || []) : [spKey];
    const closed = check.filter(k => ['banned', 'season'].includes(catchWarning(k, noon, '')));
    const info = wxInfo(d.code);
    const label = i => i === 0 ? t('today') : i === 1 ? t('tomorrow') : dayName(days[i].day);
    body.innerHTML = `
      <div class="field"><span>${esc(t('trip_date'))}</span><div class="trip-days">${days.map((x, i) => `<button type="button" data-d="${i}" class="${i === di ? 'on' : ''}">${esc(label(i))}<br><small>${x.day.slice(8, 10)}.${x.day.slice(5, 7)}.</small></button>`).join('')}</div></div>
      <label class="field"><span>${esc(t('trip_species'))}</span><select id="tpSp">${Object.keys(BITE_SPECIES).map(k => `<option value="${k}" ${k === spKey ? 'selected' : ''}>${esc(k === 'general' ? t('sp_general') : speciesName(k))}</option>`).join('')}</select></label>
      <div class="card" style="display:flex;gap:12px;align-items:center;margin-bottom:14px">${wxIcon(info.icon, 36)}
        <div class="grow"><b>${Math.round(d.min)}° / ${Math.round(d.max)}°</b> · ${esc(info.text)}
        <div class="small muted">${icon('wind', 14)} ${Math.round(d.wind)} km/h · ${esc(t('wx_rain'))} ${d.rain ?? 0}% · ${icon('sunrise', 14)} ${d.sunrise.slice(11, 16)}–${d.sunset.slice(11, 16)}</div></div></div>
      <h3 style="font-size:16px;margin-bottom:8px">${esc(t('trip_best'))}</h3>
      ${wins.length ? wins.map(b => `<div class="trip-win"><b>${hm(b.from)}–${hm(b.to)}</b><span class="small">${b.reasons.filter(r => ['dawn', 'major', 'minor', 'p_fall', 'temp_good', 'night'].includes(r)).slice(0, 2).map(r => esc(t('r_' + r))).join(' · ')}</span><em>${b.score}%</em></div>`).join('')
        : `<p class="small muted">${esc(t('trip_none'))}</p>`}
      <div class="notice ${closed.length ? '' : 'info'}" style="margin:12px 0">${closed.length ? `<b>${esc(t('trip_closed'))}</b> ${closed.map(k => esc(speciesName(k))).join(', ')}` : esc(t('trip_season_ok'))} <a href="#/lovostaj">${esc(t('ss_all'))}</a></div>
      ${lake.price_day || lake.opening ? `<div class="small" style="margin-bottom:12px">${lake.price_day ? `<b>${esc(t('trip_price'))}:</b> ${esc(fmtMoney(lake.price_day))}${lake.price_night ? ' / ' + esc(fmtMoney(lake.price_night)) : ''}` : ''}${lake.opening ? `<div class="muted">${esc(lake.opening)}</div>` : ''}</div>` : ''}
      <h3 style="font-size:16px;margin-bottom:6px">${esc(t('trip_checklist'))}</h3>
      <ul class="trip-check">${items.map((it, i) => `<li><label><input type="checkbox" data-ci="${i}" ${checked.has(i) ? 'checked' : ''}><span>${esc(it)}</span></label></li>`).join('')}</ul>
      <div class="row" style="margin-top:14px">
        ${lake.phone ? `<a class="btn ghost" href="tel:${esc(lake.phone.replace(/[^+\d]/g, ''))}">${icon('phone', 18)}${esc(t('call'))}</a>` : ''}
        <button class="btn lake grow" id="tpShare">${icon('share', 18)}${esc(t('trip_share'))}</button></div>`;
    $$('[data-d]', body).forEach(b => b.onclick = () => { di = Number(b.dataset.d); draw(); });
    $('#tpSp', body).onchange = e => { spKey = e.target.value; try { localStorage.setItem('ripple_bite_sp', spKey); } catch (er) {} draw(); };
    $$('[data-ci]', body).forEach(c => c.onchange = () => {
      const i = Number(c.dataset.ci); c.checked ? checked.add(i) : checked.delete(i);
      try { localStorage.setItem('ripple_trip_check', JSON.stringify([...checked])); } catch (e) {}
    });
    $('#tpShare', body).onclick = () => {
      const title = t('trip_title').replace('{lake}', lake.name).replace('{day}', `${label(di)} ${d.day.slice(8, 10)}.${d.day.slice(5, 7)}.`);
      const text = `${title}\n${Math.round(d.min)}°/${Math.round(d.max)}° · ${info.text}${wins.length ? '\n' + t('trip_best') + ': ' + wins.map(b => `${hm(b.from)}–${hm(b.to)}`).join(', ') : ''}`;
      share({ title, text, url: shareUrl('jezero=' + encodeURIComponent(lake.slug)) });
    };
  };
  draw();
}
