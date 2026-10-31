// Kapás-előrejelzés: óránkénti becslés halfajonként, napszak, szolunáris időszakok,
// légnyomás-változás (12 óra) és becsült vízhőmérséklet (az elmúlt napok átlaga) alapján.
// Ez egyszerű szabályrendszer, nem tudományos modell.

const SC = () => window.SunCalc;

// Halfajok kedvelt körülményei
export const BITE_SPECIES = {
  general: { opt: [12, 24], ok: [6, 28], night: 0, dawn: 15, cloud: 0, wind: [4, 22] },
  saran:   { opt: [16, 26], ok: [10, 30], night: 5, dawn: 12, cloud: 0, wind: [3, 18] },
  amur:    { opt: [18, 28], ok: [13, 31], night: 0, dawn: 10, cloud: -3, wind: [2, 16] },
  som:     { opt: [20, 28], ok: [15, 31], night: 18, dawn: 10, cloud: 5, wind: [0, 18] },
  stuka:   { opt: [6, 16], ok: [2, 22], night: -15, dawn: 15, cloud: 8, wind: [8, 28] },
  smudj:   { opt: [8, 20], ok: [4, 25], night: 8, dawn: 18, cloud: 8, wind: [6, 25] },
  bandar:  { opt: [10, 22], ok: [5, 26], night: -10, dawn: 12, cloud: 3, wind: [3, 22] },
  deverika:{ opt: [12, 24], ok: [7, 28], night: 5, dawn: 12, cloud: 0, wind: [3, 18] }
};

const H = 3600e3;
const parse = s => new Date(s);
const near = (t, ref, hrs) => ref && Math.abs(t - ref) <= hrs * H;

// Szolunáris időszakok egy napra: fő = hold delelése és alsó delelése (±1 óra), mellék = holdkelte és holdnyugta (±30 perc)
export function solunar(day, lat, lng) {
  if (!SC()) return { major: [], minor: [] };
  const d0 = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  let maxT = null, minT = null, maxA = -9, minA = 9;
  for (let m = 0; m < 24 * 60; m += 10) {
    const t = new Date(d0.getTime() + m * 60e3);
    const a = SC().getMoonPosition(t, lat, lng).altitude;
    if (a > maxA) { maxA = a; maxT = t; }
    if (a < minA) { minA = a; minT = t; }
  }
  const mt = SC().getMoonTimes(d0, lat, lng);
  const major = [maxT, minT].filter(Boolean).map(t => ({ center: t, from: new Date(t - H), to: new Date(+t + H) }));
  const minor = [mt.rise, mt.set].filter(Boolean).map(t => ({ center: t, from: new Date(t - H / 2), to: new Date(+t + H / 2) }));
  return { major: major.sort((a, b) => a.center - b.center), minor: minor.sort((a, b) => a.center - b.center) };
}

function moonPhaseAt(t) {
  if (SC()) return SC().getMoonIllumination(t).phase;
  return 0.5;
}

// Óránkénti pontszám a következő ~36 órára
// range: { from, to } – egy adott napra (túratervező); alapból most-1 óra … +36 óra
export function forecast(wx, lat, lng, speciesKey = 'general', range = null) {
  const sp = BITE_SPECIES[speciesKey] || BITE_SPECIES.general;
  const h = wx.hourly;
  const now = new Date();
  const times = h.time.map(parse);
  // Becsült vízhőmérséklet: az elmúlt 4 nap átlagos léghőmérséklete
  const past = times.map((t, i) => [t, h.temperature_2m[i]]).filter(([t]) => t <= now && t > now - 4 * 24 * H).map(x => x[1]);
  const water = past.length ? past.reduce((a, b) => a + b, 0) / past.length : null;
  const sunCache = {}, solCache = {};
  const dayKey = t => `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`;
  const sunOf = t => sunCache[dayKey(t)] || (sunCache[dayKey(t)] = SC() ? SC().getTimes(t, lat, lng) : {});
  const solOf = t => solCache[dayKey(t)] || (solCache[dayKey(t)] = solunar(t, lat, lng));

  const out = [];
  times.forEach((t, i) => {
    const lo = range ? range.from : now - H, hi = range ? range.to : +now + 36 * H;
    if (t < lo || t > hi) return;
    let s = 42;
    const reasons = [];
    // Víz- és léghőmérséklet (a víz lassan változik: a becsült víz és a pillanatnyi levegő keveréke)
    const temp = water != null ? water * 0.75 + h.temperature_2m[i] * 0.25 : h.temperature_2m[i];
    if (temp >= sp.opt[0] && temp <= sp.opt[1]) { s += 14; reasons.push('temp_good'); }
    else if (temp < sp.ok[0] || temp > sp.ok[1]) { s -= 18; reasons.push('temp_bad'); }
    // Légnyomás 12 órás változása
    const j = i - 12;
    const dp = j >= 0 ? h.surface_pressure[i] - h.surface_pressure[j] : 0;
    if (dp <= -1 && dp >= -4) { s += 10; reasons.push('p_fall'); }
    else if (dp < -4) { s -= 6; reasons.push('p_front'); }
    else if (dp > 3) { s -= 10; reasons.push('p_rise'); }
    else if (Math.abs(dp) < 1) { s += 4; reasons.push('p_stable'); }
    // Napszak
    const sun = sunOf(t);
    const isNight = sun.sunrise && sun.sunset ? (t < sun.sunrise || t > sun.sunset) : false;
    if (near(t, sun.sunrise, 1.5) || near(t, sun.sunset, 1.5)) { s += sp.dawn; reasons.push('dawn'); }
    else if (isNight) { s += sp.night; if (sp.night > 5) reasons.push('night'); }
    // Szolunáris időszakok
    const sol = solOf(t);
    if (sol.major.some(p => t >= p.from && t <= p.to)) { s += 9; reasons.push('major'); }
    else if (sol.minor.some(p => t >= p.from && t <= p.to)) { s += 5; reasons.push('minor'); }
    // Szél, felhő, csapadék
    const w = h.wind_speed_10m[i];
    if (w >= sp.wind[0] && w <= sp.wind[1]) s += 6; else if (w > 32) { s -= 15; reasons.push('wind_bad'); }
    if ((h.cloud_cover?.[i] ?? 0) > 60) s += sp.cloud;
    const code = h.weather_code[i];
    if ([95, 96, 99].includes(code)) { s -= 30; reasons.push('storm'); }
    else if ([51, 53, 61, 80].includes(code)) s += 3;
    // Újhold / telihold közelében enyhe plusz
    const ph = moonPhaseAt(t);
    if (Math.min(ph, Math.abs(ph - 0.5), 1 - ph) < 0.06) s += 3;
    s = Math.max(5, Math.min(95, Math.round(s)));
    out.push({ t, score: s, level: s >= 65 ? 'good' : s >= 45 ? 'mid' : 'low', reasons });
  });

  // A legjobb 3 időablak (2 órás blokkok, nem fedik egymást)
  const blocks = out.slice(0, -1).map((x, k) => ({ from: x.t, to: new Date(+out[k + 1].t + H), score: Math.round((x.score + out[k + 1].score) / 2), reasons: [...new Set([...x.reasons, ...out[k + 1].reasons])] }))
    .filter(b => b.to > now && (!range || +b.to - +b.from === 2 * H));
  const best = [];
  blocks.slice().sort((a, b) => b.score - a.score).forEach(b => {
    if (best.length < 3 && b.score >= 50 && !best.some(x => b.from < x.to && b.to > x.from)) best.push(b);
  });
  best.sort((a, b) => a.from - b.from);
  const cur = out.find(x => x.t <= now && +x.t + H > now) || out[0];
  const today = range ? new Date(range.from) : new Date();
  return { hours: out, best, current: cur, water, solunar: solOf(today) };
}
