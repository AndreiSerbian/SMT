
// Глобальная функция для добавления товара в корзину
window.addToCart = function(productId, quantity = 1) {
  console.log(`Добавляем в корзину: товар ${productId}, количество ${quantity}`);
  cartService.addToCart(productId, quantity);
  
  // Показываем уведомление
  notificationService.show(`Товар добавлен в корзину (${quantity} шт.)`);
};

// Глобальная функция для обновления количества в корзине
window.updateQuantity = function(productId, quantity) {
  console.log(`Обновляем количество: товар ${productId}, новое количество ${quantity}`);
  if (quantity <= 0) {
    cartService.removeFromCart(productId);
  } else {
    cartService.updateQuantity(productId, quantity);
  }
};

// Глобальная переменная для доступа к полю количества
window.quantityInput = null;

// Глобальная функция для очистки корзины
window.clearCart = function() {
  console.log('Очищаем корзину');
  cartService.clearCart();
};

// Инициализация приложения
export function initApp() {
  console.log('Инициализация приложения');
  
  // Устанавливаем quantityInput после загрузки DOM
  document.addEventListener('DOMContentLoaded', () => {
    const quantityInput = document.getElementById('quantityInput');
    if (quantityInput) {
      window.quantityInput = quantityInput;
    }
  });
}
