import { sb } from '../config.js';
import { t, speciesName } from '../i18n.js';
import { $, $$, esc, icon, fmtMoney, fmtDate, lakePhotoUrl, catchPhotoUrls, todayStr, toast, share, shareUrl, openModal, closeModal } from '../ui.js';
import { renderWeatherCard } from '../weather.js';
import { go } from '../app.js';

export async function render(el, [slug], ctx) {
  const { data: lake } = await sb.from('lakes').select('*, lake_photos(path, sort)').eq('slug', slug).maybeSingle();
  if (!lake) { el.innerHTML = `<div class="page narrow"><div class="empty">${esc(t('not_found'))}</div></div>`; return; }

  const [{ data: stock }, { data: comps }, { data: catches }, { data: reviews }, { data: fav }] = await Promise.all([
    sb.from('stockings').select('*').eq('lake_id', lake.id).order('date', { ascending: false }).limit(6),
    sb.from('competitions').select('*').eq('lake_id', lake.id).eq('status', 'approved').gte('date_start', todayStr()).order('date_start').limit(5),
    sb.from('catches').select('id, species, weight_kg, length_cm, bait, caught_at, photo_path, released, user_id, profiles!catches_user_profile_fk(display_name)').eq('lake_id', lake.id).eq('is_public', true).order('caught_at', { ascending: false }).limit(12),
    sb.from('reviews').select('id, rating, text, created_at, user_id, profiles(display_name)').eq('lake_id', lake.id).order('created_at', { ascending: false }).limit(50),
    ctx.user ? sb.from('favorites').select('lake_id').eq('lake_id', lake.id).eq('user_id', ctx.user.id).maybeSingle() : Promise.resolve({ data: null })
  ]);
  const revs = reviews || [];
  let claim = null;
  if (ctx.user && lake.owner_id !== ctx.user.id) {
    const { data: cl } = await sb.from('lake_claims').select('id').eq('lake_id', lake.id).eq('user_id', ctx.user.id).eq('status', 'pending').maybeSingle();
    claim = cl;
  }
  const avg = revs.length ? revs.reduce((a, r) => a + r.rating, 0) / revs.length : 0;
  const mine = ctx.user ? revs.find(r => r.user_id === ctx.user.id) : null;
  const isOwner = ctx.user && lake.owner_id === ctx.user.id;
  let isFav = !!fav;
  const stars = (n, size = 16) => [1, 2, 3, 4, 5].map(i => `<span class="star ${i <= Math.round(n) ? 'on' : ''}">${icon('star', size)}</span>`).join('');
  const urls = await catchPhotoUrls((catches || []).map(c => c.photo_path));
  const photos = (lake.lake_photos || []).sort((a, b) => a.sort - b.sort);
  const canEdit = ctx.user && (lake.owner_id === ctx.user.id || ctx.isAdmin);
  const tel = (lake.phone || '').replace(/[^+\d]/g, '');
  const linkify = (u, base) => !u ? '' : /^https?:\/\//i.test(u) ? u : (base ? base + u.replace(/^@/, '') : 'https://' + u);
  const feat = (on, ic, label) => `<div class="feat-item ${on ? '' : 'off'}">${icon(ic, 18)}${esc(label)}</div>`;

  el.innerHTML = `
  <div class="page">
    ${lake.status !== 'approved' ? `<div class="notice">${icon('shield', 18)}${esc(t('status_pending_lake'))}</div>` : ''}
    ${photos.length ? `<div class="gallery">${photos.map((p, i) => `<img src="${esc(lakePhotoUrl(p.path))}" alt="${esc(lake.name)} ${i + 1}" loading="${i ? 'lazy' : 'eager'}">`).join('')}</div>`
      : `<div class="gallery-empty">${icon('lake', 54)}</div>`}
    <div class="lake-head">
      <div>
        ${lake.plan !== 'free' ? `<span class="chip sand">${esc(t('featured'))}</span>` : ''}
        <h1 style="margin-top:6px">${esc(lake.name)}</h1>
        ${lake.place || lake.address ? `<div class="place">${icon('pin', 18)}${esc([lake.place, lake.address].filter(Boolean).join(', '))}</div>` : ''}
        ${revs.length ? `<button class="rating-sum" id="toReviews">${stars(avg)}<b>${avg.toFixed(1).replace('.', ',')}</b><span>(${revs.length} ${esc(t('reviews_n'))})</span></button>` : ''}
      </div>
      <div class="row">
        <button class="fav-btn" id="shareBtn">${icon('share', 18)}<span>${esc(t('share'))}</span></button>
        <button class="fav-btn ${isFav ? 'on' : ''}" id="favBtn" aria-pressed="${isFav}" aria-label="${esc(isFav ? t('fav_remove') : t('fav_add'))}">${icon('heart', 20)}<span>${esc(t('fav'))}</span></button>
        ${canEdit ? `<a class="btn ghost sm" href="#/moja-jezera/${lake.id}">${icon('edit', 16)}${esc(t('edit'))}</a>` : ''}
      </div>
    </div>

    <div class="lake-layout">
      <div>
        ${lake.price_day || lake.price_night ? `<div class="prices">
          ${lake.price_day ? `<div class="price"><small>${esc(t('price_day'))}</small><b>${esc(fmtMoney(lake.price_day))}</b></div>` : ''}
          ${lake.price_night ? `<div class="price"><small>${esc(t('price_night'))}</small><b>${esc(fmtMoney(lake.price_night))}</b></div>` : ''}
        </div>` : ''}
        ${(lake.species || []).length ? `<div class="section"><h2>${esc(t('species'))}</h2><div class="chips">${lake.species.map(s => `<span class="chip">${icon('fish', 14)}${esc(speciesName(s))}</span>`).join('')}</div></div>` : ''}
        <div class="feat-list">
          ${feat(lake.night_fishing, 'moon', t('f_night'))}${feat(lake.accommodation, 'bed', t('f_acc'))}
          ${feat(lake.food, 'food', t('f_food'))}${feat(lake.boat, 'boat', t('f_boat'))}
          ${lake.catch_release ? feat(true, 'fish', t('catch_release')) : ''}
        </div>
        ${lake.description ? `<div class="section"><h2>${esc(t('description'))}</h2><p class="prose">${esc(lake.description)}</p></div>` : ''}
        ${lake.rules ? `<div class="section"><h2>${esc(t('rules'))}</h2><p class="prose">${esc(lake.rules)}</p></div>` : ''}

        <div class="section"><h2>${esc(t('stockings'))}</h2>
          <div class="card">${(stock || []).length ? stock.map(s => `
            <div class="list-item"><div class="date-badge"><b>${new Date(s.date + 'T12:00').getDate()}</b><small>${esc(fmtDate(s.date).replace(/^\d+\.?\s*/, '').split(' ')[0])}</small></div>
            <div class="grow"><b>${esc(speciesName(s.species))}</b>${s.quantity_kg ? ` · ${esc(Number(s.quantity_kg).toLocaleString('sr-RS'))} ${esc(t('kg'))}` : ''}${s.note ? `<div class="small muted">${esc(s.note)}</div>` : ''}</div></div>`).join('')
            : `<div class="muted">${esc(t('no_stockings'))}</div>`}</div>
        </div>

        ${(comps || []).length ? `<div class="section"><h2>${esc(t('upcoming_comp'))}</h2>${comps.map(c => `
          <div class="comp-card"><div class="date-badge"><b>${new Date(c.date_start + 'T12:00').getDate()}</b><small>${esc(fmtDate(c.date_start).replace(/^\d+\.?\s*/, '').split(' ')[0])}</small></div>
          <div class="cbody"><h3>${esc(c.title)}</h3><div class="small muted">${esc(fmtDate(c.date_start))}${c.date_end && c.date_end !== c.date_start ? ' – ' + esc(fmtDate(c.date_end)) : ''}${c.entry_fee ? ' · ' + esc(fmtMoney(c.entry_fee)) : ''}</div>${c.description ? `<p>${esc(c.description)}</p>` : ''}</div></div>`).join('')}</div>` : ''}

        <div class="section"><h2>${esc(t('public_catches'))}</h2>
          ${(catches || []).length ? `<div class="catch-grid">${catches.map(c => `
            <div class="catch-card"><div class="ph">${c.photo_path && urls[c.photo_path] ? `<img src="${esc(urls[c.photo_path])}" alt="${esc(speciesName(c.species))}" loading="lazy">` : icon('fish', 40)}</div>
            <div class="cb"><h3><span>${esc(speciesName(c.species))}</span>${c.weight_kg ? `<span class="w">${esc(Number(c.weight_kg).toLocaleString('sr-RS'))} ${esc(t('kg'))}</span>` : ''}</h3>
            <div class="small muted">${esc(c.profiles?.display_name || '')} · ${esc(fmtDate(c.caught_at))}${c.released ? ' · ' + esc(t('released')) : ''}</div></div></div>`).join('')}</div>`
            : `<div class="card muted">${esc(t('no_catches'))}</div>`}
        </div>

        <div class="section" id="reviews"><h2>${esc(t('reviews'))}</h2>
          <div class="card">
            ${!ctx.user ? `<a class="btn ghost" href="#/prijava">${icon('star', 18)}${esc(t('review_add'))}</a>`
              : isOwner ? `<div class="muted small">${esc(t('review_owner'))}</div>`
              : `<div class="field"><span>${esc(mine ? t('review_your') : t('review_add'))}</span>
                  <div class="star-pick" role="radiogroup" aria-label="${esc(t('rating'))}">${[5, 4, 3, 2, 1].map(i => `<label><input type="radio" name="rv" value="${i}" ${mine?.rating === i ? 'checked' : ''}><span aria-hidden="true">${icon('star', 30)}</span><span class="sr-only">${i}</span></label>`).join('')}</div></div>
                 <label class="field"><span>${esc(t('review_text'))}</span><textarea id="rvText" maxlength="1000">${esc(mine?.text || '')}</textarea></label>
                 <div class="row"><button class="btn lake" id="rvSave">${esc(t('save'))}</button>${mine ? `<button class="btn danger sm" id="rvDel">${esc(t('delete'))}</button>` : ''}</div>`}
            <div style="margin-top:14px">${revs.length ? revs.map(r => `
              <div class="list-item" style="align-items:flex-start"><div class="grow">
                <div class="row" style="gap:8px"><span class="stars-sm">${stars(r.rating, 14)}</span><b>${esc(r.profiles?.display_name || '')}</b><span class="small muted">${esc(fmtDate(r.created_at))}</span></div>
                ${r.text ? `<p class="prose" style="margin-top:4px">${esc(r.text)}</p>` : ''}
              </div></div>`).join('') : `<div class="muted">${esc(t('review_none'))}</div>`}</div>
          </div>
        </div>
      </div>

      <aside class="lake-side">
        <div class="card wx-card" id="wxCard">${lake.lat && lake.lng ? '<div class="spinner" style="margin:20px auto"></div>' : `<h2>${esc(t('wx_title'))}</h2><p class="muted small">${esc(t('wx_noloc'))}</p>`}</div>
        <div class="card">
          <h2 style="margin-bottom:12px">${esc(t('contact'))}</h2>
          <div class="contact-btns">
            ${tel ? `<a class="btn lake block" data-track="call" href="tel:${esc(tel)}">${icon('phone', 18)}${esc(t('call'))} · ${esc(lake.phone)}</a>` : ''}
            ${lake.lat && lake.lng ? `<a class="btn ghost block" data-track="directions" href="https://www.google.com/maps/dir/?api=1&destination=${lake.lat},${lake.lng}" target="_blank" rel="noopener">${icon('nav', 18)}${esc(t('directions'))}</a>` : ''}
            ${lake.website ? `<a class="btn ghost block" data-track="website" href="${esc(linkify(lake.website))}" target="_blank" rel="noopener">${icon('globe', 18)}${esc(t('website'))}</a>` : ''}
            ${lake.facebook ? `<a class="btn ghost block" data-track="social" href="${esc(linkify(lake.facebook, 'https://facebook.com/'))}" target="_blank" rel="noopener">Facebook</a>` : ''}
            ${lake.instagram ? `<a class="btn ghost block" data-track="social" href="${esc(linkify(lake.instagram, 'https://instagram.com/'))}" target="_blank" rel="noopener">Instagram</a>` : ''}
          </div>
          ${lake.opening ? `<div style="margin-top:14px"><div class="small muted" style="font-weight:600">${esc(t('opening'))}</div><p class="prose">${esc(lake.opening)}</p></div>` : ''}
          ${lake.lat && lake.lng ? `<div class="mini-map" id="miniMap"></div>` : ''}
        </div>
        ${!isOwner && !(ctx.user && claim) ? `<div class="card claim-card"><b>${esc(t('claim_q'))}</b><p class="small muted" style="margin:4px 0 10px">${esc(t('claim_hint'))}</p><button class="btn ghost block" id="claimBtn">${esc(t('claim_btn'))}</button></div>`
          : !isOwner && claim ? `<div class="card claim-card small muted">${esc(t('claim_pending'))}</div>` : ''}
      </aside>
    </div>
  </div>`;

  if (lake.lat && lake.lng) {
    const m = L.map('miniMap', { scrollWheelZoom: false, dragging: !L.Browser.mobile }).setView([lake.lat, lake.lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap' }).addTo(m);
    L.marker([lake.lat, lake.lng], { icon: L.divIcon({ className: '', html: '<div class="pin"></div>', iconSize: [30, 30], iconAnchor: [15, 30] }) }).addTo(m);
  }
  document.title = `${lake.name} – Ripple`;

  if ($('#toReviews')) $('#toReviews').onclick = () => $('#reviews').scrollIntoView({ behavior: 'smooth' });

  // Statisztika: megtekintés (munkamenetenként egyszer) és kattintások
  const track = kind => sb.rpc('track_lake', { p_lake: lake.id, p_kind: kind }).then(() => {}, () => {});
  try { const k = 'rv_' + lake.id; if (!sessionStorage.getItem(k)) { sessionStorage.setItem(k, '1'); track('view'); } } catch (e) { track('view'); }
  $$('[data-track]').forEach(a => a.addEventListener('click', () => track(a.dataset.track)));

  // Megosztás
  $('#shareBtn').onclick = () => { track('share'); share({ title: lake.name, text: `${lake.name}${lake.place ? ' – ' + lake.place : ''} | Ripple`, url: shareUrl('jezero=' + encodeURIComponent(lake.slug)) }); };

  // Tulajdonosi kérés
  if ($('#claimBtn')) $('#claimBtn').onclick = () => {
    if (!ctx.user) { toast(t('need_login'), 'err'); go('/prijava'); return; }
    const body = openModal(t('claim_btn'), `
      <p class="muted" style="margin-top:0">${esc(t('claim_hint'))}</p>
      <label class="field"><span>${esc(t('phone'))}</span><input id="clPhone" type="tel" maxlength="40"></label>
      <label class="field"><span>${esc(t('message'))}</span><textarea id="clMsg" maxlength="1000"></textarea></label>
      <div class="err" id="clErr"></div>
      <div class="row"><button class="btn ghost" id="clCancel">${esc(t('cancel'))}</button><button class="btn lake grow" id="clSend">${esc(t('send'))}</button></div>`);
    $('#clCancel', body).onclick = closeModal;
    $('#clSend', body).onclick = async () => {
      const phone = $('#clPhone', body).value.trim();
      if (phone.replace(/\D/g, '').length < 6) { $('#clErr', body).textContent = t('phone'); return; }
      const { error } = await sb.from('lake_claims').insert({ lake_id: lake.id, user_id: ctx.user.id, phone, message: $('#clMsg', body).value.trim() || null });
      if (error) { console.error(error); $('#clErr', body).textContent = t('error'); return; }
      closeModal(); toast(t('claim_sent')); render(el, [slug], ctx);
    };
  };

  // Kedvenc
  $('#favBtn').onclick = async () => {
    if (!ctx.user) { toast(t('need_login'), 'err'); go('/prijava'); return; }
    const b = $('#favBtn');
    const { error } = isFav
      ? await sb.from('favorites').delete().eq('user_id', ctx.user.id).eq('lake_id', lake.id)
      : await sb.from('favorites').insert({ user_id: ctx.user.id, lake_id: lake.id });
    if (error) { toast(t('error'), 'err'); return; }
    isFav = !isFav;
    b.classList.toggle('on', isFav); b.setAttribute('aria-pressed', isFav); b.setAttribute('aria-label', isFav ? t('fav_remove') : t('fav_add'));
  };

  // Értékelés
  if ($('#rvSave')) $('#rvSave').onclick = async () => {
    const v = el.querySelector('input[name=rv]:checked');
    if (!v) { toast(t('rating'), 'err'); return; }
    const row = { lake_id: lake.id, user_id: ctx.user.id, rating: Number(v.value), text: $('#rvText').value.trim() || null };
    const { error } = mine ? await sb.from('reviews').update({ rating: row.rating, text: row.text }).eq('id', mine.id) : await sb.from('reviews').insert(row);
    if (error) { console.error(error); toast(t('error'), 'err'); return; }
    toast(t('saved')); render(el, [slug], ctx);
  };
  if ($('#rvDel')) $('#rvDel').onclick = async () => {
    if (!confirm(t('confirm_delete'))) return;
    await sb.from('reviews').delete().eq('id', mine.id); render(el, [slug], ctx);
  };

  // Időjárás
  if (lake.lat && lake.lng) renderWeatherCard($('#wxCard'), lake.lat, lake.lng);
}
