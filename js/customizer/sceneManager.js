/**
 * SceneManager: manages 7-side state for the box customizer.
 * Each side stores its own Fabric JSON and objects_mm array.
 */

const SIDES = ['front', 'back', 'left', 'right', 'top', 'bottom', 'inside'];
const SIDE_LABELS = {
  front: 'Перед', back: 'Зад', left: 'Лево', right: 'Право',
  top: 'Верх', bottom: 'Низ', inside: 'Внутри',
};

const DRAFT_KEY = 'customizer_draft';

export class SceneManager {
  constructor() {
    this.currentSide = 'front';
    this.sides = {};
    SIDES.forEach(s => {
      this.sides[s] = { fabricJSON: null, objectsMM: [] };
    });
    this.canvas = null;
  }

  setCanvas(canvas) {
    this.canvas = canvas;
  }

  getCurrentSide() {
    return this.currentSide;
  }

  getSideData(side) {
    return this.sides[side];
  }

  getAllSidesData() {
    // Before returning, serialize current canvas
    this._serializeCurrent();
    return { ...this.sides };
  }

  /**
   * Switch to a different side.
   * Serializes the current canvas state, then loads the target side.
   */
  switchSide(targetSide) {
    if (targetSide === this.currentSide) return;
    if (!SIDES.includes(targetSide)) return;

    // Save current side state
    this._serializeCurrent();

    this.currentSide = targetSide;

    // Load target side state
    this._restoreSide(targetSide);
  }

  _serializeCurrent() {
    if (!this.canvas) return;
    const json = this.canvas.toJSON(['selectable', 'evented', 'name', 'data']);
    // Filter out non-user objects (grid, safe zone, background rect)
    json.objects = (json.objects || []).filter(o => !o.data?.isSystem);
    this.sides[this.currentSide].fabricJSON = json;
  }

  _restoreSide(side) {
    if (!this.canvas) return;
    const sideData = this.sides[side];
    
    // Clear only user objects
    const userObjects = this.canvas.getObjects().filter(o => !o.data?.isSystem);
    userObjects.forEach(o => this.canvas.remove(o));

    if (sideData.fabricJSON && sideData.fabricJSON.objects?.length > 0) {
      // Use enlivening to restore objects
      fabric.util.enlivenObjects(sideData.fabricJSON.objects, (objects) => {
        objects.forEach(obj => this.canvas.add(obj));
        this.canvas.renderAll();
      });
    } else {
      this.canvas.renderAll();
    }
  }

  /** Save draft to localStorage */
  saveDraft(productId) {
    this._serializeCurrent();
    const draft = {
      productId,
      currentSide: this.currentSide,
      sides: this.sides,
      savedAt: Date.now(),
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn('Failed to save draft:', e);
    }
  }

  /** Restore draft from localStorage if exists and matches product */
  restoreDraft(productId) {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return false;
      const draft = JSON.parse(raw);
      if (draft.productId !== productId) return false;
      // Check if draft is less than 24h old
      if (Date.now() - draft.savedAt > 24 * 60 * 60 * 1000) return false;
      
      this.sides = draft.sides;
      this.currentSide = draft.currentSide || 'front';
      return true;
    } catch (e) {
      console.warn('Failed to restore draft:', e);
      return false;
    }
  }

  clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
  }

  /** Get all objects_mm for all sides (for DB save) */
  getObjectsMM(canvasWidth, sideDimensions) {
    // Import dynamically avoided — caller should pass conversion fn
    return null; // handled externally
  }
}

export { SIDES, SIDE_LABELS };
