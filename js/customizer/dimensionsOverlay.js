/**
 * DimensionsOverlay: renders mm rulers and dimension labels
 * around the Fabric canvas. All overlay objects are marked
 * isSystem so they are excluded from export.
 */

const RULER_THICKNESS = 24;  // px
const TICK_SMALL = 4;        // px height for 5mm tick
const TICK_LARGE = 8;        // px height for 10mm tick
const LABEL_FONT = '10px Inter, sans-serif';
const RULER_BG = '#f8f9fa';
const RULER_BORDER = '#dee2e6';
const TICK_COLOR = '#6b7280';
const LABEL_COLOR = '#374151';
const DIM_LABEL_FONT = '12px Inter, sans-serif';
const DIM_LABEL_COLOR = '#7c3aed';

export class DimensionsOverlay {
  constructor(canvasController) {
    this.cc = canvasController;
    this.enabled = false;
    this.topRulerEl = null;
    this.leftRulerEl = null;
    this.dimLabelsEl = null;
    this._createDOMElements();
  }

  _createDOMElements() {
    const wrapper = document.getElementById('canvas-wrapper');
    if (!wrapper) return;

    // Top ruler canvas
    this.topRulerEl = document.createElement('canvas');
    this.topRulerEl.className = 'dimensions-ruler dimensions-ruler-top';
    this.topRulerEl.style.cssText = `
      position: absolute; top: -${RULER_THICKNESS + 1}px; left: 0;
      height: ${RULER_THICKNESS}px; pointer-events: none; display: none;
    `;
    wrapper.appendChild(this.topRulerEl);

    // Left ruler canvas
    this.leftRulerEl = document.createElement('canvas');
    this.leftRulerEl.className = 'dimensions-ruler dimensions-ruler-left';
    this.leftRulerEl.style.cssText = `
      position: absolute; left: -${RULER_THICKNESS + 1}px; top: 0;
      width: ${RULER_THICKNESS}px; pointer-events: none; display: none;
    `;
    wrapper.appendChild(this.leftRulerEl);

    // Dimension labels container
    this.dimLabelsEl = document.createElement('div');
    this.dimLabelsEl.className = 'dimensions-labels';
    this.dimLabelsEl.style.cssText = `
      position: absolute; inset: -${RULER_THICKNESS + 20}px;
      pointer-events: none; display: none;
    `;
    wrapper.appendChild(this.dimLabelsEl);
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.rebuild();
    } else {
      this._hide();
    }
    return this.enabled;
  }

  rebuild() {
    if (!this.enabled) return;
    const canvas = this.cc.canvas;
    const sideMM = this.cc.sideMM;
    if (!canvas || !sideMM) return;

    const canvasW = canvas.width;
    const canvasH = canvas.height;

    this._drawTopRuler(canvasW, canvasH, sideMM);
    this._drawLeftRuler(canvasW, canvasH, sideMM);
    this._drawDimensionLabels(canvasW, canvasH, sideMM);
  }

  _hide() {
    if (this.topRulerEl) this.topRulerEl.style.display = 'none';
    if (this.leftRulerEl) this.leftRulerEl.style.display = 'none';
    if (this.dimLabelsEl) this.dimLabelsEl.style.display = 'none';
  }

  _drawTopRuler(canvasW, canvasH, sideMM) {
    const el = this.topRulerEl;
    if (!el) return;

    el.width = canvasW;
    el.height = RULER_THICKNESS;
    el.style.width = canvasW + 'px';
    el.style.display = 'block';

    const ctx = el.getContext('2d');
    const pxPerMm = canvasW / sideMM.width;

    // Background
    ctx.fillStyle = RULER_BG;
    ctx.fillRect(0, 0, canvasW, RULER_THICKNESS);
    ctx.strokeStyle = RULER_BORDER;
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, canvasW, RULER_THICKNESS);

    // Ticks
    ctx.strokeStyle = TICK_COLOR;
    ctx.fillStyle = LABEL_COLOR;
    ctx.font = LABEL_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const totalMM = Math.ceil(sideMM.width);
    for (let mm = 0; mm <= totalMM; mm++) {
      const x = mm * pxPerMm;
      if (x > canvasW) break;

      const isBold = mm % 10 === 0;
      const isMedium = mm % 5 === 0;

      if (isBold || isMedium) {
        ctx.lineWidth = isBold ? 1.5 : 0.5;
        const tickH = isBold ? TICK_LARGE : TICK_SMALL;
        ctx.beginPath();
        ctx.moveTo(x, RULER_THICKNESS);
        ctx.lineTo(x, RULER_THICKNESS - tickH);
        ctx.stroke();

        if (isBold && mm > 0) {
          ctx.fillText(String(mm), x, 2);
        }
      }
    }
  }

  _drawLeftRuler(canvasW, canvasH, sideMM) {
    const el = this.leftRulerEl;
    if (!el) return;

    el.width = RULER_THICKNESS;
    el.height = canvasH;
    el.style.height = canvasH + 'px';
    el.style.display = 'block';

    const ctx = el.getContext('2d');
    const pxPerMm = canvasH / sideMM.height;

    ctx.fillStyle = RULER_BG;
    ctx.fillRect(0, 0, RULER_THICKNESS, canvasH);
    ctx.strokeStyle = RULER_BORDER;
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, RULER_THICKNESS, canvasH);

    ctx.strokeStyle = TICK_COLOR;
    ctx.fillStyle = LABEL_COLOR;
    ctx.font = LABEL_FONT;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const totalMM = Math.ceil(sideMM.height);
    for (let mm = 0; mm <= totalMM; mm++) {
      const y = mm * pxPerMm;
      if (y > canvasH) break;

      const isBold = mm % 10 === 0;
      const isMedium = mm % 5 === 0;

      if (isBold || isMedium) {
        ctx.lineWidth = isBold ? 1.5 : 0.5;
        const tickH = isBold ? TICK_LARGE : TICK_SMALL;
        ctx.beginPath();
        ctx.moveTo(RULER_THICKNESS, y);
        ctx.lineTo(RULER_THICKNESS - tickH, y);
        ctx.stroke();

        if (isBold && mm > 0) {
          ctx.fillText(String(mm), RULER_THICKNESS - TICK_LARGE - 2, y);
        }
      }
    }
  }

  _drawDimensionLabels(canvasW, canvasH, sideMM) {
    const el = this.dimLabelsEl;
    if (!el) return;
    el.style.display = 'block';

    const wMM = Math.round(sideMM.width);
    const hMM = Math.round(sideMM.height);
    const offset = RULER_THICKNESS + 20; // match inset

    el.innerHTML = `
      <div style="
        position: absolute;
        top: ${offset - 18}px;
        left: ${offset}px;
        right: ${offset}px;
        text-align: center;
        font: ${DIM_LABEL_FONT};
        color: ${DIM_LABEL_COLOR};
        font-weight: 600;
      ">${wMM} мм</div>
      <div style="
        position: absolute;
        right: ${offset - 18}px;
        top: ${offset}px;
        bottom: ${offset}px;
        display: flex;
        align-items: center;
        writing-mode: vertical-rl;
        text-orientation: mixed;
        font: ${DIM_LABEL_FONT};
        color: ${DIM_LABEL_COLOR};
        font-weight: 600;
      ">${hMM} мм</div>
    `;
  }

  destroy() {
    this.topRulerEl?.remove();
    this.leftRulerEl?.remove();
    this.dimLabelsEl?.remove();
  }
}
