/**
 * magnetPhotoRenderer — фото-перекраска магнитной коробки (MAIN / SIDE).
 *
 * Портирован вариант D из scripts/magnet-box-recolor-experiment.py.
 * Тональные карты заранее запечены в .../photo_closed_45/web/:
 *   tone_main.png — R/G/B/A = форма / тени / блики / полутона зоны MAIN
 *   tone_side.png — то же для боковушки
 *   mix.png       — R/G = веса зон, B = микрофактура (0.5 = ноль), A = альфа выреза
 */

const LUMA = [0.2126, 0.7152, 0.0722];
const DETAIL_SCALE = 5;

const TO_LINEAR = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const v = i / 255;
  TO_LINEAR[i] = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearToSrgb(v) {
  if (v <= 0) return 0;
  if (v >= 1) return 255;
  const s = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return s * 255;
}

function hexToSrgb01(hex) {
  const h = String(hex || '#cccccc').replace('#', '');
  const v = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  return [
    (parseInt(v.slice(0, 2), 16) || 0) / 255,
    (parseInt(v.slice(2, 4), 16) || 0) / 255,
    (parseInt(v.slice(4, 6), 16) || 0) / 255
  ];
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image load failed: ${src}`));
    img.src = src;
  });
}

function readPixels(img) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, c.width, c.height).data;
}

function zoneParams(hex, zone) {
  const srgb = hexToSrgb01(hex);
  const color = srgb.map(v => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  const brightness = srgb[0] * LUMA[0] + srgb[1] * LUMA[1] + srgb[2] * LUMA[2];

  let base, kForm, kMid, kHigh, kShadow, liftColor, liftGain, detailGain, floor, ceiling;
  if (brightness < 0.35) {
    base = 0.58; kForm = 0.35; kMid = 0.30; kHigh = 0.34; kShadow = 0.18;
    liftColor = color.map(c => c * 0.62 + 0.055);
    liftGain = 0.38 - 0.14 * brightness;
    detailGain = 0.82; floor = 0.46; ceiling = 1.48;
  } else if (brightness > 0.78) {
    base = 0.91; kForm = 0.09; kMid = 0.07; kHigh = 0.075; kShadow = 0.085;
    liftColor = color.slice();
    liftGain = 0.018;
    detailGain = 0.30; floor = 0.82; ceiling = 1.16;
  } else {
    base = 0.69; kForm = 0.27; kMid = 0.20; kHigh = 0.22; kShadow = 0.15;
    liftColor = color.slice();
    liftGain = 0.045;
    detailGain = 0.58; floor = 0.58; ceiling = 1.36;
  }
  // Боковушка утоплена: чуть глубже тон и мягче блик.
  const shadeScale = zone === 1 ? 0.94 : 1;
  if (zone === 1) liftGain *= 0.90;
  const microGain = brightness < 0.78 ? 0.18 : 0.08;
  return { color, base, kForm, kMid, kHigh, kShadow, liftColor, liftGain,
    detailGain, floor, ceiling, shadeScale, microGain };
}

export function createMagnetRenderer(view) {
  const maps = view.maps || {};
  let toneMain, toneSide, mix, out;
  let width = 0, height = 0;

  async function load() {
    const imgs = await Promise.all([
      loadImage(maps.tone_main), loadImage(maps.tone_side), loadImage(maps.mix)
    ]);
    width = imgs[0].naturalWidth;
    height = imgs[0].naturalHeight;
    [toneMain, toneSide, mix] = imgs.map(readPixels);
    out = new ImageData(width, height);
  }

  function render(canvas, colors) {
    if (!mix || !canvas) return;
    canvas.width = width;
    canvas.height = height;
    const zones = [zoneParams(colors.main, 0), zoneParams(colors.side, 1)];
    const tones = [toneMain, toneSide];
    const d = out.data;
    const n = width * height;

    for (let i = 0; i < n; i++) {
      const p = i * 4;
      const alpha = mix[p + 3];
      if (alpha === 0) { d[p] = d[p + 1] = d[p + 2] = d[p + 3] = 0; continue; }
      const detail = (mix[p + 2] / 255 - 0.5) / DETAIL_SCALE;
      let r = 0, g = 0, b = 0;

      for (let z = 0; z < 2; z++) {
        const w = mix[p + z] / 255;
        if (w <= 0) continue;
        const q = zones[z];
        const t = tones[z];
        const form = t[p] / 255;
        const shadow = t[p + 1] / 255;
        const high = t[p + 2] / 255;
        const mid = t[p + 3] / 255;

        let shade = q.base + q.kForm * form + q.kMid * mid + q.kHigh * high - q.kShadow * shadow;
        shade *= q.shadeScale;
        shade = Math.min(q.ceiling, Math.max(q.floor, shade + detail * q.detailGain));
        const lift = high * q.liftGain;
        const micro = detail * q.microGain;
        r += w * Math.min(1, Math.max(0, q.color[0] * shade + q.liftColor[0] * lift + q.color[0] * micro));
        g += w * Math.min(1, Math.max(0, q.color[1] * shade + q.liftColor[1] * lift + q.color[1] * micro));
        b += w * Math.min(1, Math.max(0, q.color[2] * shade + q.liftColor[2] * lift + q.color[2] * micro));
      }

      d[p] = linearToSrgb(r);
      d[p + 1] = linearToSrgb(g);
      d[p + 2] = linearToSrgb(b);
      d[p + 3] = alpha;
    }
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    ctx.putImageData(out, 0, 0);
  }

  return { load, render };
}

export default { createMagnetRenderer };
