"""Bake the approved D recolor pipeline of the magnetic box into static browser maps.

Reads the approved cutout/masks, reproduces the tonal maps used by method D in
scripts/magnet-box-recolor-experiment.py, cleans photographic noise/blotches and
emphasises the magnetic-lid construction seams, then writes the PNG maps consumed
by js/services/magnetPhotoRenderer.js. No mask or source asset is modified.
"""
import importlib.util
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, median_filter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/mockups/magnet_box/default/photo_closed_45/web'

spec = importlib.util.spec_from_file_location(
    'magnet_experiment', ROOT / 'scripts/magnet-box-recolor-experiment.py')
exp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exp)

DETAIL_SCALE = 5.0


def to_u8(a):
    return np.rint(np.clip(a, 0, 1) * 255).astype(np.uint8)


def smooth_tone(channel):
    """Remove blotches without flattening the photographic gradient.

    A median pass kills isolated stains/speckles, a small gaussian removes the
    residual median staircase; broad form is untouched because both kernels are
    far smaller than the lighting gradients.
    """
    cleaned = median_filter(channel, size=7, mode='nearest')
    return np.clip(gaussian_filter(cleaned, 1.2), 0, 1)


def clean_detail(detail):
    """Keep paper micro-texture, drop sensor noise and dirt specks."""
    med = median_filter(detail, size=3, mode='nearest')
    # soft threshold: values below the noise floor collapse to zero
    floor = 0.012
    shrunk = np.sign(med) * np.maximum(np.abs(med) - floor, 0)
    return np.clip(gaussian_filter(shrunk, 0.4) * 0.75, -0.06, 0.06)


def structure(lum, alpha):
    """Extract lid seams / construction creases from the photograph."""
    band = gaussian_filter(lum, 1.0) - gaussian_filter(lum, 5.0)
    inside = alpha > 0.5
    scale = max(np.percentile(np.abs(band[inside]), 99), 1e-4)
    norm = np.clip(band / scale, -1, 1)
    dark = np.clip(-norm, 0, 1) ** 1.3
    light = np.clip(norm, 0, 1) ** 1.3
    # only keep decisive linear features, not soft tonal wobble
    dark = np.where(dark > 0.30, dark, 0.0)
    light = np.where(light > 0.35, light, 0.0)
    return gaussian_filter(dark, 0.35), gaussian_filter(light, 0.35)


def masked_blur(channel, mask, sigma):
    """Normalised convolution: blur inside the zone without pulling outside tones."""
    num = gaussian_filter(channel * mask, sigma)
    den = gaussian_filter(mask, sigma)
    return np.where(den > 1e-4, num / np.maximum(den, 1e-4), channel)


def flatten_panel(channel, mask, interior, sigma=22.0, strength=0.80):
    """Let each panel keep its lighting gradient but lose low-frequency stains.

    Inside the panel the map is pulled toward its own broad average; near the
    borders the original values stay so edges, rims and seams are untouched.
    """
    broad = masked_blur(channel, mask, sigma)
    w = interior * strength
    return np.clip(channel * (1 - w) + broad * w, 0, 1)


def main():
    data = exp.load_inputs()
    OUT.mkdir(parents=True, exist_ok=True)

    seam_dark, seam_light = structure(data['lum'], data['alpha'])

    for zone, name in enumerate(('tone_main', 'tone_side')):
        m = data['maps'][zone]
        mask = (data['masks'][..., zone] > 0.5).astype(np.float64)
        # interior = away from every panel border, so rims keep their contrast
        interior = np.clip(gaussian_filter(mask, 5.0) * 1.6 - 0.6, 0, 1) * mask
        channels = []
        for ch in ('normalized', 'shadows', 'highlights', 'midtones'):
            channels.append(flatten_panel(smooth_tone(m[ch]), mask, interior))
        normalized, shadows, highlights, midtones = channels
        # re-assert the construction: seams darken, their lit lip keeps a highlight
        shadows = np.clip(shadows + 0.85 * seam_dark, 0, 1)
        highlights = np.clip(highlights + 0.45 * seam_light, 0, 1)
        img = np.dstack([to_u8(normalized), to_u8(shadows),

                         to_u8(highlights), to_u8(midtones)])
        Image.fromarray(img, 'RGBA').save(OUT / f'{name}.png')

    detail = np.clip(clean_detail(data['detail']) * DETAIL_SCALE + 0.5, 0, 1)
    mix = np.dstack([
        to_u8(data['weights'][..., 0]), to_u8(data['weights'][..., 1]),
        to_u8(detail), to_u8(data['alpha'])
    ])
    Image.fromarray(mix, 'RGBA').save(OUT / 'mix.png')

    meta = {
        'size': list(Image.open(exp.INPUT / 'cutout.png').size),
        'detail_scale': DETAIL_SCALE,
        'fingerprints': data['fingerprints'],
    }
    (OUT / 'maps.json').write_text(json.dumps(meta, indent=2), encoding='utf-8')
    print(json.dumps(meta, indent=2))


if __name__ == '__main__':
    main()
