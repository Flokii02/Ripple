// Tilalmi idők és legkisebb kifogható méretek (Szerbia)
// Forrás: Naredba o merama za očuvanje i zaštitu ribljeg fonda, "Sl. glasnik RS" 104/2009,
// a kecsegére 2019. január 1-jétől teljes tilalom. Tájékoztató adatok, a hivatalos szabályok az irányadók.
import { lang, speciesName, SPECIES } from './i18n.js';

export const SOURCE_DATE = '2026-10-31';

// from/to: 'HH-NN' formátum (hónap-nap); ha to < from, átnyúlik az éven
export const SEASONS = [
  { key: 'stuka', from: '02-01', to: '03-31', min: 40 },
  { key: 'smudj', from: '03-01', to: '04-30', min: 40 },
  { key: 'smudj_k', sr: 'Smuđ kamenjar', hu: 'Kősüllő', from: '03-01', to: '04-30', min: 25 },
  { key: 'saran', from: '04-01', to: '05-31', min: 30 },
  { key: 'deverika', from: '04-15', to: '05-31', min: 20 },
  { key: 'mrena', sr: 'Mrena', hu: 'Márna', from: '04-15', to: '05-31', min: 25 },
  { key: 'klen', sr: 'Klen', hu: 'Domolykó', from: '04-15', to: '05-31', min: 20 },
  { key: 'jaz', sr: 'Jaz', hu: 'Jászkeszeg', from: '04-15', to: '05-31', min: 20 },
  { key: 'skobalj', sr: 'Skobalj', hu: 'Paduc', from: '04-15', to: '05-31', min: 20 },
  { key: 'plotica', sr: 'Plotica', hu: 'Leánykoncér', from: '04-15', to: '05-31', min: 20 },
  { key: 'bucov', from: '04-15', to: '06-15', min: 30 },
  { key: 'som', from: '05-01', to: '06-15', min: 60 },
  { key: 'pastrmka', from: '10-01', to: '03-01', min: 25 },
  { key: 'bandar', from: null, to: null, min: 10 },
  { key: 'manic', sr: 'Manić', hu: 'Menyhal', from: null, to: null, min: 10 },
  { key: 'nosara', sr: 'Nosara', hu: 'Szilvaorrú keszeg', from: null, to: null, min: 15 }
];

// Teljes (állandó) tilalom
export const BANNED = [
  { key: 'kecige', note: { sr: 'od 1. 1. 2019.', hu: '2019. 1. 1-jétől' } },
  { key: 'linjak' },
  { key: 'jesetra', sr: 'Jesetre (sve vrste), moruna, pastruga, sim', hu: 'Tokfélék (minden faj), viza' },
  { key: 'zlatni_karas', sr: 'Zlatni karaš', hu: 'Széles kárász' },
  { key: 'cikov', sr: 'Čikov', hu: 'Réti csík' },
  { key: 'crnka', sr: 'Crnka', hu: 'Lápi póc' },
  { key: 'rak', sr: 'Rečni i potočni rak', hu: 'Folyami és kövi rák' }
];

export function seasonName(s) {
  if (s.sr) return lang() === 'hu' ? s.hu : s.sr;
  return speciesName(s.key);
}

const md = d => (d.getMonth() + 1) * 100 + d.getDate();
const toNum = s => Number(s.slice(0, 2)) * 100 + Number(s.slice(3));
export function inSeason(s, date = new Date()) {
  if (!s.from) return false;
  const x = md(date), a = toNum(s.from), b = toNum(s.to);
  return a <= b ? x >= a && x <= b : x >= a || x <= b;
}
// Hány nap múlva kezdődik (0–n), vagy null
export function daysUntil(s, date = new Date()) {
  if (!s.from) return null;
  const [m, d] = s.from.split('-').map(Number);
  let start = new Date(date.getFullYear(), m - 1, d);
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (start < today) start = new Date(date.getFullYear() + 1, m - 1, d);
  return Math.round((start - today) / 864e5);
}
// Év-napja tört (0–1) a naptár sávokhoz
export function yearFrac(mmdd) {
  const [m, d] = mmdd.split('-').map(Number);
  const dt = new Date(2025, m - 1, d);
  return (dt - new Date(2025, 0, 1)) / (365 * 864e5);
}

// Figyelmeztetés a fogási naplóhoz
export function catchWarning(speciesKey, dateIso, lengthCm) {
  if (BANNED.some(b => b.key === speciesKey)) return 'banned';
  const s = SEASONS.find(x => x.key === speciesKey);
  if (!s) return null;
  if (inSeason(s, new Date(dateIso))) return 'season';
  if (lengthCm && s.min && Number(lengthCm) < s.min) return 'size';
  return null;
}
export { SPECIES };
