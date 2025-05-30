
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
  
  // Add item to cart with color support
  addToCart(productId, quantity, color = null) {
    const cart = this.getCart();
    const product = products.find(p => p.id === productId);
    
    if (!product) {
      console.error('Product not found:', productId);
      return;
    }
    
    // Use product's color if no color specified
    const itemColor = color || product.color;
    
    // Create unique key for product + color combination
    const cartKey = `${productId}_${itemColor}`;
    
    // Find existing item with same product ID and color
    const existingItem = cart.find(item => 
      item.id === productId && item.color === itemColor
    );
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push({ 
        id: productId, 
        name: product.name,
        color: itemColor,
        quantity: quantity,
        cartKey: cartKey
      });
    }
    
    this.saveCart(cart);
    this.updateCartUI();
  },
  
  // Remove item from cart
  removeFromCart(productId, color = null) {
    const cart = this.getCart();
    
    let updatedCart;
    if (color) {
      // Remove specific color variant
      updatedCart = cart.filter(item => !(item.id === productId && item.color === color));
    } else {
      // Remove all variants of this product
      updatedCart = cart.filter(item => item.id !== productId);
    }
    
    this.saveCart(updatedCart);
    this.updateCartUI();
  },
  
  // Update quantity for specific product + color
  updateQuantity(productId, color, newQuantity) {
    const cart = this.getCart();
    const item = cart.find(item => item.id === productId && item.color === color);
    
    if (item) {
      if (newQuantity <= 0) {
        this.removeFromCart(productId, color);
      } else {
        item.quantity = newQuantity;
        this.saveCart(cart);
        this.updateCartUI();
      }
    }
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
  
  // Get total unique items count (number of different products, not total quantity)
  getCartItemsCount() {
    const cart = this.getCart();
    return cart.length; // Возвращаем количество позиций, а не сумму quantity
  },
  
  // Check if order meets minimum amount
  meetsMinimumOrderAmount() {
    return this.getCartTotal() >= env.minOrderAmount;
  },
  
  // Initialize cart event listeners with delegation
  initCartEventListeners() {
    const cartModal = document.getElementById('cartModal');
    if (!cartModal) {
      console.log('Cart modal not found, skipping event listeners initialization');
      return;
    }
    
    // Remove existing listeners to prevent duplicates
    const newCartModal = cartModal.cloneNode(true);
    cartModal.parentNode.replaceChild(newCartModal, cartModal);
    
    // Use event delegation - single listener on the modal
    newCartModal.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('Click detected on:', e.target.className, e.target);
      
      // Handle quantity decrease button
      if (e.target.classList.contains('quantity-decrease')) {
        const productId = e.target.getAttribute('data-product-id');
        const color = e.target.getAttribute('data-color');
        const currentQuantity = parseInt(e.target.getAttribute('data-quantity'));
        
        console.log('Decrease clicked:', { productId, color, currentQuantity });
        
        if (productId && color) {
          if (currentQuantity > 1) {
            this.updateQuantity(productId, color, currentQuantity - 1);
          } else {
            this.removeFromCart(productId, color);
          }
        }
      }
      
      // Handle quantity increase button
      if (e.target.classList.contains('quantity-increase')) {
        const productId = e.target.getAttribute('data-product-id');
        const color = e.target.getAttribute('data-color');
        const currentQuantity = parseInt(e.target.getAttribute('data-quantity'));
        
        console.log('Increase clicked:', { productId, color, currentQuantity });
        
        if (productId && color) {
          this.updateQuantity(productId, color, currentQuantity + 1);
        }
      }
      
      // Handle remove item button
      if (e.target.classList.contains('remove-item')) {
        const productId = e.target.getAttribute('data-product-id');
        const color = e.target.getAttribute('data-color');
        
        console.log('Remove clicked:', { productId, color });
        
        if (productId && color) {
          this.removeFromCart(productId, color);
        }
      }
    });
    
    // Handle input field changes with delegation
    newCartModal.addEventListener('input', (e) => {
      if (e.target.classList.contains('quantity-input')) {
        const productId = e.target.getAttribute('data-product-id');
        const color = e.target.getAttribute('data-color');
        let newQuantity = parseInt(e.target.value);
        
        // Validate input
        if (isNaN(newQuantity) || newQuantity < 1) {
          newQuantity = 1;
          e.target.value = 1;
        }
        
        console.log('Input changed:', { productId, color, newQuantity });
        
        if (productId && color) {
          this.updateQuantity(productId, color, newQuantity);
        }
      }
    });
    
    console.log('Cart event listeners initialized successfully');
  },
  
  // Render cart component
  renderCart() {
    const cart = this.getCart();
    const total = this.getCartTotal();
    const itemsCount = this.getCartItemsCount();
    const meetsMinimum = this.meetsMinimumOrderAmount();

    return `
      <div class="fixed bottom-4 right-4 z-50">
        <button 
          onclick="toggleCart()"
          class="bg-blue-200 text-gray-800 p-4 rounded-full shadow-lg hover:bg-blue-300 transition duration-300 relative"
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
          ${itemsCount > 0
            ? `<span id="cart-counter" class="absolute -top-1 -right-1 bg-blue-500 text-white
                           rounded-full w-6 h-6 flex items-center
                           justify-center text-xs font-bold">
                 ${itemsCount}
               </span>`
            : '<span id="cart-counter" class="hidden"></span>'
          }
        </button>
      </div>

      <div id="cartModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-40">
        <div
          class="fixed right-0 top-0 bottom-0 w-full max-w-md
                 bg-white shadow-lg p-6 transform transition-transform duration-300 translate-x-full"
        >
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-gray-800">Корзина покупок</h2>
            <button onclick="toggleCart()" class="text-gray-500 hover:text-gray-700">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div id="cart-content" class="overflow-y-auto max-h-[70vh]">
            ${this.renderCartItems(cart)}
          </div>
          
          <div id="cart-footer" class="border-t pt-4 mt-4">
            ${this.renderCartFooter(total, meetsMinimum)}
          </div>
        </div>
      </div>
    `;
  },

  // Render cart items with proper data attributes for event delegation
  renderCartItems(cart) {
    if (cart.length === 0) {
      return `
        <div class="text-center py-8">
          <p class="text-gray-500">Ваша корзина пуста</p>
        </div>
      `;
    }

    return `
      <div class="space-y-4">
        ${cart.map(item => {
          const product = products.find(p => p.id === item.id);
          if (!product) return '';
          
          return `
            <div class="flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
              <img src="${product.photo[0]}"
                   alt="${item.name}"
                   class="w-20 h-20 object-cover rounded">
              <div class="flex-1">
                <h3 class="font-semibold text-gray-800">${item.name}</h3>
                <p class="text-gray-600 text-sm">Цвет: ${item.color}</p>
                <p class="text-gray-600 text-sm">ID: ${item.id}</p>
                <div class="flex items-center mt-2">
                  <button 
                    class="quantity-decrease px-3 py-1 h-8 border border-gray-300 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors rounded-l"
                    data-product-id="${item.id}"
                    data-color="${item.color}"
                    data-quantity="${item.quantity}"
                  >-</button>
                  <input 
                    type="number" 
                    value="${item.quantity}" 
                    min="1"
                    class="quantity-input w-16 h-8 text-center border-t border-b border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
                    data-product-id="${item.id}"
                    data-color="${item.color}"
                  >
                  <button 
                    class="quantity-increase px-3 py-1 h-8 border border-gray-300 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors rounded-r"
                    data-product-id="${item.id}"
                    data-color="${item.color}"
                    data-quantity="${item.quantity}"
                  >+</button>
                </div>
              </div>
              <div class="text-right">
                <p class="font-semibold text-gray-800">
                  ₽${product.price * item.quantity}
                </p>
                <button 
                  class="remove-item text-red-500 hover:text-red-700 text-sm mt-1"
                  data-product-id="${item.id}"
                  data-color="${item.color}"
                >
                  Удалить
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  // Render cart footer
  renderCartFooter(total, meetsMinimum) {
    return `
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
    `;
  },

  // Update cart UI without full re-render
  updateCartUI() {
    const cart = this.getCart();
    const itemsCount = this.getCartItemsCount();
    
    console.log('Updating cart UI, items count:', itemsCount);
    
    // Update cart counter
    const counterElement = document.getElementById('cart-counter');
    if (counterElement) {
      if (itemsCount > 0) {
        counterElement.textContent = itemsCount;
        counterElement.classList.remove('hidden');
      } else {
        counterElement.classList.add('hidden');
      }
    }
    
    // Update cart content if modal is open
    const cartContent = document.getElementById('cart-content');
    if (cartContent) {
      cartContent.innerHTML = this.renderCartItems(cart);
      console.log('Cart content updated');
    }
    
    // Update cart footer
    const cartFooter = document.getElementById('cart-footer');
    if (cartFooter) {
      const total = this.getCartTotal();
      const meetsMinimum = this.meetsMinimumOrderAmount();
      cartFooter.innerHTML = this.renderCartFooter(total, meetsMinimum);
      console.log('Cart footer updated');
    }
    
    // Re-initialize event listeners after content update
    this.initCartEventListeners();
  }
};
