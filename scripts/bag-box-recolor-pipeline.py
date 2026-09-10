"""Recolor pipeline for the bag box (box with handles) photo mockup.

Experiment result: variant C (flat colour base + normalised shading + detail
texture + highlight compensation) is the reference pipeline for this model.
Zones are unchanged: MAIN / SIDE / HANDLES. Handle slots are excluded from
HANDLES by luminance so they never take the handle colour.

Usage: python3 scripts/bag-box-recolor-pipeline.py out.png "#1b1b1b" "#141414" "#c8a24a"
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

BASE = 'public/mockups/bag_box/default/photo_closed_45/'
SLOT_LUMA = 0.55          # darker pixels inside the handle mask are cut-out slots
SHADOW_FLOOR = 0.55       # how dark the deepest shadow may go
SHADOW_GAIN = 0.45
NORM_PERCENTILE = 88      # luminance level that renders as the pure target colour
SPEC_DARK, SPEC_LIGHT = 0.9, 0.5


def load():
    src = np.asarray(Image.open(BASE + 'source.webp').convert('RGB'), np.float32) / 255.
    masks = {z: np.asarray(Image.open(f'{BASE}masks/mask_{z}.png').convert('L'), np.float32) / 255.
             for z in ('main', 'side', 'handles')}
    lum = src.max(2) * 0.5 + src.mean(2) * 0.5
    masks['handles'] = np.where((lum < SLOT_LUMA) & (masks['handles'] > 0.5), 0., masks['handles'])
    blur = np.asarray(Image.fromarray((lum * 255).astype(np.uint8))
                      .filter(ImageFilter.GaussianBlur(6)), np.float32) / 255.
    return src, masks, lum, lum - blur


def hex_to_rgb(value):
    v = value.lstrip('#')
    return np.array([int(v[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255.


def recolor_zone(colour, mask, lum, detail):
    inside = mask > 0.5
    lo = float(np.percentile(lum[inside], 5)) if inside.any() else 0.4
    hi = float(np.percentile(lum[inside], 97)) if inside.any() else 1.0
    norm = np.clip((lum - lo) / max(hi - lo, 1e-3), 0, 1)
    shade = SHADOW_FLOOR + SHADOW_GAIN * norm ** 0.85
    if inside.any():                       # compensate the white source: mid-tones read as full colour
        shade = shade / max(float(np.percentile(shade[inside], NORM_PERCENTILE)), 1e-3)
    brightness = float(colour.mean())
    out = colour[None, None, :] * shade[..., None]
    out = out + detail[..., None] * (0.5 + 0.5 * (1 - brightness))
    spec = np.clip((lum - hi) / max(1 - hi, 1e-3), 0, 1)[..., None]
    out = out + (1 - out) * spec * (SPEC_DARK if brightness < 0.6 else SPEC_LIGHT)
    return np.clip(out, 0, 1)


def render(main_hex, side_hex, handles_hex):
    src, masks, lum, detail = load()
    out = np.ones_like(src)
    for zone, colour in (('main', main_hex), ('side', side_hex), ('handles', handles_hex)):
        mask = masks[zone][..., None]
        out = out * (1 - mask) + recolor_zone(hex_to_rgb(colour), masks[zone], lum, detail) * mask
    return Image.fromarray((out * 255).astype(np.uint8))


if __name__ == '__main__':
    target, main_c, side_c, handle_c = sys.argv[1:5]
    render(main_c, side_c, handle_c).save(target)
