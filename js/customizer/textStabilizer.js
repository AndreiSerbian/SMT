/**
 * TextStabilizer: ensures Fabric text objects render deterministically
 * by loading fonts, normalizing baselines, and freezing metrics.
 *
 * Usage: await stabilizeCanvasText(canvas);
 */

const TEXT_TYPES = ['textbox', 'i-text', 'text'];
const VALID_BASELINES = ['alphabetic', 'top', 'hanging', 'middle', 'ideographic', 'bottom'];

/**
 * Collect unique font families used by text objects on the canvas.
 */
function collectFonts(canvas) {
  const fonts = new Set();
  canvas.getObjects().forEach(obj => {
    if (TEXT_TYPES.includes(obj.type) && obj.fontFamily) {
      fonts.add(obj.fontFamily);
    }
  });
  return [...fonts];
}

/**
 * Wait for document.fonts.ready, then explicitly load each used font.
 */
async function ensureFontsLoaded(fonts) {
  await document.fonts.ready;
  const loads = fonts.map(f => {
    return document.fonts.load(`16px "${f}"`).catch(() => {
      console.warn(`Font "${f}" could not be loaded, using fallback`);
    });
  });
  await Promise.all(loads);
}

/**
 * Normalize and stabilize every text object on the canvas.
 * - Fix invalid textBaseline
 * - Re-init dimensions after font load
 * - Freeze Textbox width to prevent auto-reflow
 * - Update coordinates
 */
function stabilizeTextObjects(canvas) {
  canvas.getObjects().forEach(obj => {
    if (!TEXT_TYPES.includes(obj.type)) return;

    // 1. Fix textBaseline
    if (obj.textBaseline && !VALID_BASELINES.includes(obj.textBaseline)) {
      obj.textBaseline = 'alphabetic';
    }

    // 2. Freeze Textbox width before re-init (prevents auto-reflow)
    const frozenWidth = obj.width;
    const frozenScaleX = obj.scaleX;

    // 3. Re-init dimensions so metrics match loaded font
    if (typeof obj.initDimensions === 'function') {
      obj.initDimensions();
    }

    // 4. Re-apply frozen width for Textbox with wrapping
    if (obj.type === 'textbox' && frozenWidth) {
      obj.set({ width: frozenWidth, scaleX: frozenScaleX });
    }

    // 5. Mark dirty and update coords
    obj.dirty = true;
    obj.setCoords();
  });
}

/**
 * Main entry point — call before serialize / export.
 * Returns a promise that resolves when text is fully stabilized.
 */
export async function stabilizeCanvasText(canvas) {
  if (!canvas) return;

  const fonts = collectFonts(canvas);
  if (fonts.length > 0) {
    await ensureFontsLoaded(fonts);
  }

  stabilizeTextObjects(canvas);
  canvas.renderAll();
}
