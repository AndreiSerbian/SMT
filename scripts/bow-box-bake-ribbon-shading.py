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


def bake() -> Path:
    source = np.asarray(Image.open(BASE / "source.png").convert("RGB"), dtype=float) / 255
    mask = np.asarray(Image.open(BASE / "masks/mask_bow.png").convert("L"), dtype=float) / 255
    luminance = source @ np.array([0.2126, 0.7152, 0.0722])

    # A soft broad layer carries the folds.  A much weaker fine layer keeps
    # satin character without restoring the photographed pixel noise.
    broad = gaussian_filter(luminance, 2.1)
    fine = gaussian_filter(luminance, 0.75) - gaussian_filter(luminance, 3.4)
    ribbon_pixels = broad[mask > 0.55]
    low, high = np.percentile(ribbon_pixels, (2.5, 98.5))
    normalized = np.clip((broad - low) / max(high - low, 1e-6), 0, 1)

    # Smoothstep avoids hard shoulders in highlights and shadows.  The
    # encoded range maps to a multiplier of roughly 0.62–1.16 in the browser.
    normalized = normalized * normalized * (3 - 2 * normalized)
    factor = 0.62 + 0.54 * normalized + np.clip(fine, -0.035, 0.035) * 0.7
    factor = gaussian_filter(np.clip(factor, 0.60, 1.18), 0.45)

    encoded = np.rint(np.clip(factor / 1.25, 0, 1) * 255).astype(np.uint8)
    encoded[mask == 0] = 0
    output = BASE / "bow_shading.png"
    Image.fromarray(encoded, mode="L").save(output, optimize=True)
    print(f"Wrote {output.relative_to(ROOT)} ({low:.4f}..{high:.4f} source luminance)")
    return output


if __name__ == "__main__":
    bake()