
import HomeComponent from './components/homeComponent.js';
import ProductComponent from './components/productComponent.js';
import OrderComponent from './components/orderComponent.js';
import { cartService } from './services/cartService.js';
import { eventBus } from './utils/eventBus.js';

// Инициализация корзины при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  // Render initial cart
  const appContainer = document.getElementById('app');
  if (appContainer) {
    appContainer.insertAdjacentHTML('beforeend', cartService.renderCart());
  }

  // Update cart UI
  cartService.updateCartUI();
});

// Слушаем событие обновления корзины
eventBus.on('cart-updated', (cart) => {
  cartService.updateCartUI();
});

// Импортируем глобальные функции корзины
import './utils/globalCartFunctions.js';
