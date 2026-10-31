// Megosztható fogás-kártya (1080×1350 kép) – Instagram / Viber / Facebook
import { t, speciesName } from './i18n.js';
import { fmtDate, toast } from './ui.js';

function loadImg(src) {
  return new Promise(res => {
    if (!src) return res(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}

function rounded(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

function drawBobber(g, cx, cy, s) {
  g.save(); g.translate(cx, cy); g.scale(s, s);
  g.strokeStyle = '#fff'; g.lineWidth = 3; g.lineCap = 'round';
  g.beginPath(); g.moveTo(0, -28); g.lineTo(0, -17); g.stroke();
  g.fillStyle = '#E2A73E'; g.beginPath(); g.ellipse(0, -4, 9, 13, 0, Math.PI, 0); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, -4, 9, 13, 0, 0, Math.PI); g.fill();
  g.globalAlpha = .8; g.lineWidth = 2.8; g.beginPath(); g.ellipse(0, 14, 16, 4, 0, 0, Math.PI * 2); g.stroke();
  g.globalAlpha = .4; g.lineWidth = 2.4; g.beginPath(); g.ellipse(0, 16, 27, 7, 0, 0, Math.PI * 2); g.stroke();
  g.restore();
}

function fit(g, text, max, size, weight = 700, fam = 'Outfit, system-ui, sans-serif') {
  let s = size;
  do { g.font = `${weight} ${s}px ${fam}`; s -= 2; } while (g.measureText(text).width > max && s > 20);
}

export async function catchCardBlob(c, photoUrl, waterName) {
  const W = 1080, H = 1350;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  try { await document.fonts?.ready; } catch (e) {}
  // Háttér
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0E2A3B'); bg.addColorStop(1, '#13475A');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // Fotó
  const img = await loadImg(photoUrl);
  const px = 60, py = 60, pw = W - 120, ph = 860;
  g.save(); rounded(g, px, py, pw, ph, 36); g.clip();
  if (img) {
    const sc = Math.max(pw / img.width, ph / img.height);
    const iw = img.width * sc, ih = img.height * sc;
    g.drawImage(img, px + (pw - iw) / 2, py + (ph - ih) / 2, iw, ih);
  } else {
    const fb = g.createLinearGradient(0, py, 0, py + ph); fb.addColorStop(0, '#1F7A8C'); fb.addColorStop(1, '#0E2A3B');
    g.fillStyle = fb; g.fillRect(px, py, pw, ph);
    g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 10;
    g.beginPath(); g.ellipse(W / 2, py + ph / 2, 220, 110, 0, 0, Math.PI * 2); g.stroke();
  }
  const sh = g.createLinearGradient(0, py + ph - 260, 0, py + ph); sh.addColorStop(0, 'rgba(14,42,59,0)'); sh.addColorStop(1, 'rgba(14,42,59,.85)');
  g.fillStyle = sh; g.fillRect(px, py + ph - 260, pw, 260);
  g.restore();
  // Faj + súly a fotó alján
  g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
  fit(g, speciesName(c.species), pw - 80, 96);
  g.fillText(speciesName(c.species), px + 44, py + ph - 52);
  // Adatok
  const facts = [];
  if (c.weight_kg) facts.push([Number(c.weight_kg).toLocaleString('sr-RS'), t('kg')]);
  if (c.length_cm) facts.push([Number(c.length_cm).toLocaleString('sr-RS'), t('cm')]);
  let x = 60; const y = 1030;
  facts.forEach(([v, u]) => {
    g.font = '700 110px Outfit, system-ui, sans-serif'; g.fillStyle = '#E2A73E'; g.fillText(v, x, y);
    const vw = g.measureText(v).width;
    g.font = '600 46px Outfit, system-ui, sans-serif'; g.fillStyle = '#fff'; g.fillText(u, x + vw + 12, y);
    x += vw + 12 + g.measureText(u).width + 60;
  });
  g.fillStyle = 'rgba(255,255,255,.85)';
  const line2 = [waterName, fmtDate(c.caught_at)].filter(Boolean).join(' · ');
  fit(g, line2, W - 120, 44, 500, 'Inter, system-ui, sans-serif');
  g.fillText(line2, 60, facts.length ? 1110 : 1040);
  if (c.released) {
    g.font = '600 36px Inter, system-ui, sans-serif'; g.fillStyle = '#7FD1AE';
    g.fillText('✓ ' + t('released'), 60, facts.length ? 1170 : 1100);
  }
  // Márka
  g.strokeStyle = 'rgba(255,255,255,.15)'; g.lineWidth = 2; g.beginPath(); g.moveTo(60, 1220); g.lineTo(W - 60, 1220); g.stroke();
  drawBobber(g, 96, 1282, 1.1);
  g.fillStyle = '#fff'; g.font = '700 48px Outfit, system-ui, sans-serif'; g.fillText('Ripple', 140, 1298);
  g.font = '500 30px Inter, system-ui, sans-serif'; g.fillStyle = 'rgba(255,255,255,.7)';
  const u = 'flokii02.github.io/Ripple'; g.fillText(u, W - 60 - g.measureText(u).width, 1294);
  return new Promise(res => cv.toBlob(res, 'image/jpeg', 0.9));
}

export async function shareCatchCard(c, photoUrl, waterName) {
  toast(t('loading'));
  const blob = await catchCardBlob(c, photoUrl, waterName);
  if (!blob) { toast(t('error'), 'err'); return; }
  const file = new File([blob], `ripple-${c.species}-${Date.now().toString(36)}.jpg`, { type: 'image/jpeg' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Ripple', text: `${speciesName(c.species)} – Ripple` }); return; }
    catch (e) { if (e?.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast(t('card_saved'));
}
