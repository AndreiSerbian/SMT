"""Bake a smooth, colour-neutral shading map for the existing bow mask.

The geometry is never changed.  The map is derived from the photographed
white ribbon, with broad folds retained and pixel noise / tonal stair-steps
suppressed.  Run from any directory:

    python3 scripts/bow-box-bake-ribbon-shading.py
"""

from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter


ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "public/mockups/bow_box/default/photo_closed_45"


def bake() -> tuple[Path, Path]:
    source = np.asarray(Image.open(BASE / "source.png").convert("RGB"), dtype=float) / 255
    mask = np.asarray(Image.open(BASE / "masks/mask_bow.png").convert("L"), dtype=float) / 255
    luminance = source @ np.array([0.2126, 0.7152, 0.0722])

    # The real white ribbon has two distinct signals: broad fabric folds and
    # narrow satin reflections. Keep them separate so coloured ribbon retains
    # depth without turning the source texture into polygon-like patches.
    broad = gaussian_filter(luminance, 1.45)
    medium = gaussian_filter(luminance, 0.7) - gaussian_filter(luminance, 3.2)
    ribbon_pixels = broad[mask > 0.55]
    low, high = np.percentile(ribbon_pixels, (1.5, 99.2))
    normalized = np.clip((broad - low) / max(high - low, 1e-6), 0, 1)

    # Smoothstep keeps the photographed knot/underfold shadows and bright
    # crests continuous. The medium band restores curved fabric transitions,
    # but remains too weak to recreate sensor noise or hard tonal steps.
    normalized = normalized * normalized * (3 - 2 * normalized)
    factor = 0.54 + 0.68 * normalized + np.clip(medium, -0.045, 0.045) * 0.85
    factor = gaussian_filter(np.clip(factor, 0.52, 1.24), 0.35)

    encoded = np.rint(np.clip(factor / 1.30, 0, 1) * 255).astype(np.uint8)
    encoded[mask == 0] = 0
    output = BASE / "bow_shading.png"
    Image.fromarray(encoded, mode="L").save(output, optimize=True)

    # Satin highlights are extracted independently and later screen-blended
    # with the selected colour. This matches the white reference: bright,
    # soft reflection ribbons sit on top of the underlying coloured fabric.
    highlight_base = gaussian_filter(luminance, 0.8)
    h_low, h_high = np.percentile(highlight_base[mask > 0.55], (72, 99.5))
    highlights = np.clip((highlight_base - h_low) / max(h_high - h_low, 1e-6), 0, 1)
    highlights = highlights * highlights * (3 - 2 * highlights)
    highlights = gaussian_filter(highlights, 0.55) * np.clip(mask, 0, 1)
    highlight_encoded = np.rint(np.clip(highlights, 0, 1) * 255).astype(np.uint8)
    highlight_encoded[mask == 0] = 0
    highlight_output = BASE / "bow_highlights.png"
    Image.fromarray(highlight_encoded, mode="L").save(highlight_output, optimize=True)

    print(
        f"Wrote {output.relative_to(ROOT)} and {highlight_output.relative_to(ROOT)} "
        f"({low:.4f}..{high:.4f} source luminance)"
    )
    return output, highlight_output


if __name__ == "__main__":
    bake()