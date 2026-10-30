import { sb } from '../config.js';
import { t, lang } from '../i18n.js';
import { $, esc, icon, logoMark, toast } from '../ui.js';
import { go } from '../app.js';

let tab = 'login';

export async function render(el, _p, ctx) {
  if (ctx.user) { go('/profil'); return; }
  el.innerHTML = `
  <div class="page narrow"><div class="auth-wrap">
    <div class="brand-big">${logoMark(64)}<h1>Ripple</h1><p>${esc(t('tagline'))}</p></div>
    <div class="card">
      <div class="tabs" role="group" style="width:100%;margin-bottom:16px">
        <button id="tLogin" class="grow ${tab === 'login' ? 'on' : ''}">${esc(t('login'))}</button>
        <button id="tReg" class="grow ${tab === 'register' ? 'on' : ''}">${esc(t('register'))}</button>
      </div>
      <div id="form"></div>
    </div>
  </div></div>`;
  $('#tLogin').onclick = () => { tab = 'login'; render(el, _p, ctx); };
  $('#tReg').onclick = () => { tab = 'register'; render(el, _p, ctx); };
  const f = $('#form');

  if (tab === 'login') {
    f.innerHTML = `
      <label class="field"><span>${esc(t('email'))}</span><input id="aEmail" type="email" autocomplete="email"></label>
      <label class="field"><span>${esc(t('password'))}</span><input id="aPw" type="password" autocomplete="current-password"></label>
      <div class="err" id="aErr"></div>
      <button class="btn lake block" id="aGo">${esc(t('login'))}</button>
      <button class="link-btn" id="aForgot">${esc(t('forgot'))}</button>`;
    const submit = async () => {
      $('#aErr').textContent = '';
      const { error } = await sb.auth.signInWithPassword({ email: $('#aEmail').value.trim(), password: $('#aPw').value });
      if (error) { $('#aErr').textContent = /confirm/i.test(error.message) ? t('check_email') : t('bad_login'); return; }
      toast(t('welcome')); go('/');
    };
    $('#aGo').onclick = submit;
    $('#aPw').onkeydown = e => { if (e.key === 'Enter') submit(); };
    $('#aForgot').onclick = async () => {
      const email = $('#aEmail').value.trim();
      if (!email) { $('#aErr').textContent = t('email'); $('#aEmail').focus(); return; }
      await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
      $('#aErr').className = 'err ok'; $('#aErr').textContent = t('reset_sent');
    };
  } else {
    f.innerHTML = `
      <div class="field"><span>${esc(t('i_am'))}</span>
        <div class="role-pick">
          <label><input type="radio" name="role" value="angler" checked><span>${icon('fish', 26)}${esc(t('role_angler'))}</span></label>
          <label><input type="radio" name="role" value="owner"><span>${icon('lake', 26)}${esc(t('role_owner'))}</span></label>
        </div>
      </div>
      <label class="field"><span>${esc(t('name'))}</span><input id="rName" autocomplete="name" maxlength="80"></label>
      <label class="field"><span>${esc(t('email'))}</span><input id="rEmail" type="email" autocomplete="email"></label>
      <label class="field"><span>${esc(t('password'))}</span><input id="rPw" type="password" autocomplete="new-password" minlength="6"></label>
      <label class="check small"><input type="checkbox" id="rTerms"><span>${esc(t('accept_terms'))} (<a href="#/uslovi" target="_blank">${esc(t('terms'))}</a>, <a href="#/privatnost" target="_blank">${esc(t('privacy'))}</a>)</span></label>
      <div class="err" id="rErr"></div>
      <button class="btn lake block" id="rGo">${esc(t('register'))}</button>`;
    $('#rGo').onclick = async () => {
      const name = $('#rName').value.trim(), email = $('#rEmail').value.trim(), pw = $('#rPw').value;
      const role = f.querySelector('input[name=role]:checked').value;
      if (!name || !email || pw.length < 6) { $('#rErr').textContent = t('fill_all'); return; }
      if (!$('#rTerms').checked) { $('#rErr').textContent = t('must_accept'); return; }
      $('#rGo').disabled = true;
      const { data, error } = await sb.auth.signUp({ email, password: pw, options: { data: { display_name: name, role, lang: lang() }, emailRedirectTo: location.origin + location.pathname } });
      $('#rGo').disabled = false;
      if (error) { $('#rErr').textContent = error.message; return; }
      if (!data.session) { $('#rErr').className = 'err ok'; $('#rErr').textContent = t('check_email'); return; }
      toast(t('welcome')); go(role === 'owner' ? '/moja-jezera' : '/');
    };
  }
}
