/**
 * Inspector: Right panel for object properties (X/Y/W/H in mm, rotation, opacity, flip, text controls)
 */

import { pxToMm, mmToPx } from './geometry.js';

export class Inspector {
  constructor(canvasController, sideMM) {
    this.cc = canvasController;
    this.sideMM = sideMM;
    this.currentObject = null;

    this.els = {
      empty: document.getElementById('inspector-empty'),
      props: document.getElementById('inspector-props'),
      x: document.getElementById('prop-x'),
      y: document.getElementById('prop-y'),
      w: document.getElementById('prop-w'),
      h: document.getElementById('prop-h'),
      rotation: document.getElementById('prop-rotation'),
      opacity: document.getElementById('prop-opacity'),
      flipH: document.getElementById('prop-flip-h'),
      flipV: document.getElementById('prop-flip-v'),
      textControls: document.getElementById('text-controls'),
      font: document.getElementById('prop-font'),
      fontSize: document.getElementById('prop-font-size'),
      fontColor: document.getElementById('prop-font-color'),
      bold: document.getElementById('prop-bold'),
      italic: document.getElementById('prop-italic'),
      alignLeft: document.getElementById('prop-align-left'),
      alignCenter: document.getElementById('prop-align-center'),
      alignRight: document.getElementById('prop-align-right'),
    };

    this._bindEvents();
  }

  updateSideMM(sideMM) {
    this.sideMM = sideMM;
  }

  show(obj) {
    this.currentObject = obj;
    this.els.empty.classList.add('hidden');
    this.els.props.classList.remove('hidden');
    this._updateValues();

    // Show text controls if it's a text object
    const isText = obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox';
    this.els.textControls.classList.toggle('hidden', !isText);
    if (isText) this._updateTextValues();
  }

  hide() {
    this.currentObject = null;
    this.els.empty.classList.remove('hidden');
    this.els.props.classList.add('hidden');
  }

  _getPxPerMm() {
    return this.cc.getCanvas().width / this.sideMM.width;
  }

  _updateValues() {
    const obj = this.currentObject;
    if (!obj) return;
    const ppm = this._getPxPerMm();

    this.els.x.value = (obj.left / ppm).toFixed(1);
    this.els.y.value = (obj.top / ppm).toFixed(1);
    this.els.w.value = ((obj.width * (obj.scaleX || 1)) / ppm).toFixed(1);
    this.els.h.value = ((obj.height * (obj.scaleY || 1)) / ppm).toFixed(1);
    this.els.rotation.value = (obj.angle || 0).toFixed(0);
    this.els.opacity.value = obj.opacity ?? 1;
  }

  _updateTextValues() {
    const obj = this.currentObject;
    if (!obj) return;
    this.els.font.value = obj.fontFamily || 'Inter';
    this.els.fontSize.value = obj.fontSize || 24;
    this.els.fontColor.value = obj.fill || '#000000';
  }

  _bindEvents() {
    // Position/size changes
    const applyNumeric = (el, setter) => {
      el.addEventListener('change', () => {
        if (!this.currentObject) return;
        setter(parseFloat(el.value));
        this.currentObject.setCoords();
        this.cc.getCanvas().renderAll();
      });
    };

    const ppm = () => this._getPxPerMm();

    applyNumeric(this.els.x, (v) => this.currentObject.set('left', v * ppm()));
    applyNumeric(this.els.y, (v) => this.currentObject.set('top', v * ppm()));
    applyNumeric(this.els.w, (v) => {
      const scale = (v * ppm()) / this.currentObject.width;
      this.currentObject.set('scaleX', scale);
    });
    applyNumeric(this.els.h, (v) => {
      const scale = (v * ppm()) / this.currentObject.height;
      this.currentObject.set('scaleY', scale);
    });
    applyNumeric(this.els.rotation, (v) => this.currentObject.set('angle', v));

    this.els.opacity.addEventListener('input', () => {
      if (!this.currentObject) return;
      this.currentObject.set('opacity', parseFloat(this.els.opacity.value));
      this.cc.getCanvas().renderAll();
    });

    this.els.flipH.addEventListener('click', () => {
      if (!this.currentObject) return;
      this.currentObject.set('flipX', !this.currentObject.flipX);
      this.cc.getCanvas().renderAll();
    });

    this.els.flipV.addEventListener('click', () => {
      if (!this.currentObject) return;
      this.currentObject.set('flipY', !this.currentObject.flipY);
      this.cc.getCanvas().renderAll();
    });

    // Text controls
    this.els.font?.addEventListener('change', () => {
      if (!this.currentObject) return;
      this.currentObject.set('fontFamily', this.els.font.value);
      this.currentObject.setCoords();
      this.cc.getCanvas().renderAll();
    });

    this.els.fontSize?.addEventListener('change', () => {
      if (!this.currentObject) return;
      this.currentObject.set('fontSize', parseInt(this.els.fontSize.value));
      this.currentObject.setCoords();
      this.cc.getCanvas().renderAll();
    });

    this.els.fontColor?.addEventListener('input', () => {
      if (!this.currentObject) return;
      this.currentObject.set('fill', this.els.fontColor.value);
      this.cc.getCanvas().renderAll();
    });

    this.els.bold?.addEventListener('click', () => {
      if (!this.currentObject) return;
      const isBold = this.currentObject.fontWeight === 'bold';
      this.currentObject.set('fontWeight', isBold ? 'normal' : 'bold');
      this.els.bold.classList.toggle('bg-gray-200', !isBold);
      this.cc.getCanvas().renderAll();
    });

    this.els.italic?.addEventListener('click', () => {
      if (!this.currentObject) return;
      const isItalic = this.currentObject.fontStyle === 'italic';
      this.currentObject.set('fontStyle', isItalic ? 'normal' : 'italic');
      this.els.italic.classList.toggle('bg-gray-200', !isItalic);
      this.cc.getCanvas().renderAll();
    });

    this.els.alignLeft?.addEventListener('click', () => this._setTextAlign('left'));
    this.els.alignCenter?.addEventListener('click', () => this._setTextAlign('center'));
    this.els.alignRight?.addEventListener('click', () => this._setTextAlign('right'));

    // Listen for object movement on canvas to update inspector live
    if (this.cc.getCanvas()) {
      this.cc.getCanvas().on('object:moving', () => this._updateValues());
      this.cc.getCanvas().on('object:scaling', () => this._updateValues());
      this.cc.getCanvas().on('object:rotating', () => this._updateValues());
    }
  }

  /** Bind canvas events after canvas is initialized */
  bindCanvasEvents() {
    const canvas = this.cc.getCanvas();
    if (!canvas) return;
    canvas.on('object:moving', () => this._updateValues());
    canvas.on('object:scaling', () => this._updateValues());
    canvas.on('object:rotating', () => this._updateValues());
  }

  _setTextAlign(align) {
    if (!this.currentObject) return;
    this.currentObject.set('textAlign', align);
    this.cc.getCanvas().renderAll();
  }
}
