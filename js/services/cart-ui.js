
/**
 * Модуль для рендеринга интерфейса корзины
 */

import { 
  getCart, 
  getCategoriesCount, 
  isCartEmpty, 
  updateCartQuantity, 
  removeCategory,
  getCartTotal
} from './cart.js';
import { products } from '../data/products.js';

/**
 * Обновляет счетчик категорий в шапке
 */
export function updateCartCounter() {
  const cartCount = document.getElementById('cart-count');
  const count = getCategoriesCount();
  
  if (cartCount) {
    cartCount.textContent = count;
    cartCount.style.display = count > 0 ? 'flex' : 'none';
  }
}

/**
 * Рендерит содержимое корзины
 */
export function renderCart() {
  const cartContent = document.getElementById('cart-content');
  if (!cartContent) return;

  const cart = getCart();
  
  if (isCartEmpty()) {
    cartContent.innerHTML = `
      <div class="text-center py-8">
        <p class="text-gray-500">Корзина пуста</p>
      </div>
    `;
    hideOrderButton();
    return;
  }

  const cartHTML = Object.entries(cart).map(([categoryId, item]) => {
    const product = products.find(p => p.id === categoryId);
    if (!product) return '';

    return `
      <div class="flex items-center gap-4 bg-gray-50 p-4 rounded-lg" data-category="${categoryId}">
        <img src="${product.photo[0]}" alt="${product.name}" class="w-20 h-20 object-cover rounded">
        <div class="flex-1">
          <h3 class="font-semibold text-gray-800">${product.name}</h3>
          <p class="text-gray-600 text-sm">Цвет: ${product.color}</p>
          <div class="flex items-center mt-2">
            <button class="btn-decrease px-3 py-1 h-8 border border-gray-300 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors rounded-l" 
                    data-category="${categoryId}" ${item.quantity <= 1 ? 'disabled' : ''}>
              -
            </button>
            <input type="number" value="${item.quantity}" min="1" 
                   class="quantity-input w-16 h-8 text-center border-t border-b border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
                   data-category="${categoryId}">
            <button class="btn-increase px-3 py-1 h-8 border border-gray-300 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors rounded-r"
                    data-category="${categoryId}">
              +
            </button>
          </div>
        </div>
        <div class="text-right">
          <p class="font-semibold text-gray-800">₽${product.price * item.quantity}</p>
          <button class="btn-remove-category text-red-500 hover:text-red-700 text-sm" data-category="${categoryId}">
            Удалить
          </button>
        </div>
      </div>
    `;
  }).join('');

  const total = getCartTotal();
  
  cartContent.innerHTML = `
    <div class="space-y-4 mb-6">
      ${cartHTML}
    </div>
    <div class="border-t pt-4">
      <div class="flex justify-between items-center mb-4">
        <span class="font-semibold text-gray-800">Всего:</span>
        <span class="font-bold text-xl text-gray-800">₽${total}</span>
      </div>
      <button id="order-button" class="w-full bg-blue-200 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-blue-300 transition duration-300">
        Оформить предзаказ
      </button>
    </div>
  `;

  attachCartListeners();
}

/**
 * Скрывает кнопку оформления заказа
 */
function hideOrderButton() {
  const orderButton = document.getElementById('order-button');
  if (orderButton) {
    orderButton.style.display = 'none';
  }
}

/**
 * Навешивает обработчики событий на элементы корзины
 */
function attachCartListeners() {
  // Кнопки уменьшения количества
  document.querySelectorAll('.btn-decrease').forEach(btn => {
    btn.addEventListener('click', handleDecrease);
  });

  // Кнопки увеличения количества
  document.querySelectorAll('.btn-increase').forEach(btn => {
    btn.addEventListener('click', handleIncrease);
  });

  // Инпуты количества
  document.querySelectorAll('.quantity-input').forEach(input => {
    input.addEventListener('change', handleQuantityChange);
    input.addEventListener('blur', handleQuantityChange);
  });

  // Кнопки удаления категории
  document.querySelectorAll('.btn-remove-category').forEach(btn => {
    btn.addEventListener('click', handleRemoveCategory);
  });
}

/**
 * Обработчик уменьшения количества
 * @param {Event} event - Событие клика
 */
function handleDecrease(event) {
  const categoryId = event.target.dataset.category;
  const cart = getCart();
  const currentQuantity = cart[categoryId]?.quantity || 1;
  
  if (currentQuantity > 1) {
    updateCartQuantity(categoryId, currentQuantity - 1);
    renderCart();
    updateCartCounter();
  }
}

/**
 * Обработчик увеличения количества
 * @param {Event} event - Событие клика
 */
function handleIncrease(event) {
  const categoryId = event.target.dataset.category;
  const cart = getCart();
  const currentQuantity = cart[categoryId]?.quantity || 1;
  
  updateCartQuantity(categoryId, currentQuantity + 1);
  renderCart();
  updateCartCounter();
}

/**
 * Обработчик изменения количества через инпут
 * @param {Event} event - Событие изменения
 */
function handleQuantityChange(event) {
  const categoryId = event.target.dataset.category;
  const newQuantity = parseInt(event.target.value);
  
  if (isNaN(newQuantity) || newQuantity < 1) {
    // Возвращаем к последнему валидному значению
    const cart = getCart();
    event.target.value = cart[categoryId]?.quantity || 1;
    return;
  }
  
  updateCartQuantity(categoryId, newQuantity);
  renderCart();
  updateCartCounter();
}

/**
 * Обработчик удаления категории
 * @param {Event} event - Событие клика
 */
function handleRemoveCategory(event) {
  const categoryId = event.target.dataset.category;
  removeCategory(categoryId);
  renderCart();
  updateCartCounter();
}
