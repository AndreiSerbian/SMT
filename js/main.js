
import { cartService } from './services/cartService.js';
import { addToCart } from './services/cart.js';
import { updateCartCounter, renderCart } from './services/cart-ui.js';
import { initCartPopup, openCart, closeCart } from './services/cart-popup.js';

// Глобальные функции для совместимости с существующим кодом
window.addToCart = function(productId, quantity = 1) {
  console.log(`Добавляем в корзину: товар ${productId}, количество ${quantity}`);
  addToCart(productId, quantity);
  updateCartCounter();
  
  // Показываем уведомление если есть notificationService
  if (window.notificationService) {
    window.notificationService.show(`Товар добавлен в корзину (${quantity} шт.)`);
  }
};

// Глобальная функция для переключения отображения корзины
window.toggleCart = function() {
  if (document.getElementById('cart-modal')?.classList.contains('hidden')) {
    openCart();
  } else {
    closeCart();
  }
};

// Остальные глобальные функции для совместимости
window.updateCartQuantity = function(productId, quantity) {
  console.log(`Обновляем количество в корзине: товар ${productId}, количество ${quantity}`);
  cartService.updateQuantity(productId, quantity);
};

window.removeFromCart = function(productId) {
  console.log(`Удаляем из корзины: товар ${productId}`);
  cartService.removeFromCart(productId);
};

window.goToOrderPage = function() {
  console.log('Переходим на страницу заказа');
  window.location.href = '#order';
};

window.clearCart = function() {
  console.log('Очищаем корзину');
  cartService.clearCart();
};

// Глобальная переменная для доступа к полю количества
window.quantityInput = null;

// Инициализация приложения
export function initApp() {
  console.log('Инициализация приложения');
  
  // Инициализируем pop-up корзины при загрузке DOM
  document.addEventListener('DOMContentLoaded', () => {
    initCartPopup();
    
    const quantityInput = document.getElementById('quantityInput');
    if (quantityInput) {
      window.quantityInput = quantityInput;
    }
  });
}
