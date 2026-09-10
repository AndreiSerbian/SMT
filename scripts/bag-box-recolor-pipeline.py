"""Offline, reproducible bag-box recolor experiment. No website integration.

Requires Python 3, numpy, Pillow and scipy. Run from any directory:
  python3 scripts/bag-box-recolor-pipeline.py --output /mnt/documents/bag_recolor
The default exported reference is C; A and B remain comparison controls.
Source, masks, original light maps and the ribbon-box renderer are read-only.
"""
from argparse import ArgumentParser
from hashlib import sha256
import json
from pathlib import Path
import zipfile

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import binary_erosion, gaussian_filter

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'public/mockups/bag_box/default/photo_closed_45'
DEFAULT_PIPELINE = 'C'
ZONES = ('main', 'side', 'handles')
CASES = (
    ('black_gold', 'Чёрный корпус / золотые ручки', ('#1B1B1B', '#1B1B1B', '#C8A24A')),
    ('red_black', 'Красный корпус / чёрные ручки', ('#D62027', '#D62027', '#151515')),
    ('white_red', 'Белый корпус / красные ручки', ('#F2F2F2', '#F2F2F2', '#CF1F2A')),
    ('blue_white', 'Синий корпус / белые ручки', ('#1F3F7A', '#1F3F7A', '#F5F5F5')),
)
LABELS = {'A': 'A · Multiply', 'B': 'B · Компенсация света', 'C': 'C · Подложка + свет + фактура'}


def digest(path):
    return sha256(path.read_bytes()).hexdigest()


def hex_rgb(value):
    if len(value) != 7 or value[0] != '#':
        raise ValueError('Expected #RRGGBB')
    return np.array([int(value[i:i+2], 16) for i in (1, 3, 5)], dtype=float) / 255


def load():
    files = [BASE/'source.webp', *(BASE/'masks'/f'mask_{z}.png' for z in ZONES),
             *sorted((BASE/'maps').glob('*.webp'))]
    fingerprints = {str(p.relative_to(ROOT)): digest(p) for p in files}
    src = np.asarray(Image.open(files[0]).convert('RGB'), dtype=float) / 255
    masks = np.stack([np.array(Image.open(BASE/'masks'/f'mask_{z}.png').convert('L')) / 255
                      for z in ZONES], axis=-1)
    if src.shape != masks.shape:
        raise ValueError('Source and masks must have matching dimensions')
    lum = src @ np.array([.2126, .7152, .0722])
    low = gaussian_filter(lum, 3)
    detail = np.clip(lum-low, -.12, .12)
    coverage = np.clip(masks.sum(2), 0, 1)
    # Keep the existing silhouette and its outer AA exactly. Normalize only
    # supported interior coverage: no dilation, new silhouette or hole filling.
    interior = binary_erosion(coverage > .5, iterations=1)
    alpha = np.where(interior, 1., coverage)
    # Fixed source-specific slot ROI, not runtime segmentation. Only dark
    # photographic slit material is protected; no source mask is rewritten.
    roi = np.zeros_like(lum)
    roi[160:230, 240:535] = 1
    slots = roi * np.clip((.80-lum)/.15, 0, 1) * (coverage > .5)
    raw = masks.copy()
    raw[:, :, 0] += raw[:, :, 2] * slots
    raw[:, :, 2] *= 1-slots
    weights = raw.copy()
    # Continuous main-colour underlay supplies fractional gaps at internal
    # joins, analogous to ribbon-box gap-fix. SIDE/HANDLES retain their weights.
    weights[:, :, 0] += np.maximum(0, alpha-coverage)
    weights /= np.maximum(weights.sum(2), 1e-12)[..., None]
    return dict(src=src, masks=masks, raw=raw, lum=lum, low=low, detail=detail,
                coverage=coverage, interior=interior, alpha=alpha,
                slots=slots, weights=weights, fingerprints=fingerprints)


def surface(data, colour, zone, variant):
    l, low, detail = data['lum'], data['low'], data['detail']
    if variant == 'A':
        # Reconstructed source-luminance multiply reference, not a claim to
        # reproduce the unavailable historical bag proof generator exactly.
        return np.clip(colour[None, None, :] * (1.02*l)[..., None], 0, 1)
    reference = .985 if zone == 2 else .98
    gain = 3.4 if zone == 2 else 1.35
    # Invert WHITE-SOURCE brightness into a shadow deficit, not final RGB:
    # white => deficit 0 => full target colour; no white screen overlay.
    deficit = np.clip(1-low/reference, 0, 1)
    shade = np.clip(1-gain*deficit, .12, 1)
    if variant == 'B':
        return np.clip(colour[None, None, :] * shade[..., None], 0, 1)
    shade = np.clip(shade + detail*(3.0 if zone == 2 else 1.35), .05, 1.03)
    brightness = float(colour @ np.array([.2126, .7152, .0722]))
    # Bounded sheen preserves folds on black without washing out saturated
    # colours. Existing highlights map is deliberately NOT added as white:
    # on this white source it is mostly albedo/overexposure, not specularity.
    sheen = np.clip((low-.85)/.15, 0, 1) * (.06 if zone == 2 else .028) * (1-brightness)**2
    sheen += np.maximum(detail, 0) * (.22 if zone == 2 else .08) * (1-brightness)**2
    return np.clip(colour[None, None, :] * shade[..., None] + sheen[..., None], 0, 1)


def render(data, colours, variant=DEFAULT_PIPELINE):
    if variant not in LABELS:
        raise ValueError('variant must be A, B or C')
    colours = [hex_rgb(c) for c in colours]
    layers = [surface(data, c, z, variant) for z, c in enumerate(colours)]
    if variant == 'C':
        painted = sum(layer*data['weights'][:, :, z, None] for z, layer in enumerate(layers))
        out = data['src']*(1-data['alpha'][..., None])+painted*data['alpha'][..., None]
    else:
        out = data['src'].copy()
        for z, layer in enumerate(layers):
            w = data['raw'][:, :, z, None]
            out = out*(1-w)+layer*w
    # Protected slit detail is independent of handles; stays darker than the
    # body instead of becoming gold/red/white or an unrealistically grey stripe.
    slit_rgb = np.minimum(data['src']*.25, colours[0][None, None, :]*.22+.008)
    out = out*(1-data['slots'][..., None])+slit_rgb*data['slots'][..., None]
    return np.clip(out, 0, 1)


def image(array):
    return Image.fromarray(np.rint(array*255).astype(np.uint8))


def font(size):
    import subprocess
    path = subprocess.check_output(['fc-match', '-f', '%{file}', 'DejaVu Sans'], text=True).strip()
    return ImageFont.truetype(path, size)


def sheet(tiles, labels, cols, tile_size=(480, 480), heading=None):
    width, height = tile_size
    rows = (len(tiles)+cols-1)//cols
    top = 60 if heading else 0
    result = Image.new('RGB', (cols*width, rows*(height+48)+top), '#f1f3f5')
    draw = ImageDraw.Draw(result)
    if heading:
        draw.text((18, 16), heading, fill='#202124', font=font(22))
    for i, (tile, label) in enumerate(zip(tiles, labels)):
        x, y = (i % cols)*width, (i//cols)*(height+48)+top
        result.paste(tile.resize((width, height), Image.Resampling.LANCZOS), (x, y))
        draw.text((x+12, y+height+12), label, fill='#202124', font=font(17))
    return result


def validate(data):
    for path, old_hash in data['fingerprints'].items():
        assert digest(ROOT/path) == old_hash, f'Input was modified: {path}'
    base = render(data, CASES[0][2])
    checks = {}
    for z, zone in enumerate(ZONES):
        colours = list(CASES[0][2]); colours[z] = '#E93D9F'
        delta = np.max(np.abs(render(data, colours)-base), axis=2)
        support = data['weights'][:, :, z] > 1e-10
        if zone == 'main':
            support |= data['slots'] > 0
        assert not (delta[~support] > 1e-10).any(), f'{zone} leaks outside its support'
        checks[f'{zone}_independent'] = True
    colours = list(CASES[0][2]); colours[2] = '#FFFFFF'
    slit_delta = np.max(np.abs(render(data, colours)-base), axis=2)[data['slots'] >= 1]
    assert not (slit_delta > 1e-10).any(), 'Handle colour affects protected slots'
    checks['protected_slots_independent_of_handles'] = True
    checks['source_masks_maps_unchanged'] = True
    checks['exterior_unchanged'] = bool(np.allclose(base[data['coverage'] == 0], data['src'][data['coverage'] == 0]))
    assert checks['exterior_unchanged']
    checks['all_black_finite'] = bool(np.isfinite(render(data, ['#000000']*3)).all())
    checks['all_white_finite'] = bool(np.isfinite(render(data, ['#FFFFFF']*3)).all())
    return checks


def export(output):
    output.mkdir(parents=True, exist_ok=True)
    data = load()
    results, crops, metrics = {}, {}, {}
    for variant in LABELS:
        tiles, zooms = [], []
        for slug, label, colours in CASES:
            arr = render(data, colours, variant)
            img = image(arr)
            img.save(output/f'{variant}_{slug}.png')
            crop = img.crop((235, 100, 545, 250))
            crop.resize((1240, 600), Image.Resampling.NEAREST).save(output/f'{variant}_{slug}_handles_4x.png')
            tiles.append(img); zooms.append(crop)
            metrics[f'{variant}_{slug}'] = {}
            for z, name in enumerate(ZONES):
                if max(hex_rgb(colours[z])) > .9:
                    continue  # intentional white is not a coverage defect
                inside = (data['masks'][:, :, z] > .98) & data['interior'] & (data['slots'] == 0)
                metrics[f'{variant}_{slug}'][f'{name}_near_white_pixels'] = int(((arr.min(2) > .9) & inside).sum())
            # Photometric, not perceptual: white-handle fold contrast on same ROI.
            region = (data['masks'][:, :, 2] > .98) & (data['slots'] == 0)
            values = (arr @ np.array([.2126, .7152, .0722]))[region]
            metrics[f'{variant}_{slug}']['handles_luma_p95_minus_p5'] = round(float(np.percentile(values, 95)-np.percentile(values, 5)), 4)
        results[variant] = tiles; crops[variant] = zooms
        sheet(tiles, [c[1] for c in CASES], 2, (650, 650), LABELS[variant]).save(output/f'variant_{variant}.png')
    sheet([results[v][i] for i in range(4) for v in LABELS],
          [LABELS[v] for i in range(4) for v in LABELS], 3,
          heading='Коробка-сумка: одинаковые цвета и маски, три способа перекраски').save(output/'comparison_ABC.png')
    sheet([crops[v][i] for i in range(4) for v in LABELS],
          [LABELS[v] for i in range(4) for v in LABELS], 3, (620, 300),
          'Ручки и прорези: сравнение без перерисовки масок').save(output/'handles_comparison_ABC.png')
    # Explicit ablation: same C lighting but raw sequential masks isolates
    # the compositing-gap issue from exposure compensation.
    original_weights, original_alpha = data['weights'], data['alpha']
    coverage = data['coverage']
    data['weights'] = data['raw']/np.maximum(coverage, 1e-12)[..., None]
    data['alpha'] = coverage
    raw_c = image(render(data, CASES[0][2])).crop((235, 100, 545, 250))
    data['weights'], data['alpha'] = original_weights, original_alpha
    sheet([raw_c, crops['C'][0]], ['C без компенсации покрытия', 'C с непрерывной подложкой MAIN'], 2, (620, 300)).save(output/'coverage_ablation.png')
    report = dict(default_pipeline=DEFAULT_PIPELINE, cases=CASES, metrics=metrics,
                  validation=validate(data), input_sha256=data['fingerprints'],
                  notes=['A is a reconstructed source-multiply control, not exact historical generator.',
                         'Colours are fixed representative test hexes, not fetched from the shop palette.',
                         'MAIN and SIDE use the same input colour in all four requested body cases.',
                         'No UI/catalog/runtime integration; original masks remain unchanged.',
                         'Residual coloured rims/pinholes belong to existing zone ownership, not highlight clipping.'])
    (output/'qa.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps(report['validation'], indent=2))
    print('Artifacts:', output)


if __name__ == '__main__':
    parser = ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=Path('/mnt/documents/bag_recolor'))
    args = parser.parse_args()
    export(args.output)
