
import { cart } from './services/cart.js';
import { cartUI } from './services/cart-ui.js';
import { cartPopup } from './services/cart-popup.js';

// Глобальные функции для добавления товара в корзину
window.addToCart = function(productId, quantity = 1) {
  console.log(`Добавляем в корзину: товар ${productId}, количество ${quantity}`);
  cart.addItem(productId, quantity);
  
  // Показываем уведомление, если доступно
  if (typeof notificationService !== 'undefined') {
    notificationService.show(`Товар добавлен в корзину (${quantity} шт.)`);
  }
};

// Глобальная функция для переключения корзины
window.toggleCart = function() {
  console.log('Переключаем корзину');
  if (cartPopup.isOpen()) {
    cartPopup.close();
  } else {
    cartPopup.open();
  }
};

// Глобальная функция для очистки корзины
window.clearCart = function() {
  console.log('Очищаем корзину');
  cart.clear();
};

// Глобальные переменные для доступа к модулям корзины
window.cart = cart;
window.cartUI = cartUI;
window.cartPopup = cartPopup;

// Инициализация приложения
export function initApp() {
  console.log('Инициализация приложения');
  
  // Инициализируем корзину
  cart.load();
  
  // Устанавливаем quantityInput после загрузки DOM
  document.addEventListener('DOMContentLoaded', () => {
    // Инициализируем pop-up корзины
    cartPopup.init();
    
    // Обновляем счётчик корзины при загрузке
    cart.updateHeaderCounter();
    
    const quantityInput = document.getElementById('quantityInput');
    if (quantityInput) {
      window.quantityInput = quantityInput;
    }
  });
}
