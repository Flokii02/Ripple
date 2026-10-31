import { sb } from '../config.js';
import { t, lang } from '../i18n.js';
import { $, esc, icon, logoMark, toast, errText } from '../ui.js';

const ABOUT = {
  sr: `<p>Ripple okuplja na jednom mestu jezera za sportski ribolov, takmičenja i dnevnik ulova. Nastao je u Vojvodini, za pecaroše i vlasnike jezera iz našeg kraja, na srpskom i mađarskom jeziku.</p>
       <p><b>Pecaroši</b> besplatno pronalaze jezera, cene, poribljavanja, vremensku prognozu i takmičenja, i vode svoj dnevnik ulova.</p>
       <p><b>Vlasnici jezera</b> besplatno dodaju svoje jezero, objavljuju poribljavanja i takmičenja i vide koliko ljudi gleda njihovu stranicu.</p>`,
  hu: `<p>A Ripple egy helyre gyűjti a horgásztavakat, a versenyeket és a fogási naplót. Vajdaságban született, a környékbeli horgászoknak és tótulajdonosoknak, szerb és magyar nyelven.</p>
       <p><b>A horgászok</b> ingyen megtalálják a tavakat, árakat, haltelepítéseket, az időjárást és a versenyeket, és vezethetik a fogási naplójukat.</p>
       <p><b>A tótulajdonosok</b> ingyen feltölthetik a tavukat, bejelenthetik a telepítéseket és versenyeket, és látják, hányan nézik az oldalukat.</p>`
};

export async function render(el, _p, ctx) {
  el.innerHTML = `
  <div class="page narrow">
    <div class="card">
      <div class="row" style="gap:12px;margin-bottom:10px">${logoMark(48)}<h1>${esc(t('about'))}</h1></div>
      ${ABOUT[lang()] || ABOUT.sr}
    </div>
    <div class="card">
      <h2 style="margin-bottom:12px">${icon('mail', 20)} ${esc(t('contact_us'))}</h2>
      <label class="field"><span>${esc(t('name'))}</span><input id="cmName" maxlength="80" autocomplete="name" value="${esc(ctx.profile?.display_name || '')}"></label>
      <label class="field"><span>${esc(t('email'))}</span><input id="cmEmail" type="email" maxlength="160" autocomplete="email" value="${esc(ctx.user?.email || '')}"></label>
      <label class="field"><span>${esc(t('message'))}</span><textarea id="cmMsg" maxlength="3000"></textarea></label>
      <div class="err" id="cmErr"></div>
      <button class="btn lake" id="cmSend">${esc(t('send'))}</button>
    </div>
    <div class="row small" style="justify-content:center;margin-top:16px"><a href="#/privatnost">${esc(t('privacy'))}</a> · <a href="#/uslovi">${esc(t('terms'))}</a></div>
  </div>`;
  $('#cmSend').onclick = async () => {
    const name = $('#cmName').value.trim(), email = $('#cmEmail').value.trim(), message = $('#cmMsg').value.trim();
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || message.length < 2) { $('#cmErr').textContent = t('fill_all').split('(')[0]; return; }
    $('#cmSend').disabled = true;
    const { error } = await sb.from('contact_messages').insert({ name, email, message, user_id: ctx.user?.id || null });
    $('#cmSend').disabled = false;
    if (error) { console.error(error); $('#cmErr').textContent = errText(error); return; }
    $('#cmMsg').value = ''; $('#cmErr').textContent = ''; toast(t('sent_ok'));
  };
}
