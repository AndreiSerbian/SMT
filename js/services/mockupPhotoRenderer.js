/**
 * mockupPhotoRenderer — 3-зонная перекраска фото-мокапа (MAIN / SIDE / BOW).
 *
 * Использует утверждённые ассеты последней успешной версии:
 *   zone_map.png — R = MAIN SHELL, G = SIDEWALLS, B = BOW (мягкая alpha по краю)
 *   shading.png  — нормализованная светотень исходной фотографии
 *
 * Маски не пересобираются: карта зон уже включает gap-fix (корпус — сплошной
 * слой под бантом), поэтому белых проплешин и перетекания цвета нет.
 */

const SHADE_MAX = 2.2;
const BOW_SHADE_MAX = 1.25;

function hexToRgb(hex) {
  const h = String(hex || '#cccccc').replace('#', '');
  const v = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  return [
    parseInt(v.slice(0, 2), 16) || 0,
    parseInt(v.slice(2, 4), 16) || 0,
    parseInt(v.slice(4, 6), 16) || 0
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
  return ctx.getImageData(0, 0, c.width, c.height);
}

export function createPhotoRenderer(view) {
  let zone = null;
  let shade = null;
  let bowShade = null;
  let width = 0;
  let height = 0;
  let out = null;

  async function load() {
    const imageLoads = [
      loadImage(view.zone_map),
      loadImage(view.shading)
    ];
    if (view.bow_shading) imageLoads.push(loadImage(view.bow_shading));
    const [zImg, sImg, bImg] = await Promise.all(imageLoads);
    const z = readPixels(zImg);
    const s = readPixels(sImg);
    width = z.width;
    height = z.height;
    zone = z.data;
    shade = s.data;
    bowShade = bImg ? readPixels(bImg).data : null;
    out = new ImageData(width, height);
  }

  function ribbonChannel(base, factor) {
    const highlight = Math.max(0, factor - 1);
    const colouredLift = (255 - base) * highlight * 0.18;
    return Math.min(255, base * factor + colouredLift);
  }

  function render(canvas, colors) {
    if (!zone || !canvas) return;
    canvas.width = width;
    canvas.height = height;
    const main = hexToRgb(colors.main);
    const side = hexToRgb(colors.side);
    const bow = hexToRgb(colors.bow);
    const d = out.data;
    const n = width * height;
    for (let i = 0; i < n; i++) {
      const p = i * 4;
      const wm = zone[p] / 255;
      const ws = zone[p + 1] / 255;
      const wb = zone[p + 2] / 255;
      const alpha = 1 - (1 - wm) * (1 - ws) * (1 - wb);
      const sh = (shade[p] / 255) * SHADE_MAX;
      let r = 255, g = 255, b = 255;
      if (wm > 0) {
        r = r * (1 - wm) + Math.min(255, main[0] * sh) * wm;
        g = g * (1 - wm) + Math.min(255, main[1] * sh) * wm;
        b = b * (1 - wm) + Math.min(255, main[2] * sh) * wm;
      }
      if (ws > 0) {
        r = r * (1 - ws) + Math.min(255, side[0] * sh) * ws;
        g = g * (1 - ws) + Math.min(255, side[1] * sh) * ws;
        b = b * (1 - ws) + Math.min(255, side[2] * sh) * ws;
      }
      if (wb > 0) {
        // The photographed ribbon needs softer continuous folds than the box.
        // Its dedicated map removes baked tonal steps while preserving the
        // approved silhouette, knot, loops and tails pixel-for-pixel.
        const ribbonShade = bowShade
          ? (bowShade[p] / 255) * BOW_SHADE_MAX
          : sh;
        r = r * (1 - wb) + ribbonChannel(bow[0], ribbonShade) * wb;
        g = g * (1 - wb) + ribbonChannel(bow[1], ribbonShade) * wb;
        b = b * (1 - wb) + ribbonChannel(bow[2], ribbonShade) * wb;
      }
      // Карта раньше была сведена с белым фоном. Возвращаем цвет силуэта
      // из этой композиции и оставляем фон прозрачным, чтобы единый фон
      // preview-area был виден также у коробки с лентой.
      if (alpha > 0) {
        d[p] = Math.max(0, Math.min(255, (r - 255 * (1 - alpha)) / alpha));
        d[p + 1] = Math.max(0, Math.min(255, (g - 255 * (1 - alpha)) / alpha));
        d[p + 2] = Math.max(0, Math.min(255, (b - 255 * (1 - alpha)) / alpha));
        d[p + 3] = Math.round(alpha * 255);
      } else {
        d[p] = d[p + 1] = d[p + 2] = d[p + 3] = 0;
      }
    }
    canvas.getContext('2d').putImageData(out, 0, 0);
  }

  return { load, render };
}

export default { createPhotoRenderer };
