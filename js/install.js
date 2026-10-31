// "Telepítsd az appot" – Android/Chrome: a böngésző saját telepítő ablaka; iPhone: rövid útmutató
import { t } from './i18n.js';
import { esc, icon, logoMark, openModal, closeModal } from './ui.js';

let deferred = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; document.dispatchEvent(new Event('ripple-installable')); });
window.addEventListener('appinstalled', () => { deferred = null; document.querySelectorAll('.inst-banner,.inst-btn').forEach(x => x.remove()); });

export const isInstalled = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const canInstall = () => !isInstalled() && (!!deferred || isIOS() || /android/i.test(navigator.userAgent));

export async function install() {
  if (deferred) {
    deferred.prompt();
    const r = await deferred.userChoice.catch(() => null);
    deferred = null;
    return r?.outcome === 'accepted';
  }
  // iPhone / régebbi böngésző: útmutató
  const ios = isIOS();
  const body = openModal(t('install'), `
    <div class="inst-steps">
      <div class="row" style="gap:12px;margin-bottom:14px">${logoMark(44)}<p class="small" style="margin:0">${esc(t('inst_why'))}</p></div>
      <ol>${(ios ? t('inst_ios') : t('inst_android')).split('|').map(s => `<li>${esc(s)}</li>`).join('')}</ol>
      ${ios ? `<p class="small muted">${esc(t('inst_ios_note'))}</p>` : ''}
    </div>
    <button class="btn lake" id="instOk" style="width:100%">OK</button>`);
  body.querySelector('#instOk').onclick = closeModal;
  return false;
}

// Főoldali sáv (egyszer elrejthető)
export function installBanner() {
  let hidden = false; try { hidden = localStorage.getItem('ripple_inst_hide') === '1'; } catch (e) {}
  if (hidden || !canInstall()) return '';
  return `<div class="inst-banner">${logoMark(36, true)}<div class="grow"><b>${esc(t('install'))}</b><div class="small">${esc(t('inst_short'))}</div></div>
    <button class="btn sm" data-inst>${esc(t('inst_btn'))}</button><button class="icon-btn" data-inst-x aria-label="${esc(t('close'))}">${icon('x', 18)}</button></div>`;
}
export function bindInstall(root = document) {
  root.querySelectorAll('[data-inst]').forEach(b => b.onclick = () => install());
  root.querySelectorAll('[data-inst-x]').forEach(b => b.onclick = () => {
    try { localStorage.setItem('ripple_inst_hide', '1'); } catch (e) {}
    b.closest('.inst-banner')?.remove();
  });
}
