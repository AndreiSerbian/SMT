"""Bake the approved D recolor pipeline of the magnetic box into static browser maps.

Reads the approved cutout/masks, reproduces the tonal maps used by method D in
scripts/magnet-box-recolor-experiment.py and writes three PNG maps consumed by
js/services/magnetPhotoRenderer.js. No mask or source asset is modified.
"""
import importlib.util
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/mockups/magnet_box/default/photo_closed_45/web'

spec = importlib.util.spec_from_file_location(
    'magnet_experiment', ROOT / 'scripts/magnet-box-recolor-experiment.py')
exp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exp)


def to_u8(a):
    return np.rint(np.clip(a, 0, 1) * 255).astype(np.uint8)


def main():
    data = exp.load_inputs()
    OUT.mkdir(parents=True, exist_ok=True)

    for zone, name in enumerate(('tone_main', 'tone_side')):
        m = data['maps'][zone]
        img = np.dstack([
            to_u8(m['normalized']), to_u8(m['shadows']),
            to_u8(m['highlights']), to_u8(m['midtones'])
        ])
        Image.fromarray(img, 'RGBA').save(OUT / f'{name}.png')

    # detail is bounded to +-0.10; store as 0.5-centred with x5 scale
    detail = np.clip(data['detail'] * 5 + 0.5, 0, 1)
    mix = np.dstack([
        to_u8(data['weights'][..., 0]), to_u8(data['weights'][..., 1]),
        to_u8(detail), to_u8(data['alpha'])
    ])
    Image.fromarray(mix, 'RGBA').save(OUT / 'mix.png')

    meta = {
        'size': list(Image.open(exp.INPUT / 'cutout.png').size),
        'detail_scale': 5.0,
        'fingerprints': data['fingerprints'],
    }
    (OUT / 'maps.json').write_text(json.dumps(meta, indent=2), encoding='utf-8')
    print(json.dumps(meta, indent=2))


if __name__ == '__main__':
    main()
