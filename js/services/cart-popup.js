
/**
 * Модуль управления pop-up окном корзины
 */
import { cartUI } from './cart-ui.js';

export const cartPopup = {
  popup: null,
  overlay: null,

  /**
   * Инициализирует pop-up корзины
   */
  init() {
    this.popup = document.getElementById('cart-popup');
    this.overlay = document.querySelector('.cart-overlay');
    
    if (!this.popup) {
      console.error('Элемент #cart-popup не найден');
      return;
    }

    this.attachEventListeners();
  },

  /**
   * Навешивает обработчики событий
   */
  attachEventListeners() {
    // Открытие корзины
    const toggleBtn = document.getElementById('cart-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.open();
      });
    }

    // Закрытие по клику на overlay
    if (this.overlay) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) {
          this.close();
        }
      });
    }

    // Закрытие по кнопке ×
    const closeBtn = this.popup?.querySelector('.cart-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.close();
      });
    }

    // Закрытие по ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });
  },

  /**
   * Открывает pop-up корзины
   */
  open() {
    if (!this.popup) return;

    // Рендерим содержимое корзины
    cartUI.render();

    // Показываем popup с анимацией
    this.popup.classList.add('active');
    setTimeout(() => {
      this.popup.classList.add('scale-100');
      this.popup.classList.remove('scale-95');
    }, 10);

    // Блокируем скролл body
    document.body.style.overflow = 'hidden';
  },

  /**
   * Закрывает pop-up корзины
   */
  close() {
    if (!this.popup) return;

    // Анимация закрытия
    this.popup.classList.add('scale-95');
    this.popup.classList.remove('scale-100');

    setTimeout(() => {
      this.popup.classList.remove('active');
      // Восстанавливаем скролл body
      document.body.style.overflow = '';
    }, 200);
  },

  /**
   * Проверяет, открыт ли pop-up
   * @returns {boolean}
   */
  isOpen() {
    return this.popup?.classList.contains('active') || false;
  }
};
