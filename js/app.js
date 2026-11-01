import { sb } from './config.js';
import { t, lang, setLang } from './i18n.js';
import { $, esc, icon, logoMark, closeModal, spinner, toast } from './ui.js';
import './install.js';

// Közös állapot: ki van belépve
export const ctx = { user: null, profile: null, isAdmin: false };

async function loadSession() {
  const { data } = await sb.auth.getSession();
  ctx.user = data.session?.user || null;
  ctx.profile = null; ctx.isAdmin = false;
  if (ctx.user) {
    const [{ data: p }, { data: adm }] = await Promise.all([
      sb.from('profiles').select('*').eq('id', ctx.user.id).maybeSingle(),
      sb.rpc('am_i_admin')
    ]);
    ctx.profile = p;
    ctx.isAdmin = adm === true;
    if (p?.lang && p.lang !== lang()) setLang(p.lang);
  }
}

// Útvonalak: #/..., a minták sorrendben
const ROUTES = [
  [/^\/?$/, 'home'],
  [/^\/jezero\/([a-z0-9-]+)$/, 'lake'],
  [/^\/takmicenja$/, 'competitions'],
  [/^\/dnevnik$/, 'log'],
  [/^\/moja-jezera$/, 'owner'],
  [/^\/moja-jezera\/(novo|\d+)$/, 'lakeEdit'],
  [/^\/admin$/, 'admin'],
  [/^\/prijava$/, 'auth'],
  [/^\/profil$/, 'profile'],
  [/^\/omiljena$/, 'favorites'],
  [/^\/o-nama$/, 'about'],
  [/^\/lovostaj$/, 'seasons'],
  [/^\/mesta$/, 'spots'],
  [/^\/ulovi$/, 'feed'],
  [/^\/(privatnost|uslovi)$/, 'legal']
];
const PAGES = {
  home: () => import('./pages/home.js'),
  lake: () => import('./pages/lake.js'),
  competitions: () => import('./pages/competitions.js'),
  log: () => import('./pages/log.js'),
  owner: () => import('./pages/owner.js'),
  lakeEdit: () => import('./pages/lakeEdit.js'),
  admin: () => import('./pages/admin.js'),
  auth: () => import('./pages/auth.js'),
  profile: () => import('./pages/profile.js'),
  favorites: () => import('./pages/favorites.js'),
  spots: () => import('./pages/spots.js'),
  feed: () => import('./pages/feed.js'),
  about: () => import('./pages/about.js'),
  seasons: () => import('./pages/seasons.js'),
  legal: () => import('./pages/legal.js')
};

const SPLASH_START = Date.now();
function hideSplash() {
  const sp = document.getElementById('splash'); if (!sp || sp.classList.contains('out')) return;
  const wait = Math.max(0, 900 - (Date.now() - SPLASH_START));
  setTimeout(() => { sp.classList.add('out'); setTimeout(() => sp.remove(), 600); }, wait);
}
setTimeout(hideSplash, 6000);

export function go(path) { location.hash = '#' + path; }

let renderSeq = 0;
async function route() {
  closeModal();
  // Supabase visszairányítás (email megerősítés, jelszó-visszaállítás): a token a hash-ben jön
  if (/access_token=|error_description=/.test(location.hash)) { $('#main').innerHTML = `<div class="page">${spinner()}</div>`; setTimeout(() => { if (/access_token=|error_description=/.test(location.hash)) go('/'); }, 2500); return; }
  const path = decodeURIComponent(location.hash.replace(/^#/, '')) || '/';
  let name = null, params = [];
  for (const [re, n] of ROUTES) { const m = path.match(re); if (m) { name = n; params = m.slice(1); break; } }
  renderNav(name);
  const main = $('#main');
  const seq = ++renderSeq;
  if (!name) { main.innerHTML = `<div class="page narrow"><div class="empty">${esc(t('not_found'))}</div></div>`; return; }
  main.innerHTML = `<div class="page">${spinner()}</div>`;
  try {
    const mod = await PAGES[name]();
    if (seq !== renderSeq) return;
    main.innerHTML = '';
    document.body.dataset.page = name;
    await mod.render(main, params, ctx);
    window.scrollTo(0, 0);
    hideSplash();
  } catch (e) {
    console.error(e);
    if (seq === renderSeq) main.innerHTML = `<div class="page narrow"><div class="empty">${esc(t('error'))}</div></div>`;
    hideSplash();
  }
}

function renderNav(active) {
  const tabs = [
    ['home', '/', 'map', t('nav_lakes')],
    ['competitions', '/takmicenja', 'trophy', t('nav_comp')],
    ['log', '/dnevnik', 'book', t('nav_log')],
    ctx.user ? ['profile', '/profil', 'user', t('nav_profile')] : ['auth', '/prijava', 'user', t('nav_login')]
  ];
  const isActive = n => n === active || (n === 'home' && active === 'lake') || (n === 'profile' && ['owner', 'lakeEdit', 'admin', 'favorites', 'spots'].includes(active)) || (n === 'log' && active === 'feed');
  $('#topNav').innerHTML = tabs.map(([n, p, ic, label]) =>
    `<a href="#${p}" class="tn ${isActive(n) ? 'on' : ''}" ${isActive(n) ? 'aria-current="page"' : ''}>${esc(label)}</a>`).join('')
    + `<a href="#/ulovi" class="tn ${active === 'feed' ? 'on' : ''}">${esc(t('feed_title'))}</a>`
    + `<a href="#/lovostaj" class="tn ${active === 'seasons' ? 'on' : ''}">${esc(t('seasons'))}</a>`
    + `<button class="lang-btn" id="langBtn" aria-label="${esc(t('language'))}">${lang() === 'hu' ? 'SR' : 'HU'}</button>`;
  $('#footer').innerHTML = `<a href="#/o-nama">${esc(t('about'))}</a><a href="#/privatnost">${esc(t('privacy'))}</a><a href="#/uslovi">${esc(t('terms'))}</a><span>© ${new Date().getFullYear()} Ripple</span>`;
  $('#tabBar').innerHTML = tabs.map(([n, p, ic, label]) =>
    `<a href="#${p}" class="tb ${isActive(n) ? 'on' : ''}" ${isActive(n) ? 'aria-current="page"' : ''}>${icon(ic, 22)}<span>${esc(label)}</span></a>`).join('');
  $('#langBtn').onclick = async () => {
    setLang(lang() === 'hu' ? 'sr' : 'hu');
    if (ctx.user) sb.from('profiles').update({ lang: lang() }).eq('id', ctx.user.id);
    route();
  };
}

export function refresh() { return route(); }

async function init() {
  $('#brand').innerHTML = `${logoMark(30)}<span>Ripple</span>`;
  $('#modalClose').onclick = closeModal;
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  // Megosztott linkek: ?jezero=<slug> vagy ?takmicenja -> belső oldal
  const qs = new URLSearchParams(location.search);
  if (qs.get('jezero') && /^[a-z0-9-]+$/.test(qs.get('jezero'))) { history.replaceState(null, '', location.pathname + '#/jezero/' + qs.get('jezero')); }
  else if (qs.has('takmicenja')) { history.replaceState(null, '', location.pathname + '#/takmicenja'); }
  await loadSession();
  sb.auth.onAuthStateChange(async (ev) => {
    if (ev === 'SIGNED_IN' || ev === 'SIGNED_OUT' || ev === 'USER_UPDATED') { await loadSession(); route(); }
    if (ev === 'PASSWORD_RECOVERY') go('/profil');
  });
  window.addEventListener('hashchange', route);
  // Visszatérés az appba (telefonon háttérből): a régi tartalom / lejárt bejelentkezés helyett frissítünk
  let hiddenAt = 0, resuming = false;
  const resume = async () => {
    if (resuming || !hiddenAt || Date.now() - hiddenAt < 30e3 || !navigator.onLine) return;
    resuming = true; hiddenAt = 0;
    try {
      // a lejárt munkamenet-tokent itt frissíti a Supabase, mielőtt újra lekérdezünk
      try { await sb.auth.startAutoRefresh?.(); } catch (e) {}
      await loadSession().catch(() => {});
      if ($('#modal').hidden) {
        const y = window.scrollY;
        await route();
        if (y) setTimeout(() => window.scrollTo(0, y), 300);
      }
    } finally { resuming = false; }
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { hiddenAt = hiddenAt || Date.now(); try { sb.auth.stopAutoRefresh?.(); } catch (e) {} }
    else resume();
  });
  window.addEventListener('pageshow', e => { if (e.persisted) { hiddenAt = hiddenAt || Date.now() - 60e3; resume(); } });
  window.addEventListener('focus', () => resume());
  window.addEventListener('online', () => { if (!$('#main .loader')) { hiddenAt = hiddenAt || Date.now() - 60e3; resume(); } });
  route();
  // Net nélkül mentett fogások feltöltése indításkor és amikor visszajön a net
  const sync = () => ctx.user && import('./offline.js').then(m => m.flushQueue(ctx, n => {
    toast(t('offline_synced').replace('{n}', n));
    if (location.hash.startsWith('#/dnevnik') && $('#modal').hidden) route();
  })).catch(() => {});
  setTimeout(sync, 2500);
  window.addEventListener('online', sync);
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    // Új verzió élesedésekor egyszer újratöltjük az oldalt, hogy ne keveredjenek a régi és új fájlok
    const had = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!had || reloaded || !$('#modal').hidden) return;
      reloaded = true; location.reload();
    });
    navigator.serviceWorker.register('sw.js').then(r => r.update()).catch(() => {});
  }
}
export async function reloadSession() { await loadSession(); }
init();
