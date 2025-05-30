
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
    this.updateCartCounter();
    eventBus.emit('cart-updated', cart);
  },
  
  // Add item to cart
  addToCart(productId, quantity) {
    const cart = this.getCart();
    const product = products.find(p => p.id === productId);
    
    if (!product) return;
    
    const existingItem = cart.find(item => 
      item.id === productId && item.color === product.color
    );
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push({ 
        id: productId, 
        name: product.name,
        color: product.color,
        quantity: quantity 
      });
    }
    
    this.saveCart(cart);
    this.updateCartUI();
  },
  
  // Update item quantity in cart
  updateCartQuantity(productId, newQuantity) {
    const cart = this.getCart();
    const item = cart.find(item => item.id === productId);
    
    if (item && newQuantity > 0) {
      item.quantity = newQuantity;
      this.saveCart(cart);
      this.updateCartUI();
    }
  },
  
  // Remove item from cart
  removeFromCart(productId) {
    const cart = this.getCart();
    const updatedCart = cart.filter(item => item.id !== productId);
    
    this.saveCart(updatedCart);
    this.updateCartUI();
  },
  
  // Clear cart
  clearCart() {
    localStorage.removeItem('cart');
    this.updateCartCounter();
    eventBus.emit('cart-updated', []);
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
  
  // Update cart counter
  updateCartCounter() {
    const cart = this.getCart();
    const cartCount = cart.length;
    
    // Обновляем счетчик в иконке корзины
    const cartButton = document.querySelector('button[onclick="toggleCart()"]');
    if (cartButton) {
      let countElement = cartButton.querySelector('.absolute');
      
      if (cartCount > 0) {
        if (!countElement) {
          countElement = document.createElement('span');
          countElement.className = 'absolute -top-1 -right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs';
          cartButton.appendChild(countElement);
        }
        countElement.textContent = cartCount;
        countElement.style.display = 'flex';
      } else {
        if (countElement) {
          countElement.style.display = 'none';
        }
      }
    }
  },
  
  // Initialize cart event listeners
  initCartEventListeners() {
    const cartModal = document.getElementById('cartModal');
    if (!cartModal) return;
    
    // Делегирование событий для корзины
    cartModal.addEventListener('click', (e) => {
      // Кнопка увеличения количества
      if (e.target.matches('[data-action="increase"]')) {
        const productId = e.target.dataset.productId;
        const currentQuantity = parseInt(e.target.dataset.quantity) || 1;
        this.updateCartQuantity(productId, currentQuantity + 1);
      }
      
      // Кнопка уменьшения количества
      if (e.target.matches('[data-action="decrease"]')) {
        const productId = e.target.dataset.productId;
        const currentQuantity = parseInt(e.target.dataset.quantity) || 1;
        if (currentQuantity > 1) {
          this.updateCartQuantity(productId, currentQuantity - 1);
        }
      }
      
      // Кнопка удаления
      if (e.target.matches('[data-action="remove"]')) {
        const productId = e.target.dataset.productId;
        this.removeFromCart(productId);
      }
    });
    
    // Обработка изменения количества через input
    cartModal.addEventListener('input', (e) => {
      if (e.target.matches('.quantity-input')) {
        const productId = e.target.dataset.productId;
        const newQuantity = parseInt(e.target.value) || 1;
        this.updateCartQuantity(productId, Math.max(1, newQuantity));
      }
    });
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
          ${cart.length > 0
            ? `<span class="absolute -top-1 -right-1 bg-blue-500 text-white
                           rounded-full w-5 h-5 flex items-center
                           justify-center text-xs">
                 ${cart.length}
               </span>`
            : ''
          }
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

          <div class="overflow-y-auto max-h-[80vh]">
            ${cart.length === 0 ? `
              <div class="text-center py-8">
                <p class="text-gray-500">Ваша корзина пуста</p>
              </div>
            ` : `
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
                        <p class="text-gray-600 text-sm">Цвет: ${item.color}</p>
                        <div class="flex items-center mt-1">
                          <button 
                            data-action="decrease"
                            data-product-id="${item.id}"
                            data-quantity="${item.quantity}"
                            class="px-3 py-1 h-8 border border-gray-300 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors rounded-l"
                          >-</button>
                          <input 
                            type="number" 
                            value="${item.quantity}" 
                            min="1"
                            data-product-id="${item.id}"
                            class="quantity-input w-16 h-8 text-center border-t border-b border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
                          >
                          <button 
                            data-action="increase"
                            data-product-id="${item.id}"
                            data-quantity="${item.quantity}"
                            class="px-3 py-1 h-8 border border-gray-300 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors rounded-r"
                          >+</button>
                        </div>
                      </div>
                      <div class="text-right">
                        <p class="font-semibold text-gray-800">
                          ₽${product.price * item.quantity}
                        </p>
                        <button 
                          data-action="remove"
                          data-product-id="${item.id}"
                          class="text-red-500 hover:text-red-700 text-sm"
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
            `}
          </div>
        </div>
      </div>
    `;
  },

  // Update cart UI without full re-render
  updateCartUI() {
    const cart = this.getCart();
    const cartModalContent = document.querySelector('#cartModal .overflow-y-auto');
    
    if (cartModalContent) {
      if (cart.length === 0) {
        cartModalContent.innerHTML = `
          <div class="text-center py-8">
            <p class="text-gray-500">Ваша корзина пуста</p>
          </div>
        `;
      } else {
        const total = this.getCartTotal();
        const meetsMinimum = this.meetsMinimumOrderAmount();
        
        const itemsHTML = cart.map(item => {
          const product = products.find(p => p.id === item.id);
          return product ? `
            <div class="flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
              <img src="${product.photo[0]}"
                   alt="${product.name}"
                   class="w-20 h-20 object-cover rounded">
              <div class="flex-1">
                <h3 class="font-semibold text-gray-800">${product.name}</h3>
                <p class="text-gray-600 text-sm">Цвет: ${item.color}</p>
                <div class="flex items-center mt-1">
                  <button 
                    data-action="decrease"
                    data-product-id="${item.id}"
                    data-quantity="${item.quantity}"
                    class="px-3 py-1 h-8 border border-gray-300 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors rounded-l"
                  >-</button>
                  <input 
                    type="number" 
                    value="${item.quantity}" 
                    min="1"
                    data-product-id="${item.id}"
                    class="quantity-input w-16 h-8 text-center border-t border-b border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
                  >
                  <button 
                    data-action="increase"
                    data-product-id="${item.id}"
                    data-quantity="${item.quantity}"
                    class="px-3 py-1 h-8 border border-gray-300 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors rounded-r"
                  >+</button>
                </div>
              </div>
              <div class="text-right">
                <p class="font-semibold text-gray-800">
                  ₽${product.price * item.quantity}
                </p>
                <button 
                  data-action="remove"
                  data-product-id="${item.id}"
                  class="text-red-500 hover:text-red-700 text-sm"
                >
                  Удалить
                </button>
              </div>
            </div>
          ` : '';
        }).join('');
        
        cartModalContent.innerHTML = `
          <div class="space-y-4 mb-6">
            ${itemsHTML}
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
      }
      
      // Переинициализируем обработчики после обновления DOM
      this.initCartEventListeners();
    }
    
    this.updateCartCounter();
  }
};
