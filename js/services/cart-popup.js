
/**
 * Модуль для управления pop-up корзины
 */

import { renderCart, updateCartCounter } from './cart-ui.js';

let isPopupOpen = false;

/**
 * Инициализирует pop-up корзины
 */
export function initCartPopup() {
  const cartToggle = document.getElementById('cart-toggle');
  const cartModal = document.getElementById('cart-modal');
  const overlay = cartModal?.querySelector('.overlay');
  const closeBtn = cartModal?.querySelector('.btn-close');

  // Обработчик открытия корзины
  if (cartToggle) {
    cartToggle.addEventListener('click', openCart);
  }

  // Обработчик закрытия по overlay
  if (overlay) {
    overlay.addEventListener('click', closeCart);
  }

  // Обработчик закрытия по кнопке
  if (closeBtn) {
    closeBtn.addEventListener('click', closeCart);
  }

  // Обработчик закрытия по ESC
  document.addEventListener('keydown', handleKeyDown);
  
  // Обновляем счетчик при инициализации
  updateCartCounter();
}

/**
 * Открывает pop-up корзины
 */
export function openCart() {
  const cartModal = document.getElementById('cart-modal');
  const cartPopup = cartModal?.querySelector('.cart-popup');
  
  if (!cartModal || !cartPopup) return;

  // Рендерим корзину перед показом
  renderCart();
  
  // Показываем modal
  cartModal.classList.remove('hidden');
  
  // Анимация появления
  requestAnimationFrame(() => {
    cartModal.classList.add('opacity-100');
    cartPopup.classList.remove('scale-95');
    cartPopup.classList.add('scale-100');
  });
  
  // Блокируем скролл
  document.body.style.overflow = 'hidden';
  isPopupOpen = true;
}

/**
 * Закрывает pop-up корзины
 */
export function closeCart() {
  const cartModal = document.getElementById('cart-modal');
  const cartPopup = cartModal?.querySelector('.cart-popup');
  
  if (!cartModal || !cartPopup) return;

  // Анимация скрытия
  cartModal.classList.remove('opacity-100');
  cartPopup.classList.remove('scale-100');
  cartPopup.classList.add('scale-95');
  
  // Скрываем modal после анимации
  setTimeout(() => {
    cartModal.classList.add('hidden');
  }, 200);
  
  // Разблокируем скролл
  document.body.style.overflow = '';
  isPopupOpen = false;
}

/**
 * Обработчик нажатия клавиш
 * @param {KeyboardEvent} event - Событие нажатия клавиши
 */
function handleKeyDown(event) {
  if (event.key === 'Escape' && isPopupOpen) {
    closeCart();
  }
}

/**
 * Проверяет, открыт ли pop-up
 * @returns {boolean} true, если pop-up открыт
 */
export function isCartOpen() {
  return isPopupOpen;
}
