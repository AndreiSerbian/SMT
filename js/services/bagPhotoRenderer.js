/**
 * bagPhotoRenderer — перекраска фото-мокапа коробки-сумки (MAIN / SIDE / HANDLES).
 *
 * Портирован pipeline C из scripts/bag-box-recolor-pipeline.py.
 * Все тяжёлые расчёты (формы плоскостей, светотень, детали, веса зон, прорези)
 * заранее запечены в статические карты в .../photo_closed_45/web/:
 *   form.png    — R/G/B = форма плоскостей MAIN / SIDE / HANDLES
 *   aux.png     — R = тени, G = блики, B = кромочное затемнение боковины
 *   weights.png — R/G/B = веса зон
 *   mix.png     — R = alpha корпуса, G = прорези, B = свет в прорезях
 *   detail.png  — фактура (0.5 = ноль)
 *   source.png  — исходное фото (фон и края вне силуэта)
 */

const LUMA = [0.2126, 0.7152, 0.0722];

function hexToRgb01(hex) {
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

export function createBagRenderer(view) {
  const maps = view.maps || {};
  let form, aux, weights, mix, detail, src, out;
  let width = 0, height = 0;

  async function load() {
    const imgs = await Promise.all([
      loadImage(maps.form), loadImage(maps.aux), loadImage(maps.weights),
      loadImage(maps.mix), loadImage(maps.detail), loadImage(maps.source)
    ]);
    width = imgs[0].naturalWidth;
    height = imgs[0].naturalHeight;
    [form, aux, weights, mix, detail, src] = imgs.map(readPixels);
    out = new ImageData(width, height);
  }

  function zoneParams(hex, zone) {
    const c = hexToRgb01(hex);
    const brightness = c[0] * LUMA[0] + c[1] * LUMA[1] + c[2] * LUMA[2];
    return {
      c,
      brightness,
      dark: brightness < 0.35,
      handleGain: brightness < 0.45 ? 0.5 : 0.34,
      detailGain: zone === 2 ? 0.16 : (zone === 1 ? 0.34 : 0.46),
      shadeMin: brightness < 0.35 ? 0.42 : 0.68,
      lift: (brightness < 0.35 ? 0.12 : 0.025) * (1 - brightness)
    };
  }

  function render(canvas, colors) {
    if (!form || !canvas) return;
    canvas.width = width;
    canvas.height = height;
    const zones = [zoneParams(colors.main, 0), zoneParams(colors.side, 1), zoneParams(colors.handles, 2)];
    const d = out.data;
    const n = width * height;
    for (let i = 0; i < n; i++) {
      const p = i * 4;
      const alpha = mix[p] / 255;
      const slots = mix[p + 1] / 255;
      const slotLight = 0.16 + (mix[p + 2] / 255) * 0.12;
      const ash = aux[p] / 255;
      const ahl = aux[p + 1] / 255;
      const edge = 0.72 + (aux[p + 2] / 255) * 0.28;
      const det = (detail[p] / 255) * 2 - 1;
      const texture = det * 0.16;

      let pr = 0, pg = 0, pb = 0;
      for (let z = 0; z < 3; z++) {
        const w = weights[p + z] / 255;
        if (w <= 0) continue;
        const q = zones[z];
        const f = form[p + z] / 255;
        let shade;
        if (z === 2) {
          shade = 0.62 + q.handleGain * f;
        } else if (q.dark) {
          shade = 0.58 + 0.82 * f + 0.18 * ahl - 0.16 * ash;
        } else if (q.brightness > 0.78) {
          shade = 0.90 + 0.13 * f + 0.035 * ahl - 0.10 * ash;
        } else {
          shade = 0.70 + 0.48 * f + 0.08 * ahl - 0.14 * ash;
        }
        if (z === 1) shade *= edge;
        shade = Math.min(1.48, Math.max(q.shadeMin, shade + texture * q.detailGain));
        const lift = ahl * q.lift;
        pr += w * Math.min(1, q.c[0] * shade + q.c[0] * lift);
        pg += w * Math.min(1, q.c[1] * shade + q.c[1] * lift);
        pb += w * Math.min(1, q.c[2] * shade + q.c[2] * lift);
      }

      let r = (src[p] / 255) * (1 - alpha) + pr * alpha;
      let g = (src[p + 1] / 255) * (1 - alpha) + pg * alpha;
      let b = (src[p + 2] / 255) * (1 - alpha) + pb * alpha;

      if (slots > 0) {
        const m = zones[0].c;
        const k = 0.18 + 0.28 * slotLight;
        const add = slotLight * 0.035;
        r = r * (1 - slots) + (m[0] * k + add) * slots;
        g = g * (1 - slots) + (m[1] * k + add) * slots;
        b = b * (1 - slots) + (m[2] * k + add) * slots;
      }

      // У исходного фото был белый фон. Убираем его из результата и
      // оставляем только силуэт, чтобы общий preview background работал
      // одинаково для сумки, банта и магнитной коробки.
      if (alpha > 0) {
        d[p] = Math.max(0, Math.min(255, ((r - (1 - alpha)) / alpha) * 255));
        d[p + 1] = Math.max(0, Math.min(255, ((g - (1 - alpha)) / alpha) * 255));
        d[p + 2] = Math.max(0, Math.min(255, ((b - (1 - alpha)) / alpha) * 255));
        d[p + 3] = Math.round(alpha * 255);
      } else {
        d[p] = d[p + 1] = d[p + 2] = d[p + 3] = 0;
      }
    }
    canvas.getContext('2d').putImageData(out, 0, 0);
  }

  return { load, render };
}

export default { createBagRenderer };
