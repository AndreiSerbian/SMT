/**
 * Toolbar: Left toolbar managing tool selection and tool panels
 * (upload, text, pattern, stickers, templates, align)
 */

import { PATTERNS } from './patterns.js';
import { STICKERS } from './stickers.js';
import { TEMPLATES } from './templates.js';

export class Toolbar {
  constructor(canvasController) {
    this.cc = canvasController;
    this.activeToolBtn = null;
    this.toolPanel = document.getElementById('tool-panel');
    this.toolPanelTitle = document.getElementById('tool-panel-title');
    this.toolPanelContent = document.getElementById('tool-panel-content');
    this.fileInput = document.getElementById('file-input');

    this._bindButtons();
    this._bindFileInput();

    document.getElementById('tool-panel-close')?.addEventListener('click', () => this._closePanel());
  }

  _bindButtons() {
    document.querySelectorAll('.toolbar-btn[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => this._onToolClick(btn));
    });

    document.getElementById('btn-delete')?.addEventListener('click', () => {
      this.cc.deleteSelected();
    });
  }

  _bindFileInput() {
    this.fileInput?.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      for (const file of files) {
        try {
          await this.cc.addImage(file);
        } catch (err) {
          alert(err.message);
        }
      }
      this.fileInput.value = '';
    });
  }

  _onToolClick(btn) {
    const tool = btn.dataset.tool;

    // Deactivate previous
    document.querySelectorAll('.toolbar-btn').forEach(b => b.classList.remove('active', 'bg-purple-100', 'text-purple-700'));
    btn.classList.add('active', 'bg-purple-100', 'text-purple-700');

    switch (tool) {
      case 'select':
        this._closePanel();
        break;
      case 'upload':
        this._closePanel();
        this.fileInput?.click();
        break;
      case 'text':
        this._closePanel();
        this.cc.addText();
        break;
      case 'pattern':
        this._showPanel('Паттерны', this._renderPatterns());
        break;
      case 'stickers':
        this._showPanel('Стикеры', this._renderStickers());
        break;
      case 'templates':
        this._showPanel('Шаблоны', this._renderTemplates());
        break;
      case 'align':
        this._showPanel('Выравнивание', this._renderAlign());
        break;
    }
  }

  _showPanel(title, content) {
    this.toolPanelTitle.textContent = title;
    this.toolPanelContent.innerHTML = '';
    if (typeof content === 'string') {
      this.toolPanelContent.innerHTML = content;
    } else {
      this.toolPanelContent.appendChild(content);
    }
    this.toolPanel.classList.remove('hidden');
    this._bindPanelActions();
  }

  _closePanel() {
    this.toolPanel.classList.add('hidden');
  }

  _renderPatterns() {
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-3 gap-2';
    
    PATTERNS.forEach((p, idx) => {
      const btn = document.createElement('button');
      btn.className = 'aspect-square border border-gray-200 rounded-lg hover:border-purple-400 transition overflow-hidden';
      btn.dataset.patternIndex = idx;
      btn.title = p.name;

      // Draw pattern preview
      const canvas = document.createElement('canvas');
      canvas.width = 60;
      canvas.height = 60;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = p.bgColor || '#fff';
      ctx.fillRect(0, 0, 60, 60);
      // Simple preview
      ctx.fillStyle = p.fgColor || '#000';
      if (p.type === 'dots') {
        for (let x = 10; x < 60; x += 15) {
          for (let y = 10; y < 60; y += 15) {
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (p.type === 'stripes') {
        for (let x = 0; x < 60; x += 10) {
          ctx.fillRect(x, 0, 5, 60);
        }
      } else {
        ctx.fillRect(0, 0, 30, 30);
        ctx.fillRect(30, 30, 30, 30);
      }

      btn.appendChild(canvas);
      
      const label = document.createElement('span');
      label.className = 'text-[10px] text-gray-500 block mt-0.5';
      label.textContent = p.name;
      btn.appendChild(label);

      grid.appendChild(btn);
    });

    return grid;
  }

  _renderStickers() {
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-3 gap-2';
    
    STICKERS.forEach((s, idx) => {
      const btn = document.createElement('button');
      btn.className = 'aspect-square border border-gray-200 rounded-lg hover:border-purple-400 transition flex items-center justify-center text-2xl';
      btn.dataset.stickerIndex = idx;
      btn.title = s.name;
      btn.textContent = s.emoji || '⭐';
      grid.appendChild(btn);
    });

    return grid;
  }

  _renderTemplates() {
    const container = document.createElement('div');
    container.className = 'space-y-2';
    
    TEMPLATES.forEach((t, idx) => {
      const btn = document.createElement('button');
      btn.className = 'w-full text-left px-3 py-2 border border-gray-200 rounded-lg hover:border-purple-400 transition';
      btn.dataset.templateIndex = idx;
      btn.innerHTML = `<span class="text-sm font-medium">${t.name}</span><br><span class="text-xs text-gray-400">${t.description}</span>`;
      container.appendChild(btn);
    });

    return container;
  }

  _renderAlign() {
    return `
      <div class="grid grid-cols-3 gap-2">
        <button data-align="left" class="text-xs border border-gray-200 rounded py-2 hover:bg-gray-50">← Лево</button>
        <button data-align="center-h" class="text-xs border border-gray-200 rounded py-2 hover:bg-gray-50">↔ Центр</button>
        <button data-align="right" class="text-xs border border-gray-200 rounded py-2 hover:bg-gray-50">Право →</button>
        <button data-align="top" class="text-xs border border-gray-200 rounded py-2 hover:bg-gray-50">↑ Верх</button>
        <button data-align="center-v" class="text-xs border border-gray-200 rounded py-2 hover:bg-gray-50">↕ Сред.</button>
        <button data-align="bottom" class="text-xs border border-gray-200 rounded py-2 hover:bg-gray-50">Низ ↓</button>
        <button data-align="center" class="col-span-3 text-xs border border-gray-200 rounded py-2 hover:bg-gray-50 font-medium">◎ По центру</button>
      </div>
    `;
  }

  _bindPanelActions() {
    // Patterns
    this.toolPanelContent.querySelectorAll('[data-pattern-index]').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = PATTERNS[parseInt(btn.dataset.patternIndex)];
        this.cc.applyPattern(p);
      });
    });

    // Stickers
    this.toolPanelContent.querySelectorAll('[data-sticker-index]').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = STICKERS[parseInt(btn.dataset.stickerIndex)];
        if (s.url) {
          this.cc.addSticker(s.url);
        } else {
          // Emoji-based sticker: add as text
          this.cc.addText({ text: s.emoji, fontSize: 48 });
        }
      });
    });

    // Templates
    this.toolPanelContent.querySelectorAll('[data-template-index]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Применение шаблона очистит текущую сторону. Продолжить?')) return;
        const t = TEMPLATES[parseInt(btn.dataset.templateIndex)];
        this.cc.applyTemplate(t);
      });
    });

    // Alignment
    this.toolPanelContent.querySelectorAll('[data-align]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.cc.alignObject(btn.dataset.align);
      });
    });
  }
}
