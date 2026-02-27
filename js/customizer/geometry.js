/**
 * Geometry utilities: px <-> mm conversion
 * Millimeters are the source of truth for all object positions/sizes.
 */

const SCREEN_DPI = 72;
const PRINT_DPI = 300;
const MM_PER_INCH = 25.4;

export function mmToPx(mm, dpi = SCREEN_DPI) {
  return (mm / MM_PER_INCH) * dpi;
}

export function pxToMm(px, dpi = SCREEN_DPI) {
  return (px / dpi) * MM_PER_INCH;
}

/**
 * Given product dimensions {length, width, height} in mm,
 * return the dimensions for each box side in mm.
 */
/**
 * Parse a single dimension value from DB.
 * DB stores values in cm (e.g. 23 meaning 23cm).
 * If string contains unit suffix, parse accordingly.
 * Returns value in mm.
 */
export function parseDimensionToMM(raw) {
  if (raw == null) return 0;
  const str = String(raw).trim().toLowerCase();
  const num = parseFloat(str);
  if (isNaN(num)) return 0;

  // Explicit mm
  if (str.includes('мм') || str.includes('mm')) {
    return num;
  }
  // Explicit cm — or bare number (DB convention: cm)
  // Strings with 'см' or 'cm', or plain numbers
  return num * 10;
}

/**
 * Parse product dimensions object from DB → mm values.
 * DB stores length/width/height in cm (bare numbers).
 */
export function parseProductDimensions(dims) {
  return {
    length: parseDimensionToMM(dims?.length),
    width: parseDimensionToMM(dims?.width),
    height: parseDimensionToMM(dims?.height),
  };
}

export function getSideDimensions(productDimensions) {
  const { length: l, width: w, height: h } = productDimensions;
  return {
    front:  { width: l, height: h },
    back:   { width: l, height: h },
    left:   { width: w, height: h },
    right:  { width: w, height: h },
    top:    { width: l, height: w },
    bottom: { width: l, height: w },
    inside: { width: l, height: w },
  };
}

/**
 * Compute the best canvas px size that fits a given container,
 * maintaining the mm aspect ratio of the current side.
 */
export function computeCanvasSize(sideMM, containerWidth, containerHeight, padding = 40) {
  const availW = containerWidth - padding * 2;
  const availH = containerHeight - padding * 2;
  const aspect = sideMM.width / sideMM.height;

  let canvasW, canvasH;
  if (availW / availH > aspect) {
    canvasH = availH;
    canvasW = canvasH * aspect;
  } else {
    canvasW = availW;
    canvasH = canvasW / aspect;
  }

  return {
    width: Math.round(canvasW),
    height: Math.round(canvasH),
    scale: canvasW / mmToPx(sideMM.width),
  };
}

/**
 * Convert a Fabric object's px coords to mm values.
 */
export function objectToMM(obj, canvasWidth, sideMM_width) {
  const pxPerMm = canvasWidth / sideMM_width;
  return {
    x_mm: +(obj.left / pxPerMm).toFixed(2),
    y_mm: +(obj.top / pxPerMm).toFixed(2),
    width_mm: +((obj.width * obj.scaleX) / pxPerMm).toFixed(2),
    height_mm: +((obj.height * obj.scaleY) / pxPerMm).toFixed(2),
    rotation: +(obj.angle || 0).toFixed(1),
    opacity: obj.opacity ?? 1,
  };
}

/**
 * Convert mm coords back to px for canvas rendering.
 */
export function mmToObject(mmData, canvasWidth, sideMM_width) {
  const pxPerMm = canvasWidth / sideMM_width;
  return {
    left: mmData.x_mm * pxPerMm,
    top: mmData.y_mm * pxPerMm,
    scaleX: (mmData.width_mm * pxPerMm) / 100, // will be adjusted per object
    scaleY: (mmData.height_mm * pxPerMm) / 100,
    angle: mmData.rotation || 0,
    opacity: mmData.opacity ?? 1,
  };
}

export { SCREEN_DPI, PRINT_DPI, MM_PER_INCH };
