
/**
 * Компонент modal корзины
 * Добавьте этот HTML в основной шаблон или создайте через JS
 */

export function createCartModal() {
  return `
    <div id="cart-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50 opacity-0 transition-opacity duration-200">
      <div class="overlay absolute inset-0"></div>
      <div class="cart-popup fixed right-4 top-4 bottom-4 w-full max-w-md bg-white rounded-lg shadow-xl p-6 transform transition-all duration-200 scale-95 overflow-hidden">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-gray-800">Корзина</h2>
          <button class="btn-close text-gray-500 hover:text-gray-700 p-1">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div id="cart-content" class="overflow-y-auto flex-1"></div>
      </div>
    </div>
  `;
}

// Добавляем modal в DOM при загрузке
document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('cart-modal')) {
    document.body.insertAdjacentHTML('beforeend', createCartModal());
  }
});
