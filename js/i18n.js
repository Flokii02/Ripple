// Nyelvek: szerb (alapértelmezett) és magyar
const DICT = {
  sr: {
    tagline: 'Sva jezera, takmičenja i tvoj ulov na jednom mestu',
    nav_lakes: 'Jezera', nav_comp: 'Takmičenja', nav_log: 'Dnevnik', nav_profile: 'Profil', nav_login: 'Prijava',
    nav_mylakes: 'Moja jezera', nav_admin: 'Admin',
    search_ph: 'Pretraži jezera ili mesta…', all_species: 'Sve vrste', f_night: 'Noćni ribolov', f_acc: 'Smeštaj', f_food: 'Hrana', f_boat: 'Čamac',
    view_map: 'Mapa', view_list: 'Lista', no_lakes: 'Još nema jezera u ovoj pretrazi.',
    owner_cta_t: 'Imate jezero?', owner_cta: 'Dodajte ga besplatno i dovedite nove pecaroše.', add_lake: 'Dodaj jezero',
    per_day: 'dan', per_night: 'noć', price_day: 'Cena (dan)', price_night: 'Cena (noć)', rsd: 'RSD',
    featured: 'Izdvojeno', species: 'Vrste ribe', description: 'O jezeru', rules: 'Pravila', opening: 'Radno vreme', contact: 'Kontakt',
    call: 'Pozovi', directions: 'Kako stići', website: 'Sajt', stockings: 'Poribljavanje', no_stockings: 'Još nema objava o poribljavanju.',
    upcoming_comp: 'Predstojeća takmičenja', public_catches: 'Ulov sa ovog jezera', no_catches: 'Još nema javnog ulova.',
    edit: 'Izmeni', save: 'Sačuvaj', cancel: 'Otkaži', delete: 'Obriši', close: 'Zatvori', back: 'Nazad', add: 'Dodaj', loading: 'Učitavanje…',
    confirm_delete: 'Sigurno želite da obrišete?', saved: 'Sačuvano!', error: 'Greška. Pokušajte ponovo.',
    comp_title: 'Takmičenja', comp_add: 'Dodaj takmičenje', comp_none: 'Nema predstojećih takmičenja.', comp_past: 'Prošla', comp_upcoming: 'Predstojeća',
    comp_name: 'Naziv takmičenja', date_start: 'Datum početka', date_end: 'Datum završetka', lake: 'Jezero', other_place: 'Drugo mesto (ako nije na listi)',
    entry_fee: 'Kotizacija (RSD)', pending_note: 'Biće vidljivo nakon odobrenja.', pending: 'Na čekanju', approved: 'Odobreno', rejected: 'Odbijeno',
    log_title: 'Moj dnevnik ulova', log_add: 'Dodaj ulov', log_empty: 'Još nema ulova. Zabeleži prvi!', log_login: 'Prijavi se da bi vodio svoj dnevnik ulova.',
    st_total: 'Ukupno ulova', st_biggest: 'Najveća riba', st_top: 'Najčešća vrsta', st_waters: 'Različitih voda',
    weight: 'Težina (kg)', length: 'Dužina (cm)', bait: 'Mamac', method: 'Tehnika', when: 'Kada', water: 'Voda', water_other: 'Druga voda (naziv)',
    released: 'Pušteno nazad', public_catch: 'Javno (vidljivo drugima)', note: 'Napomena', photo: 'Fotografija', choose_lake: '— Izaberi jezero —',
    login: 'Prijava', register: 'Registracija', email: 'Email', password: 'Lozinka', name: 'Ime i prezime', i_am: 'Ja sam',
    role_angler: 'Pecaroš', role_owner: 'Vlasnik jezera', forgot: 'Zaboravljena lozinka?', send_link: 'Pošalji link', reset_sent: 'Ako nalog postoji, poslali smo link na email.',
    check_email: 'Registracija uspešna! Potvrdite email adresu preko linka koji smo poslali.', welcome: 'Dobro došli!', bad_login: 'Pogrešan email ili lozinka.',
    fill_all: 'Popunite sva polja (lozinka min. 6 karaktera).', logout: 'Odjava', language: 'Jezik', become_owner: 'Postani vlasnik jezera',
    my_lakes: 'Moja jezera', my_lakes_empty: 'Još niste dodali jezero.', lake_name: 'Naziv jezera', place: 'Mesto', address: 'Adresa',
    location: 'Lokacija na mapi', location_hint: 'Kliknite na mapu da postavite lokaciju jezera.', my_location: 'Moja lokacija',
    phone: 'Telefon', facebook: 'Facebook', instagram: 'Instagram', catch_release: 'Uhvati i pusti',
    photos: 'Fotografije', upload_photos: 'Dodaj fotografije', stock_add: 'Objavi poribljavanje', qty_kg: 'Količina (kg)', date: 'Datum',
    save_first: 'Sačuvajte jezero da biste dodali fotografije i poribljavanja.', status_pending_lake: 'Jezero čeka odobrenje i još nije javno.',
    view_page: 'Pogledaj stranicu', admin_title: 'Odobravanje', approve: 'Odobri', reject: 'Odbij', plan: 'Paket', all_lakes: 'Sva jezera',
    nothing_pending: 'Nema ničeg na čekanju.', not_found: 'Stranica nije pronađena.', need_login: 'Za ovo je potrebna prijava.',
    wx_title: 'Vreme na jezeru', wx_feels: 'Oseća se kao', wx_wind: 'Vetar', wx_pressure: 'Pritisak', wx_rain: 'Kiša', wx_moon: 'Mesec',
    wx_sunrise: 'Izlazak sunca', wx_sunset: 'Zalazak sunca', wx_err: 'Vremenska prognoza trenutno nije dostupna.', wx_noloc: 'Jezero nema lokaciju na mapi, pa nema prognoze.',
    p_up: 'raste', p_down: 'pada', p_flat: 'stabilan',
    bite: 'Šansa za ulov danas', bite_good: 'Dobra', bite_mid: 'Srednja', bite_low: 'Slabija', bite_note: 'Gruba procena na osnovu pritiska, vetra, temperature i meseca.',
    reviews: 'Ocene', review_add: 'Oceni jezero', review_your: 'Vaša ocena', review_text: 'Komentar (opciono)', review_none: 'Još nema ocena. Budite prvi!',
    review_owner: 'Vlasnik ne može da oceni svoje jezero.', reviews_n: 'ocena', rating: 'Ocena',
    fav: 'Omiljeno', fav_add: 'Dodaj u omiljena', fav_remove: 'Ukloni iz omiljenih', favs: 'Omiljena jezera', favs_empty: 'Još nemate omiljena jezera. Dodajte ih srcem na stranici jezera.',
    wx_today: 'Vreme za pecanje danas', loc_region: 'Vojvodina (centar)', loc_label: 'Lokacija', loc_denied: 'Lokacija nije dostupna. Izaberite jezero ili mesto.',
    only_favs: 'Omiljena', last_stock: 'Poslednje poribljavanje', next_comp: 'Sledeće takmičenje',
    install: 'Instaliraj aplikaciju', kg: 'kg', cm: 'cm', from: 'od'
  },
  hu: {
    tagline: 'Minden tó, verseny és a fogásaid egy helyen',
    nav_lakes: 'Tavak', nav_comp: 'Versenyek', nav_log: 'Napló', nav_profile: 'Profil', nav_login: 'Belépés',
    nav_mylakes: 'Saját tavaim', nav_admin: 'Admin',
    search_ph: 'Tavak vagy települések keresése…', all_species: 'Minden halfaj', f_night: 'Éjszakai horgászat', f_acc: 'Szállás', f_food: 'Étkezés', f_boat: 'Csónak',
    view_map: 'Térkép', view_list: 'Lista', no_lakes: 'Ebben a keresésben még nincs tó.',
    owner_cta_t: 'Van tavad?', owner_cta: 'Add hozzá ingyen, és hozz új horgászokat.', add_lake: 'Tó hozzáadása',
    per_day: 'nap', per_night: 'éjszaka', price_day: 'Ár (nappal)', price_night: 'Ár (éjszaka)', rsd: 'RSD',
    featured: 'Kiemelt', species: 'Halfajok', description: 'A tóról', rules: 'Szabályok', opening: 'Nyitvatartás', contact: 'Elérhetőség',
    call: 'Hívás', directions: 'Útvonal', website: 'Weboldal', stockings: 'Haltelepítés', no_stockings: 'Még nincs telepítési bejelentés.',
    upcoming_comp: 'Közelgő versenyek', public_catches: 'Fogások erről a tóról', no_catches: 'Még nincs nyilvános fogás.',
    edit: 'Szerkesztés', save: 'Mentés', cancel: 'Mégse', delete: 'Törlés', close: 'Bezárás', back: 'Vissza', add: 'Hozzáadás', loading: 'Betöltés…',
    confirm_delete: 'Biztosan törlöd?', saved: 'Mentve!', error: 'Hiba történt. Próbáld újra.',
    comp_title: 'Versenyek', comp_add: 'Verseny hozzáadása', comp_none: 'Nincs közelgő verseny.', comp_past: 'Korábbiak', comp_upcoming: 'Közelgők',
    comp_name: 'Verseny neve', date_start: 'Kezdés napja', date_end: 'Befejezés napja', lake: 'Tó', other_place: 'Más helyszín (ha nincs a listán)',
    entry_fee: 'Nevezési díj (RSD)', pending_note: 'Jóváhagyás után lesz látható.', pending: 'Jóváhagyásra vár', approved: 'Jóváhagyva', rejected: 'Elutasítva',
    log_title: 'Fogási naplóm', log_add: 'Fogás hozzáadása', log_empty: 'Még nincs fogásod. Rögzítsd az elsőt!', log_login: 'Lépj be, hogy vezethesd a fogási naplódat.',
    st_total: 'Összes fogás', st_biggest: 'Legnagyobb hal', st_top: 'Leggyakoribb faj', st_waters: 'Különböző víz',
    weight: 'Súly (kg)', length: 'Hossz (cm)', bait: 'Csali', method: 'Módszer', when: 'Mikor', water: 'Víz', water_other: 'Más víz (neve)',
    released: 'Visszaengedve', public_catch: 'Nyilvános (mások is látják)', note: 'Megjegyzés', photo: 'Fotó', choose_lake: '— Válassz tavat —',
    login: 'Belépés', register: 'Regisztráció', email: 'Email', password: 'Jelszó', name: 'Név', i_am: 'Én',
    role_angler: 'Horgász vagyok', role_owner: 'Tótulajdonos vagyok', forgot: 'Elfelejtett jelszó?', send_link: 'Link küldése', reset_sent: 'Ha a fiók létezik, elküldtük a linket emailben.',
    check_email: 'Sikeres regisztráció! Erősítsd meg az email címed a kiküldött linkkel.', welcome: 'Üdv!', bad_login: 'Hibás email vagy jelszó.',
    fill_all: 'Tölts ki minden mezőt (jelszó min. 6 karakter).', logout: 'Kilépés', language: 'Nyelv', become_owner: 'Tótulajdonos leszek',
    my_lakes: 'Saját tavaim', my_lakes_empty: 'Még nem adtál hozzá tavat.', lake_name: 'A tó neve', place: 'Település', address: 'Cím',
    location: 'Helye a térképen', location_hint: 'Kattints a térképre a tó helyének megadásához.', my_location: 'Saját helyzetem',
    phone: 'Telefon', facebook: 'Facebook', instagram: 'Instagram', catch_release: 'Fogd meg és engedd vissza',
    photos: 'Fotók', upload_photos: 'Fotók feltöltése', stock_add: 'Telepítés bejelentése', qty_kg: 'Mennyiség (kg)', date: 'Dátum',
    save_first: 'Mentsd el a tavat, utána adhatsz hozzá fotókat és telepítést.', status_pending_lake: 'A tó jóváhagyásra vár, még nem nyilvános.',
    view_page: 'Oldal megtekintése', admin_title: 'Jóváhagyás', approve: 'Jóváhagy', reject: 'Elutasít', plan: 'Csomag', all_lakes: 'Minden tó',
    nothing_pending: 'Nincs semmi jóváhagyásra váró.', not_found: 'Az oldal nem található.', need_login: 'Ehhez be kell lépni.',
    wx_title: 'Időjárás a tónál', wx_feels: 'Hőérzet', wx_wind: 'Szél', wx_pressure: 'Légnyomás', wx_rain: 'Eső', wx_moon: 'Hold',
    wx_sunrise: 'Napkelte', wx_sunset: 'Napnyugta', wx_err: 'Az időjárás most nem érhető el.', wx_noloc: 'A tónak nincs helye a térképen, ezért nincs előrejelzés.',
    p_up: 'emelkedik', p_down: 'csökken', p_flat: 'stabil',
    bite: 'Kapás-esély ma', bite_good: 'Jó', bite_mid: 'Közepes', bite_low: 'Gyengébb', bite_note: 'Durva becslés a légnyomás, szél, hőmérséklet és a hold alapján.',
    reviews: 'Értékelések', review_add: 'Értékeld a tavat', review_your: 'Az értékelésed', review_text: 'Vélemény (nem kötelező)', review_none: 'Még nincs értékelés. Légy az első!',
    review_owner: 'A tulajdonos nem értékelheti a saját tavát.', reviews_n: 'értékelés', rating: 'Értékelés',
    fav: 'Kedvenc', fav_add: 'Kedvencekhez', fav_remove: 'Eltávolítás a kedvencekből', favs: 'Kedvenc tavaim', favs_empty: 'Még nincs kedvenc tavad. A tó oldalán a szívvel adhatod hozzá.',
    wx_today: 'Horgászidő ma', loc_region: 'Vajdaság (közép)', loc_label: 'Helyszín', loc_denied: 'A helyzeted nem érhető el. Válassz tavat vagy helyet.',
    only_favs: 'Kedvencek', last_stock: 'Utolsó telepítés', next_comp: 'Következő verseny',
    install: 'Alkalmazás telepítése', kg: 'kg', cm: 'cm', from: 'tól'
  }
};

// Halfajok: kulcs az adatbázisban, név két nyelven
export const SPECIES = [
  ['saran', 'Šaran', 'Ponty'], ['amur', 'Amur', 'Amur'], ['tolstolobik', 'Tolstolobik', 'Busa'],
  ['som', 'Som', 'Harcsa'], ['smudj', 'Smuđ', 'Süllő'], ['stuka', 'Štuka', 'Csuka'],
  ['karas', 'Karaš', 'Kárász'], ['deverika', 'Deverika', 'Dévérkeszeg'], ['bandar', 'Bandar', 'Sügér'],
  ['linjak', 'Linjak', 'Compó'], ['crvenperka', 'Crvenperka', 'Vörösszárnyú keszeg'], ['bucov', 'Bucov', 'Balin'],
  ['kecige', 'Kečiga', 'Kecsege'], ['pastrmka', 'Pastrmka', 'Pisztráng'], ['jesetra', 'Jesetra', 'Tok']
].map(([key, sr, hu]) => ({ key, sr, hu }));

let LANG = (() => { try { return localStorage.getItem('ripple_lang') || ''; } catch (e) { return ''; } })()
  || ((navigator.language || '').startsWith('hu') ? 'hu' : 'sr');

export function lang() { return LANG; }
export function setLang(l) {
  LANG = l === 'hu' ? 'hu' : 'sr';
  try { localStorage.setItem('ripple_lang', LANG); } catch (e) {}
  document.documentElement.lang = LANG;
}
export function t(key) { return (DICT[LANG] && DICT[LANG][key]) || DICT.sr[key] || key; }
export function speciesName(key) {
  const s = SPECIES.find(x => x.key === key);
  return s ? s[LANG] : key;
}
document.documentElement.lang = LANG;
