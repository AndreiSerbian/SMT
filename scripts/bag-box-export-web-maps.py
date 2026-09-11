"""Export precomputed static maps so the browser can reproduce pipeline C.

Read-only for source, masks and authored maps. Writes only into
public/mockups/bag_box/default/photo_closed_45/web/.

  python3 scripts/bag-box-export-web-maps.py
"""
from pathlib import Path
import sys

import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt, gaussian_filter, median_filter

sys.path.insert(0, str(Path(__file__).resolve().parent))
import importlib.util

spec = importlib.util.spec_from_file_location(
    'bagpipe', Path(__file__).resolve().parent / 'bag-box-recolor-pipeline.py')
bagpipe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bagpipe)

BASE = bagpipe.BASE
OUT = BASE / 'web'


def u8(a):
    return np.rint(np.clip(a, 0, 1) * 255).astype(np.uint8)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    d = bagpipe.load()
    low, lum = d['low'], d['lum']

    forms = []
    for z in range(3):
        zone_mask = d['masks'][:, :, z] > .5
        samples = low[zone_mask]
        lo, hi = np.percentile(samples, (3, 97)) if samples.size else (.7, 1.)
        forms.append(np.clip((low - lo) / max(hi - lo, .04), 0, 1))
    handle_luma = median_filter(lum, size=5)
    forms[2] = np.clip((gaussian_filter(handle_luma, 2) - .68) / .31, 0, 1)

    side_mask = d['masks'][:, :, 1] > .5
    edge_depth = np.clip(distance_transform_edt(side_mask) / 18, 0, 1)
    edge_factor = .72 + .28 * edge_depth  # 0.72 .. 1.0

    ashadow = np.clip(d['shadows'] / max(float(d['shadows'][d['masks'][:, :, 0] > .5].max()), .08), 0, 1)
    ahigh = np.clip(d['highlights'], 0, 1)
    slot_light = np.clip(.13 + .15 * gaussian_filter(lum, 2), .16, .28)

    Image.fromarray(np.dstack([u8(f) for f in forms])).save(OUT / 'form.png')
    Image.fromarray(np.dstack([u8(ashadow), u8(ahigh), u8((edge_factor - .72) / .28)])).save(OUT / 'aux.png')
    Image.fromarray(np.dstack([u8(d['weights'][:, :, z]) for z in range(3)])).save(OUT / 'weights.png')
    Image.fromarray(np.dstack([u8(d['alpha']), u8(d['slots']), u8((slot_light - .16) / .12)])).save(OUT / 'mix.png')
    Image.fromarray(u8((d['detail'] / .16 + 1) / 2)).save(OUT / 'detail.png')
    Image.fromarray(u8(d['src'])).save(OUT / 'source.png')
    print('written to', OUT)


if __name__ == '__main__':
    main()
