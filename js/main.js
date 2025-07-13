import { router } from './utils/router.js';
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

// Define route handlers
const routes = {
  '/': () => {
    const homeComponent = document.createElement('div');
    homeComponent.id = 'home-component';
    document.getElementById('app').appendChild(homeComponent);
    HomeComponent.render(homeComponent);
  },
  '/product/:id': (params) => {
    const productComponent = document.createElement('div');
    productComponent.id = 'product-component';
    document.getElementById('app').appendChild(productComponent);
    ProductComponent.render(productComponent, params.id);
  },
  '/order': () => {
    const orderComponent = document.createElement('div');
    orderComponent.id = 'order-component';
    document.getElementById('app').appendChild(orderComponent);
    OrderComponent.render(orderComponent);
  },
};

// Function to handle route changes
function handleRouteChange() {
  const appContainer = document.getElementById('app');
  if (appContainer) {
    // Destroy existing components
    const homeComponent = document.getElementById('home-component');
    if (homeComponent) {
      HomeComponent.destroy(homeComponent);
      homeComponent.remove();
    }

    const productComponent = document.getElementById('product-component');
    if (productComponent) {
      productComponent.remove();
    }

    const orderComponent = document.getElementById('order-component');
    if (orderComponent) {
      orderComponent.remove();
    }

    // Call the router
    router(routes);
  }
}

// Listen for hash changes
window.addEventListener('hashchange', handleRouteChange);

// Initial route handling on page load
document.addEventListener('DOMContentLoaded', handleRouteChange);

// Импортируем глобальные функции корзины
import './utils/globalCartFunctions.js';
