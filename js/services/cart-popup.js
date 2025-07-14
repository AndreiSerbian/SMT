
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
    console.log('Инициализация cart-popup');
    this.popup = document.getElementById('cart-popup');
    this.overlay = document.querySelector('.cart-overlay');
    
    console.log('Popup element:', this.popup);
    console.log('Overlay element:', this.overlay);
    
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
    console.log('Навешиваем обработчики событий для popup');
    
    // Открытие корзины - используем как ID, так и класс для совместимости
    const toggleBtns = document.querySelectorAll('#cart-toggle, .cart-toggle');
    console.log('Найдено кнопок toggle:', toggleBtns.length);
    
    toggleBtns.forEach((btn, index) => {
      if (btn) {
        console.log(`Навешиваем обработчик на кнопку ${index}:`, btn);
        // Удаляем старые обработчики если есть
        btn.removeEventListener('click', this.handleToggleClick);
        // Добавляем новый обработчик
        btn.addEventListener('click', this.handleToggleClick.bind(this));
      }
    });

    // Закрытие по клику на overlay
    if (this.overlay) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) {
          console.log('Закрытие по клику на overlay');
          this.close();
        }
      });
    }

    // Закрытие по кнопке ×
    const closeBtn = this.popup?.querySelector('.cart-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        console.log('Закрытие по кнопке ×');
        this.close();
      });
    }

    // Закрытие по ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        console.log('Закрытие по ESC');
        this.close();
      }
    });
  },

  /**
   * Обработчик клика по кнопке переключения корзины
   */
  handleToggleClick(e) {
    console.log('handleToggleClick вызван');
    e.preventDefault();
    e.stopPropagation();
    this.open();
  },

  /**
   * Открывает pop-up корзины
   */
  open() {
    if (!this.popup) {
      console.error('Popup не найден, не можем открыть');
      return;
    }

    console.log('Открываем корзину, popup element:', this.popup);
    console.log('Popup classes before:', this.popup.className);
    
    // Рендерим содержимое корзины
    cartUI.render();

    // Показываем popup с анимацией
    this.popup.classList.add('active');
    this.popup.classList.remove('scale-95');
    this.popup.classList.add('scale-100');
    
    console.log('Popup classes after:', this.popup.className);

    // Блокируем скролл body
    document.body.style.overflow = 'hidden';
    
    console.log('Корзина должна быть открыта');
  },

  /**
   * Закрывает pop-up корзины
   */
  close() {
    if (!this.popup) return;

    console.log('Закрываем корзину');

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
