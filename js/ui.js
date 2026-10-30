import { sb } from './config.js';
import { t, lang } from './i18n.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function toast(msg, kind = 'ok') {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'toast show ' + kind;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.className = 'toast'; }, 3200);
}

// Modális ablak
export function openModal(title, bodyHTML) {
  const m = $('#modal');
  $('#modalTitle', m).textContent = title;
  $('#modalBody', m).innerHTML = bodyHTML;
  m.hidden = false;
  document.body.classList.add('noscroll');
  setTimeout(() => { const f = $('#modalBody input, #modalBody select, #modalBody textarea', m); if (f && window.innerWidth > 700) f.focus(); }, 50);
  return $('#modalBody', m);
}
export function closeModal() {
  $('#modal').hidden = true;
  document.body.classList.remove('noscroll');
}

export function fmtDate(d) {
  if (!d) return '';
  const dt = typeof d === 'string' && d.length === 10 ? new Date(d + 'T12:00:00') : new Date(d);
  return dt.toLocaleDateString(lang() === 'hu' ? 'hu-HU' : 'sr-Latn-RS', { day: 'numeric', month: 'short', year: 'numeric' });
}
export function fmtMonth(d) {
  const dt = new Date(d + 'T12:00:00');
  return dt.toLocaleDateString(lang() === 'hu' ? 'hu-HU' : 'sr-Latn-RS', { month: 'long', year: 'numeric' });
}
export function fmtMoney(n) {
  if (n === null || n === undefined || n === '') return '';
  return Number(n).toLocaleString('sr-RS') + ' ' + t('rsd');
}
export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function slugify(s) {
  const map = { š: 's', đ: 'dj', č: 'c', ć: 'c', ž: 'z', á: 'a', é: 'e', í: 'i', ó: 'o', ö: 'o', ő: 'o', ú: 'u', ü: 'u', ű: 'u' };
  return String(s || '').toLowerCase().replace(/[šđčćžáéíóöőúüű]/g, c => map[c] || c)
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

export function lakePhotoUrl(path) {
  return sb.storage.from('lake-photos').getPublicUrl(path).data.publicUrl;
}
export async function catchPhotoUrls(paths) {
  const list = [...new Set(paths.filter(Boolean))];
  if (!list.length) return {};
  const { data } = await sb.storage.from('catch-photos').createSignedUrls(list, 3600);
  const out = {};
  (data || []).forEach(r => { if (r.signedUrl) out[r.path] = r.signedUrl; });
  return out;
}

// Telefonos fotók kicsinyítése feltöltés előtt (max 1600 px, JPEG)
export function compressImage(file, max = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => b ? resolve(b) : reject(new Error('compress')), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image')); };
    img.src = url;
  });
}
export function randomName() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + '.jpg';
}

export function spinner() { return `<div class="spinner" role="status" aria-label="${esc(t('loading'))}"></div>`; }

// Ikonok (vonalas SVG)
const I = {
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z"/><path d="M4 19a2 2 0 0 1 2-2h13"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  nav: '<path d="m3 11 18-8-8 18-2-8-8-2Z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  moon: '<path d="M20 14A8 8 0 1 1 10 4a7 7 0 0 0 10 10Z"/>',
  bed: '<path d="M3 18V6M3 14h18v4M21 14v-3a3 3 0 0 0-3-3h-8v6"/><circle cx="7" cy="11" r="2"/>',
  food: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 2-2 6 0 8v10"/>',
  boat: '<path d="M3 17h18l-3 4H6l-3-4ZM12 3v14M12 4l6 9h-6"/>',
  fish: '<path d="M2 12c4-6 12-6 16 0-4 6-12 6-16 0Z"/><path d="M18 12l4-4v8l-4-4Z"/><circle cx="7" cy="11" r="1"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  camera: '<path d="M4 7h4l2-3h4l2 3h4v13H4V7Z"/><circle cx="12" cy="13" r="4"/>',
  pin: '<path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
  shield: '<path d="M12 3 4 6v6c0 5 4 8 8 9 4-1 8-4 8-9V6l-8-3Z"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
  wind: '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h7"/>',
  gauge: '<path d="M12 14l4-4"/><path d="M4 18a9 9 0 1 1 16 0"/>',
  sunrise: '<path d="M12 3v5M8 6l4-3 4 3M3 20h18M6 16a6 6 0 0 1 12 0"/>',
  moonph: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  lake: '<path d="M3 15c3-2 6 2 9 0s6 2 9 0M3 19c3-2 6 2 9 0s6 2 9 0"/><path d="M8 11c0-3 2-6 4-7 2 1 4 4 4 7"/>'
};
export function icon(name, size = 20) {
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[name] || ''}</svg>`;
}

// A márkajel (úszó)
export function logoMark(size = 28, light = false) {
  const ink = light ? '#FFFFFF' : '#0E2A3B', ring = light ? '#FFFFFF' : '#1F7A8C';
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><line x1="32" y1="4" x2="32" y2="15" stroke="${ink}" stroke-width="3" stroke-linecap="round"/><path d="M23 28 A9 13 0 0 1 41 28 Z" fill="#E2A73E"/><path d="M23 28 A9 13 0 0 0 41 28 Z" fill="${ink}"/><ellipse cx="32" cy="46" rx="16" ry="4" fill="none" stroke="${ring}" stroke-width="2.8" opacity="0.8"/><ellipse cx="32" cy="48" rx="27" ry="7" fill="none" stroke="${ring}" stroke-width="2.4" opacity="0.4"/></svg>`;
}

// Megosztás: a telefon saját megosztója, különben Viber / WhatsApp / Facebook / link
export function shareUrl(params) {
  return location.origin + location.pathname + '?' + params;
}
export function share({ title, text, url }) {
  const msg = `${text || title} ${url}`;
  if (navigator.share) { navigator.share({ title, text: text || title, url }).catch(() => {}); return; }
  const enc = encodeURIComponent;
  const body = openModal(t('share'), `
    <div class="contact-btns">
      <a class="btn ghost block" href="viber://forward?text=${enc(msg)}">Viber</a>
      <a class="btn ghost block" href="https://wa.me/?text=${enc(msg)}" target="_blank" rel="noopener">WhatsApp</a>
      <a class="btn ghost block" href="https://www.facebook.com/sharer/sharer.php?u=${enc(url)}" target="_blank" rel="noopener">Facebook</a>
      <button class="btn lake block" id="shCopy">${esc(t('copy_link'))}</button>
    </div>`);
  $('#shCopy', body).onclick = async () => {
    try { await navigator.clipboard.writeText(url); } catch (e) { const i = document.createElement('input'); i.value = url; document.body.appendChild(i); i.select(); document.execCommand('copy'); i.remove(); }
    toast(t('link_copied')); closeModal();
  };
}
