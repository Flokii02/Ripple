// Nyilvános fogások: mindenki friss, nyilvánosra tett fogása egy helyen
import { sb } from '../config.js';
import { t, SPECIES, speciesName } from '../i18n.js';
import { $, $$, esc, icon, fmtDate, toast, catchPhotoUrls, spinner, openModal } from '../ui.js';

const PAGE = 24;

export async function render(el, _p, ctx) {
  let sp = '';
  try { sp = sessionStorage.getItem('ripple_feed_sp') || ''; } catch (e) {}
  el.innerHTML = `
  <div class="page">
    <div class="page-head"><div><h1>${esc(t('feed_title'))}</h1><p>${esc(t('feed_sub'))}</p></div>
      ${ctx.user ? `<a class="btn lake" href="#/dnevnik">${icon('plus', 18)}${esc(t('log_add'))}</a>` : ''}</div>
    <label class="field" style="max-width:280px"><span class="sr-only">${esc(t('species'))}</span>
      <select id="fSp"><option value="">${esc(t('all_species'))}</option>${SPECIES.map(s => `<option value="${s.key}" ${sp === s.key ? 'selected' : ''}>${esc(speciesName(s.key))}</option>`).join('')}</select></label>
    <div id="feed">${spinner()}</div>
    <div style="text-align:center;margin-top:16px"><button class="btn ghost" id="fMore" hidden>${esc(t('feed_more'))}</button></div>
  </div>`;

  let offset = 0, items = [];
  const load = async (reset) => {
    if (reset) { offset = 0; items = []; $('#feed').innerHTML = spinner(); }
    let q = sb.from('catches')
      .select('id, user_id, species, weight_kg, length_cm, bait, method, caught_at, photo_path, thumb_path, released, water_name, lakes(name, slug), profiles!catches_user_profile_fk(display_name)')
      .eq('is_public', true).order('caught_at', { ascending: false }).range(offset, offset + PAGE - 1);
    if (sp) q = q.eq('species', sp);
    const { data, error } = await q;
    if (error) { $('#feed').innerHTML = `<div class="empty">${esc(t('error'))}</div>`; return; }
    const got = data || [];
    const urls = await catchPhotoUrls(got.map(c => c.thumb_path || c.photo_path));
    got.forEach(c => { c._img = urls[c.thumb_path || c.photo_path] || null; });
    items = items.concat(got); offset += got.length;
    $('#fMore').hidden = got.length < PAGE;
    draw();
  };

  const draw = () => {
    if (!items.length) { $('#feed').innerHTML = `<div class="empty">${icon('fish', 44)}<p>${esc(t('feed_empty'))}</p></div>`; return; }
    $('#feed').innerHTML = `<div class="catch-grid">${items.map(c => `
      <div class="catch-card">
        <div class="ph">${c._img ? `<img src="${esc(c._img)}" alt="${esc(speciesName(c.species))}" loading="lazy" data-big="${c.id}" style="cursor:zoom-in">` : icon('fish', 40)}</div>
        <div class="cb">
          <h3><span>${esc(speciesName(c.species))}</span>${c.weight_kg ? `<span class="w">${esc(Number(c.weight_kg).toLocaleString('sr-RS'))} ${esc(t('kg'))}</span>` : ''}</h3>
          <div class="small"><b>${esc(c.profiles?.display_name || '—')}</b></div>
          <div class="small muted">${esc(fmtDate(c.caught_at))}${c.lakes ? ` · <a href="#/jezero/${esc(c.lakes.slug)}">${esc(c.lakes.name)}</a>` : c.water_name ? ' · ' + esc(c.water_name) : ''}</div>
          <div class="small muted">${[c.length_cm ? Number(c.length_cm).toLocaleString('sr-RS') + ' ' + t('cm') : '', c.bait, c.method].filter(Boolean).map(esc).join(' · ')}</div>
          ${c.released ? `<div class="chips" style="margin-top:4px"><span class="chip ok">${esc(t('released'))}</span></div>` : ''}
        </div>
        ${ctx.isAdmin && c.user_id !== ctx.user?.id ? `<div class="actions"><button class="icon-btn" data-hide="${c.id}" aria-label="${esc(t('feed_hide'))}" title="${esc(t('feed_hide'))}">${icon('shield', 18)}</button></div>` : ''}
      </div>`).join('')}</div>`;
    $$('[data-hide]').forEach(b => b.onclick = async () => {
      if (!confirm(t('feed_hide_q'))) return;
      const { error } = await sb.from('catches').update({ is_public: false }).eq('id', b.dataset.hide);
      if (error) { toast(t('error'), 'err'); return; }
      items = items.filter(x => x.id != b.dataset.hide); draw(); toast(t('feed_hidden'));
    });
    $$('[data-big]').forEach(img => img.onclick = async () => {
      const c = items.find(x => x.id == img.dataset.big);
      const body = openModal(speciesName(c.species), `<div style="text-align:center">${spinner()}</div>`);
      const full = c.photo_path ? (await catchPhotoUrls([c.photo_path]))[c.photo_path] : c._img;
      body.innerHTML = `<img src="${esc(full || c._img)}" alt="" style="width:100%;border-radius:12px;display:block">
        <p class="small muted" style="margin-top:8px">${esc(c.profiles?.display_name || '')} · ${esc(fmtDate(c.caught_at))}${c.weight_kg ? ' · ' + esc(Number(c.weight_kg).toLocaleString('sr-RS')) + ' ' + esc(t('kg')) : ''}</p>`;
    });
  };

  $('#fSp').onchange = e => { sp = e.target.value; try { sessionStorage.setItem('ripple_feed_sp', sp); } catch (er) {} load(true); };
  $('#fMore').onclick = () => load(false);
  load(true);
}
