/**
 * CanvasController: Fabric.js wrapper for the box customizer.
 * Handles canvas init, object manipulation, undo/redo, grid, snap, zoom.
 */

import { mmToPx, pxToMm, computeCanvasSize, objectToMM } from './geometry.js';

const MAX_HISTORY = 50;
const GRID_SIZE_MM = 10; // 10mm grid
const SNAP_THRESHOLD = 5; // px

export class CanvasController {
  constructor(canvasElementId, options = {}) {
    this.canvasEl = document.getElementById(canvasElementId);
    this.canvas = null;
    this.sideMM = null;
    this.zoom = 1;
    this.gridEnabled = false;
    this.snapEnabled = false;
    this.gridObjects = [];
    this.safeZoneRect = null;
    this.bgRect = null;
    this.safeZoneInsetMM = options.safeZoneInsetMM || 5;

    // Undo/redo
    this.history = [];
    this.historyIndex = -1;
    this.isRestoring = false;

    // Callbacks
    this.onSelectionChange = options.onSelectionChange || null;
    this.onModified = options.onModified || null;
    this.onHistoryChange = options.onHistoryChange || null;
  }

  init(sideMM) {
    this.sideMM = sideMM;
    const container = document.getElementById('canvas-container');
    const { width, height } = computeCanvasSize(
      sideMM,
      container.clientWidth,
      container.clientHeight
    );

    this.canvas = new fabric.Canvas(this.canvasEl, {
      width,
      height,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
    });

    this._addBackgroundRect(width, height);
    this._addSafeZone(width, height, sideMM);
    this._setupEvents();
    this._saveHistory();

    return this.canvas;
  }

  /** Resize canvas when side changes */
  resizeForSide(sideMM) {
    this.sideMM = sideMM;
    const container = document.getElementById('canvas-container');
    const { width, height } = computeCanvasSize(
      sideMM,
      container.clientWidth,
      container.clientHeight
    );

    this.canvas.setDimensions({ width, height });

    // Update system objects
    this._removeSystemObjects();
    this._addBackgroundRect(width, height);
    this._addSafeZone(width, height, sideMM);
    if (this.gridEnabled) this._drawGrid();
    this.canvas.renderAll();
  }

  _addBackgroundRect(w, h) {
    this.bgRect = new fabric.Rect({
      left: 0, top: 0, width: w, height: h,
      fill: '#ffffff', stroke: '#e5e7eb', strokeWidth: 1,
      selectable: false, evented: false,
      data: { isSystem: true, type: 'background' },
    });
    this.canvas.add(this.bgRect);
    this.canvas.sendToBack(this.bgRect);
  }

  _addSafeZone(canvasW, canvasH, sideMM) {
    const pxPerMm = canvasW / sideMM.width;
    const inset = this.safeZoneInsetMM * pxPerMm;

    this.safeZoneRect = new fabric.Rect({
      left: inset, top: inset,
      width: canvasW - inset * 2,
      height: canvasH - inset * 2,
      fill: 'transparent',
      stroke: '#ef4444',
      strokeWidth: 1,
      strokeDashArray: [4, 4],
      selectable: false, evented: false,
      data: { isSystem: true, type: 'safezone' },
      opacity: 0.5,
    });
    this.canvas.add(this.safeZoneRect);
    this.canvas.bringToFront(this.safeZoneRect);
  }

  _removeSystemObjects() {
    const systemObjs = this.canvas.getObjects().filter(o => o.data?.isSystem);
    systemObjs.forEach(o => this.canvas.remove(o));
    this.gridObjects = [];
  }

  _setupEvents() {
    this.canvas.on('selection:created', (e) => this._onSelection(e));
    this.canvas.on('selection:updated', (e) => this._onSelection(e));
    this.canvas.on('selection:cleared', () => {
      if (this.onSelectionChange) this.onSelectionChange(null);
    });

    this.canvas.on('object:modified', () => {
      this._saveHistory();
      if (this.onModified) this.onModified();
    });

    this.canvas.on('object:added', (e) => {
      if (!e.target?.data?.isSystem && !this.isRestoring) {
        this._saveHistory();
      }
    });

    this.canvas.on('object:removed', (e) => {
      if (!e.target?.data?.isSystem && !this.isRestoring) {
        this._saveHistory();
      }
    });

    // Snap to grid
    this.canvas.on('object:moving', (e) => {
      if (!this.snapEnabled) return;
      const obj = e.target;
      const pxPerMm = this.canvas.width / this.sideMM.width;
      const gridPx = GRID_SIZE_MM * pxPerMm;
      obj.set({
        left: Math.round(obj.left / gridPx) * gridPx,
        top: Math.round(obj.top / gridPx) * gridPx,
      });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) this.redo(); else this.undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        this.redo();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement === document.body) {
          e.preventDefault();
          this.deleteSelected();
        }
      }
    });
  }

  _onSelection(e) {
    const obj = e.selected?.[0] || this.canvas.getActiveObject();
    if (obj && !obj.data?.isSystem && this.onSelectionChange) {
      this.onSelectionChange(obj);
    }
  }

  // ---- History (Undo/Redo) ----

  _saveHistory() {
    if (this.isRestoring) return;
    const json = this.canvas.toJSON(['selectable', 'evented', 'name', 'data']);
    json.objects = (json.objects || []).filter(o => !o.data?.isSystem);

    // Truncate future history
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    this.history.push(JSON.stringify(json));
    if (this.history.length > MAX_HISTORY) this.history.shift();
    this.historyIndex = this.history.length - 1;

    if (this.onHistoryChange) {
      this.onHistoryChange(this.historyIndex > 0, this.historyIndex < this.history.length - 1);
    }
  }

  undo() {
    if (this.historyIndex <= 0) return;
    this.historyIndex--;
    this._restoreHistory();
  }

  redo() {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex++;
    this._restoreHistory();
  }

  _restoreHistory() {
    this.isRestoring = true;
    const json = JSON.parse(this.history[this.historyIndex]);

    // Remove user objects
    const userObjs = this.canvas.getObjects().filter(o => !o.data?.isSystem);
    userObjs.forEach(o => this.canvas.remove(o));

    if (json.objects?.length > 0) {
      fabric.util.enlivenObjects(json.objects, (objects) => {
        objects.forEach(obj => this.canvas.add(obj));
        this.canvas.renderAll();
        this.isRestoring = false;
      });
    } else {
      this.canvas.renderAll();
      this.isRestoring = false;
    }

    if (this.onHistoryChange) {
      this.onHistoryChange(this.historyIndex > 0, this.historyIndex < this.history.length - 1);
    }
  }

  // ---- Tools ----

  addImage(file) {
    return new Promise((resolve, reject) => {
      if (file.size > 25 * 1024 * 1024) {
        reject(new Error('Файл слишком большой. Максимум 25MB.'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        fabric.Image.fromURL(e.target.result, (img) => {
          // Scale to fit 50% of canvas
          const maxW = this.canvas.width * 0.5;
          const maxH = this.canvas.height * 0.5;
          const scale = Math.min(maxW / img.width, maxH / img.height, 1);

          img.set({
            left: this.canvas.width / 2,
            top: this.canvas.height / 2,
            originX: 'center',
            originY: 'center',
            scaleX: scale,
            scaleY: scale,
          });

          this.canvas.add(img);
          this.canvas.setActiveObject(img);
          this.canvas.renderAll();
          resolve(img);
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  addText(options = {}) {
    const text = new fabric.IText(options.text || 'Текст', {
      left: this.canvas.width / 2,
      top: this.canvas.height / 2,
      originX: 'center',
      originY: 'center',
      fontFamily: options.fontFamily || 'Inter',
      fontSize: options.fontSize || 24,
      fill: options.fill || '#000000',
      fontWeight: options.fontWeight || 'normal',
      fontStyle: options.fontStyle || 'normal',
      textAlign: options.textAlign || 'left',
    });

    this.canvas.add(text);
    this.canvas.setActiveObject(text);
    this.canvas.renderAll();
    return text;
  }

  addSticker(url) {
    return new Promise((resolve) => {
      fabric.Image.fromURL(url, (img) => {
        const maxSize = Math.min(this.canvas.width, this.canvas.height) * 0.25;
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);

        img.set({
          left: this.canvas.width / 2,
          top: this.canvas.height / 2,
          originX: 'center',
          originY: 'center',
          scaleX: scale,
          scaleY: scale,
          data: { type: 'sticker' },
        });

        this.canvas.add(img);
        this.canvas.setActiveObject(img);
        this.canvas.renderAll();
        resolve(img);
      }, { crossOrigin: 'anonymous' });
    });
  }

  applyPattern(patternDef) {
    const active = this.canvas.getActiveObject();
    if (!active) {
      // Apply to background
      this._applyPatternToBackground(patternDef);
      return;
    }

    // Create pattern
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = patternDef.size || 20;
    patternCanvas.height = patternDef.size || 20;
    const ctx = patternCanvas.getContext('2d');
    
    // Draw pattern based on type
    this._drawPatternToContext(ctx, patternDef, patternCanvas.width, patternCanvas.height);

    const pattern = new fabric.Pattern({
      source: patternCanvas,
      repeat: 'repeat',
    });

    active.set('fill', pattern);
    this.canvas.renderAll();
    this._saveHistory();
  }

  _applyPatternToBackground(patternDef) {
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = patternDef.size || 20;
    patternCanvas.height = patternDef.size || 20;
    const ctx = patternCanvas.getContext('2d');
    this._drawPatternToContext(ctx, patternDef, patternCanvas.width, patternCanvas.height);

    const pattern = new fabric.Pattern({
      source: patternCanvas,
      repeat: 'repeat',
    });

    if (this.bgRect) {
      this.bgRect.set('fill', pattern);
      this.canvas.renderAll();
      this._saveHistory();
    }
  }

  _drawPatternToContext(ctx, patternDef, w, h) {
    ctx.fillStyle = patternDef.bgColor || '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = patternDef.fgColor || '#000000';

    switch (patternDef.type) {
      case 'dots':
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, (patternDef.dotSize || 2), 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'stripes':
        ctx.fillRect(0, 0, w / 2, h);
        break;
      case 'diagonal':
        ctx.lineWidth = patternDef.lineWidth || 2;
        ctx.strokeStyle = patternDef.fgColor || '#000000';
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(w, 0);
        ctx.stroke();
        break;
      case 'grid':
        ctx.lineWidth = 1;
        ctx.strokeStyle = patternDef.fgColor || '#000000';
        ctx.beginPath();
        ctx.moveTo(w / 2, 0);
        ctx.lineTo(w / 2, h);
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();
        break;
      case 'chevron':
        ctx.lineWidth = patternDef.lineWidth || 2;
        ctx.strokeStyle = patternDef.fgColor || '#000000';
        ctx.beginPath();
        ctx.moveTo(0, h * 0.75);
        ctx.lineTo(w / 2, h * 0.25);
        ctx.lineTo(w, h * 0.75);
        ctx.stroke();
        break;
      default:
        ctx.fillRect(0, 0, w / 3, h / 3);
    }
  }

  deleteSelected() {
    const active = this.canvas.getActiveObject();
    if (!active || active.data?.isSystem) return;

    if (active.type === 'activeSelection') {
      active.forEachObject(obj => {
        if (!obj.data?.isSystem) this.canvas.remove(obj);
      });
      this.canvas.discardActiveObject();
    } else {
      this.canvas.remove(active);
    }
    this.canvas.renderAll();
  }

  // ---- Grid ----

  toggleGrid() {
    this.gridEnabled = !this.gridEnabled;
    if (this.gridEnabled) {
      this._drawGrid();
    } else {
      this.gridObjects.forEach(o => this.canvas.remove(o));
      this.gridObjects = [];
      this.canvas.renderAll();
    }
    return this.gridEnabled;
  }

  _drawGrid() {
    // Remove existing grid
    this.gridObjects.forEach(o => this.canvas.remove(o));
    this.gridObjects = [];

    const pxPerMm = this.canvas.width / this.sideMM.width;
    const gridPx = GRID_SIZE_MM * pxPerMm;

    for (let x = gridPx; x < this.canvas.width; x += gridPx) {
      const line = new fabric.Line([x, 0, x, this.canvas.height], {
        stroke: '#d1d5db', strokeWidth: 0.5,
        selectable: false, evented: false,
        data: { isSystem: true, type: 'grid' },
        opacity: 0.5,
      });
      this.canvas.add(line);
      this.gridObjects.push(line);
    }
    for (let y = gridPx; y < this.canvas.height; y += gridPx) {
      const line = new fabric.Line([0, y, this.canvas.width, y], {
        stroke: '#d1d5db', strokeWidth: 0.5,
        selectable: false, evented: false,
        data: { isSystem: true, type: 'grid' },
        opacity: 0.5,
      });
      this.canvas.add(line);
      this.gridObjects.push(line);
    }

    // Ensure safe zone stays on top
    if (this.safeZoneRect) this.canvas.bringToFront(this.safeZoneRect);
    this.canvas.renderAll();
  }

  toggleSnap() {
    this.snapEnabled = !this.snapEnabled;
    return this.snapEnabled;
  }

  // ---- Zoom ----

  setZoom(pct) {
    this.zoom = pct / 100;
    const container = document.getElementById('canvas-container');
    const wrapper = document.getElementById('canvas-wrapper');
    if (wrapper) {
      wrapper.style.transform = `scale(${this.zoom})`;
      wrapper.style.transformOrigin = 'center center';
    }
    return pct;
  }

  getZoom() {
    return Math.round(this.zoom * 100);
  }

  // ---- Export ----

  exportToPNG(multiplier = 2) {
    // Temporarily hide system objects
    const systemObjs = this.canvas.getObjects().filter(o => o.data?.isSystem);
    systemObjs.forEach(o => o.set('visible', false));
    this.canvas.renderAll();

    const dataUrl = this.canvas.toDataURL({
      format: 'png',
      quality: 1.0,
      multiplier,
    });

    // Restore system objects
    systemObjs.forEach(o => o.set('visible', true));
    this.canvas.renderAll();

    return dataUrl;
  }

  // ---- Alignment ----

  alignObject(alignment) {
    const obj = this.canvas.getActiveObject();
    if (!obj || obj.data?.isSystem) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const bound = obj.getBoundingRect();

    switch (alignment) {
      case 'left': obj.set('left', obj.left - bound.left); break;
      case 'center-h': obj.set('left', w / 2 - bound.width / 2 + (obj.left - bound.left)); break;
      case 'right': obj.set('left', w - bound.width + (obj.left - bound.left)); break;
      case 'top': obj.set('top', obj.top - bound.top); break;
      case 'center-v': obj.set('top', h / 2 - bound.height / 2 + (obj.top - bound.top)); break;
      case 'bottom': obj.set('top', h - bound.height + (obj.top - bound.top)); break;
      case 'center':
        obj.set({
          left: w / 2 - bound.width / 2 + (obj.left - bound.left),
          top: h / 2 - bound.height / 2 + (obj.top - bound.top),
        });
        break;
    }

    obj.setCoords();
    this.canvas.renderAll();
    this._saveHistory();
  }

  /** Apply a template to the canvas */
  applyTemplate(templateDef) {
    // Remove all user objects
    const userObjs = this.canvas.getObjects().filter(o => !o.data?.isSystem);
    userObjs.forEach(o => this.canvas.remove(o));

    if (templateDef.objects) {
      templateDef.objects.forEach(objDef => {
        if (objDef.type === 'text') {
          this.addText({
            text: objDef.text || 'Текст',
            fontFamily: objDef.fontFamily,
            fontSize: objDef.fontSize,
            fill: objDef.fill,
          });
        }
      });
    }

    this.canvas.renderAll();
    this._saveHistory();
  }

  getCanvas() {
    return this.canvas;
  }

  /**
   * Get mm data for all user objects on the canvas
   */
  getUserObjectsMM() {
    if (!this.canvas || !this.sideMM) return [];
    return this.canvas.getObjects()
      .filter(o => !o.data?.isSystem)
      .map(o => ({
        type: o.type,
        ...objectToMM(o, this.canvas.width, this.sideMM.width),
      }));
  }
}
