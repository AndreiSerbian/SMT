
/**
 * Модуль для работы с данными корзины
 */

// Объект корзины: { categoryId: { quantity: number, ... } }
let cart = {};

/**
 * Загружает корзину из localStorage
 */
export function loadCart() {
  try {
    const saved = localStorage.getItem('cart');
    cart = saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.error('Ошибка загрузки корзины:', error);
    cart = {};
  }
}

/**
 * Сохраняет корзину в localStorage
 */
export function saveCart() {
  try {
    localStorage.setItem('cart', JSON.stringify(cart));
  } catch (error) {
    console.error('Ошибка сохранения корзины:', error);
  }
}

/**
 * Получает текущую корзину
 * @returns {Object} Объект корзины
 */
export function getCart() {
  return { ...cart };
}

/**
 * Добавляет товар в корзину
 * @param {string} categoryId - ID категории товара
 * @param {number} quantity - Количество для добавления
 */
export function addToCart(categoryId, quantity = 1) {
  if (!cart[categoryId]) {
    cart[categoryId] = { quantity: 0 };
  }
  cart[categoryId].quantity += quantity;
  saveCart();
}

/**
 * Обновляет количество товара в корзине
 * @param {string} categoryId - ID категории товара
 * @param {number} quantity - Новое количество
 */
export function updateCartQuantity(categoryId, quantity) {
  if (quantity < 1) {
    delete cart[categoryId];
  } else {
    if (!cart[categoryId]) {
      cart[categoryId] = {};
    }
    cart[categoryId].quantity = quantity;
  }
  saveCart();
}

/**
 * Удаляет категорию из корзины
 * @param {string} categoryId - ID категории для удаления
 */
export function removeCategory(categoryId) {
  delete cart[categoryId];
  saveCart();
}

/**
 * Очищает корзину
 */
export function clearCart() {
  cart = {};
  saveCart();
}

/**
 * Получает количество уникальных категорий в корзине
 * @returns {number} Количество категорий
 */
export function getCategoriesCount() {
  return Object.keys(cart).length;
}

/**
 * Проверяет, пуста ли корзина
 * @returns {boolean} true, если корзина пуста
 */
export function isCartEmpty() {
  return Object.keys(cart).length === 0;
}

/**
 * Получает общую стоимость корзины
 * @returns {number} Общая стоимость
 */
export function getCartTotal() {
  // Заглушка для расчета стоимости - нужно будет добавить логику с товарами
  return Object.values(cart).reduce((sum, item) => sum + (item.quantity * 100), 0);
}

// Инициализация при загрузке модуля
loadCart();
