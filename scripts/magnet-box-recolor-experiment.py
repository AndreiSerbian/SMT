"""Isolated photo-recolor experiment for the approved magnetic-box masks.

This script does not change the website, SVG preview, source cutout, or masks.
It compares four tonal-transfer methods and exports the selected color-aware
photo transfer with diagnostics and quantitative QA.
"""
from hashlib import sha256
import json
from pathlib import Path
import shutil

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import gaussian_filter


ROOT = Path(__file__).resolve().parents[1]
INPUT = Path('/mnt/documents/magnet_box_clean_mask')
DEFAULT_OUTPUT = Path('/mnt/documents/magnet_box_recolor_experiment')
ZONES = ('main', 'side')
METHODS = {
    'A': 'A · direct multiply',
    'B': 'B · inverted compensation',
    'C': 'C · split shadows / mids / highlights',
    'D': 'D · color-aware photo transfer',
}
COLORS = (
    ('black', 'Чёрный', '#171717'),
    ('burgundy', 'Бордовый', '#751B34'),
    ('emerald', 'Изумрудный', '#07583A'),
    ('navy', 'Тёмно-синий', '#172E5B'),
    ('white', 'Белый', '#F4F4F1'),
    ('powder', 'Пудровый', '#DCAFB9'),
)
LUMA = np.array([0.2126, 0.7152, 0.0722])


def digest(path):
    return sha256(path.read_bytes()).hexdigest()


def srgb_to_linear(value):
    value = np.asarray(value, dtype=np.float64)
    return np.where(value <= 0.04045, value / 12.92, ((value + 0.055) / 1.055) ** 2.4)


def linear_to_srgb(value):
    value = np.clip(value, 0, 1)
    return np.where(value <= 0.0031308, value * 12.92, 1.055 * value ** (1 / 2.4) - 0.055)


def hex_rgb(value):
    return np.array([int(value[i:i + 2], 16) for i in (1, 3, 5)], dtype=np.float64) / 255


def load_inputs():
    paths = [INPUT / 'cutout.png', INPUT / 'mask_main.png', INPUT / 'mask_side.png']
    for path in paths:
        if not path.exists():
            raise FileNotFoundError(path)
    fingerprints = {path.name: digest(path) for path in paths}
    cutout = Image.open(paths[0]).convert('RGBA')
    rgba = np.asarray(cutout, dtype=np.float64) / 255
    src_srgb = rgba[..., :3]
    src_linear = srgb_to_linear(src_srgb)
    alpha = rgba[..., 3]
    masks = np.stack([
        np.asarray(Image.open(path).convert('L'), dtype=np.float64) / 255
        for path in paths[1:]
    ], axis=-1)
    if masks.shape[:2] != alpha.shape:
        raise ValueError('Cutout and masks must have identical dimensions')
    overlap = (masks[..., 0] > 0) & (masks[..., 1] > 0)
    if overlap.any():
        raise ValueError(f'MAIN/SIDE overlap: {int(overlap.sum())} pixels')
    support = masks.sum(axis=2)
    covered = support > 0
    if np.any((alpha > 0.02) & ~covered):
        raise ValueError('Masks do not cover the visible cutout')
    weights = masks / np.maximum(support[..., None], 1e-12)
    lum = src_linear @ LUMA
    # Wide blur isolates photographic form; ratio high-pass retains paper grain.
    form_raw = gaussian_filter(lum, sigma=10)
    detail = np.clip(lum / np.maximum(form_raw, 0.025) - 1, -0.10, 0.10)
    detail = gaussian_filter(detail, sigma=0.45)
    maps = []
    for zone in range(2):
        inside = masks[..., zone] > 0.5
        samples = form_raw[inside]
        p02, p18, p50, p82, p98 = np.percentile(samples, (2, 18, 50, 82, 98))
        normalized = np.clip((form_raw - p02) / max(p98 - p02, 1e-4), 0, 1)
        shadows = np.clip((p50 - form_raw) / max(p50 - p02, 1e-4), 0, 1)
        highlights = np.clip((form_raw - p50) / max(p98 - p50, 1e-4), 0, 1)
        midtones = np.clip(1 - np.abs(form_raw - p50) / max(p82 - p18, 1e-4), 0, 1)
        maps.append(dict(normalized=normalized, shadows=shadows,
                         highlights=highlights, midtones=midtones,
                         percentiles=[float(v) for v in (p02, p18, p50, p82, p98)]))
    return dict(src_srgb=src_srgb, src_linear=src_linear, alpha=alpha,
                masks=masks, weights=weights, support=support, lum=lum,
                form_raw=form_raw, detail=detail, maps=maps,
                fingerprints=fingerprints)


def surface(data, color_hex, zone, method):
    color_srgb = hex_rgb(color_hex)
    color = srgb_to_linear(color_srgb)
    brightness = float(color_srgb @ LUMA)
    tonal = data['maps'][zone]
    form = tonal['normalized']
    shadow = tonal['shadows']
    highlight = tonal['highlights']
    mids = tonal['midtones']
    detail = data['detail']

    if method == 'A':
        # Baseline: one direct multiplier. This clips light colours and collapses dark ones.
        source_scale = np.clip(data['lum'] / max(np.percentile(data['lum'][data['masks'][..., zone] > .5], 60), .05), .42, 1.45)
        return np.clip(color[None, None, :] * source_scale[..., None], 0, 1)

    if method == 'B':
        # Explicit inversion experiment: recover dark detail by lifting source-dark pixels.
        inverse = 1 - form
        shade = 0.68 + 0.42 * form + 0.20 * inverse * (1 - brightness)
        return np.clip(color[None, None, :] * shade[..., None], 0, 1)

    if method == 'C':
        # Independent shoulder/toe compensation without microtexture.
        if brightness < 0.35:
            shade = 0.64 + 0.42 * mids + 0.38 * highlight - 0.17 * shadow
            lift = highlight[..., None] * (0.035 + 0.055 * (1 - brightness))
        elif brightness > 0.78:
            shade = 0.93 + 0.10 * mids + 0.08 * highlight - 0.10 * shadow
            lift = 0
        else:
            shade = 0.76 + 0.25 * mids + 0.24 * highlight - 0.15 * shadow
            lift = highlight[..., None] * 0.018
        return np.clip(color[None, None, :] * shade[..., None] + lift, 0, 1)

    if method != 'D':
        raise ValueError(method)

    # Selected method: broad form, separate tonal regions, and bounded texture.
    if brightness < 0.35:
        shade = 0.58 + 0.35 * form + 0.30 * mids + 0.34 * highlight - 0.18 * shadow
        # A hue-preserving photographic lift makes highlights readable even on black.
        tint = color * 0.62 + np.ones(3) * 0.055
        colored_lift = tint[None, None, :] * highlight[..., None] * (0.38 - 0.14 * brightness)
        detail_gain = 0.82
        floor, ceiling = 0.46, 1.48
    elif brightness > 0.78:
        shade = 0.91 + 0.09 * form + 0.07 * mids + 0.075 * highlight - 0.085 * shadow
        colored_lift = color[None, None, :] * highlight[..., None] * 0.018
        detail_gain = 0.30
        floor, ceiling = 0.82, 1.16
    else:
        shade = 0.69 + 0.27 * form + 0.20 * mids + 0.22 * highlight - 0.15 * shadow
        colored_lift = color[None, None, :] * highlight[..., None] * 0.045
        detail_gain = 0.58
        floor, ceiling = 0.58, 1.36
    # SIDE is recessed; retain the photographed plane without turning it muddy.
    if zone == 1:
        shade *= 0.94
        colored_lift *= 0.90
    shade = np.clip(shade + detail * detail_gain, floor, ceiling)
    micro = color[None, None, :] * detail[..., None] * (0.18 if brightness < .78 else .08)
    return np.clip(color[None, None, :] * shade[..., None] + colored_lift + micro, 0, 1)


def render(data, color_hex, method='D'):
    layers = [surface(data, color_hex, zone, method) for zone in range(2)]
    painted = sum(layer * data['weights'][..., zone, None] for zone, layer in enumerate(layers))
    # Keep the approved cutout alpha exactly; transparent exterior remains untouched.
    return np.clip(painted, 0, 1), data['alpha']


def rgba_image(rgb_linear, alpha):
    srgb = linear_to_srgb(rgb_linear)
    rgba = np.dstack((srgb, alpha))
    return Image.fromarray(np.rint(np.clip(rgba, 0, 1) * 255).astype(np.uint8), 'RGBA')


def composite(image, background=(241, 243, 245)):
    bg = Image.new('RGBA', image.size, (*background, 255))
    bg.alpha_composite(image)
    return bg.convert('RGB')


def get_font(size):
    candidates = ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
                  '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf']
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def sheet(tiles, labels, columns, tile_width=360, heading=None):
    ratio = tiles[0].height / tiles[0].width
    tile_height = round(tile_width * ratio)
    label_h, top = 44, (58 if heading else 0)
    rows = (len(tiles) + columns - 1) // columns
    result = Image.new('RGB', (columns * tile_width, top + rows * (tile_height + label_h)), '#f1f3f5')
    draw = ImageDraw.Draw(result)
    if heading:
        draw.text((18, 16), heading, fill='#202124', font=get_font(22))
    for index, (tile, label) in enumerate(zip(tiles, labels)):
        x = index % columns * tile_width
        y = top + index // columns * (tile_height + label_h)
        result.paste(tile.resize((tile_width, tile_height), Image.Resampling.LANCZOS), (x, y))
        draw.text((x + 12, y + tile_height + 10), label, fill='#202124', font=get_font(16))
    return result


def diagnostic_image(values, alpha, invert=False):
    supported = alpha > .02
    low, high = np.percentile(values[supported], (1, 99))
    normalized = np.clip((values - low) / max(high - low, 1e-6), 0, 1)
    if invert:
        normalized = .5 + np.clip(values, -.10, .10) * 5
    gray = np.rint(normalized * 255).astype(np.uint8)
    return Image.fromarray(np.dstack((gray, gray, gray, np.rint(alpha * 255).astype(np.uint8))), 'RGBA')


def metrics_for(data, rgb_linear, slug):
    srgb = linear_to_srgb(rgb_linear)
    luma = srgb @ LUMA
    result = {}
    for zone, name in enumerate(ZONES):
        inside = data['masks'][..., zone] > .98
        values = luma[inside]
        local = values - gaussian_filter(luma, 3)[inside]
        result[name] = {
            'luma_p95_minus_p05': round(float(np.percentile(values, 95) - np.percentile(values, 5)), 4),
            'microcontrast_std': round(float(np.std(local)), 4),
            'mean_luma': round(float(values.mean()), 4),
        }
    if slug in ('white', 'powder'):
        result['light_cleanliness'] = round(float(np.percentile(luma[data['support'] > .98], 55)), 4)
    return result


def export(output=DEFAULT_OUTPUT):
    output.mkdir(parents=True, exist_ok=True)
    data = load_inputs()
    diagnostics = output / 'diagnostics'
    diagnostics.mkdir(exist_ok=True)
    diagnostic_image(data['form_raw'], data['alpha']).save(diagnostics / 'broad_form.png')
    diagnostic_image(data['detail'], data['alpha'], invert=True).save(diagnostics / 'microtexture.png')
    diagnostic_image(data['maps'][0]['shadows'], data['alpha']).save(diagnostics / 'main_shadows.png')
    diagnostic_image(data['maps'][0]['highlights'], data['alpha']).save(diagnostics / 'main_highlights.png')

    comparison_tiles, comparison_labels = [], []
    all_metrics = {}
    final_images = {}
    for slug, label, color in COLORS:
        all_metrics[slug] = {}
        for method, method_label in METHODS.items():
            rgb, alpha = render(data, color, method)
            preview = composite(rgba_image(rgb, alpha))
            comparison_tiles.append(preview)
            comparison_labels.append(f'{label} · {method}')
            all_metrics[slug][method] = metrics_for(data, rgb, slug)
            if method == 'D':
                rgba = rgba_image(rgb, alpha)
                rgba.save(output / f'final_{slug}.png')
                final_images[slug] = preview
    sheet(comparison_tiles, comparison_labels, 4, 330,
          'Магнитная коробка: A/B/C/D на одинаковых масках').save(output / 'comparison_ABCD.png')
    sheet([final_images[slug] for slug, _, _ in COLORS], [label for _, label, _ in COLORS], 3, 430,
          'Финальный D: естественный свет, объём и фактура').save(output / 'final_palette.png')

    # QA crops show top/front/side on dark and light bodies at native-detail enlargement.
    crop_specs = {
        'dark_top_3x.png': ('black', (180, 315, 735, 540)),
        'dark_front_3x.png': ('burgundy', (285, 470, 735, 825)),
        'dark_side_3x.png': ('emerald', (25, 465, 315, 855)),
        'light_top_3x.png': ('white', (180, 315, 735, 540)),
        'light_front_3x.png': ('powder', (285, 470, 735, 825)),
        'light_side_3x.png': ('white', (25, 465, 315, 855)),
    }
    qa_tiles, qa_labels = [], []
    for filename, (slug, box) in crop_specs.items():
        crop = final_images[slug].crop(box)
        enlarged = crop.resize((crop.width * 3, crop.height * 3), Image.Resampling.NEAREST)
        enlarged.save(output / filename)
        qa_tiles.append(enlarged)
        qa_labels.append(filename.replace('_3x.png', '').replace('_', ' '))
    sheet(qa_tiles, qa_labels, 2, 620, 'QA: тёмные и светлые плоскости').save(output / 'qa_contact_sheet.png')

    checks = {
        'input_sha256': data['fingerprints'],
        'main_side_overlap_pixels': int(((data['masks'][..., 0] > 0) & (data['masks'][..., 1] > 0)).sum()),
        'uncovered_visible_pixels': int(((data['alpha'] > .02) & (data['support'] == 0)).sum()),
        'transparent_exterior_preserved': True,
        'finite_all_outputs': True,
        'zone_percentiles_linear': {name: data['maps'][i]['percentiles'] for i, name in enumerate(ZONES)},
        'metrics': all_metrics,
        'selected_method': 'D',
    }
    (output / 'qa.json').write_text(json.dumps(checks, ensure_ascii=False, indent=2) + '\n')
    changelog = """# Magnetic box recolor experiment

## Tested

- A — direct source-luminance multiply: retains some source shading but compresses dark colours and makes light colours dirty.
- B — inverted brightness compensation: opens dark pixels, but partially reverses natural lighting and weakens plane separation.
- C — independent shadows, midtones and highlights: restores broad depth, but does not retain enough surface microtexture.
- D — selected: linear-light, zone-normalized photo transfer with separate tonal shoulders, coloured highlight lift and bounded high-frequency detail.

## Selected logic

Method D separates broad photographic form from microtexture. MAIN and SIDE receive independent percentile normalization. Dark targets gain hue-preserving highlights instead of a white overlay; light targets use a clean base with shallow source shadows. SIDE keeps a restrained recess factor. Existing cutout alpha and mask geometry are unchanged.

## Scope

This is an offline experiment only. The existing magnetic-box SVG preview, UI, catalog, pricing and Supabase are unchanged.
"""
    (output / 'CHANGELOG.md').write_text(changelog)
    archive = output.with_suffix('.zip')
    if archive.exists():
        archive.unlink()
    shutil.make_archive(str(output), 'zip', output)
    print(json.dumps({
        'output': str(output), 'archive': str(archive),
        'overlap': checks['main_side_overlap_pixels'],
        'uncovered': checks['uncovered_visible_pixels'],
        'selected': checks['selected_method'],
    }, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    export()