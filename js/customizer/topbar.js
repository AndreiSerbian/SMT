/**
 * TopBar: undo/redo, zoom, grid, snap, save, confirm, back
 */

export class TopBar {
  constructor(canvasController, options = {}) {
    this.cc = canvasController;
    this.onSave = options.onSave || (() => {});
    this.onConfirm = options.onConfirm || (() => {});
    this.onBack = options.onBack || (() => {});
    this.productId = options.productId || '';

    this._bind();
  }

  _bind() {
    document.getElementById('btn-undo')?.addEventListener('click', () => this.cc.undo());
    document.getElementById('btn-redo')?.addEventListener('click', () => this.cc.redo());

    document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
      const z = Math.min(this.cc.getZoom() + 10, 200);
      this.cc.setZoom(z);
      document.getElementById('zoom-level').textContent = z + '%';
    });
    document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
      const z = Math.max(this.cc.getZoom() - 10, 50);
      this.cc.setZoom(z);
      document.getElementById('zoom-level').textContent = z + '%';
    });

    document.getElementById('btn-grid')?.addEventListener('click', (e) => {
      const on = this.cc.toggleGrid();
      e.currentTarget.classList.toggle('bg-purple-100', on);
      e.currentTarget.classList.toggle('text-purple-700', on);
    });

    document.getElementById('btn-snap')?.addEventListener('click', (e) => {
      const on = this.cc.toggleSnap();
      e.currentTarget.classList.toggle('bg-purple-100', on);
      e.currentTarget.classList.toggle('text-purple-700', on);
    });

    document.getElementById('btn-save')?.addEventListener('click', () => this.onSave());
    document.getElementById('btn-confirm')?.addEventListener('click', () => this.onConfirm());
    document.getElementById('btn-back')?.addEventListener('click', () => {
      if (this.productId) {
        window.location.href = '/#product/' + this.productId;
      } else {
        window.location.href = '/';
      }
    });
  }

  updateHistoryButtons(canUndo, canRedo) {
    const undoBtn = document.getElementById('btn-undo');
    const redoBtn = document.getElementById('btn-redo');
    if (undoBtn) undoBtn.disabled = !canUndo;
    if (redoBtn) redoBtn.disabled = !canRedo;
  }
}
