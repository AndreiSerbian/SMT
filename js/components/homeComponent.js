
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
      
      // Добавляем обработчики для кнопок "Посмотреть все"
      document.querySelectorAll('.view-all-btn').forEach(button => {
        button.addEventListener('click', function() {
          const productId = this.dataset.productId;
          const baseName = this.dataset.baseName;
          const baseSize = this.dataset.baseSize;
          
          // Находим активную кнопку цвета
          const activeColorButton = document.querySelector(`.color-button[data-product-id="${productId}"].border-blue-500`);
          
          if (activeColorButton) {
            // Если есть активная кнопка цвета, используем её цвет
            const color = activeColorButton.dataset.color;
            const matchingProduct = ColorService.findMatchingProduct(baseName, baseSize, color);
            
            if (matchingProduct) {
              window.location.href = `#product/${matchingProduct.id}`;
              return;
            }
          }
          
          // Если активной кнопки нет или продукт не найден, просто переходим к текущему продукту
          window.location.href = `#product/${productId}`;
        });
      });
    }, 100);
  }
};

export default HomeComponent;
