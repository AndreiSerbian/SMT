
/**
 * Модуль управления UI корзины
 */
import { cart } from './cart.js';
import { products } from '../data/products.js';

export const cartUI = {
  /**
   * Рендерит содержимое корзины
   */
  render() {
    console.log('Рендерим содержимое корзины');
    const container = document.getElementById('cart-items');
    const totalElement = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    
    console.log('Container:', container);
    console.log('Total element:', totalElement);
    console.log('Checkout btn:', checkoutBtn);
    
    if (!container) {
      console.error('Контейнер #cart-items не найден');
      return;
    }

    // Если корзина пуста
    if (cart.isEmpty()) {
      console.log('Корзина пуста');
      container.innerHTML = '<p class="text-center text-gray-500 py-8">Корзина пуста</p>';
      if (totalElement) totalElement.textContent = '0';
      if (checkoutBtn) checkoutBtn.style.display = 'none';
      return;
    }

    // Показываем кнопку оформления заказа
    if (checkoutBtn) checkoutBtn.style.display = 'block';

    // Рендерим товары
    let html = '';
    let total = 0;

    console.log('Данные корзины:', cart.data);

    Object.entries(cart.data).forEach(([categoryId, quantity]) => {
      const product = products.find(p => p.id === categoryId);
      if (!product) {
        console.warn(`Продукт с ID ${categoryId} не найден`);
        return;
      }

      console.log(`Рендерим товар: ${product.name}, количество: ${quantity}`);

      const itemTotal = product.price * quantity;
      total += itemTotal;

      html += `
        <div class="cart-item bg-white rounded-lg p-4 shadow-sm border" data-category="${categoryId}">
          <div class="flex items-center gap-4">
            <img src="${product.photo[0]}" alt="${product.name}" class="w-16 h-16 object-cover rounded">
            <div class="flex-1">
              <h3 class="font-semibold text-gray-800">${product.name}</h3>
              <p class="text-gray-600 text-sm">Цвет: ${product.color}</p>
              <p class="text-blue-600 font-semibold">₽${product.price}</p>
            </div>
            <div class="flex items-center gap-2">
              <button class="qty-btn-minus px-3 py-1 border border-gray-300 rounded-l hover:bg-gray-50 transition-colors ${quantity <= 1 ? 'opacity-50 cursor-not-allowed' : ''}" 
                      data-category="${categoryId}" ${quantity <= 1 ? 'disabled' : ''}>-</button>
              <input type="number" class="qty-input w-16 text-center border-t border-b border-gray-300 py-1" 
                     value="${quantity}" min="1" data-category="${categoryId}">
              <button class="qty-btn-plus px-3 py-1 border border-gray-300 rounded-r hover:bg-gray-50 transition-colors" 
                      data-category="${categoryId}">+</button>
            </div>
            <div class="text-right">
              <p class="font-semibold text-gray-800">₽${itemTotal}</p>
              <button class="btn-remove-category text-red-500 hover:text-red-700 text-sm mt-1" 
                      data-category="${categoryId}">Удалить</button>
            </div>
          </div>
        </div>
      `;
    });

    console.log('Готовый HTML:', html.substring(0, 200) + '...');
    container.innerHTML = html;
    
    // Обновляем итоговую сумму
    if (totalElement) {
      totalElement.textContent = total.toLocaleString();
    }

    console.log('Итоговая сумма:', total);

    // Навешиваем обработчики событий после рендера
    this.attachEventListeners();
  },

  /**
   * Навешивает обработчики событий на элементы корзины
   */
  attachEventListeners() {
    console.log('Навешиваем обработчики на элементы корзины');
    const container = document.getElementById('cart-items');
    if (!container) {
      console.error('Контейнер cart-items не найден для навешивания обработчиков');
      return;
    }

    // Используем делегирование событий для динамически создаваемых элементов
    container.addEventListener('click', (e) => {
      const categoryId = e.target.dataset.category;
      if (!categoryId) return;

      e.preventDefault();
      e.stopPropagation();

      console.log('Клик по элементу корзины:', e.target.className, 'categoryId:', categoryId);

      if (e.target.classList.contains('qty-btn-plus')) {
        const currentQty = cart.data[categoryId] || 0;
        console.log('Увеличиваем количество:', categoryId, currentQty + 1);
        cart.setQuantity(categoryId, currentQty + 1);
      } else if (e.target.classList.contains('qty-btn-minus')) {
        const currentQty = cart.data[categoryId] || 0;
        if (currentQty > 1) {
          console.log('Уменьшаем количество:', categoryId, currentQty - 1);
          cart.setQuantity(categoryId, currentQty - 1);
        }
      } else if (e.target.classList.contains('btn-remove-category')) {
        console.log('Удаляем категорию:', categoryId);
        cart.removeCategory(categoryId);
      }
    });

    // Обработчики для input полей
    container.addEventListener('input', (e) => {
      if (e.target.classList.contains('qty-input')) {
        const categoryId = e.target.dataset.category;
        let value = parseInt(e.target.value);
        
        console.log('Изменение input:', categoryId, value);
        
        // Валидация введённого значения
        if (!value || value < 1) {
          // Возвращаем к последнему валидному значению
          e.target.value = cart.data[categoryId] || 1;
          return;
        }

        cart.setQuantity(categoryId, value);
      }
    });

    // Обработчик для корректировки значения при потере фокуса  
    container.addEventListener('blur', (e) => {
      if (e.target.classList.contains('qty-input')) {
        const categoryId = e.target.dataset.category;
        let value = parseInt(e.target.value);
        
        if (!value || value < 1) {
          e.target.value = cart.data[categoryId] || 1;
        }
      }
    }, true);

    console.log('Обработчики навешены на контейнер');
  }
};
