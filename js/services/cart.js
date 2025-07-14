
/**
 * Модуль управления данными корзины
 */
export const cart = {
  data: {},

  /**
   * Загружает корзину из localStorage
   */
  load() {
    try {
      const stored = localStorage.getItem('cart');
      this.data = stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Ошибка загрузки корзины:', error);
      this.data = {};
    }
  },

  /**
   * Сохраняет корзину в localStorage
   */
  save() {
    try {
      localStorage.setItem('cart', JSON.stringify(this.data));
    } catch (error) {
      console.error('Ошибка сохранения корзины:', error);
    }
  },

  /**
   * Добавляет товар в корзину
   * @param {string} categoryId - ID категории товара
   * @param {number} quantity - количество
   */
  addItem(categoryId, quantity = 1) {
    if (!this.data[categoryId]) {
      this.data[categoryId] = 0;
    }
    this.data[categoryId] += quantity;
    this.save();
    this.notifyChange();
  },

  /**
   * Устанавливает количество товара
   * @param {string} categoryId - ID категории товара
   * @param {number} quantity - новое количество
   */
  setQuantity(categoryId, quantity) {
    if (quantity <= 0) {
      delete this.data[categoryId];
    } else {
      this.data[categoryId] = quantity;
    }
    this.save();
    this.notifyChange();
  },

  /**
   * Удаляет категорию из корзины
   * @param {string} categoryId - ID категории товара
   */
  removeCategory(categoryId) {
    delete this.data[categoryId];
    this.save();
    this.notifyChange();
  },

  /**
   * Очищает всю корзину
   */
  clear() {
    this.data = {};
    this.save();
    this.notifyChange();
  },

  /**
   * Возвращает количество уникальных категорий
   * @returns {number}
   */
  getCategoryCount() {
    return Object.keys(this.data).length;
  },

  /**
   * Возвращает общее количество товаров
   * @returns {number}
   */
  getTotalQuantity() {
    return Object.values(this.data).reduce((sum, qty) => sum + qty, 0);
  },

  /**
   * Проверяет, пуста ли корзина
   * @returns {boolean}
   */
  isEmpty() {
    return this.getCategoryCount() === 0;
  },

  /**
   * Уведомляет об изменении корзины
   */
  notifyChange() {
    // Обновляем счётчик в шапке
    this.updateHeaderCounter();
    
    // Если pop-up открыт, обновляем его содержимое
    if (document.getElementById('cart-popup')?.classList.contains('active')) {
      window.cartUI?.render();
    }
  },

  /**
   * Обновляет счётчик в шапке
   */
  updateHeaderCounter() {
    const counter = document.getElementById('cart-count');
    if (counter) {
      const count = this.getCategoryCount();
      counter.textContent = count.toString();
      counter.style.display = count > 0 ? 'block' : 'none';
    }
  }
};
