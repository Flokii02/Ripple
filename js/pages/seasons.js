import { t, lang } from '../i18n.js';
import { esc, icon } from '../ui.js';
import { SEASONS, BANNED, seasonName, inSeason, daysUntil, yearFrac, SOURCE_DATE } from '../seasons.js';

export async function render(el) {
  const now = new Date();
  const hu = lang() === 'hu';
  const months = [...Array(12)].map((_, i) => new Date(2025, i, 15).toLocaleDateString(hu ? 'hu-HU' : 'sr-Latn-RS', { month: 'short' }).replace('.', ''));
  const fmt = mmdd => { const [m, d] = mmdd.split('-').map(Number); return `${d}. ${months[m - 1]}`; };
  const active = SEASONS.filter(s => inSeason(s, now));
  const soon = SEASONS.filter(s => !inSeason(s, now) && daysUntil(s, now) !== null && daysUntil(s, now) <= 30);
  const todayX = yearFrac(`${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`) * 100;
  const bars = s => {
    if (!s.from) return '';
    const a = yearFrac(s.from) * 100, b = yearFrac(s.to) * 100 + 100 / 365;
    const seg = (l, r) => `<i style="left:${l.toFixed(2)}%;width:${(r - l).toFixed(2)}%"></i>`;
    return a <= b ? seg(a, b) : seg(a, 100) + seg(0, b);
  };
  const withSeason = SEASONS.filter(s => s.from);

  el.innerHTML = `
  <div class="page">
    <div class="page-head"><div><h1>${esc(t('seasons'))}</h1><p>${esc(t('seasons_sub'))}</p></div></div>

    <div class="season-today">
      <div class="card st-now">
        <h2>${icon('shield', 20)} ${esc(t('ss_now'))}</h2>
        ${active.length ? `<div class="chips">${active.map(s => `<span class="chip bad">${esc(seasonName(s))} · ${esc(t('until'))} ${esc(fmt(s.to))}</span>`).join('')}</div>`
          : `<p class="muted">${esc(t('ss_none'))}</p>`}
      </div>
      <div class="card">
        <h2>${esc(t('ss_soon'))}</h2>
        ${soon.length ? `<div class="chips">${soon.map(s => `<span class="chip warn">${esc(seasonName(s))} · ${esc(t('from'))} ${esc(fmt(s.from))}</span>`).join('')}</div>`
          : `<p class="muted">${esc(t('ss_none_soon'))}</p>`}
      </div>
    </div>

    <div class="section"><h2>${esc(t('ss_calendar'))}</h2>
      <div class="card season-cal">
        <div class="sc-row sc-head"><span></span><div class="sc-track">${months.map(m => `<b>${esc(m)}</b>`).join('')}<em class="sc-now" style="left:${todayX.toFixed(2)}%"><span>${esc(t('today'))}</span></em></div></div>
        ${withSeason.map(s => `<div class="sc-row ${inSeason(s, now) ? 'on' : ''}"><span>${esc(seasonName(s))}</span><div class="sc-track">${bars(s)}<em class="sc-now" style="left:${todayX.toFixed(2)}%"></em></div></div>`).join('')}
      </div>
    </div>

    <div class="section"><h2>${esc(t('ss_table'))}</h2>
      <div class="card"><div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>${esc(t('species'))}</th><th>${esc(t('ss_period'))}</th><th>${esc(t('ss_min'))}</th></tr></thead>
        <tbody>${SEASONS.map(s => `<tr class="${inSeason(s, now) ? 'on' : ''}"><td>${esc(seasonName(s))}</td><td>${s.from ? `${esc(fmt(s.from))} – ${esc(fmt(s.to))}` : '—'}</td><td>${s.min ? s.min + ' cm' : '—'}</td></tr>`).join('')}</tbody>
      </table></div></div>
    </div>

    <div class="section"><h2>${esc(t('ss_banned'))}</h2>
      <div class="card"><p class="small muted" style="margin-top:0">${esc(t('ss_banned_sub'))}</p>
        <div class="chips">${BANNED.map(b => `<span class="chip bad">${esc(seasonName(b))}${b.note ? ' · ' + esc(b.note[lang()] || b.note.sr) : ''}</span>`).join('')}</div>
      </div>
    </div>

    <div class="notice info" style="margin-top:20px">${icon('shield', 18)}<div>${esc(t('ss_note'))}<br><span class="small">${esc(t('ss_source'))} (${esc(SOURCE_DATE)})</span></div></div>
  </div>`;
}
