
import { products } from '../data/products.js';
import { cartService } from '../services/cartService.js';
import { colorMap } from '../data/products.js';
import { ColorService } from '../services/colorService.js';

const ProductComponent = {
  eventListeners: [],
  timeouts: [],
  
  destroy(container) {
    // Очищаем таймеры
    this.timeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this.timeouts = [];
    
    // Очищаем слушатели событий
    this.eventListeners.forEach(({ element, event, handler }) => {
      if (element && element.removeEventListener) {
        element.removeEventListener(event, handler);
      }
    });
    this.eventListeners = [];
    
    // Очищаем глобальные функции
    if (window.openImageModal) delete window.openImageModal;
    if (window.closeImageModal) delete window.closeImageModal;
    if (window.quantityInput) delete window.quantityInput;
  },
  
  addEventListenerWithCleanup(element, event, handler) {
    if (element && element.addEventListener) {
      element.addEventListener(event, handler);
      this.eventListeners.push({ element, event, handler });
    }
  },

  render(productId, container) {
    if (!container) {
      console.error('Container not provided to ProductComponent');
      return;
    }
    
    const product = products.find(p => p.id === productId);
    if (!product) {
      // Если продукт не найден, перенаправляем на главную
      window.location.href = '#';
      return;
    }

    // Устанавливаем текущий продукт как выбранный цвет
    ColorService.selectedColors[productId] = product.color;

    container.innerHTML = `
      <nav class="bg-white shadow-md">
        <div class="container mx-auto px-6 py-3 flex justify-between items-center">
          <a href="#" class="text-xl font-bold text-gray-800">
            <span class="hidden sm:inline">Gift Box Shop</span>
            <span class="sm:hidden">Gift Box</span>
          </a>
          
          <!-- Навигационное меню (одинаковое для всех устройств) -->
          <div class="flex space-x-4">
            <a href="#" class="text-gray-600 hover:text-gray-800">Главная</a>
            <a href="#contacts" class="text-gray-600 hover:text-gray-800">Контакты</a>
          </div>
        </div>
      </nav>

      <div class="container mx-auto px-4 py-8">
         <button 
          class="back-button mb-8 text-gray-600 hover:text-gray-800 flex items-center"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
          Вернуться к категориям
        </button>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div class="space-y-4">
            <div class="bg-white rounded-lg shadow-lg overflow-hidden">
              <img id="main-product-image" src="${product.photo[0]}" alt="${product.name}" class="w-full h-96 object-contain cursor-pointer">
            </div>
            <div class="grid grid-cols-4 gap-4">
              ${product.photo.map(photo => `
                <img 
                  src="${photo}" 
                  alt="${product.name}" 
                  class="product-thumbnail w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-75 transition"
                >
              `).join('')}
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-lg p-8">
            <h1 class="text-3xl font-bold text-gray-800 mb-4">${product.name}</h1>
            <p class="text-gray-600 mb-4">Цвет: ${product.color}</p>
            <p class="text-2xl font-bold text-gray-800 mb-6">₽${product.price}</p>
            
            <div class="mb-6">
              <h2 class="font-semibold text-gray-800 mb-2">Размеры:</h2>
              <p class="text-gray-600">Длина: ${product.dimensions.length}см</p>
              <p class="text-gray-600">Ширина: ${product.dimensions.width}см</p>
              <p class="text-gray-600">Высота: ${product.dimensions.height}см</p>
              <p class="text-gray-600">Вес: ${product.weight}кг</p>
            </div>

            <div class="mb-6">
              <h2 class="font-semibold text-gray-800 mb-2">Цвета в наличии:</h2>
              <div class="flex flex-wrap gap-2">
                ${Object.entries(colorMap)
                  .filter(([color]) => 
                    products.some(p => 
                      p.name === product.name && 
                      p.sizeType === product.sizeType && 
                      p.color === color
                    )
                  )
                  .map(([color, hex]) => {
                    const isSelected = product.color === color;
                    return `
                      <button 
                        class="w-8 h-8 rounded-full border-2 ${isSelected ? 'border-blue-500' : 'border-gray-300'}"
                        style="background-color: ${hex}"
                        onclick="window.location.href='#product/${
                          products.find(p => 
                            p.name === product.name && 
                            p.sizeType === product.sizeType && 
                            p.color === color
                          ).id
                        }'"
                      ></button>
                    `;
                  }).join('')}
              </div>
            </div>

            <div class="flex items-center gap-4 mb-6">
              <label class="font-semibold text-gray-800">Количество:</label>
              <div class="flex items-center border rounded">
                <button 
                  class="px-3 py-1 hover:bg-gray-100"
                  onclick="window.quantityInput.value = Math.max(1, parseInt(window.quantityInput.value) - 1)"
                >-</button>
                <input 
                  type="number" 
                  id="quantityInput"
                  value="1" 
                  min="1"
                  class="w-16 text-center border-x"
                >
                <button 
                  class="px-3 py-1 hover:bg-gray-100"
                  onclick="window.quantityInput.value = parseInt(window.quantityInput.value) + 1"
                >+</button>
              </div>
            </div>

            <button 
              onclick="addToCart('${product.id}', parseInt(document.getElementById('quantityInput').value))"
              class="w-full bg-blue-200 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-blue-300 transition duration-300"
            >
              Добавить в корзину
            </button>
          </div>
        </div>

        <!-- Модальное окно для просмотра изображения -->
        <div id="imageModal" class="fixed inset-0 bg-black bg-opacity-75 hidden z-50 flex items-center justify-center">
          <div class="relative max-w-4xl max-h-full p-4">
            <button 
              class="close-modal-btn absolute top-2 right-2 text-red-500 hover:text-red-700 text-4xl font-bold z-10"
            >
              ×
            </button>
            <img id="modalImage" src="" alt="" class="max-w-full max-h-full object-contain">
          </div>
        </div>
      </div>
      ${cartService.renderCart()}
      
     <footer class="bg-blue-950 text-white py-8 mt-12">
        <div class="container mx-auto px-6">
          <div class="flex flex-col md:flex-row justify-between">
            <div class="mb-6 md:mb-0">
              <h3 class="text-xl font-bold mb-4">SMT Premium Box</h3>
              <p class="text-gray-400">Красивые подарочные коробки оптом</p>
            </div>
            <div>
              <h4 class="text-lg font-semibold mb-3">Контакты</h4>
              <p class="text-white-400">Телефон: +79153474616</p>
              <p class="text-white-400">Email: smtpremiumbox@serbiyan.ru</p>
            </div>
          </div>
          <div class="border-t border-gray-700 mt-8 pt-6 text-center text-white-400">
            <p>&copy; 2025 SMT Premium Box. Все права защищены.</p>
          </div>
        </div>
      </footer>
    `;
    
    // Добавляем обработчики событий для изображений
    const timeoutId = setTimeout(() => {
      const mainImage = container.querySelector('#main-product-image');
      const thumbnails = container.querySelectorAll('.product-thumbnail');
      const backButton = container.querySelector('.back-button');
      const closeModalBtn = container.querySelector('.close-modal-btn');
      const imageModal = container.querySelector('#imageModal');
      
      // Обработчик кнопки "Назад"
      if (backButton) {
        const backHandler = () => window.location.href = '#';
        ProductComponent.addEventListenerWithCleanup(backButton, 'click', backHandler);
      }
      
      // Функции для модального окна
      const openImageModal = (imageSrc) => {
        const modalImage = container.querySelector('#modalImage');
        const imageModal = container.querySelector('#imageModal');
        if (modalImage && imageModal) {
          modalImage.src = imageSrc;
          imageModal.classList.remove('hidden');
        }
      };
      
      const closeImageModal = () => {
        const imageModal = container.querySelector('#imageModal');
        if (imageModal) {
          imageModal.classList.add('hidden');
        }
      };
      
      if (mainImage) {
        const mainImageHandler = function() {
          openImageModal(this.src);
        };
        ProductComponent.addEventListenerWithCleanup(mainImage, 'click', mainImageHandler);
      }
      
      thumbnails.forEach(thumbnail => {
        const thumbnailHandler = function() {
          if (mainImage) {
            mainImage.src = this.src;
          }
          openImageModal(this.src);
        };
        ProductComponent.addEventListenerWithCleanup(thumbnail, 'click', thumbnailHandler);
      });
      
      if (closeModalBtn) {
        ProductComponent.addEventListenerWithCleanup(closeModalBtn, 'click', closeImageModal);
      }
      
      // Закрытие модального окна по клику на фон
      if (imageModal) {
        const modalBackgroundHandler = function(e) {
          if (e.target === this) {
            closeImageModal();
          }
        };
        ProductComponent.addEventListenerWithCleanup(imageModal, 'click', modalBackgroundHandler);
      }
      
      // Сохраняем ссылку на quantityInput
      window.quantityInput = container.querySelector('#quantityInput');
    }, 0);
    
    this.timeouts.push(timeoutId);
  }
};

export default ProductComponent;
