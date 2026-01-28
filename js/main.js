
import { cartService } from './services/cartService.js';
import { notificationService } from './services/notificationService.js';

// Глобальная функция для добавления товара в корзину
window.addToCart = async function(productId, quantity = 1) {
  console.log(`Добавляем в корзину: товар ${productId}, количество ${quantity}`);
  await cartService.addToCart(productId, quantity);
};

// Глобальная функция для обновления количества в корзине
window.updateQuantity = async function(productId, quantity) {
  console.log(`Обновляем количество: товар ${productId}, новое количество ${quantity}`);
  if (quantity <= 0) {
    await cartService.removeFromCart(productId);
  } else {
    await cartService.updateQuantity(productId, quantity);
  }
};

// Глобальная функция для переключения отображения корзины
window.toggleCart = async function() {
  const cartModal = document.getElementById('cartModal');
  const cartSlide = cartModal.querySelector('.fixed.right-0');
  
  if (cartModal.classList.contains('hidden')) {
    // Обновляем содержимое корзины перед открытием
    await cartService.updateCartUI();
    
    cartModal.classList.remove('hidden');
    cartSlide.classList.remove('translate-x-full');
    document.body.style.overflow = 'hidden';
  } else {
    cartSlide.classList.add('translate-x-full');
    document.body.style.overflow = '';
    setTimeout(() => {
      cartModal.classList.add('hidden');
    }, 300);
  }
};

// Глобальная функция для обновления количества товара в корзине
window.updateCartQuantity = async function(productId, quantity) {
  console.log(`Обновляем количество в корзине: товар ${productId}, количество ${quantity}`);
  if (quantity <= 0) {
    await cartService.removeFromCart(productId);
  } else {
    await cartService.updateQuantity(productId, quantity);
  }
};

// Глобальная функция для удаления товара из корзины
window.removeFromCart = async function(productId) {
  console.log(`Удаляем из корзины: товар ${productId}`);
  await cartService.removeFromCart(productId);
};

// Глобальная функция для перехода на страницу заказа
window.goToOrderPage = function() {
  console.log('Переходим на страницу заказа');
  window.location.href = '#order';
};

// Глобальная переменная для доступа к полю количества
window.quantityInput = null;

// Глобальная функция для очистки корзины
window.clearCart = async function() {
  console.log('Очищаем корзину');
  await cartService.clearCart();
};

// Инициализация приложения
export function initApp() {
  console.log('Инициализация приложения');
  
  // Подписываемся на события обновления корзины
  cartService.getCart(); // Инициализируем корзину
  
  // Устанавливаем quantityInput после загрузки DOM
  document.addEventListener('DOMContentLoaded', async () => {
    // Принудительно сбрасываем стили прокрутки при загрузке приложения
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.documentElement.style.overflow = '';
    
    const quantityInput = document.getElementById('quantityInput');
    if (quantityInput) {
      window.quantityInput = quantityInput;
    }
    
    // Инициализируем UI корзины
    cartService.updateCartUI();
    
    // Проверяем режим технических работ при загрузке
    if (window.modernAdminComponent) {
      await window.modernAdminComponent.loadSettings?.();
      window.modernAdminComponent.checkMaintenanceMode?.();
    }
  });
}

// Добавляем обработчик изменения хеша для проверки режима технических работ
window.addEventListener('hashchange', () => {
  if (window.modernAdminComponent) {
    window.modernAdminComponent.checkMaintenanceMode?.();
  }
});
