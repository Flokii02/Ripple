// Versenyszervező felület: beállítások, nevezések, sorsolás, mérlegelés (net nélkül is), lezárás
import { sb } from '../config.js';
import { t, SPECIES, speciesName } from '../i18n.js';
import { $, $$, esc, icon, fmtDate, toast, spinner, openModal, closeModal, errText } from '../ui.js';
import { rankEntries, fmtKg } from '../compscore.js';
import { loadBoard, stageChip, resultsHTML } from './comp.js';

const STAGES = ['setup', 'registration', 'draw', 'live', 'finished'];
const QKEY = 'ripple_weigh_queue';
const secL = n => n ? String.fromCharCode(64 + n) : '';
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => { const r = Math.random() * 16 | 0; return (ch === 'x' ? r : (r & 3 | 8)).toString(16); }));

// --- Net nélküli mérlegelés: a beírt súly a telefonon marad, amíg fel nem töltődik ---
function queue() { try { return JSON.parse(localStorage.getItem(QKEY) || '[]'); } catch (e) { return []; } }
function setQueue(q) { try { localStorage.setItem(QKEY, JSON.stringify(q)); } catch (e) {} }
const netErr = e => !navigator.onLine || e instanceof TypeError || /fetch|network|Load failed/i.test(String(e?.message || ''));
async function flushWeigh() {
  let q = queue(); if (!q.length || !navigator.onLine) return 0;
  let n = 0;
  for (const w of q.slice()) {
    const { error } = await sb.from('comp_weighins').insert(w);
    if (error && netErr(error)) break;
    if (error && error.code !== '23505') console.error(error); // 23505: már fent van
    q = q.filter(x => x.client_id !== w.client_id); setQueue(q); n++;
  }
  return n;
}

export async function render(el, params, ctx) {
  const id = Number(params[0]);
  if (!ctx.user) { el.innerHTML = `<div class="page narrow"><div class="empty"><p>${esc(t('need_login'))}</p><a class="btn lake" href="#/prijava">${esc(t('login'))}</a></div></div>`; return; }
  const { data: c0 } = await sb.from('competitions').select('*').eq('id', id).maybeSingle();
  if (!c0 || !(ctx.isAdmin || c0.organizer_id === ctx.user.id)) { el.innerHTML = `<div class="page narrow"><div class="empty">${esc(t('not_found'))}</div></div>`; return; }
  let c = c0, entries = [], weighins = [];
  let tab = { setup: 'settings', registration: 'entries', draw: 'draw', live: 'weigh', finished: 'results' }[c.stage] || 'settings';
  await flushWeigh();

  const load = async () => {
    const [a, b2, w] = await Promise.all([
      sb.from('competitions').select('*').eq('id', id).single(),
      sb.from('comp_entries').select('*').eq('competition_id', id).order('created_at'),
      sb.from('comp_weighins').select('*').eq('competition_id', id).order('created_at', { ascending: false })
    ]);
    if (a.data) c = a.data;
    entries = b2.data || []; weighins = w.data || [];
    // Még fel nem töltött mérések is számítsanak
    queue().filter(x => x.competition_id === id).forEach(x => weighins.unshift({ ...x, pending: true, created_at: x.at }));
  };
  const totals = () => {
    const m = {};
    weighins.forEach(w => { const x = (m[w.entry_id] ||= { total: 0, fish: 0, biggest: 0, n: 0 }); x.total += +w.weight_kg; x.fish += +w.fish_count; x.biggest = Math.max(x.biggest, +w.weight_kg); x.n++; });
    return m;
  };

  const draw = () => {
    const active = entries.filter(e => e.status === 'approved');
    const cnt = s => entries.filter(e => e.status === s).length;
    const qn = queue().filter(x => x.competition_id === id).length;
    el.innerHTML = `
    <div class="page narrow cm-page">
      <a class="back" href="#/takmicenje/${id}">${icon('chevL', 18)}${esc(t('cm_public'))}</a>
      <div class="page-head" style="margin-bottom:8px"><div><h1>${esc(c.title)}</h1><p>${esc(fmtDate(c.date_start))} · ${stageChip(c.stage)}${c.status !== 'approved' ? ` <span class="chip warn">${esc(t(c.status))}</span>` : ''}</p></div></div>
      ${c.status !== 'approved' ? `<div class="notice info">${esc(t('cm_pending_note'))}</div>` : ''}
      ${qn ? `<div class="notice info">${icon('cloud', 16)} ${esc(t('cm_queue').replace('{n}', qn))}</div>` : ''}
      <div class="stage-steps">${STAGES.map((s, i) => `<button data-stage="${s}" class="${s === c.stage ? 'on' : STAGES.indexOf(c.stage) > i ? 'done' : ''}" ${s === 'registration' && c.status !== 'approved' ? 'disabled' : ''}><b>${i + 1}</b><span>${esc(t('st_' + s))}</span></button>`).join('')}</div>
      <div class="tabs cm-tabs" role="group">
        ${[['settings', t('cm_t_settings')], ['entries', `${t('cr_entries')} (${active.length})`], ['draw', t('cm_t_draw')], ['weigh', t('cm_t_weigh')], ['results', t('cr_results')]]
          .map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${esc(l)}</button>`).join('')}
      </div>
      <div id="cmBody"></div>
    </div>`;
    $$('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; draw(); });
    $$('[data-stage]').forEach(b => b.onclick = () => setStage(b.dataset.stage));
    const body = $('#cmBody');
    ({ settings, entries: entriesTab, draw: drawTab, weigh: weighTab, results: resultsTab })[tab](body, { active, cnt });
  };

  const setStage = async s => {
    if (s === c.stage) return;
    if (s === 'live' && !entries.some(e => e.status === 'approved' && e.peg) && !confirm(t('cm_no_pegs_q'))) return;
    if (s === 'finished' && !confirm(t('cm_finish_q'))) return;
    const { error } = await sb.from('competitions').update({ stage: s }).eq('id', id);
    if (error) { toast(errText(error), 'err'); return; }
    c.stage = s; tab = { setup: 'settings', registration: 'entries', draw: 'draw', live: 'weigh', finished: 'results' }[s];
    toast(t('st_' + s)); draw();
  };

  // 1. Beállítások
  function settings(body) {
    body.innerHTML = `<div class="card">
      <label class="field"><span>${esc(t('cm_scoring'))}</span><select id="sScore">
        ${['weight', 'biggest', 'count'].map(k => `<option value="${k}" ${c.scoring === k ? 'selected' : ''}>${esc(t('sc_' + k))}</option>`).join('')}</select>
        <small class="muted">${esc(t('cm_scoring_note'))}</small></label>
      <div class="grid2">
        <label class="field"><span>${esc(t('cm_sectors'))}</span><input id="sSec" type="number" min="1" max="12" inputmode="numeric" value="${c.sectors}"></label>
        <label class="field"><span>${esc(t('cm_max'))}</span><input id="sMax" type="number" min="2" max="500" inputmode="numeric" value="${c.max_entries ?? ''}" placeholder="∞"></label>
      </div>
      <label class="field"><span>${esc(t('cm_min'))}</span><input id="sMin" type="number" min="0" max="200" inputmode="numeric" value="${c.min_cm ?? ''}"></label>
      <label class="check"><input type="checkbox" id="sAuto" ${c.auto_approve ? 'checked' : ''}>${esc(t('cm_auto'))}</label>
      <label class="check"><input type="checkbox" id="sTeam" ${c.team_mode ? 'checked' : ''}>${esc(t('cm_team'))}</label>
      <div class="err" id="sErr"></div>
      <button class="btn lake" id="sSave" style="width:100%;margin-top:8px">${esc(t('save'))}</button></div>
      <p class="small muted" style="margin-top:12px">${esc(t('cm_settings_note'))}</p>`;
    $('#sSave').onclick = async () => {
      const sec = Math.min(12, Math.max(1, parseInt($('#sSec').value, 10) || 1));
      const mx = $('#sMax').value.trim() === '' ? null : Math.min(500, Math.max(2, parseInt($('#sMax').value, 10) || 2));
      const mn = $('#sMin').value.trim() === '' ? null : Math.max(0, parseInt($('#sMin').value, 10) || 0);
      const { error } = await sb.from('competitions').update({ scoring: $('#sScore').value, sectors: sec, max_entries: mx, min_cm: mn || null, auto_approve: $('#sAuto').checked, team_mode: $('#sTeam').checked }).eq('id', id);
      if (error) { $('#sErr').textContent = errText(error); return; }
      await load(); toast(t('saved')); draw();
    };
  }

  // 2. Nevezések
  function entriesTab(body, { cnt }) {
    const paid = entries.filter(e => e.status === 'approved' && e.paid).length;
    const list = entries.filter(e => e.status !== 'cancelled');
    body.innerHTML = `
      <div class="cm-stats"><span><b>${cnt('approved')}</b>${esc(t('reg_st_approved'))}</span><span><b>${cnt('pending')}</b>${esc(t('reg_st_pending'))}</span><span><b>${cnt('waitlist')}</b>${esc(t('reg_st_waitlist'))}</span><span><b>${paid}</b>${esc(t('cm_paid'))}</span></div>
      ${c.stage === 'setup' && c.status === 'approved' ? `<div class="notice info">${esc(t('cm_open_hint'))}</div>` : ''}
      <button class="btn lake" id="eAdd" style="margin:8px 0 12px">${icon('plus', 18)}${esc(t('cm_add_entry'))}</button>
      ${list.length ? `<div class="cm-entries">${list.map(e => `
        <div class="cm-entry st-${e.status}">
          <div class="row" style="align-items:flex-start;gap:10px"><span class="pg">${e.peg ?? '–'}</span>
            <div class="grow"><b>${esc(e.name)}</b>${e.team ? ` <span class="muted">· ${esc(e.team)}</span>` : ''}
              <div class="small muted">${e.phone ? `<a href="tel:${esc(e.phone.replace(/[^+\d]/g, ''))}">${icon('phone', 13)} ${esc(e.phone)}</a>` : ''}${e.user_id ? '' : ` ${esc(t('cm_manual'))}`}</div></div>
            <button class="icon-btn" data-del="${e.id}" aria-label="${esc(t('delete'))}">${icon('trash', 17)}</button></div>
          <div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap">
            <select data-st="${e.id}" class="sm-select">${['approved', 'pending', 'waitlist', 'cancelled'].map(s => `<option value="${s}" ${e.status === s ? 'selected' : ''}>${esc(t('reg_st_' + s))}</option>`).join('')}</select>
            <label class="check sm"><input type="checkbox" data-paid="${e.id}" ${e.paid ? 'checked' : ''}>${esc(t('cm_paid1'))}</label>
          </div></div>`).join('')}</div>` : `<div class="empty small"><p>${esc(t('cr_no_entries'))}</p></div>`}`;
    const upd = async (eid, patch) => { const { error } = await sb.from('comp_entries').update(patch).eq('id', eid); if (error) toast(errText(error), 'err'); await load(); draw(); };
    $$('[data-st]').forEach(s => s.onchange = () => upd(s.dataset.st, { status: s.value }));
    $$('[data-paid]').forEach(s => s.onchange = () => upd(s.dataset.paid, { paid: s.checked }));
    $$('[data-del]').forEach(b => b.onclick = async () => {
      if (!confirm(t('cm_del_q'))) return;
      const { error } = await sb.from('comp_entries').delete().eq('id', b.dataset.del);
      if (error) toast(errText(error), 'err'); await load(); draw();
    });
    $('#eAdd').onclick = () => {
      const m = openModal(t('cm_add_entry'), `
        <label class="field"><span>${esc(t('cr_name'))} <b class="req">*</b></span><input id="mName" maxlength="80"></label>
        <label class="field"><span>${esc(t('cr_team'))}</span><input id="mTeam" maxlength="80"></label>
        <label class="field"><span>${esc(t('phone'))}</span><input id="mPhone" type="tel" maxlength="40"></label>
        <label class="check"><input type="checkbox" id="mPaid">${esc(t('cm_paid1'))}</label>
        <div class="err" id="mErr"></div>
        <div class="row"><button class="btn ghost" id="mCancel">${esc(t('cancel'))}</button><button class="btn lake grow" id="mSave">${esc(t('save'))}</button></div>`);
      $('#mCancel', m).onclick = closeModal;
      $('#mName', m).focus();
      $('#mSave', m).onclick = async () => {
        const name = $('#mName', m).value.trim();
        if (name.length < 2) { $('#mName', m).closest('.field').classList.add('bad'); $('#mErr', m).textContent = t('err_required'); return; }
        const { error } = await sb.from('comp_entries').insert({ competition_id: id, name, team: $('#mTeam', m).value.trim() || null, phone: $('#mPhone', m).value.trim() || null, status: 'approved', paid: $('#mPaid', m).checked });
        if (error) { $('#mErr', m).textContent = errText(error); return; }
        closeModal(); await load(); draw();
      };
    };
  }

  // 3. Sorsolás (žreb)
  function drawTab(body, { active }) {
    const n = active.length;
    let pegsText = ''; try { pegsText = localStorage.getItem('ripple_pegs_' + id) || ''; } catch (e) {}
    const sorted = active.slice().sort((a, b) => (a.peg ?? 999) - (b.peg ?? 999) || a.name.localeCompare(b.name));
    body.innerHTML = `
      <div class="card">
        <label class="field"><span>${esc(t('cm_pegs'))}</span><input id="dPegs" value="${esc(pegsText || (n ? `1-${n}` : ''))}" placeholder="1-30 / 2,4,6,8">
          <small class="muted">${esc(t('cm_pegs_note'))}</small></label>
        ${c.sectors > 1 ? `<p class="small muted">${esc(t('cm_sector_note').replace('{n}', c.sectors))}</p>` : ''}
        <div class="err" id="dErr"></div>
        <button class="btn lake" id="dGo" style="width:100%" ${n ? '' : 'disabled'}>${icon('star', 18)}${esc(t('cm_draw_btn'))} (${n})</button>
      </div>
      <div class="row" style="justify-content:space-between;margin:16px 0 8px"><h2 style="margin:0">${esc(t('cm_peglist'))}</h2><button class="btn ghost sm" id="dPrint">${esc(t('cm_print'))}</button></div>
      <div class="entry-list print-area">${sorted.map(e => `<div class="entry-row">
        <input class="peg-in" type="number" min="1" max="999" inputmode="numeric" data-peg="${e.id}" value="${e.peg ?? ''}" aria-label="${esc(t('cr_peg'))}">
        <span class="grow">${esc(e.name)}${e.team ? `<small>${esc(e.team)}</small>` : ''}</span>
        ${c.sectors > 1 ? `<select data-sec="${e.id}" class="sm-select">${['', ...Array.from({ length: c.sectors }, (_, i) => i + 1)].map(s => `<option value="${s}" ${(e.sector ?? '') === s ? 'selected' : ''}>${s ? t('cr_sector') + ' ' + secL(s) : '–'}</option>`).join('')}</select>` : ''}
      </div>`).join('') || `<div class="empty small"><p>${esc(t('cr_no_entries'))}</p></div>`}</div>`;
    const parsePegs = s => {
      const out = [];
      s.split(/[,;\s]+/).filter(Boolean).forEach(p => {
        const m = p.match(/^(\d+)-(\d+)$/);
        if (m) { const a = +m[1], b = +m[2]; for (let i = Math.min(a, b); i <= Math.max(a, b) && out.length < 1000; i++) out.push(i); }
        else if (/^\d+$/.test(p)) out.push(+p);
      });
      return [...new Set(out)];
    };
    $('#dGo').onclick = async () => {
      const pegs = parsePegs($('#dPegs').value).sort((a, b) => a - b);
      if (pegs.length < n) { $('#dErr').textContent = t('cm_pegs_few').replace('{n}', n); return; }
      if (active.some(e => e.peg) && !confirm(t('cm_redraw_q'))) return;
      try { localStorage.setItem('ripple_pegs_' + id, $('#dPegs').value); } catch (e) {}
      // A helyek sorban szektorokra oszlanak; minden szektorba egyenlő számú versenyző kerül,
      // a szektoron belül véletlen helyre, és a versenyzők sorrendje is véletlen (Fisher–Yates)
      const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
      const S = Math.min(c.sectors || 1, n);
      const per = Math.ceil(pegs.length / S);
      const groups = Array.from({ length: S }, (_, k) => pegs.slice(k * per, (k + 1) * per));
      const chosen = [];
      groups.forEach((g, k) => {
        const quota = Math.floor(n / S) + (k < n % S ? 1 : 0);
        shuffle(g.slice()).slice(0, quota).forEach(p => chosen.push({ peg: p, sector: S > 1 ? k + 1 : null }));
      });
      if (chosen.length < n) { $('#dErr').textContent = t('cm_pegs_few').replace('{n}', n); return; }
      const people = shuffle(active.slice());
      $('#dGo').disabled = true;
      const res = await Promise.all(people.map((e, i) => sb.from('comp_entries').update(chosen[i]).eq('id', e.id)));
      const err = res.find(r => r.error);
      if (err) toast(errText(err.error), 'err'); else toast(t('cm_drawn'));
      await load(); draw();
    };
    $$('[data-peg]').forEach(inp => inp.onchange = async () => {
      const v = inp.value.trim() === '' ? null : parseInt(inp.value, 10);
      if (v != null && active.some(e => e.peg === v && String(e.id) !== inp.dataset.peg)) { toast(t('cm_peg_taken').replace('{n}', v), 'err'); inp.value = ''; return; }
      const { error } = await sb.from('comp_entries').update({ peg: v }).eq('id', inp.dataset.peg);
      if (error) toast(errText(error), 'err');
      const e = entries.find(x => String(x.id) === inp.dataset.peg); if (e) e.peg = v;
    });
    $$('[data-sec]').forEach(s => s.onchange = async () => {
      const { error } = await sb.from('comp_entries').update({ sector: s.value ? Number(s.value) : null }).eq('id', s.dataset.sec);
      if (error) toast(errText(error), 'err');
      const e = entries.find(x => String(x.id) === s.dataset.sec); if (e) e.sector = s.value ? Number(s.value) : null;
    });
    $('#dPrint').onclick = () => window.print();
  }

  // 4. Mérlegelés
  function weighTab(body, { active }) {
    const tot = totals();
    const sorted = active.slice().sort((a, b) => (a.peg ?? 999) - (b.peg ?? 999) || a.name.localeCompare(b.name));
    const byId = Object.fromEntries(entries.map(e => [e.id, e]));
    body.innerHTML = `
      ${c.stage !== 'live' ? `<div class="notice info">${esc(t('cm_weigh_hint'))}</div>` : ''}
      <input id="wSearch" class="search-in" type="search" placeholder="${esc(t('cm_weigh_search'))}" autocomplete="off">
      <div class="weigh-grid">${sorted.map(e => { const x = tot[e.id]; return `
        <button class="weigh-btn" data-w="${e.id}" data-q="${esc((e.name + ' ' + (e.team || '') + ' ' + (e.peg ?? '')).toLowerCase())}">
          <span class="pg">${e.peg ?? '–'}</span><span class="nm">${esc(e.name)}</span>
          <span class="tt">${x ? (c.scoring === 'count' ? x.fish + ' ' + t('cr_fish_s').toLowerCase() : fmtKg(x.total) + ' kg') : '—'}</span></button>`; }).join('') || `<div class="empty small"><p>${esc(t('cr_no_entries'))}</p></div>`}</div>
      <h2 style="margin-top:20px">${esc(t('cm_recent'))}</h2>
      <div class="entry-list">${weighins.slice(0, 25).map(w => { const e = byId[w.entry_id]; return `<div class="entry-row">
        <span class="pg">${e?.peg ?? '–'}</span><span class="grow">${esc(e?.name || '?')}<small>${new Date(w.created_at).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}${w.species ? ' · ' + esc(speciesName(w.species)) : ''}${w.fish_count !== 1 ? ' · ' + w.fish_count + ' ' + esc(t('cr_fish_s').toLowerCase()) : ''}${w.pending ? ' · ' + esc(t('cm_wait_net')) : ''}</small></span>
        <b>${esc(fmtKg(w.weight_kg))} kg</b>
        ${w.pending ? '' : `<button class="icon-btn" data-wdel="${w.id}" aria-label="${esc(t('delete'))}">${icon('trash', 16)}</button>`}</div>`; }).join('') || `<p class="small muted">${esc(t('cm_no_weigh'))}</p>`}</div>`;
    $('#wSearch').oninput = e => { const q = e.target.value.trim().toLowerCase(); $$('.weigh-btn').forEach(b => { b.hidden = q && !b.dataset.q.includes(q); }); };
    $$('[data-w]').forEach(b => b.onclick = () => weighForm(entries.find(e => String(e.id) === b.dataset.w)));
    $$('[data-wdel]').forEach(b => b.onclick = async () => {
      if (!confirm(t('cm_wdel_q'))) return;
      const { error } = await sb.from('comp_weighins').delete().eq('id', b.dataset.wdel);
      if (error) toast(errText(error), 'err'); await load(); draw();
    });
  }

  function weighForm(e) {
    let lastSp = ''; try { lastSp = localStorage.getItem('ripple_weigh_sp') || ''; } catch (er) {}
    const m = openModal(`#${e.peg ?? '–'} · ${e.name}`, `
      <label class="field"><span>${esc(t('cm_weight'))} <b class="req">*</b></span>
        <input id="wKg" class="weigh-in" type="text" inputmode="decimal" autocomplete="off" placeholder="0,000"></label>
      <div class="grid2">
        <label class="field"><span>${esc(t('cm_count'))}</span><input id="wN" type="number" min="0" max="999" inputmode="numeric" value="1"></label>
        <label class="field"><span>${esc(t('species'))}</span><select id="wSp"><option value="">–</option>${SPECIES.map(s => `<option value="${s.key}" ${lastSp === s.key ? 'selected' : ''}>${esc(speciesName(s.key))}</option>`).join('')}</select></label>
      </div>
      <p class="small muted">${esc(c.scoring === 'count' ? t('cm_count_note') : t('cm_weight_note'))}</p>
      <div class="err" id="wErr"></div>
      <div class="row"><button class="btn ghost" id="wCancel">${esc(t('cancel'))}</button><button class="btn lake grow" id="wSave">${esc(t('save'))}</button></div>`);
    setTimeout(() => $('#wKg', m)?.focus(), 50);
    $('#wCancel', m).onclick = closeModal;
    const save = async () => {
      const raw = $('#wKg', m).value.trim().replace(',', '.');
      const kg = Number(raw), n = parseInt($('#wN', m).value, 10);
      if (raw === '' || !isFinite(kg) || kg < 0 || kg > 500) { $('#wKg', m).closest('.field').classList.add('bad'); $('#wErr', m).textContent = t('cm_bad_weight'); return; }
      if (kg > 60 && !confirm(t('cm_big_q').replace('{kg}', fmtKg(kg)))) return;
      const sp = $('#wSp', m).value;
      try { localStorage.setItem('ripple_weigh_sp', sp); } catch (er) {}
      const row = { competition_id: id, entry_id: e.id, weight_kg: Math.round(kg * 1000) / 1000, fish_count: isFinite(n) && n >= 0 ? n : 1, species: sp || null, client_id: uuid() };
      $('#wSave', m).disabled = true;
      let offline = !navigator.onLine;
      if (!offline) {
        const { error } = await sb.from('comp_weighins').insert(row);
        if (error) { if (netErr(error)) offline = true; else { $('#wErr', m).textContent = errText(error); $('#wSave', m).disabled = false; return; } }
      }
      if (offline) { setQueue([...queue(), { ...row, at: new Date().toISOString() }]); toast(t('offline_saved')); }
      else toast(`${e.name}: ${fmtKg(row.weight_kg)} kg ✓`);
      closeModal(); await load().catch(() => {}); draw();
    };
    $('#wSave', m).onclick = save;
    $('#wKg', m).onkeydown = ev => { if (ev.key === 'Enter') save(); };
  }

  // 5. Eredmény
  async function resultsTab(body) {
    body.innerHTML = spinner();
    let b; try { b = await loadBoard(id); } catch (er) { body.innerHTML = esc(t('error')); return; }
    const { list } = rankEntries(b.entries, b.competition);
    body.innerHTML = `
      <div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:12px">
        <a class="btn ghost" href="#/takmicenje/${id}/tv">${icon('chart', 18)}${esc(t('cm_tv'))}</a>
        <button class="btn ghost" id="rImg" ${list.length ? '' : 'disabled'}>${icon('share', 18)}${esc(t('cm_podium_img'))}</button>
        <button class="btn ghost" id="rPrint">${esc(t('cm_print'))}</button></div>
      <div class="print-area">${resultsHTML(b)}</div>`;
    $('#rPrint').onclick = () => window.print();
    $('#rImg').onclick = () => podiumImage(b);
  }

  window.addEventListener('online', async () => { if (await flushWeigh()) { await load(); if (location.hash.endsWith('/vodjenje')) draw(); } }, { once: true });
  await load();
  draw();
}

// Dobogó-kép (1080×1350) megosztáshoz
async function podiumImage(b) {
  const c = b.competition;
  const { list, big } = rankEntries(b.entries, c);
  const W = 1080, H = 1350;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  try { await document.fonts?.ready; } catch (e) {}
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0E2A3B'); bg.addColorStop(1, '#1F5A6B');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.fillStyle = '#E2A73E'; g.font = '700 40px Outfit, system-ui, sans-serif'; g.fillText(t('cm_results_img').toUpperCase(), 70, 110);
  g.fillStyle = '#fff'; let fs = 76; do { g.font = `700 ${fs}px Outfit, system-ui, sans-serif`; fs -= 4; } while (g.measureText(c.title).width > W - 140 && fs > 36);
  g.fillText(c.title, 70, 200);
  g.font = '500 36px Inter, system-ui, sans-serif'; g.fillStyle = 'rgba(255,255,255,.75)'; g.fillText(fmtDate(c.date_start) + (c.place ? ' · ' + c.place : ''), 70, 255);
  // Dobogó
  const top = list.slice(0, 3);
  const cols = [{ i: 1, x: 120, h: 300, col: '#B9C6CC' }, { i: 0, x: 400, h: 400, col: '#E2A73E' }, { i: 2, x: 680, h: 230, col: '#C98B57' }];
  const base = 1010;
  cols.forEach(({ i, x, h, col }) => {
    const e = top[i]; if (!e) return;
    g.fillStyle = col; g.fillRect(x, base - h, 280, h);
    g.fillStyle = '#0E2A3B'; g.font = '700 110px Outfit, system-ui, sans-serif'; const s = String(e.place); g.fillText(s, x + 140 - g.measureText(s).width / 2, base - h + 130);
    g.fillStyle = '#fff'; let f = 40; do { g.font = `700 ${f}px Outfit, system-ui, sans-serif`; f -= 2; } while (g.measureText(e.name).width > 300 && f > 20);
    g.fillText(e.name, x + 140 - g.measureText(e.name).width / 2, base - h - 70);
    const v = c.scoring === 'count' ? `${e.fish}` : `${fmtKg(c.scoring === 'biggest' ? e.biggest : e.total)} kg`;
    g.font = '600 34px Inter, system-ui, sans-serif'; g.fillStyle = '#E2A73E'; g.fillText(v, x + 140 - g.measureText(v).width / 2, base - h - 22);
  });
  if (big && big.biggest > 0) {
    g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(70, 1060, W - 140, 110);
    g.fillStyle = '#fff'; g.font = '600 38px Inter, system-ui, sans-serif';
    g.fillText(`${t('cr_bigfish')}: ${fmtKg(big.biggest)} kg · ${big.name}`, 100, 1128);
  }
  g.fillStyle = '#fff'; g.font = '700 46px Outfit, system-ui, sans-serif'; g.fillText('Ripple', 70, 1285);
  g.font = '500 28px Inter, system-ui, sans-serif'; g.fillStyle = 'rgba(255,255,255,.7)';
  const u = location.host + location.pathname; g.fillText(u, W - 70 - g.measureText(u).width, 1282);
  const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.9));
  const file = new File([blob], `ripple-rezultati-${c.id}.jpg`, { type: 'image/jpeg' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: c.title }); return; } catch (e) { if (e?.name === 'AbortError') return; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
  toast(t('card_saved'));
}
