import { mockupService } from '../services/mockupService.js';
import { resolveImageUrl } from '../services/mediaResolver.js';

/**
 * mockupPreviewModal — POC двухцветной кастомизации.
 * Только предпросмотр. Никаких записей в Supabase / корзину / заказ.
 *
 * Перекраска выполняется локально изменением CSS custom properties на корневом SVG,
 * без повторной загрузки ассета.
 */

const MockupPreviewModal = {
  _overlay: null,
  _lastFocused: null,
  _onClose: null,

  async open(product, triggerEl) {
    this._lastFocused = triggerEl || document.activeElement;

    let model;
    try {
      model = await mockupService.getModelForProduct(product);
    } catch (e) {
      console.error('[mockupPreview] getModelForProduct failed', e);
      this._renderFallback(product);
      return;
    }
    if (!model || !mockupService.isPreviewAvailable(model, 'closed_45')) {
      return; // кнопка не должна была показываться
    }

    const palette = await mockupService.getPalette().catch(() => []);
    const baseColorHex = product.color_hex || '#E5E5E5';
    const baseColorId = String(baseColorHex).toLowerCase();

    // второй цвет по умолчанию — первый отличный от базового
    const defaultSecond = palette.find(c => c.id !== baseColorId) || palette[0] || null;

    const config = {
      type: 'two_color',
      product_id: product.artikul || product.id,
      mockup_model: model.id,
      variant: model.variant || 'default',
      view: 'closed_45',
      outer_color_id: baseColorId,
      inner_side_color_id: defaultSecond ? defaultSecond.id : null,
      ribbon_color_id: null,
      estimated_price_modifier_percent: model.price_modifier_percent || 10
    };

    const basePrice = Number(product.price_rub || product.price || 0);
    const estimated = mockupService.estimatePrice(basePrice, model);

    this._buildShell(product, model, config, palette, baseColorHex, estimated);
    await this._loadSvg(model, product);
    this._applyColors(config, baseColorHex);
    this._renderPalette(palette, config, baseColorHex, estimated, model);
    this._attachListeners();
  },

  _buildShell(product, model, config, palette, baseColorHex, estimated) {
    this._closeExisting();
    const overlay = document.createElement('div');
    overlay.id = 'mockup-preview-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'mockup-preview-title');
    overlay.className = 'mpm-overlay';
    overlay.innerHTML = `
      <div class="mpm-backdrop" data-mpm-close></div>
      <div class="mpm-dialog" tabindex="-1">
        <button class="mpm-close" type="button" aria-label="Закрыть предпросмотр" data-mpm-close>×</button>
        <h2 id="mockup-preview-title" class="mpm-title">Двухцветная коробка — предпросмотр</h2>
        <div class="mpm-body">
          <div class="mpm-preview-col">
            <div class="mpm-preview-wrap" id="mpm-preview-wrap">
              <div class="mpm-preview-fallback" id="mpm-fallback" hidden>
                <img class="mpm-fallback-img" alt="${this._esc(product.name)}" />
                <p class="mpm-fallback-msg">Не удалось загрузить предпросмотр. Попробуйте открыть его ещё раз.</p>
              </div>
              <div class="mpm-preview" id="mpm-preview"></div>
            </div>
            <p class="mpm-caption" id="mpm-caption"></p>
          </div>
          <div class="mpm-controls-col">
            <div class="mpm-control-group">
              <div class="mpm-control-label">Внешний цвет (базовый)</div>
              <div class="mpm-base-color">
                <span class="mpm-swatch mpm-swatch-base" id="mpm-base-swatch"></span>
                <span id="mpm-base-name" class="mpm-base-name"></span>
              </div>
            </div>
            <div class="mpm-control-group">
              <div class="mpm-control-label">Второй цвет (боковушка)</div>
              <div class="mpm-palette" id="mpm-palette" role="radiogroup" aria-label="Второй цвет"></div>
              <p class="mpm-hint" id="mpm-hint" hidden></p>
            </div>
            <div class="mpm-price-block">
              <p class="mpm-price" id="mpm-price">Предварительная цена: ₽${estimated} · Финальная стоимость подтверждается менеджером</p>
            </div>
            <p class="mpm-disclaimer">Это предварительный предпросмотр. Реальный результат зависит от материалов и подтверждается менеджером при оформлении.</p>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    this._overlay = overlay;
    document.body.style.overflow = 'hidden';

    // базовый цвет
    overlay.querySelector('#mpm-base-swatch').style.backgroundColor = baseColorHex;
    overlay.querySelector('#mpm-base-name').textContent = product.color || 'Текущий цвет';

    const dialog = overlay.querySelector('.mpm-dialog');
    requestAnimationFrame(() => dialog.focus());
  },

  async _loadSvg(model, product) {
    const previewEl = this._overlay.querySelector('#mpm-preview');
    const fallbackEl = this._overlay.querySelector('#mpm-fallback');
    const fallbackImg = this._overlay.querySelector('.mpm-fallback-img');
    try {
      const res = await fetch(model.views['closed_45'].asset, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`SVG HTTP ${res.status}`);
      const text = await res.text();
      const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
      const svg = doc.querySelector('svg');
      if (!svg) throw new Error('SVG root not found');
      // безопасность: удаляем скрипты/foreignObject/external href
      svg.querySelectorAll('script, foreignObject').forEach(n => n.remove());
      svg.querySelectorAll('[href^="http"], [xlink\\:href^="http"]').forEach(n => n.removeAttribute('href'));
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.style.maxWidth = '100%';
      svg.style.height = 'auto';
      previewEl.replaceChildren(svg);
    } catch (e) {
      console.error('[mockupPreview] SVG load failed', e);
      previewEl.replaceChildren();
      fallbackEl.hidden = false;
      try {
        fallbackImg.src = resolveImageUrl(product.photos && product.photos[0]) || '';
      } catch (_) { /* ignore */ }
    }
  },

  _applyColors(config, baseColorHex) {
    const previewEl = this._overlay.querySelector('#mpm-preview');
    const svg = previewEl.querySelector('svg');
    if (!svg) return;
    const palette = this._paletteCache || [];
    const second = palette.find(c => c.id === config.inner_side_color_id);
    const secondHex = second ? second.hex : baseColorHex;
    svg.style.setProperty('--zone-outer-top', baseColorHex);
    svg.style.setProperty('--zone-outer-front', baseColorHex);
    svg.style.setProperty('--zone-side', secondHex);
    this._updateCaption(config, second);
  },

  _updateCaption(config, second) {
    const caption = this._overlay.querySelector('#mpm-caption');
    if (!caption) return;
    const name = second ? second.name : '—';
    caption.textContent = `Вид: закрытая 45° · Второй цвет: ${name}`;
  },

  _renderPalette(palette, config, baseColorHex, estimated, model) {
    this._paletteCache = palette;
    const container = this._overlay.querySelector('#mpm-palette');
    container.innerHTML = palette.map(c => {
      const isBase = c.id === config.outer_color_id;
      const selected = c.id === config.inner_side_color_id;
      const disabled = isBase && model.two_color && model.two_color.disallow_same_color;
      return `
        <button type="button"
          role="radio"
          aria-checked="${selected}"
          aria-label="${this._esc(c.name)}"
          ${disabled ? 'disabled' : ''}
          class="mpm-swatch-btn ${selected ? 'mpm-swatch-selected' : ''} ${disabled ? 'mpm-swatch-disabled' : ''}"
          style="background-color:${c.hex}"
          title="${this._esc(c.name)}${disabled ? ' (совпадает с внешним)' : ''}"
          data-color-id="${this._esc(c.id)}">
          ${selected ? '<span class="mpm-check">✓</span>' : ''}
        </button>
      `;
    }).join('');

    container.querySelectorAll('.mpm-swatch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-color-id');
        this._selectColor(id, config, baseColorHex, estimated, model);
      });
    });

    // первичная валидация
    this._validate(config, model, baseColorHex);
  },

  _selectColor(id, config, baseColorHex, estimated, model) {
    config.inner_side_color_id = id;
    const palette = this._paletteCache || [];
    const second = palette.find(c => c.id === id);
    // обновить визуал свотчей
    const container = this._overlay.querySelector('#mpm-palette');
    container.querySelectorAll('.mpm-swatch-btn').forEach(btn => {
      const bid = btn.getAttribute('data-color-id');
      const isSel = bid === id;
      btn.setAttribute('aria-checked', String(isSel));
      btn.classList.toggle('mpm-swatch-selected', isSel);
      btn.innerHTML = isSel ? '<span class="mpm-check">✓</span>' : '';
    });
    this._applyColors(config, baseColorHex);
    this._validate(config, model, baseColorHex);
  },

  _validate(config, model, baseColorHex) {
    const hint = this._overlay.querySelector('#mpm-hint');
    const result = mockupService.validateTwoColor(config, model);
    if (!result.ok) {
      hint.hidden = false;
      hint.textContent = result.reason;
    } else {
      hint.hidden = true;
      hint.textContent = '';
    }
  },

  _attachListeners() {
    const overlay = this._overlay;
    overlay.querySelectorAll('[data-mpm-close]').forEach(el =>
      el.addEventListener('click', () => this.close())
    );
    this._keyHandler = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); this.close(); }
      else if (e.key === 'Tab') { this._trapFocus(e); }
    };
    document.addEventListener('keydown', this._keyHandler);
  },

  _trapFocus(e) {
    const overlay = this._overlay;
    if (!overlay) return;
    const focusables = overlay.querySelectorAll('button:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  },

  _renderFallback(product) {
    this._buildShell(product, { id: 'unknown', variant: 'default', views: {}, price_modifier_percent: 10 },
      {}, [], '#E5E5E5', 0);
    const previewEl = this._overlay.querySelector('#mpm-preview');
    previewEl.innerHTML = `<p style="padding:24px;text-align:center;color:#6b7280">Предпросмотр недоступен для этого товара.</p>`;
  },

  _closeExisting() {
    if (this._overlay) this.close();
  },

  close() {
    if (this._keyHandler) { document.removeEventListener('keydown', this._keyHandler); this._keyHandler = null; }
    if (this._overlay) { this._overlay.remove(); this._overlay = null; }
    document.body.style.overflow = '';
    if (this._lastFocused && typeof this._lastFocused.focus === 'function') {
      this._lastFocused.focus();
    }
  },

  _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>')
      .replace(/"/g, '"').replace(/'/g, '&#39;');
  }
};

window.MockupPreviewModal = MockupPreviewModal;
export { MockupPreviewModal };
export default MockupPreviewModal;
