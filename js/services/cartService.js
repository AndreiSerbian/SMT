
import { products } from '../data/products.js';
import { eventBus } from '../utils/eventBus.js';
import { env } from '../utils/env.js';

export const cartService = {
  // Get cart from localStorage
  getCart() {
    return JSON.parse(localStorage.getItem('cart')) || [];
  },
  
  // Save cart to localStorage
  saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    // Emit cart updated event
    eventBus.emit('cart-updated', cart);
    // Обновляем UI сразу после сохранения
    this.updateCartUI();
  },
  
  // Add item to cart
  addToCart(productId, quantity) {
    const cart = this.getCart();
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push({ id: productId, quantity });
    }
    
    this.saveCart(cart);
  },
  
  // Remove item from cart
  removeFromCart(productId) {
    const cart = this.getCart();
    const updatedCart = cart.filter(item => item.id !== productId);
    
    this.saveCart(updatedCart);
  },
  
  // Clear cart
  clearCart() {
    localStorage.removeItem('cart');
    eventBus.emit('cart-updated', []);
    this.updateCartUI();
  },
  
  // Get cart total
  getCartTotal() {
    const cart = this.getCart();
    return cart.reduce((sum, item) => {
      const product = products.find(p => p.id === item.id);
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);
  },
  
  // Check if order meets minimum amount
  meetsMinimumOrderAmount() {
    return this.getCartTotal() >= env.minOrderAmount;
  },
  
  // Render cart component
  renderCart() {
    const cart = this.getCart();
    const total = this.getCartTotal();
    const meetsMinimum = this.meetsMinimumOrderAmount();

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
          <span class="cart-count absolute -top-1 -right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs ${cart.length > 0 ? '' : 'hidden'}">
            ${cart.length}
          </span>
        </button>
      </div>

      <div id="cartModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-40">
        <div
          class="fixed right-0 top-0 bottom-0 w-full max-w-md
                 bg-white shadow-lg p-6 transform transition-transform duration-300 translate-x-full"
        >
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-gray-800">Shopping Cart</h2>
            <button onclick="toggleCart()" class="text-gray-500 hover:text-gray-700">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="overflow-y-auto max-h-[80vh]" id="cart-content">
            ${this.renderCartContent(cart, total, meetsMinimum)}
          </div>
        </div>
      </div>
    `;
  },

  // Render cart content
  renderCartContent(cart, total, meetsMinimum) {
    if (cart.length === 0) {
      return `
        <div class="text-center py-8">
          <p class="text-gray-500">Ваша корзина пуста</p>
        </div>
      `;
    }

    return `
      <div class="space-y-4 mb-6">
        ${cart.map(item => {
          const product = products.find(p => p.id === item.id);
          return product ? `
            <div class="flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
              <img src="${product.photo[0]}"
                   alt="${product.name}"
                   class="w-20 h-20 object-cover rounded">
              <div class="flex-1">
                <h3 class="font-semibold text-gray-800">${product.name}</h3>
                <p class="text-gray-600 text-sm">Цвет: ${product.color}</p>
                <div class="flex items-center mt-1">
                  <button 
                    class="quantity-decrease px-3 py-1 h-8 border border-gray-300 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors rounded-l"
                    data-product-id="${item.id}"
                  >-</button>
                  <input 
                    type="number" 
                    value="${item.quantity}" 
                    min="1"
                    class="quantity-input w-16 h-8 text-center border-t border-b border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
                    data-product-id="${item.id}"
                  >
                  <button 
                    class="quantity-increase px-3 py-1 h-8 border border-gray-300 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors rounded-r"
                    data-product-id="${item.id}"
                  >+</button>
                </div>
              </div>
              <div class="text-right">
                <p class="font-semibold text-gray-800">
                  ₽${product.price * item.quantity}
                </p>
                <button 
                  class="remove-item text-red-500 hover:text-red-700 text-sm"
                  data-product-id="${item.id}"
                >
                  Удалить
                </button>
              </div>
            </div>
          ` : '';
        }).join('')}
      </div>

      <div class="border-t pt-4">
        <div class="flex justify-between items-center mb-4">
          <span class="font-semibold text-gray-800">Всего:</span>
          <span class="font-bold text-xl text-gray-800">₽${total}</span>
        </div>
        ${meetsMinimum ? `
          <button
            onclick="goToOrderPage()"
            class="w-full bg-blue-200 text-gray-800 px-6 py-3 rounded-lg
                 font-semibold hover:bg-blue-300 transition duration-300"
          >
            Перейти к оплате
          </button>
        ` : `
          <div class="text-orange-500 text-center mb-4">
            Минимальная сумма заказа: ₽${env.minOrderAmount}
          </div>
          <button
            class="w-full bg-gray-200 text-gray-500 px-6 py-3 rounded-lg
                 font-semibold cursor-not-allowed"
            disabled
          >
            Перейти к оплате
          </button>
        `}
      </div>
    `;
  },

  // Update cart UI without re-rendering everything
  updateCartUI() {
    const cart = this.getCart();
    
    // Обновляем счетчик на кнопке корзины
    const cartCountElement = document.querySelector('.cart-count');
    if (cartCountElement) {
      if (cart.length > 0) {
        cartCountElement.textContent = cart.length;
        cartCountElement.classList.remove('hidden');
      } else {
        cartCountElement.classList.add('hidden');
      }
    }
    
    // Обновляем содержимое корзины, если модальное окно открыто
    const cartContent = document.getElementById('cart-content');
    if (cartContent) {
      const total = this.getCartTotal();
      const meetsMinimum = this.meetsMinimumOrderAmount();
      cartContent.innerHTML = this.renderCartContent(cart, total, meetsMinimum);
    }
  },

  // Initialize cart event listeners
  initCartEventListeners() {
    // Используем делегирование событий на модальном окне корзины
    document.addEventListener('click', (e) => {
      // Обработка кнопок увеличения количества
      if (e.target.matches('.quantity-increase')) {
        e.preventDefault();
        const productId = e.target.dataset.productId;
        this.updateQuantity(productId, 1);
      }
      
      // Обработка кнопок уменьшения количества
      if (e.target.matches('.quantity-decrease')) {
        e.preventDefault();
        const productId = e.target.dataset.productId;
        this.updateQuantity(productId, -1);
      }
      
      // Обработка кнопок удаления
      if (e.target.matches('.remove-item')) {
        e.preventDefault();
        const productId = e.target.dataset.productId;
        this.removeFromCart(productId);
      }
    });

    // Обработка изменений в поле ввода количества
    document.addEventListener('input', (e) => {
      if (e.target.matches('.quantity-input')) {
        const productId = e.target.dataset.productId;
        const newQuantity = parseInt(e.target.value) || 1;
        this.setQuantity(productId, newQuantity);
      }
    });
  },

  // Update quantity by delta
  updateQuantity(productId, delta) {
    const cart = this.getCart();
    const item = cart.find(item => item.id === productId);
    
    if (item) {
      const newQuantity = Math.max(1, item.quantity + delta);
      item.quantity = newQuantity;
      this.saveCart(cart);
    }
  },

  // Set specific quantity
  setQuantity(productId, quantity) {
    const cart = this.getCart();
    const item = cart.find(item => item.id === productId);
    
    if (item) {
      item.quantity = Math.max(1, quantity);
      this.saveCart(cart);
    }
  }
};
