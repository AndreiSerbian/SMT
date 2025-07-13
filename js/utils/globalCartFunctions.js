
import { cartService } from '../services/cartService.js';

// Глобальные функции для работы с корзиной
window.toggleCart = function() {
  const cartModal = document.getElementById('cartModal');
  const cartContent = cartModal.querySelector('.fixed.right-0');
  
  if (cartModal.classList.contains('hidden')) {
    // Открываем корзину
    cartModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Анимация появления
    setTimeout(() => {
      cartContent.classList.remove('translate-x-full');
    }, 10);
  } else {
    // Закрываем корзину
    cartContent.classList.add('translate-x-full');
    document.body.style.overflow = '';
    
    // Скрываем после анимации
    setTimeout(() => {
      cartModal.classList.add('hidden');
    }, 300);
  }
};

window.updateCartQuantity = function(productId, quantity) {
  if (quantity < 1) return;
  
  const cart = cartService.getCart();
  const item = cart.find(item => item.id === productId);
  
  if (item) {
    item.quantity = quantity;
    cartService.saveCart(cart);
    cartService.updateCartUI();
  }
};

window.removeFromCart = function(productId) {
  cartService.removeFromCart(productId);
  cartService.updateCartUI();
};

window.goToOrderPage = function() {
  window.location.href = '#order';
};

window.addToCart = function(productId, quantity = 1) {
  cartService.addToCart(productId, quantity);
  
  // Показываем уведомление
  const notification = document.createElement('div');
  notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
  notification.textContent = 'Товар добавлен в корзину!';
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
};
