// Egy verseny nyilvános oldala: adatok, nevezés, résztvevők, élő eredmény, kivetítés (TV)
import { sb } from '../config.js';
import { t } from '../i18n.js';
import { $, $$, esc, icon, fmtDate, fmtMoney, toast, spinner, share, shareUrl, errText } from '../ui.js';
import { rankEntries, fmtKg } from '../compscore.js';

let timer = null;
const hm = d => { const x = new Date(d); return `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`; };

export async function loadBoard(id) {
  const { data, error } = await sb.rpc('comp_board', { p_comp: Number(id) });
  if (error) throw error;
  return data;
}

export function stageChip(stage) {
  const cls = { registration: 'ok', live: 'bad', finished: '', draw: 'warn', setup: '' }[stage] || '';
  return `<span class="chip ${cls} stage-${stage}">${stage === 'live' ? '<i class="live-dot"></i>' : ''}${esc(t('st_' + stage))}</span>`;
}

// Eredménytábla HTML (oldalon és TV-n is)
export function resultsHTML(b, opts = {}) {
  const c = b.competition;
  const { list, big } = rankEntries(b.entries, c);
  if (!list.length) return `<div class="empty small">${icon('trophy', 36)}<p>${esc(t('cr_none'))}</p></div>`;
  const sec = c.sectors > 1;
  const main = c.scoring === 'count' ? t('cr_fish') : c.scoring === 'biggest' ? t('cr_big') : t('cr_total');
  return `
    ${big && big.biggest > 0 ? `<div class="big-fish">${icon('fish', 22)}<div><small>${esc(t('cr_bigfish'))}</small><b>${esc(fmtKg(big.biggest))} kg</b> · ${esc(big.name)}${big.peg ? ` (#${big.peg})` : ''}</div></div>` : ''}
    <div class="res-table ${opts.tv ? 'tv' : ''} ${sec ? 'sec' : ''}" role="table">
      <div class="res-row head" role="row"><span>#</span><span>${esc(t('cr_peg'))}</span><span>${esc(c.team_mode ? t('cr_team') : t('cr_name'))}</span>${sec ? `<span title="${esc(t('cr_sector'))}">${esc(opts.tv ? t('cr_sector') : t('cr_sector_s'))}</span>` : ''}<span>${esc(t('cr_fish_s'))}</span><span class="main" title="${esc(main)}">${esc(opts.tv ? main : (c.scoring === 'count' ? t('cr_fish_s') : c.scoring === 'biggest' ? t('cr_big_s') : 'kg'))}</span></div>
      ${list.map(e => `<div class="res-row ${e.mine ? 'mine' : ''} ${e.place <= 3 && (e.total > 0 || e.fish > 0) ? 'p' + e.place : ''}" role="row">
        <span class="pl">${e.place}</span><span class="pg">${e.peg ?? '–'}</span>
        <span class="nm">${esc(e.name)}${e.team && !c.team_mode ? `<small>${esc(e.team)}</small>` : ''}</span>
        ${sec ? `<span>${e.sector ? String.fromCharCode(64 + e.sector) + ' · ' + e.sPlace + '.' : '–'}</span>` : ''}
        <span>${e.fish}</span>
        <span class="main">${c.scoring === 'count' ? e.fish : esc(fmtKg(c.scoring === 'biggest' ? e.biggest : e.total))}${c.scoring === 'count' ? '' : ' kg'}</span></div>`).join('')}
    </div>`;
}

export async function render(el, params, ctx) {
  clearInterval(timer);
  const id = params[0], tv = params[1] === 'tv';
  let b;
  try { b = await loadBoard(id); } catch (e) { b = null; }
  if (!b?.competition) { el.innerHTML = `<div class="page narrow"><div class="empty">${esc(t('not_found'))}</div></div>`; return; }
  if (tv) return renderTV(el, id, b);
  const c = b.competition;
  const manager = ctx.user && (ctx.isAdmin || c.organizer_id === ctx.user.id);
  let tab = ['live', 'finished'].includes(c.stage) ? 'res' : 'info';

  const draw = () => {
    const c = b.competition;
    const approved = b.entries.filter(e => e.status === 'approved');
    const mine = b.entries.find(e => e.mine);
    el.innerHTML = `
    <div class="page narrow comp-page">
      <a class="back" href="#/takmicenja">${icon('chevL', 18)}${esc(t('comp_title'))}</a>
      <div class="comp-hero">
        <div class="row" style="gap:8px;flex-wrap:wrap">${stageChip(c.stage)}${c.entry_fee ? `<span class="chip sand">${esc(fmtMoney(c.entry_fee))}</span>` : ''}</div>
        <h1>${esc(c.title)}</h1>
        <p class="muted">${icon('calendar', 16)} ${esc(fmtDate(c.date_start))}${c.date_end && c.date_end !== c.date_start ? ' – ' + esc(fmtDate(c.date_end)) : ''}
          ${c.place ? ` · ${esc(c.place)}` : ''} <span id="cLake"></span></p>
        <div class="row" style="gap:8px;flex-wrap:wrap">
          ${manager ? `<a class="btn lake" href="#/takmicenje/${c.id}/vodjenje">${icon('edit', 18)}${esc(t('cm_manage'))}</a>` : ''}
          <button class="btn ghost" id="cShare">${icon('share', 18)}${esc(t('share'))}</button>
          ${['live', 'finished'].includes(c.stage) ? `<a class="btn ghost" href="#/takmicenje/${c.id}/tv">${icon('chart', 18)}${esc(t('cm_tv'))}</a>` : ''}
        </div>
      </div>
      <div id="regBox"></div>
      <div class="tabs" role="group">
        <button data-tab="res" class="${tab === 'res' ? 'on' : ''}">${esc(t('cr_results'))}</button>
        <button data-tab="entries" class="${tab === 'entries' ? 'on' : ''}">${esc(t('cr_entries'))} (${approved.length})</button>
        <button data-tab="info" class="${tab === 'info' ? 'on' : ''}">${esc(t('cr_info'))}</button>
      </div>
      <div id="tabBody"></div>
    </div>`;
    if (c.lake_id) sb.from('lakes').select('name, slug').eq('id', c.lake_id).maybeSingle().then(({ data }) => { if (data && $('#cLake')) $('#cLake').innerHTML = `· <a href="#/jezero/${esc(data.slug)}">${esc(data.name)}</a>`; });
    // Nevezés
    const reg = $('#regBox');
    if (mine) {
      reg.innerHTML = `<div class="notice ${mine.status === 'approved' ? '' : 'info'} reg-mine"><div><b>${esc(t('reg_st_' + mine.status))}</b>
        ${mine.peg ? `<div>${esc(t('cr_peg'))}: <b class="peg-big">${mine.peg}</b>${mine.sector ? ` · ${esc(t('cr_sector'))} ${String.fromCharCode(64 + mine.sector)}` : ''}</div>` : ''}</div>
        ${c.stage === 'registration' ? `<button class="btn ghost sm" id="regCancel">${esc(t('reg_cancel'))}</button>` : ''}</div>`;
    } else if (c.stage === 'registration') {
      const full = c.max_entries && approved.length >= c.max_entries;
      reg.innerHTML = `<div class="card reg-card"><h2>${esc(t('reg_title'))}</h2>
        ${c.max_entries ? `<p class="small muted">${esc(t('reg_spots').replace('{n}', approved.length).replace('{max}', c.max_entries))}${full ? ' · ' + esc(t('reg_full')) : ''}</p>` : ''}
        ${ctx.user ? `
          <p class="small muted req-note"><b class="req">*</b> ${esc(t('required_note'))}</p>
          <label class="field"><span>${esc(t('cr_name'))} <b class="req">*</b></span><input id="rName" maxlength="80" value="${esc(ctx.profile?.display_name || '')}"></label>
          <label class="field"><span>${esc(c.team_mode ? t('cr_team') + ' *' : t('reg_team_opt'))}</span><input id="rTeam" maxlength="80"></label>
          <label class="field"><span>${esc(t('phone'))}</span><input id="rPhone" type="tel" maxlength="40" placeholder="06x…"><small class="muted">${esc(t('reg_phone_note'))}</small></label>
          <div class="err" id="rErr"></div>
          <button class="btn lake" id="rSend" style="width:100%">${esc(full ? t('reg_waitlist') : t('reg_send'))}</button>`
        : `<p>${esc(t('reg_login'))}</p><a class="btn lake" href="#/prijava" id="rLogin">${esc(t('login'))}</a>`}</div>`;
    }
    $('#rLogin')?.addEventListener('click', () => { try { sessionStorage.setItem('ripple_after_login', location.hash); } catch (e) {} });
    $('#rSend') && ($('#rSend').onclick = async () => {
      const name = $('#rName').value.trim(), team = $('#rTeam').value.trim();
      $$('.field.bad').forEach(f => f.classList.remove('bad'));
      if (name.length < 2 || (c.team_mode && team.length < 2)) {
        (name.length < 2 ? $('#rName') : $('#rTeam')).closest('.field').classList.add('bad');
        $('#rErr').textContent = t('err_required'); return;
      }
      $('#rSend').disabled = true;
      const { error } = await sb.from('comp_entries').insert({ competition_id: c.id, user_id: ctx.user.id, name, team: team || null, phone: $('#rPhone').value.trim() || null });
      if (error) { $('#rSend').disabled = false; $('#rErr').textContent = error.code === '23505' ? t('reg_already') : errText(error); return; }
      toast(t('reg_done')); refresh();
    });
    $('#regCancel') && ($('#regCancel').onclick = async () => {
      if (!confirm(t('reg_cancel_q'))) return;
      const { error } = await sb.from('comp_entries').update({ status: 'cancelled' }).eq('id', mine.id);
      if (error) { toast(errText(error), 'err'); return; }
      refresh();
    });
    $('#cShare').onclick = () => share({ title: c.title, text: `${c.title} – ${fmtDate(c.date_start)} | Ripple`, url: shareUrl('takmicenje=' + c.id) });
    $$('[data-tab]').forEach(x => x.onclick = () => { tab = x.dataset.tab; draw(); });
    const body = $('#tabBody');
    if (tab === 'res') {
      body.innerHTML = `${c.stage === 'live' ? `<p class="small muted live-note"><i class="live-dot"></i> ${esc(t('cr_live'))} · ${esc(t('cr_updated'))} ${hm(b.updated)}</p>` : ''}
        ${['live', 'finished'].includes(c.stage) ? resultsHTML(b) : `<div class="empty small">${icon('trophy', 36)}<p>${esc(t('cr_not_started'))}</p></div>`}`;
    } else if (tab === 'entries') {
      const shown = b.entries.filter(e => e.status !== 'cancelled');
      body.innerHTML = shown.length ? `<div class="entry-list">${shown.map(e => `<div class="entry-row ${e.mine ? 'mine' : ''}">
        <span class="pg">${e.peg ?? '–'}</span><span class="grow">${esc(e.name)}${e.team ? `<small>${esc(e.team)}</small>` : ''}</span>
        ${e.sector ? `<span class="chip">${esc(t('cr_sector'))} ${String.fromCharCode(64 + e.sector)}</span>` : ''}
        ${e.status !== 'approved' ? `<span class="chip warn">${esc(t('reg_st_' + e.status))}</span>` : ''}</div>`).join('')}</div>`
        : `<div class="empty small"><p>${esc(t('cr_no_entries'))}</p></div>`;
    } else {
      const sc = { weight: t('sc_weight'), biggest: t('sc_biggest'), count: t('sc_count') }[c.scoring];
      body.innerHTML = `<div class="card">
        <dl class="kv"><dt>${esc(t('cm_scoring'))}</dt><dd>${esc(sc)}</dd>
        ${c.sectors > 1 ? `<dt>${esc(t('cm_sectors'))}</dt><dd>${c.sectors}</dd>` : ''}
        ${c.max_entries ? `<dt>${esc(t('cm_max'))}</dt><dd>${c.max_entries}</dd>` : ''}
        ${c.min_cm ? `<dt>${esc(t('cm_min'))}</dt><dd>${c.min_cm} cm</dd>` : ''}
        ${c.entry_fee ? `<dt>${esc(t('entry_fee'))}</dt><dd>${esc(fmtMoney(c.entry_fee))}</dd>` : ''}
        ${c.contact ? `<dt>${esc(t('contact'))}</dt><dd>${esc(c.contact)}</dd>` : ''}</dl>
        ${c.description ? `<p style="white-space:pre-line;margin-top:12px">${esc(c.description)}</p>` : ''}</div>`;
    }
  };
  const refresh = async () => {
    try { b = await loadBoard(id); } catch (e) { return; }
    if (!document.body.contains(el) || !location.hash.startsWith('#/takmicenje/' + id)) { clearInterval(timer); return; }
    const y = window.scrollY; draw(); window.scrollTo(0, y);
  };
  draw();
  // Élő frissítés verseny közben (csak ha az oldal látszik és nincs nyitva űrlap)
  if (c.stage === 'live') timer = setInterval(() => {
    if (!location.hash.startsWith('#/takmicenje/' + id)) { clearInterval(timer); return; }
    if (document.visibilityState === 'visible' && !document.activeElement?.matches('input,textarea,select')) refresh();
  }, 20000);
}

function renderTV(el, id, b) {
  document.body.classList.add('tv-mode');
  const draw = () => {
    const c = b.competition;
    el.innerHTML = `<div class="tv-wrap">
      <div class="tv-head"><div><h1>${esc(c.title)}</h1><p>${stageChip(c.stage)} · ${esc(t('cr_updated'))} ${hm(b.updated)}</p></div>
        <a class="btn ghost sm tv-exit" href="#/takmicenje/${c.id}">${esc(t('close'))}</a></div>
      ${resultsHTML(b, { tv: true })}
      <div class="tv-foot">Ripple · ${esc(location.host + location.pathname)}#/takmicenje/${c.id}</div></div>`;
  };
  draw();
  timer = setInterval(async () => {
    if (!location.hash.endsWith('/tv')) { clearInterval(timer); document.body.classList.remove('tv-mode'); return; }
    try { b = await loadBoard(id); draw(); } catch (e) {}
  }, 15000);
  window.addEventListener('hashchange', () => { if (!location.hash.endsWith('/tv')) document.body.classList.remove('tv-mode'); }, { once: true });
}
