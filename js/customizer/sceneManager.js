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
  async switchSide(targetSide) {
    if (targetSide === this.currentSide) return;
    if (!SIDES.includes(targetSide)) return;

    // Save current side state
    this._serializeCurrent();

    this.currentSide = targetSide;

    // Load target side state
    await this._restoreSide(targetSide);
  }

  _serializeCurrent() {
    if (!this.canvas) return;
    const json = this.canvas.toJSON(['selectable', 'evented', 'name', 'data']);
    // Filter out non-user objects (grid, safe zone, background rect)
    json.objects = (json.objects || []).filter(o => !o.data?.isSystem);
    this.sides[this.currentSide].fabricJSON = json;
  }

  _restoreSide(side) {
    if (!this.canvas) return Promise.resolve();
    const sideData = this.sides[side];
    
    // Clear only user objects
    const userObjects = this.canvas.getObjects().filter(o => !o.data?.isSystem);
    userObjects.forEach(o => this.canvas.remove(o));

    if (sideData.fabricJSON && sideData.fabricJSON.objects?.length > 0) {
      return new Promise((resolve) => {
        fabric.util.enlivenObjects(sideData.fabricJSON.objects, (objects) => {
          objects.forEach(obj => this.canvas.add(obj));
          this.canvas.renderAll();
          resolve();
        });
      });
    } else {
      this.canvas.renderAll();
      return Promise.resolve();
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

  /**
   * Load scene JSON from a public URL (e.g. Supabase Storage).
   * Uses res.text() + JSON.parse() so it works regardless of Content-Type header.
   *
   * Manual test checklist:
   * 1. Upload scene.json → verify Storage metadata is application/json
   * 2. Load scene.json from public URL with octet-stream header → still parses OK
   * 3. Add to cart completes without error, previews/PDF exported
   */
  /**
   * Detect which sides have user-created objects (not system overlays).
   * Returns array of side names, e.g. ['front', 'top']
   */
  static detectCustomizedSides(sidesData) {
    return SIDES.filter(side => {
      const sideInfo = sidesData[side];
      if (!sideInfo?.fabricJSON?.objects) return false;
      return sideInfo.fabricJSON.objects.some(o => !o.data?.isSystem);
    });
  }

  static async loadSceneFromUrl(sceneUrl) {
    const res = await fetch(sceneUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error('Сцена недоступна. Код: ' + res.status);

    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error('Сцена повреждена или недоступна. Повторите попытку.');
    }
  }
}

export { SIDES, SIDE_LABELS };
