
import Router from './router.js';
import { cartService } from './services/cartService.js';
import { eventBus } from './utils/eventBus.js';
import { ColorService } from './services/colorService.js';
import SwiperService from './services/swiperService.js';

// Initialize all global event listeners and app state
export function initApp() {
  // Инициализация ColorService
  ColorService.init();
  
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
  
  // Register go to order page functionality
  window.goToOrderPage = () => {
    window.toggleCart();
    window.location.hash = '#order';
  };
  
  // Делаем SwiperService доступным глобально
  window.SwiperService = SwiperService;
}
