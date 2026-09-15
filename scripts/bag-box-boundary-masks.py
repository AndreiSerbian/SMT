"""Rebuild bag_box recolor masks from the user's hand-drawn boundary reference.

Pink polyline  -> outer box silhouette (hard clip for MAIN and SIDE).
Orange polyline -> SIDE panel boundary.
Handles keep their authored mask and are layered on top of the body.

Outputs (geometry only; shading/tone maps untouched):
  masks/mask_box_silhouette.png
  masks/mask_main.png
  masks/mask_side.png
  web/weights.png   (R=MAIN, G=SIDE, B=HANDLES)
  web/mix.png       (R=alpha, G=slots, B=slot light)

  python3 scripts/bag-box-boundary-masks.py
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import (binary_closing, binary_dilation, binary_erosion,
                           binary_fill_holes, label, uniform_filter)

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'public/mockups/bag_box/default/photo_closed_45'
WEB = BASE / 'web'
MASKS = BASE / 'masks'
REF = Path('/mnt/user-uploads/Дизайн_без_названия.png')
LUMA = np.array([0.2126, 0.7152, 0.0722], np.float32)


def u8(a):
    return np.rint(np.clip(a, 0, 1) * 255).astype(np.uint8)


def read(path, mode='L'):
    return np.asarray(Image.open(path).convert(mode)).astype(np.float32) / 255


def largest(mask):
    lab, n = label(mask)
    if not n:
        return mask
    sizes = np.bincount(lab.ravel())
    sizes[0] = 0
    return lab == sizes.argmax()


def fill_outline(outline):
    """Close small gaps in a hand-drawn polyline and fill its interior."""
    closed = binary_closing(outline, np.ones((5, 5), bool))
    filled = binary_fill_holes(closed)
    return largest(filled)


def aa_edge(mask, photo_lum, width=1.0):
    """1-2px anti-aliased boundary derived from a hard mask (no widening)."""
    soft = uniform_filter(mask.astype(np.float32), size=3)
    inner = binary_erosion(mask, iterations=1)
    out = np.where(inner, 1.0, np.where(mask, np.clip(soft, 0.5, 1.0), 0.0))
    return np.clip(out, 0, 1)


def main():
    ref = np.asarray(Image.open(REF).convert('RGB')).astype(int)
    r, g, b = ref[..., 0], ref[..., 1], ref[..., 2]
    pink = (r > 180) & (g < 120) & (b > 120) & (r - g > 60) & (b - g > 30)
    orange = (r > 180) & (g > 90) & (g < 190) & (b < 110) & (r - b > 80) & (r - g > 40)

    handles = read(MASKS / 'mask_handles.png') > 0.5
    handles = binary_fill_holes(handles)

    # drop the gold handle blob from the orange extraction
    lab, n = label(binary_dilation(orange, iterations=1))
    keep = np.zeros_like(orange)
    hd = binary_dilation(handles, iterations=6)
    for i in range(1, n + 1):
        comp = lab == i
        if comp.sum() < 200:
            continue
        if (comp & hd).sum() / comp.sum() > 0.2:
            continue
        keep |= comp & binary_dilation(orange, iterations=1)
    orange = keep

    silhouette = fill_outline(pink)
    side = fill_outline(orange) & silhouette
    main_z = silhouette & ~binary_erosion(side, iterations=1)

    photo = read(WEB / 'source.png', 'RGB')
    lum = photo @ LUMA

    sil_a = aa_edge(silhouette, lum)
    side_a = aa_edge(side, lum)
    main_a = np.clip(aa_edge(main_z, lum) - side_a, 0, 1)
    hand_a = aa_edge(handles, lum)

    # body weights: SIDE wins inside its panel, MAIN elsewhere; handles on top
    body = np.clip(1 - hand_a, 0, 1)
    w_side = side_a * sil_a * body
    w_main = main_a * sil_a * body
    w_hand = hand_a

    total = w_main + w_side + w_hand
    scale = np.where(total > 1, 1 / np.maximum(total, 1e-6), 1.0)
    w_main, w_side, w_hand = w_main * scale, w_side * scale, w_hand * scale

    alpha = np.clip(w_main + w_side + w_hand, 0, 1)

    mix = read(WEB / 'mix.png', 'RGB')
    slots = np.minimum(mix[..., 1], np.clip(alpha - w_hand, 0, 1))
    slot_light = mix[..., 2] * (slots > 0.01)

    Image.fromarray(u8(silhouette.astype(np.float32))).save(MASKS / 'mask_box_silhouette.png')
    Image.fromarray(u8(main_a)).save(MASKS / 'mask_main.png')
    Image.fromarray(u8(side_a)).save(MASKS / 'mask_side.png')
    Image.fromarray(u8(np.dstack([w_main, w_side, w_hand]))).save(WEB / 'weights.png')
    Image.fromarray(u8(np.dstack([alpha, slots, slot_light]))).save(WEB / 'mix.png')

    print({'silhouette_px': int(silhouette.sum()), 'side_px': int(side.sum()),
           'handles_px': int(handles.sum()),
           'body_outside_silhouette': int((((w_main + w_side) > 0.02) & ~binary_dilation(silhouette)).sum())})


if __name__ == '__main__':
    main()
