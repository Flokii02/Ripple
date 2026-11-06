// Verseny-pontozás: helyezés össztömeg / legnagyobb hal / darabszám szerint, szektorokkal
export function rankEntries(entries, comp) {
  const list = (entries || []).filter(e => e.status === 'approved').map(e => ({ ...e, total: +e.total || 0, fish: +e.fish || 0, biggest: +e.biggest || 0 }));
  const sc = comp?.scoring || 'weight';
  const val = e => sc === 'biggest' ? e.biggest : sc === 'count' ? e.fish : e.total;
  const tie = e => sc === 'weight' ? e.biggest : e.total;
  const cmp = (a, b) => (val(b) - val(a)) || (tie(b) - tie(a));
  const place = (arr, field) => {
    arr.sort((a, b) => cmp(a, b) || String(a.name).localeCompare(String(b.name)));
    arr.forEach((e, i) => { e[field] = i > 0 && cmp(arr[i - 1], e) === 0 ? arr[i - 1][field] : i + 1; });
  };
  const sectors = (comp?.sectors || 1) > 1;
  if (sectors) {
    const groups = {};
    list.forEach(e => { (groups[e.sector || 0] ||= []).push(e); });
    Object.values(groups).forEach(g => place(g, 'sPlace'));
    // Összesítés: előbb a szektorhelyezés (kisebb a jobb), aztán az eredmény
    list.sort((a, b) => (a.sPlace - b.sPlace) || cmp(a, b) || String(a.name).localeCompare(String(b.name)));
    list.forEach((e, i) => { const p = list[i - 1]; e.place = p && p.sPlace === e.sPlace && cmp(p, e) === 0 ? p.place : i + 1; });
  } else place(list, 'place');
  const big = list.reduce((m, e) => (e.biggest > (m?.biggest || 0) ? e : m), null);
  return { list, big, value: val };
}

export const fmtKg = v => (Math.round((+v || 0) * 1000) / 1000).toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
