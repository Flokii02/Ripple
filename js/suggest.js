// Tó javaslása (horgászoknak): csak az adminhoz érkezik, nem nyilvános
import { sb } from './config.js';
import { t } from './i18n.js';
import { $, esc, openModal, closeModal, toast } from './ui.js';
import { go } from './app.js';

export function isOwner(ctx) { return !!ctx.user && (ctx.profile?.role === 'owner' || ctx.isAdmin); }

export function openSuggest(ctx) {
  if (!ctx.user) { toast(t('need_login'), 'err'); go('/prijava'); return; }
  const body = openModal(t('suggest_lake'), `
    <p class="muted" style="margin-top:0">${esc(t('suggest_hint'))}</p>
    <label class="field"><span>${esc(t('lake_name'))} *</span><input id="sgName" maxlength="120"></label>
    <label class="field"><span>${esc(t('place'))}</span><input id="sgPlace" maxlength="120"></label>
    <label class="field"><span>${esc(t('suggest_contact'))}</span><input id="sgContact" maxlength="160"></label>
    <label class="field"><span>${esc(t('note'))}</span><textarea id="sgNote" maxlength="1000"></textarea></label>
    <div class="err" id="sgErr"></div>
    <div class="row"><button class="btn ghost" id="sgCancel">${esc(t('cancel'))}</button><button class="btn lake grow" id="sgSave">${esc(t('suggest_send'))}</button></div>`);
  $('#sgCancel', body).onclick = closeModal;
  $('#sgSave', body).onclick = async () => {
    const name = $('#sgName', body).value.trim();
    if (name.length < 2) { $('#sgErr', body).textContent = t('lake_name'); return; }
    $('#sgSave', body).disabled = true;
    const { error } = await sb.from('lake_suggestions').insert({
      user_id: ctx.user.id, name, place: $('#sgPlace', body).value.trim() || null,
      contact: $('#sgContact', body).value.trim() || null, note: $('#sgNote', body).value.trim() || null
    });
    $('#sgSave', body).disabled = false;
    if (error) { console.error(error); $('#sgErr', body).textContent = t('error'); return; }
    closeModal(); toast(t('suggest_sent'));
  };
}

export function ownersOnlyHTML(ctx) {
  return `<div class="page narrow"><div class="empty">
    <p>${esc(t('owners_only'))}</p>
    <div class="row" style="justify-content:center">
      <button class="btn lake" id="sgOpen">${esc(t('suggest_lake'))}</button>
      ${ctx.user ? `<a class="btn ghost" href="#/profil">${esc(t('become_owner'))}</a>` : `<a class="btn ghost" href="#/prijava">${esc(t('register'))}</a>`}
    </div></div></div>`;
}
