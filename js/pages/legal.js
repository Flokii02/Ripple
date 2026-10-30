import { lang } from '../i18n.js';

// Adatvédelmi tájékoztató és felhasználási feltételek (SR / HU)
const UPDATED = '2026-10-30';

const PRIVACY = {
  sr: `
<h1>Politika privatnosti</h1>
<p class="small muted">Poslednja izmena: ${UPDATED}</p>
<p>Ripple je platforma za pecaroše i vlasnike jezera. Ovde objašnjavamo koje podatke prikupljamo, zašto i kako možete da ih kontrolišete. Pitanja možete poslati preko stranice „O nama".</p>
<h2>Koje podatke prikupljamo</h2>
<ul>
  <li><b>Nalog:</b> email adresa, ime i uloga (pecaroš ili vlasnik jezera), izabrani jezik.</li>
  <li><b>Sadržaj koji unosite:</b> podaci o jezeru i fotografije, ulov i fotografije ulova, ocene, takmičenja, predlozi jezera, zahtevi vlasnika i poruke.</li>
  <li><b>Statistika jezera:</b> ukupan broj pregleda i klikova (poziv, putanja, sajt) po danu, bez podataka o tome ko je kliknuo.</li>
  <li><b>Lokacija:</b> ako izaberete „Moja lokacija", koordinate se koriste samo u vašem pregledaču za vremensku prognozu i ne čuvamo ih na serveru.</li>
</ul>
<h2>Zašto ih koristimo</h2>
<p>Da bi platforma radila: prijava, prikaz jezera i takmičenja, vaš dnevnik ulova, ocene i komunikacija sa vama. Podatke ne prodajemo i ne koristimo ih za reklame trećih lica.</p>
<h2>Šta je javno, a šta privatno</h2>
<ul>
  <li>Javno: odobrena jezera, odobrena takmičenja, ocene sa vašim imenom i ulov koji ste označili kao javan.</li>
  <li>Privatno: email adresa, ulov koji nije označen kao javan i njegove fotografije, predlozi, zahtevi i poruke.</li>
</ul>
<h2>Gde se podaci čuvaju</h2>
<p>Podaci se čuvaju kod usluge Supabase na serverima u Evropskoj uniji (Frankfurt). Za mapu koristimo OpenStreetMap, za vremensku prognozu Open-Meteo (šaljemo samo koordinate), a fontove i biblioteke učitavamo sa Google Fonts i jsDelivr.</p>
<h2>Vaša prava</h2>
<p>U skladu sa Zakonom o zaštiti podataka o ličnosti, možete tražiti uvid, ispravku ili brisanje svojih podataka, kao i brisanje naloga. Većinu podataka možete sami izmeniti ili obrisati u aplikaciji. Za ostalo nam pišite preko stranice „O nama".</p>
<h2>Kolačići i lokalno skladište</h2>
<p>Koristimo samo neophodno lokalno skladište pregledača (prijava, jezik, izabrana lokacija za prognozu). Ne koristimo kolačiće za praćenje.</p>`,
  hu: `
<h1>Adatvédelmi tájékoztató</h1>
<p class="small muted">Utolsó módosítás: ${UPDATED}</p>
<p>A Ripple horgászoknak és tótulajdonosoknak szóló platform. Itt leírjuk, milyen adatokat gyűjtünk, miért, és hogyan rendelkezhetsz róluk. Kérdéseidet a „Rólunk" oldalon keresztül küldheted el.</p>
<h2>Milyen adatokat gyűjtünk</h2>
<ul>
  <li><b>Fiók:</b> email cím, név, szerepkör (horgász vagy tótulajdonos), választott nyelv.</li>
  <li><b>Az általad megadott tartalom:</b> tóadatok és fotók, fogások és fotóik, értékelések, versenyek, tó-javaslatok, tulajdonosi kérések és üzenetek.</li>
  <li><b>Tó-statisztika:</b> a megtekintések és kattintások (hívás, útvonal, weboldal) napi összesített száma, anélkül hogy tárolnánk, ki kattintott.</li>
  <li><b>Helyzet:</b> ha a „Saját helyzetem" lehetőséget választod, a koordinátákat csak a böngésződ használja az időjárás-előrejelzéshez, a szerveren nem tároljuk.</li>
</ul>
<h2>Mire használjuk</h2>
<p>A platform működéséhez: belépés, tavak és versenyek megjelenítése, a fogási naplód, értékelések és a kapcsolattartás veled. Az adatokat nem adjuk el, és nem használjuk harmadik fél reklámjaihoz.</p>
<h2>Mi nyilvános és mi privát</h2>
<ul>
  <li>Nyilvános: a jóváhagyott tavak és versenyek, az értékelések a neveddel, és a nyilvánosnak jelölt fogások.</li>
  <li>Privát: az email címed, a nem nyilvános fogások és fotóik, a javaslatok, kérések és üzenetek.</li>
</ul>
<h2>Hol tároljuk az adatokat</h2>
<p>Az adatokat a Supabase szolgáltatásnál tároljuk, az Európai Unióban (Frankfurt). A térképhez OpenStreetMapet, az időjáráshoz Open-Meteót használunk (csak a koordinátákat küldjük el), a betűtípusokat és könyvtárakat a Google Fonts és a jsDelivr szolgáltatja.</p>
<h2>A jogaid</h2>
<p>A személyes adatok védelméről szóló szerb törvény alapján kérheted az adataid megtekintését, javítását vagy törlését, valamint a fiókod törlését. Az adatok nagy részét te magad is módosíthatod vagy törölheted az alkalmazásban. A többihez írj nekünk a „Rólunk" oldalon.</p>
<h2>Sütik és helyi tárolás</h2>
<p>Csak a működéshez szükséges böngészőtárolást használjuk (belépés, nyelv, az időjárás helye). Követő sütiket nem használunk.</p>`
};

const TERMS = {
  sr: `
<h1>Uslovi korišćenja</h1>
<p class="small muted">Poslednja izmena: ${UPDATED}</p>
<h2>Korišćenje</h2>
<p>Ripple je besplatan za pecaroše. Korišćenjem platforme prihvatate ove uslove. Ne smete objavljivati netačan, uvredljiv ili tuđ sadržaj, niti sadržaj koji krši zakon.</p>
<h2>Sadržaj korisnika</h2>
<p>Za podatke o jezeru, takmičenjima, fotografije i ocene odgovoran je korisnik koji ih je objavio. Objavljivanjem nam dajete pravo da sadržaj prikazujemo na platformi. Možemo ukloniti sadržaj koji krši ove uslove.</p>
<h2>Jezera i vlasnici</h2>
<p>Nova jezera i takmičenja objavljujemo nakon provere. Vlasnik je odgovoran za tačnost cena, pravila i radnog vremena. Pre dolaska proverite informacije direktno sa vlasnikom.</p>
<h2>Vremenska prognoza i „šansa za ulov"</h2>
<p>Prognoza dolazi od usluge Open-Meteo, a „šansa za ulov" je gruba procena. Ne garantujemo njihovu tačnost.</p>
<h2>Pravila ribolova</h2>
<p>Svaki pecaroš je dužan da poštuje važeće propise o ribolovu, dozvole, lovostaj i najmanje dozvoljene mere, kao i pravila samog jezera.</p>
<h2>Odgovornost</h2>
<p>Platformu pružamo „kakva jeste". Ne odgovaramo za štetu nastalu korišćenjem informacija sa platforme ili za odnose između pecaroša i vlasnika jezera.</p>
<h2>Izmene</h2>
<p>Ove uslove možemo izmeniti. Datum poslednje izmene je naveden na vrhu.</p>`,
  hu: `
<h1>Felhasználási feltételek</h1>
<p class="small muted">Utolsó módosítás: ${UPDATED}</p>
<h2>Használat</h2>
<p>A Ripple a horgászoknak ingyenes. A platform használatával elfogadod ezeket a feltételeket. Nem tehetsz közzé valótlan, sértő vagy más tulajdonát képező tartalmat, sem olyat, ami törvénybe ütközik.</p>
<h2>A felhasználók tartalma</h2>
<p>A tavak és versenyek adataiért, a fotókért és az értékelésekért az a felhasználó felel, aki közzétette őket. A közzététellel megengeded, hogy a tartalmat a platformon megjelenítsük. A feltételeket sértő tartalmat eltávolíthatjuk.</p>
<h2>Tavak és tulajdonosok</h2>
<p>Az új tavakat és versenyeket ellenőrzés után tesszük közzé. Az árak, szabályok és nyitvatartás pontosságáért a tulajdonos felel. Indulás előtt egyeztess közvetlenül a tulajdonossal.</p>
<h2>Időjárás és „kapás-esély"</h2>
<p>Az előrejelzés az Open-Meteo szolgáltatásból származik, a „kapás-esély" pedig durva becslés. Ezek pontosságát nem garantáljuk.</p>
<h2>Horgászszabályok</h2>
<p>Minden horgász köteles betartani a horgászatra vonatkozó hatályos szabályokat, engedélyeket, tilalmi időket és méretkorlátokat, valamint a tó saját szabályait.</p>
<h2>Felelősség</h2>
<p>A platformot „ahogy van" alapon biztosítjuk. Nem felelünk a platform információinak használatából eredő károkért, sem a horgászok és a tótulajdonosok közötti ügyekért.</p>
<h2>Változások</h2>
<p>Ezeket a feltételeket módosíthatjuk. Az utolsó módosítás dátuma a lap tetején látható.</p>`
};

export async function render(el, params, ctx, which) {
  const kind = (params && params[0] === 'uslovi') || which === 'terms' ? 'terms' : 'privacy';
  const src = kind === 'terms' ? TERMS : PRIVACY;
  el.innerHTML = `<div class="page narrow"><div class="card legal">${src[lang()] || src.sr}</div></div>`;
}
