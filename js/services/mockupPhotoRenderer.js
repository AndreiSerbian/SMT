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
  let width = 0;
  let height = 0;
  let out = null;

  async function load() {
    const [zImg, sImg] = await Promise.all([
      loadImage(view.zone_map),
      loadImage(view.shading)
    ]);
    const z = readPixels(zImg);
    const s = readPixels(sImg);
    width = z.width;
    height = z.height;
    zone = z.data;
    shade = s.data;
    out = new ImageData(width, height);
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
        r = r * (1 - wb) + Math.min(255, bow[0] * sh) * wb;
        g = g * (1 - wb) + Math.min(255, bow[1] * sh) * wb;
        b = b * (1 - wb) + Math.min(255, bow[2] * sh) * wb;
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
