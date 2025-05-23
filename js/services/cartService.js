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
    // No page reload needed
  },
  
  // Remove item from cart
  removeFromCart(productId) {
    const cart = this.getCart();
    const updatedCart = cart.filter(item => item.id !== productId);
    
    this.saveCart(updatedCart);
    // No page reload needed
  },
  
  // Clear cart
  clearCart() {
    localStorage.removeItem('cart');
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

          <!-- Контент, который прокручивается, если товаров много -->
          <div class="overflow-y-auto max-h-[80vh]">
            ${cart.length === 0 ? `
              <div class="text-center py-8">
                <p class="text-gray-500">Your cart is empty</p>
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
                        <p class="text-gray-600 text-sm">Цвет: ${product.color}</p>
                        <div class="flex items-center mt-1 border rounded">
                          <button 
                            onclick="updateCartQuantity('${item.id}', ${Math.max(1, item.quantity - 1)})"
                            class="px-2 text-gray-500 hover:text-gray-700"
                          >-</button>
                          <input 
                            type="number" 
                            value="${item.quantity}" 
                            min="1"
                            class="w-8 text-center border-x"
                            onchange="updateCartQuantity('${item.id}', parseInt(this.value))"
                          >
                          <button 
                            onclick="updateCartQuantity('${item.id}', ${item.quantity + 1})"
                            class="px-2 text-gray-500 hover:text-gray-700"
                          >+</button>
                        </div>
                      </div>
                      <div class="text-right">
                        <p class="font-semibold text-gray-800">
                          ₽${product.price * item.quantity}
                        </p>
                        <button 
                          onclick="removeFromCart('${item.id}')"
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

  // Update cart UI without re-rendering everything
  updateCartUI() {
    const cart = this.getCart();
    
    // Update cart icon count
    const cartCountElement = document.querySelector('.bg-blue-500.text-white.rounded-full');
    if (cartCountElement) {
      if (cart.length > 0) {
        cartCountElement.textContent = cart.length;
        cartCountElement.classList.remove('hidden');
      } else {
        cartCountElement.classList.add('hidden');
      }
    }
    
    // Update cart modal content
    const cartModalContent = document.querySelector('#cartModal .overflow-y-auto');
    if (cartModalContent) {
      if (cart.length === 0) {
        cartModalContent.innerHTML = `
          <div class="text-center py-8">
            <p class="text-gray-500">Your cart is empty</p>
          </div>
        `;
      } else {
        const total = cart.reduce((sum, item) => {
          const product = products.find(p => p.id === item.id);
          return sum + (product ? product.price * item.quantity : 0);
        }, 0);
        
        // Update cart items
        const itemsHTML = cart.map(item => {
          const product = products.find(p => p.id === item.id);
          return product ? `
            <div class="flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
              <img src="${product.photo[0]}"
                   alt="${product.name}"
                   class="w-20 h-20 object-cover rounded">
              <div class="flex-1">
                <h3 class="font-semibold text-gray-800">${product.name}</h3>
                <p class="text-gray-600 text-sm">Цвет: ${product.color}</p>
                <div class="flex items-center mt-1 border rounded">
                  <button 
                    onclick="updateCartQuantity('${item.id}', ${Math.max(1, item.quantity - 1)})"
                    class="px-2 text-gray-500 hover:text-gray-700"
                  >-</button>
                  <input 
                    type="number" 
                    value="${item.quantity}" 
                    min="1"
                    class="w-16 text-center border-x"
                    onchange="updateCartQuantity('${item.id}', parseInt(this.value))"
                  >
                  <button 
                    onclick="updateCartQuantity('${item.id}', ${item.quantity + 1})"
                    class="px-2 text-gray-500 hover:text-gray-700"
                  >+</button>
                </div>
              </div>
              <div class="text-right">
                <p class="font-semibold text-gray-800">
                  ₽${product.price * item.quantity}
                </p>
                <button 
                  onclick="removeFromCart('${item.id}')"
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
            <button
              onclick="goToOrderPage()"
              class="w-full bg-blue-200 text-gray-800 px-6 py-3 rounded-lg
                     font-semibold hover:bg-blue-300 transition duration-300"
            >
              Перейти к оплате
            </button>
          </div>
        `;
      }
    }
  }
};
