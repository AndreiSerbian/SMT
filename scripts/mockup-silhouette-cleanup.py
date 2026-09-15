"""Clip recolor zone maps to the real photographic silhouette of each box.

Diagnostics showed colour spilling past the object contour and the continuous
MAIN underlay leaking a coloured rim over SIDE / HANDLES / BOW boundaries on
high-contrast colour tests.

The fix is purely geometric and idempotent:

1. Build the object's alpha matte from the photograph (hard core + photographic
   anti-aliased edge band). Nothing outside it may ever receive colour.
2. Re-assign the thin edge band to the nearest interior zone, so the outer
   contour keeps the colour of the plane it belongs to instead of the MAIN
   underlay.
3. Clip every zone weight / alpha to that matte and renormalise.

Shading, tonal maps, geometry, composition and source masks are untouched:
only alpha and per-zone weights are rewritten.

  python3 scripts/mockup-silhouette-cleanup.py
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import (binary_dilation, binary_erosion, binary_fill_holes,
                           distance_transform_edt, label)

ROOT = Path(__file__).resolve().parents[1]
MOCK = ROOT / 'public/mockups'
LUMA = np.array([0.2126, 0.7152, 0.0722], np.float32)


def read(path, mode='RGBA'):
    return np.asarray(Image.open(path).convert(mode)).astype(np.float32) / 255


def u8(a):
    return np.rint(np.clip(a, 0, 1) * 255).astype(np.uint8)


def largest_component(mask):
    lab, n = label(mask)
    if not n:
        return mask
    sizes = np.bincount(lab.ravel())
    sizes[0] = 0
    return lab == sizes.argmax()


def photo_edge_alpha(rgb, white=0.996, solid=0.955):
    """Anti-aliased coverage of an object photographed on a white sweep."""
    lum = rgb[..., :3] @ LUMA
    return np.clip((white - lum) / max(white - solid, 1e-4), 0, 1)


def silhouette_from_masks(zone_stack, rgb):
    """Hard core from the authored zones, AA edge from the photograph."""
    union = zone_stack.max(axis=2) > 0.5
    union = binary_fill_holes(union)
    core = binary_erosion(union, iterations=1)
    band = binary_dilation(union, iterations=1) & ~core
    matte = core.astype(np.float32)
    matte[band] = photo_edge_alpha(rgb)[band]
    return np.clip(matte, 0, 1)


def reassign_edge(zone_stack, matte, core_thr=0.985):
    """Edge pixels inherit the zone of the nearest solid interior pixel."""
    inside = matte > 0.02
    core = (matte >= core_thr) & (zone_stack.max(axis=2) > 0.5)
    core = binary_erosion(core, iterations=1) | (core & ~binary_dilation(~core, iterations=1))
    if not core.any():
        core = zone_stack.max(axis=2) > 0.5
    owner = zone_stack.argmax(axis=2)
    _, idx = distance_transform_edt(~core, return_indices=True)
    nearest = owner[idx[0], idx[1]]
    out = np.zeros_like(zone_stack)
    band = inside & ~core
    for z in range(zone_stack.shape[2]):
        keep = core & (owner == z)
        take = band & (nearest == z)
        out[..., z] = np.where(keep | take, 1.0, 0.0)
    total = out.sum(axis=2, keepdims=True)
    out = np.divide(out, np.maximum(total, 1e-6)) * matte[..., None]
    return out


# --------------------------------------------------------------- bow box
def clean_bow():
    base = MOCK / 'bow_box/default/photo_closed_45'
    src = read(base / 'source.png')
    zone = read(base / 'zone_map.png')
    stack = zone[..., :3].copy()

    photo = src[..., 3]
    matte = np.minimum(np.clip(photo, 0, 1), silhouette_from_masks(stack, src))
    matte = np.where(largest_component(matte > 0.02), matte, 0.0)

    # BOW keeps its authored shape; MAIN/SIDE only lose what falls outside it.
    bow = np.minimum(stack[..., 2], matte)
    body_room = np.clip(matte - bow, 0, 1)
    body = stack[..., :2]
    body_sum = body.sum(axis=2, keepdims=True)
    body = np.divide(body, np.maximum(body_sum, 1e-6))
    reassigned = reassign_edge(np.dstack([body[..., 0], body[..., 1], np.zeros_like(bow)]),
                               np.clip(matte, 0, 1))[..., :2]
    body = np.where(body_sum > 0.5, stack[..., :2], reassigned)
    body = np.minimum(body, body_room[..., None] + bow[..., None])
    # MAIN underlay must still exist beneath the bow (gap-fix), so it is only
    # clipped by the silhouette, never by the bow itself.
    body = np.minimum(body, matte[..., None])

    out = np.dstack([body[..., 0], body[..., 1], bow, np.ones_like(bow)])
    Image.fromarray(u8(out)).save(base / 'zone_map.png')
    return {'bow_matte_px': int((matte > 0.02).sum())}


# --------------------------------------------------------------- bag box
def clean_bag():
    base = MOCK / 'bag_box/default/photo_closed_45'
    web = base / 'web'
    src = read(web / 'source.png', 'RGB')
    masks = np.dstack([
        read(base / 'masks/mask_main.png', 'L'),
        read(base / 'masks/mask_side.png', 'L'),
        read(base / 'masks/mask_handles.png', 'L'),
    ])
    mix = read(web / 'mix.png', 'RGB')

    matte = silhouette_from_masks(masks, src)
    matte = np.where(largest_component(matte > 0.02) | (masks[..., 2] > 0.5), matte, 0.0)
    weights = reassign_edge(masks, matte)

    alpha = np.minimum(mix[..., 0], matte)
    slots = np.minimum(mix[..., 1], alpha)
    Image.fromarray(u8(weights)).save(web / 'weights.png')
    Image.fromarray(u8(np.dstack([alpha, slots, mix[..., 2]]))).save(web / 'mix.png')
    return {'bag_matte_px': int((matte > 0.02).sum()),
            'bag_alpha_outside': int(((alpha - matte) > 0.02).sum())}


# ------------------------------------------------------------ magnet box
def clean_magnet():
    web = MOCK / 'magnet_box/default/photo_closed_45/web'
    mix = read(web / 'mix.png')
    alpha = mix[..., 3]
    zones = mix[..., :2]
    matte = np.where(largest_component(alpha > 0.02), alpha, 0.0)
    weights = reassign_edge(np.dstack([zones, np.zeros_like(alpha)]), matte)[..., :2]
    keep = (zones.sum(axis=2) > 0.98)[..., None]
    weights = np.where(keep, zones, weights)
    weights = np.minimum(weights, matte[..., None])
    Image.fromarray(u8(np.dstack([weights[..., 0], weights[..., 1], mix[..., 2], matte]))).save(web / 'mix.png')
    return {'magnet_matte_px': int((matte > 0.02).sum())}


if __name__ == '__main__':
    print(clean_bow())
    print(clean_bag())
    print(clean_magnet())
