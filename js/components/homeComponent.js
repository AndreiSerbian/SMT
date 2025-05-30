
import { products } from '../data/products.js';
import { cartService } from '../services/cartService.js';
import SwiperService from '../services/swiperService.js';
import { ColorService } from '../services/colorService.js';

const HomeComponent = {
  swipersById: {},
  
  // Получение уникальных категорий
  getCategories() {
    const categories = new Set();
    products.forEach(product => {
      categories.add(`${product.name} (${product.sizeType})`);
    });
    return Array.from(categories);
  },
  
  render() {
    const app = document.getElementById('app');
    const categories = HomeComponent.getCategories();
    
    app.innerHTML = `
      <div class="container mx-auto px-4 py-8">
        <h1 class="text-4xl font-bold text-center mb-12 text-gray-800">Gift Box Collection</h1>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          ${categories.map(category => {
            const [name, sizeTypeRaw] = category.split(' (');
            const sizeType = (sizeTypeRaw || '').slice(0, -1);
            
            // Находим "продукт по умолчанию" (первый цвет)
            const product = products.find(p => p.name === name && p.sizeType === sizeType);
            if (!product) return '';

            return `
              <div class="bg-white rounded-lg shadow-lg overflow-hidden transform transition duration-300 hover:scale-110">
                <div class="relative">
                  <div id="product-slider-${product.id}" class="swiper">
                    <div class="swiper-wrapper">
                    ${product.photo.map(image => `
                      <div class="swiper-slide">
                        <img src="${image}" alt="${category}" class="w-full h-80 object-contain hover:scale-105" />
                      </div>
                    `).join('')}
                    </div>
                    <!-- Элементы управления слайдером -->
                    <div class="swiper-pagination"></div>
                    <div class="swiper-button-prev"></div>
                    <div class="swiper-button-next"></div>
                  </div>
                </div>

                <div class="p-6">
                  <h2 class="text-xl font-semibold text-gray-800 mb-2">${category}</h2>
                  <div class="mb-6">
                    <h2 class="font-semibold text-gray-800 mb-2">Цвета в наличии:</h2>
                    <div class="flex flex-wrap gap-2 mb-4" id="color-buttons-${product.id}">
                    ${ColorService.renderColorButtons(product)}
                    </div>

                    <button
                      data-product-id="${product.id}"
                      data-base-name="${product.name}"
                      data-base-size="${product.sizeType}"
                      class="view-all-btn w-full bg-blue-200 text-gray-800 px-4 py-2 rounded hover:bg-blue-300 transition duration-300"
                    >
                      Посмотреть все
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      ${cartService.renderCart()}
    `;
    
    // Инициализируем все слайдеры
    setTimeout(() => {
      SwiperService.initSwipers();
      
      // Добавляем обработчики для кнопок цветов
      this.initColorButtonHandlers();
      
      // Добавляем обработчики для кнопок "Посмотреть все"
      this.initViewAllButtonHandlers();
    }, 100);
  },

  // Инициализация обработчиков цветовых кнопок
  initColorButtonHandlers() {
    document.addEventListener('click', (e) => {
      if (e.target.matches('.color-button')) {
        e.preventDefault();
        
        const productId = e.target.dataset.productId;
        const baseName = e.target.dataset.baseName;
        const baseSize = e.target.dataset.baseSize;
        const chosenColor = e.target.dataset.color;
        
        // Проверяем, был ли уже выбран этот цвет
        const wasAlreadySelected = e.target.dataset.active === 'true';
        
        if (wasAlreadySelected) {
          // Второй клик - переходим на страницу товара
          const matchingProduct = ColorService.findMatchingProduct(baseName, baseSize, chosenColor);
          if (matchingProduct) {
            window.location.href = `#product/${matchingProduct.id}`;
          }
          return;
        }
        
        // Первый клик - обновляем слайдер и выделяем кнопку
        const matchingProduct = ColorService.findMatchingProduct(baseName, baseSize, chosenColor);
        if (matchingProduct) {
          // Обновляем слайдер
          SwiperService.updateSliderPhotos(productId, matchingProduct.photo);
          
          // Обновляем состояние кнопок цветов
          ColorService.updateButtonColor(productId, chosenColor);
          
          // Обновляем data-атрибуты для кнопки "Посмотреть все"
          const viewAllBtn = document.querySelector(`.view-all-btn[data-product-id="${productId}"]`);
          if (viewAllBtn) {
            viewAllBtn.dataset.selectedProductId = matchingProduct.id;
          }
        }
      }
    });
  },

  // Инициализация обработчиков кнопок "Посмотреть все"
  initViewAllButtonHandlers() {
    document.addEventListener('click', (e) => {
      if (e.target.matches('.view-all-btn')) {
        e.preventDefault();
        
        const productId = e.target.dataset.productId;
        const selectedProductId = e.target.dataset.selectedProductId;
        const baseName = e.target.dataset.baseName;
        const baseSize = e.target.dataset.baseSize;
        
        // Если есть выбранный продукт, переходим к нему
        if (selectedProductId) {
          window.location.href = `#product/${selectedProductId}`;
          return;
        }
        
        // Иначе ищем активную кнопку цвета
        const activeColorButton = document.querySelector(`.color-button[data-product-id="${productId}"][data-active="true"]`);
        
        if (activeColorButton) {
          const chosenColor = activeColorButton.dataset.color;
          const matchingProduct = ColorService.findMatchingProduct(baseName, baseSize, chosenColor);
          if (matchingProduct) {
            window.location.href = `#product/${matchingProduct.id}`;
            return;
          }
        }
        
        // Если ничего не выбрано, переходим к продукту по умолчанию
        window.location.href = `#product/${productId}`;
      }
    });
  }
};

export default HomeComponent;
