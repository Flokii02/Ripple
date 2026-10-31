import { sb } from '../config.js';
import { t, lang, setLang } from '../i18n.js';
import { $, esc, icon, toast } from '../ui.js';
import { go, reloadSession, refresh } from '../app.js';
import { canInstall, bindInstall } from '../install.js';

export async function render(el, _p, ctx) {
  if (!ctx.user) { go('/prijava'); return; }
  const p = ctx.profile || {};
  el.innerHTML = `
  <div class="page narrow">
    <div class="page-head"><div><h1>${esc(p.display_name || t('nav_profile'))}</h1><p>${esc(ctx.user.email)}</p></div></div>
    <div class="card"><div class="menu-list">
      <a href="#/omiljena">${icon('heart')}${esc(t('favs'))}</a>
      <a href="#/mesta">${icon('spot')}${esc(t('spots_title'))}</a>
      <a href="#/dnevnik">${icon('book')}${esc(t('nav_log'))}</a>
      <a href="#/ulovi">${icon('fish')}${esc(t('feed_title'))}</a>
      ${p.role === 'owner' || ctx.isAdmin ? `<a href="#/moja-jezera">${icon('lake')}${esc(t('my_lakes'))}</a>` : `<button id="pSuggest">${icon('plus')}${esc(t('suggest_lake'))}</button>`}
      <a href="#/takmicenja">${icon('trophy')}${esc(t('nav_comp'))}</a>
      <a href="#/lovostaj">${icon('shield')}${esc(t('seasons'))}</a>
      ${ctx.isAdmin ? `<a href="#/admin">${icon('shield')}${esc(t('nav_admin'))}</a>` : ''}
      <a href="#/o-nama">${icon('mail')}${esc(t('about'))}</a>
      ${canInstall() ? `<button data-inst class="inst-btn">${icon('download')}${esc(t('install'))}</button>` : ''}
    </div></div>
    <div class="card">
      <label class="field"><span>${esc(t('name'))}</span><input id="pName" maxlength="80" value="${esc(p.display_name || '')}"></label>
      <div class="field"><span>${esc(t('language'))}</span>
        <div class="pick">
          <label><input type="radio" name="lang" value="sr" ${lang() === 'sr' ? 'checked' : ''}><span>Srpski</span></label>
          <label><input type="radio" name="lang" value="hu" ${lang() === 'hu' ? 'checked' : ''}><span>Magyar</span></label>
        </div>
      </div>
      ${p.role !== 'owner' ? `<label class="check"><input type="checkbox" id="pOwner">${esc(t('become_owner'))}</label>` : ''}
      <label class="field" style="margin-top:8px"><span>${esc(t('password'))}</span><input id="pPw" type="password" autocomplete="new-password" minlength="6"></label>
      <button class="btn lake" id="pSave">${esc(t('save'))}</button>
    </div>
    <div style="margin-top:16px"><button class="btn danger block" id="pOut">${esc(t('logout'))}</button></div>
  </div>`;
  bindInstall(el);
  $('#pSave').onclick = async () => {
    const l = el.querySelector('input[name=lang]:checked').value;
    const upd = { display_name: $('#pName').value.trim().slice(0, 80), lang: l };
    if ($('#pOwner')?.checked) upd.role = 'owner';
    const { error } = await sb.from('profiles').update(upd).eq('id', ctx.user.id);
    const pw = $('#pPw').value;
    let pwErr = null;
    if (pw) { if (pw.length < 6) pwErr = t('fill_all'); else ({ error: pwErr } = await sb.auth.updateUser({ password: pw })); }
    if (error || pwErr) { toast(typeof pwErr === 'string' ? pwErr : t('error'), 'err'); return; }
    setLang(l); await reloadSession(); toast(t('saved')); refresh();
  };
  if ($('#pSuggest')) $('#pSuggest').onclick = () => import('../suggest.js').then(m => m.openSuggest(ctx));
  $('#pOut').onclick = async () => { await sb.auth.signOut(); go('/'); };
}
