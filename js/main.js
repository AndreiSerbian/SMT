
import Router from './router.js';
import { cartService } from './services/cartService.js';
import { eventBus } from './utils/eventBus.js';

// Initialize all global event listeners and app state
export function initApp() {
  // Set up the router
  const router = new Router();
  
  // Initialize global event listeners
  document.addEventListener('click', (e) => {
    // Проверяем, кликнули ли по элементу .color-button
    if (e.target.matches('.color-button')) {
      e.preventDefault();
      
      // Получаем атрибуты
      const productId = e.target.dataset.productId; 
      const baseName = e.target.dataset.baseName; 
      const baseSize = e.target.dataset.baseSize;
      const chosenColor = e.target.dataset.color;
      
      // Вызываем событие смены цвета
      eventBus.emit('color-changed', {
        productId,
        baseName,
        baseSize,
        chosenColor
      });
    }
  });
  
  // Listen for cart updates
  eventBus.subscribe('cart-updated', () => {
    cartService.updateCartUI();
  });
  
  // Register cart toggle functionality
  window.toggleCart = () => {
    const modal = document.getElementById('cartModal');
    modal.classList.toggle('hidden');
    
    const isOpen = !modal.classList.contains('hidden');
    
    // Блокируем прокрутку страницы при открытой корзине
    document.body.style.overflow = isOpen ? 'hidden' : '';
    
    const transformEl = modal.querySelector('.transform');
    if (isOpen) {
      transformEl.classList.add('translate-x-0');
      transformEl.classList.remove('translate-x-full');
    } else {
      transformEl.classList.remove('translate-x-0');
      transformEl.classList.add('translate-x-full');
    }
  };
  
  // Register add to cart functionality
  window.addToCart = (productId, quantity) => {
    cartService.addToCart(productId, quantity);
  };
  
  // Register remove from cart functionality
  window.removeFromCart = (productId) => {
    cartService.removeFromCart(productId);
  };
  
  // Register update cart quantity functionality
  window.updateCartQuantity = (productId, newQuantity) => {
    const cart = cartService.getCart();
    const item = cart.find(item => item.id === productId);
    
    if (item) {
      item.quantity = Math.max(1, newQuantity);
      cartService.saveCart(cart);
    }
  };
  
  // Register go to order page functionality
  window.goToOrderPage = () => {
    window.toggleCart();
    window.location.hash = '#order';
  };
}
