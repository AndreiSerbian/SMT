
import { eventBus } from '../utils/eventBus.js';
import { env } from '../utils/env.js';
import { productsService } from './productsService.js';
import { computeCart } from './pricingService.js';

// Кеш для загруженных товаров с ценами
let cachedProducts = null;

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/**
 * Ключ строки корзины. Разные конфигурации одного SKU — разные строки.
 *   std:<productId>
 *   mask:<productId>:<mainColorId>:<sideColorId>:<accentType>:<accentColorId>
 *   design:<productId>:<design_id>
 */
export function buildLineKey(item) {
  const id = item?.id ?? '';
  if (item?.design_id) return `design:${id}:${item.design_id}`;
  const c = item?.customization;
  if (c) {
    const main = c.main?.colorId || c.main?.hex || '-';
    const side = c.side?.colorId || c.side?.hex || '-';
    const accentType = c.accent?.type || '-';
    const accentColor = c.accent ? (c.accent.colorId || c.accent.hex || '-') : '-';
    return `mask:${id}:${main}:${side}:${accentType}:${accentColor}`;
  }
  return `std:${id}`;
}

const ZONE_LABELS = {
  main: 'Основной цвет',
  side: 'Боковушка',
  bow: 'Бант',
  handles: 'Ручки',
};

/** Человекочитаемые строки конфигурации (используются и в корзине, и в заказе). */
export function describeCustomization(customization) {
  if (!customization) return [];
  const rows = [];
  if (customization.main) rows.push([ZONE_LABELS.main, customization.main.nameRu]);
  if (customization.side) rows.push([ZONE_LABELS.side, customization.side.nameRu]);
  if (customization.accent && customization.accent.type) {
    rows.push([ZONE_LABELS[customization.accent.type] || 'Акцент', customization.accent.nameRu]);
  }
  return rows.filter(([, v]) => v);
}

export const cartService = {
  buildLineKey,
  describeCustomization,

  // Get cart from localStorage (с мягкой миграцией старых записей без lineKey)
  getCart() {
    let raw = [];
    try {
      raw = JSON.parse(localStorage.getItem('cart')) || [];
    } catch (_) {
      raw = [];
    }
    if (!Array.isArray(raw)) return [];

    let migrated = false;
    const cart = raw.map(item => {
      if (item && !item.lineKey) {
        migrated = true;
        return { ...item, lineKey: buildLineKey(item) };
      }
      return item;
    });

    if (migrated) {
      try { localStorage.setItem('cart', JSON.stringify(cart)); } catch (_) { /* ignore */ }
    }
    return cart;
  },

  // Save cart to localStorage
  saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    // Emit cart updated event
    eventBus.emit('cart-updated', cart);
  },

  _findIndex(cart, key) {
    let idx = cart.findIndex(item => item.lineKey === key);
    if (idx === -1) {
      // Legacy-вызовы передают productId вместо lineKey
      idx = cart.findIndex(item => item.lineKey === `std:${key}`);
    }
    if (idx === -1) {
      idx = cart.findIndex(item => item.id === key && !item.customization && !item.design_id);
    }
    return idx;
  },

  // Add standard item to cart
  async addToCart(productId, quantity) {
    await this.addLine({ id: productId, quantity });
  },

  /**
   * Универсальное добавление строки (обычной, mask-кастомизированной или печатной).
   * Одинаковая конфигурация увеличивает количество, другая создаёт новую строку.
   */
  async addLine(item) {
    const cart = this.getCart();
    const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
    const line = { ...item, quantity, lineKey: item.lineKey || buildLineKey(item) };

    const existing = cart.find(i => i.lineKey === line.lineKey);
    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push(line);
    }

    this.saveCart(cart);
    await this.updateCartUI();
    return line.lineKey;
  },

  // Update quantity of a cart line
  async updateQuantity(lineKey, quantity) {
    const cart = this.getCart();
    const idx = this._findIndex(cart, lineKey);

    if (idx >= 0 && quantity > 0) {
      cart[idx].quantity = quantity;
      this.saveCart(cart);
      await this.updateCartUI();
    }
  },

  // Remove a cart line
  async removeFromCart(lineKey) {
    const cart = this.getCart();
    const idx = this._findIndex(cart, lineKey);
    if (idx < 0) return;

    cart.splice(idx, 1);
    this.saveCart(cart);
    await this.updateCartUI();
  },

  // Clear cart
  async clearCart() {
    localStorage.removeItem('cart');
    eventBus.emit('cart-updated', []);
    await this.updateCartUI();
  },

  /**
   * Корзина с рассчитанными ценами. Единая точка расчёта для UI и оформления.
   */
  async getPricedCart() {
    const cart = this.getCart();
    const products = await this.getProducts();

    const lines = cart.map(item => {
      const product = products.find(p => p.id === item.id) || null;
      return {
        item,
        product,
        baseUnitPrice: product && product.price ? Number(product.price) : 0,
        quantity: item.quantity,
        customization: item.customization || null,
      };
    });

    return computeCart(lines);
  },

  // Get products with prices
  async getProducts() {
    if (!cachedProducts) {
      cachedProducts = await productsService.getActiveProducts();
    }
    return cachedProducts;
  },

  // Refresh products cache
  async refreshProducts() {
    cachedProducts = await productsService.getActiveProducts();
    return cachedProducts;
  },

  // Get cart subtotal (с учётом надбавки за кастомизацию, до скидки)
  async getCartTotal() {
    const { subtotal } = await this.getPricedCart();
    return subtotal;
  },

  // Check if order meets minimum amount
  async meetsMinimumOrderAmount() {
    const total = await this.getCartTotal();
    return total >= env.minOrderAmount;
  },

  _customizationHtml(line) {
    const rows = describeCustomization(line.customization);
    if (!rows.length) return '';
    const surcharge = line.surchargePct > 0
      ? `<p class="text-xs text-blue-700 mt-1">Кастомизация коробки: +${line.surchargePct}%</p>`
      : `<p class="text-xs text-gray-500 mt-1">Доплата за кастомизацию: нет</p>`;
    return `
      <div class="mt-1 text-xs text-gray-600 space-y-0.5">
        ${rows.map(([label, value]) => `<div>${esc(label)}: ${esc(value)}</div>`).join('')}
      </div>
      ${surcharge}
    `;
  },

  _designHtml(item) {
    if (!item.design_id) return '';
    return `<p class="text-xs text-purple-700 mt-1">С макетом печати</p>`;
  },

  _itemHtml(line) {
    const { item, product } = line;
    if (!product) return '';
    const key = esc(item.lineKey);
    return `
      <div class="flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
        <img src="${product.photo[0]}"
             alt="${esc(product.name)}"
             class="w-20 h-20 object-cover rounded">
        <div class="flex-1">
          <h3 class="font-semibold text-gray-800">${esc(product.name)}</h3>
          <p class="text-gray-600 text-sm">Цвет: ${esc(product.color)}</p>
          ${this._customizationHtml(line)}
          ${this._designHtml(item)}
          <p class="text-xs text-gray-500 mt-1">Цена за шт.: ₽${line.unitPriceBeforeDiscount}</p>
          <div class="flex items-center mt-1">
            <button
              onclick="updateCartQuantity('${key}', ${Math.max(1, line.quantity - 1)})"
              class="px-3 py-1 h-8 border border-gray-300 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors rounded-l ${line.quantity <= 1 ? 'opacity-50 cursor-not-allowed' : ''}"
              ${line.quantity <= 1 ? 'disabled' : ''}
            >-</button>
            <input
              type="number"
              value="${line.quantity}"
              min="1"
              class="w-16 h-8 text-center border-t border-b border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
              onchange="updateCartQuantity('${key}', parseInt(this.value))"
            >
            <button
              onclick="updateCartQuantity('${key}', ${line.quantity + 1})"
              class="px-3 py-1 h-8 border border-gray-300 border-l border-gray-300 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors rounded-r"
            >+</button>
          </div>
        </div>
        <div class="text-right">
          <p class="font-semibold text-gray-800">
            ₽${line.lineSubtotal}
          </p>
          <button
            onclick="removeFromCart('${key}')"
            class="text-red-500 hover:text-red-700 text-sm"
          >
            Удалить
          </button>
        </div>
      </div>
    `;
  },

  _headerHtml() {
    return `
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-gray-800">Корзина</h2>
        <button onclick="toggleCart()" class="text-gray-500 hover:text-gray-700">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `;
  },

  _footerHtml(subtotal, meetsMinimum, withClear) {
    return `
      <div class="border-t pt-4 mt-auto">
        <div class="flex justify-between items-center mb-4">
          <span class="font-semibold text-gray-800">Всего:</span>
          <span class="font-bold text-xl text-gray-800">₽${subtotal}</span>
        </div>
        ${meetsMinimum ? `
          <button
            onclick="goToOrderPage()"
            class="w-full bg-blue-200 text-gray-800 px-6 py-3 rounded-lg
                   font-semibold hover:bg-blue-300 transition duration-300"
          >
            Оформить предзаказ
          </button>
        ` : `
          <div class="text-orange-500 text-center mb-4">
            <p class="text-sm">Минимальная сумма заказа: ₽${env.minOrderAmount}</p>
            <p class="text-sm">Не хватает: ₽${env.minOrderAmount - subtotal}</p>
          </div>
          <button
            class="w-full bg-gray-300 text-gray-500 px-6 py-3 rounded-lg
                   font-semibold cursor-not-allowed"
            disabled
          >
            Оформить предзаказ
          </button>
        `}
        ${withClear ? `
          <button
            onclick="clearCart()"
            class="w-full mt-2 border border-red-400 text-red-500 px-6 py-3
                   rounded-lg font-semibold hover:bg-red-50 transition duration-300"
          >
            Очистить корзину
          </button>
        ` : ''}
      </div>
    `;
  },

  // Render cart component
  async renderCart() {
    const { lines, subtotal } = await this.getPricedCart();
    const meetsMinimum = subtotal >= env.minOrderAmount;

    return `
      <div class="fixed bottom-4 right-4 z-50">
        <button 
          onclick="toggleCart()"
          class="bg-blue-200 text-gray-800 p-4 rounded-full shadow-lg hover:bg-blue-300 transition duration-300"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4
                     M7 13L5.4 5
                     M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17
                     m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0
                     2 2 0 014 0z"
            />
          </svg>
          ${lines.length > 0
            ? `<span class="absolute -top-1 -right-1 bg-blue-500 text-white
                           rounded-full w-5 h-5 flex items-center
                           justify-center text-xs">
                 ${lines.length}
               </span>`
            : ''
          }
        </button>
      </div>

      <div id="cartModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-40">
      <div
          class="fixed right-0 top-0 bottom-0 w-full max-w-md
                 bg-white shadow-lg p-6 transform transition-transform duration-300 translate-x-full
                 flex flex-col"
        >
          ${this._headerHtml()}

          ${lines.length === 0 ? `
            <div class="text-center py-8">
              <p class="text-gray-500">Ваша корзина пуста</p>
            </div>
          ` : `
            <div class="overflow-y-auto flex-1 mb-4">
              <div class="space-y-4">
                ${lines.map(line => this._itemHtml(line)).join('')}
              </div>
            </div>
            ${this._footerHtml(subtotal, meetsMinimum, false)}
          `}
        </div>
      </div>
    `;
  },

  // Update cart UI without re-rendering everything
  async updateCartUI() {
    const cart = this.getCart();

    // Update cart icon count - ищем правильный элемент счетчика
    const cartCountElement = document.querySelector('.absolute.-top-1.-right-1.bg-blue-500');
    const cartButton = document.querySelector('.fixed.bottom-4.right-4.z-50 button');

    if (cartCountElement) {
      cartCountElement.textContent = cart.length;
      cartCountElement.style.display = cart.length > 0 ? 'flex' : 'none';
    } else if (cartButton && cart.length > 0) {
      const badge = document.createElement('span');
      badge.className = 'absolute -top-1 -right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs';
      badge.textContent = cart.length;
      cartButton.appendChild(badge);
    }

    const cartModal = document.querySelector('#cartModal');
    if (!cartModal) return;

    const cartContainer = cartModal.querySelector('.fixed.right-0');
    if (!cartContainer) return;

    if (cart.length === 0) {
      cartContainer.innerHTML = `
        ${this._headerHtml()}
        <div class="text-center py-8">
          <p class="text-gray-500">Ваша корзина пуста</p>
        </div>
      `;
      return;
    }

    const { lines, subtotal } = await this.getPricedCart();
    const meetsMinimum = subtotal >= env.minOrderAmount;

    cartContainer.innerHTML = `
      ${this._headerHtml()}

      <div class="overflow-y-auto flex-1 mb-4">
        <div class="space-y-4">
          ${lines.map(line => this._itemHtml(line)).join('')}
        </div>
      </div>

      ${this._footerHtml(subtotal, meetsMinimum, true)}
    `;
  }
};
