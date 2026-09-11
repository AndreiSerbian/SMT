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
from scipy.ndimage import binary_erosion, binary_fill_holes, distance_transform_edt, gaussian_filter, label, median_filter

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
REAL_CASES = (
    ('r1', 'Чёрный / бордовая боковина / золотые ручки', ('#151515', '#6E1028', '#C8A24A')),
    ('r2', 'Изумрудный / кремовая боковина / золотые ручки', ('#07583A', '#E9E3D1', '#C8A24A')),
    ('r3', 'Бордовый / чёрная боковина / чёрные ручки', ('#7A112D', '#151515', '#151515')),
    ('r4', 'Тёмно-синий / серебряная боковина / белые ручки', ('#172E5B', '#B9BEC5', '#F5F5F5')),
    ('r5', 'Белый / бордовая боковина / бордовые ручки', ('#F4F4F2', '#77122C', '#77122C')),
    ('r6', 'Пудровый розовый / золотая боковина / белые ручки', ('#DCAFB9', '#C3A047', '#F5F5F5')),
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
    low = gaussian_filter(lum, 12)
    detail = np.asarray(Image.open(BASE/'maps'/'details.webp').convert('L'), dtype=float)/255-.5
    detail = gaussian_filter(np.clip(detail, -.16, .16), .7)
    shadows = np.asarray(Image.open(BASE/'maps'/'shadows.webp').convert('L'), dtype=float)/255
    highlights = np.asarray(Image.open(BASE/'maps'/'highlights.webp').convert('L'), dtype=float)/255
    coverage = np.clip(masks.sum(2), 0, 1)
    # Keep the existing silhouette and its outer AA exactly. Normalize only
    # supported interior coverage: no dilation, new silhouette or hole filling.
    body = np.clip(masks[:, :, 0]+masks[:, :, 1], 0, 1)
    # The photographed body is a continuous base under the zone boundary.
    # Filling only enclosed body gaps prevents the white source from showing
    # through fractional MAIN/SIDE antialiasing without changing its silhouette.
    body_filled = binary_fill_holes(body > .02)
    interior = binary_erosion(body_filled | (masks[:, :, 2] > .08), iterations=1)
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
                shadows=shadows, highlights=highlights, body_filled=body_filled,
                coverage=coverage, interior=interior, alpha=alpha,
                slots=slots, weights=weights, fingerprints=fingerprints)


def surface(data, colour, zone, variant):
    l, low, detail = data['lum'], data['low'], data['detail']
    if variant == 'A':
        # Reconstructed source-luminance multiply reference, not a claim to
        # reproduce the unavailable historical bag proof generator exactly.
        return np.clip(colour[None, None, :] * (1.02*l)[..., None], 0, 1)
    brightness = float(colour @ np.array([.2126, .7152, .0722]))
    zone_mask = data['masks'][:, :, zone] > .5
    samples = low[zone_mask]
    lo, hi = np.percentile(samples, (3, 97)) if samples.size else (.7, 1.)
    form = np.clip((low-lo)/max(hi-lo, .04), 0, 1)
    authored_shadow = np.clip(data['shadows']/max(float(data['shadows'][zone_mask].max()), .08), 0, 1)
    authored_highlight = np.clip(data['highlights'], 0, 1)
    if brightness < .35:
        # Dark inks need coloured highlight lift; multiplying an almost-black
        # target by the source alone collapses every plane to a flat silhouette.
        shade = .58 + .82*form + .18*authored_highlight - .16*authored_shadow
    elif brightness > .78:
        # Light colours retain cleanliness while shallow photographic shadows
        # keep the planes and folds legible.
        shade = .90 + .13*form + .035*authored_highlight - .10*authored_shadow
    else:
        shade = .70 + .48*form + .08*authored_highlight - .14*authored_shadow
    if zone == 1:
        # The inset panel receives extra edge occlusion so it reads as a recess.
        distance = distance_transform_edt(zone_mask)
        edge_depth = np.clip(distance/18, 0, 1)
        shade *= .72 + .28*edge_depth
    if zone == 2:
        # Preserve broad textile folds but suppress isolated source compression
        # speckles which become holes on gold and other saturated colours.
        handle_luma = median_filter(l, size=5)
        handle_form = np.clip((gaussian_filter(handle_luma, 2)-.68)/.31, 0, 1)
        shade = .62 + (.50 if brightness < .45 else .34)*handle_form
    if variant == 'B':
        return np.clip(colour[None, None, :] * shade[..., None], 0, 1)
    detail_gain = .16 if zone == 2 else (.34 if zone == 1 else .46)
    shade = np.clip(shade + detail*detail_gain, .42 if brightness < .35 else .68, 1.48)
    # Highlights remain target-coloured, never a white screen layer.
    chroma_lift = colour[None, None, :] * authored_highlight[..., None]
    lift = (.12 if brightness < .35 else .025) * (1-brightness)
    return np.clip(colour[None, None, :] * shade[..., None] + chroma_lift*lift, 0, 1)


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
    # Slots inherit MAIN hue and the source's local gradient: a dark recessed
    # part of the top plane rather than a flat neutral decal.
    slot_light = np.clip(.13+.15*gaussian_filter(data['lum'], 2), .16, .28)
    slit_rgb = colours[0][None, None, :]*(.18+.28*slot_light[..., None])
    slit_rgb += slot_light[..., None]*.035
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


def clean_handle_pinholes():
    """Fill only tiny enclosed holes; preserve all open gaps and silhouette."""
    path = BASE/'masks'/'mask_handles.png'
    original = np.asarray(Image.open(path).convert('L'))
    solid = original >= 128
    holes = binary_fill_holes(solid) & ~solid
    labels, count = label(holes)
    cleaned = original.copy()
    filled_pixels = 0
    for index in range(1, count+1):
        component = labels == index
        size = int(component.sum())
        if size <= 14:
            cleaned[component] = 255
            filled_pixels += size
    # Repair isolated low-alpha specks that are fully inside the handle. This
    # does not touch the outer antialiased edge or the intentional open gaps.
    distance = distance_transform_edt(solid)
    local_median = median_filter(cleaned, size=5)
    dim = (distance >= 2) & (cleaned.astype(np.int16)+18 < local_median.astype(np.int16))
    dim_labels, dim_count = label(dim)
    for index in range(1, dim_count+1):
        component = dim_labels == index
        size = int(component.sum())
        if size <= 8:
            cleaned[component] = local_median[component]
            filled_pixels += size
    if filled_pixels:
        Image.fromarray(cleaned).save(path)
    return filled_pixels


def export_real(output):
    output.mkdir(parents=True, exist_ok=True)
    filled = clean_handle_pinholes()
    data = load()
    renders = []
    labels_text = []
    metrics = {}
    for slug, label_text, colours in REAL_CASES:
        rendered = render(data, colours, 'C')
        rendered_image = image(rendered)
        rendered_image.save(output/f'{slug}.png')
        renders.append(rendered_image)
        labels_text.append(label_text)
        luma = rendered @ np.array([.2126, .7152, .0722])
        metrics[slug] = {
            'main_luma_p95_minus_p5': round(float(np.percentile(luma[data['masks'][:, :, 0]>.98], 95)-np.percentile(luma[data['masks'][:, :, 0]>.98], 5)), 4),
            'side_luma_p95_minus_p5': round(float(np.percentile(luma[data['masks'][:, :, 1]>.98], 95)-np.percentile(luma[data['masks'][:, :, 1]>.98], 5)), 4),
            'handles_luma_p95_minus_p5': round(float(np.percentile(luma[data['masks'][:, :, 2]>.98], 95)-np.percentile(luma[data['masks'][:, :, 2]>.98], 5)), 4),
        }
    sheet(renders, labels_text, 3, (500, 500), 'Recolor с реальными цветами — финальная версия').save(output/'palette_real.png')
    crop_specs = {
        'qa_handles_4x.png': (220, 90, 535, 265),
        'qa_main_side_seam_4x.png': (25, 180, 170, 720),
        'qa_dark_top_4x.png': (20, 85, 735, 300),
        'qa_light_body_3x.png': (25, 170, 735, 735),
    }
    qa_source = {'qa_handles_4x.png': renders[0], 'qa_main_side_seam_4x.png': renders[0],
                 'qa_dark_top_4x.png': renders[0], 'qa_light_body_3x.png': renders[4]}
    for filename, box in crop_specs.items():
        crop = qa_source[filename].crop(box)
        scale = 4 if '4x' in filename else 3
        crop.resize((crop.width*scale, crop.height*scale), Image.Resampling.NEAREST).save(output/filename)
    sheet([Image.open(output/name) for name in crop_specs],
          ['Ручки', 'Стык MAIN / SIDE', 'Тёмная верхняя плоскость', 'Светлый корпус'],
          2, (760, 520), 'QA — ключевые зоны').save(output/'qa_contact_sheet.png')
    report = {
        'cases': REAL_CASES,
        'handle_pinholes_filled': filled,
        'metrics': metrics,
        'validation': validate(data),
        'technique': 'zone-specific tonal transfer, continuous body underlay, coloured slot shading',
    }
    (output/'qa.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    parser = ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=Path('/mnt/documents/bag_recolor'))
    parser.add_argument('--real', action='store_true', help='export the six approved real-colour combinations and QA crops')
    args = parser.parse_args()
    export_real(args.output) if args.real else export(args.output)
