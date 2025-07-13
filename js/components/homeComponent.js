
import { products } from '../data/products.js';
import { cartService } from '../services/cartService.js';
import SwiperService from '../services/swiperService.js';
import { ColorService } from '../services/colorService.js';

const HomeComponent = {
  swipersById: {},
  eventListeners: [],
  timeouts: [],
  
  // Получение уникальных категорий
  getCategories() {
    const categories = new Set();
    products.forEach(product => {
      categories.add(`${product.name} (${product.sizeType})`);
    });
    return Array.from(categories);
  },
  
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
    
    // Очищаем слайдеры
    if (SwiperService && SwiperService.destroyAll) {
      SwiperService.destroyAll();
    }
    this.swipersById = {};
  },
  
  addEventListenerWithCleanup(element, event, handler) {
    element.addEventListener(event, handler);
    this.eventListeners.push({ element, event, handler });
  },
  
  render(container) {
    if (!container) {
      console.error('Container not provided to HomeComponent');
      return;
    }
    
    const categories = HomeComponent.getCategories();
    
    container.innerHTML = `
      <nav class="bg-white shadow-md">
        <div class="container mx-auto px-6 py-3 flex justify-between items-center">
       <a href="#" class="text-xl font-bold text-gray-800">
         <img src="https://giftboxopt.ru/assets/logo-B0ADOiza.svg" alt="Logo" class="w-8 h-8" />
          <span class="inline">SMT Premium Box</span>
        </a>
          
          <!-- Навигационное меню (одинаковое для всех устройств) -->
          <div class="flex space-x-4">
            <a href="#" class="text-gray-600 hover:text-gray-800">Главная</a>
            <a href="#contacts" class="text-gray-600 hover:text-gray-800">Контакты</a>
          </div>
        </div>
      </nav>

      <div class="container mx-auto px-4 py-8">
        <h1 class="text-4xl font-bold text-center mb-12 text-gray-800">Коллекция подарочных упаковок</h1>
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
                      class="view-all-btn w-full bg-blue-200 text-white-800 px-4 py-2 rounded hover:bg-blue-300 transition duration-300"
                    >
                      Подробно
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
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
    
    // Инициализируем все слайдеры
    const timeoutId = setTimeout(() => {
      SwiperService.initSwipers();
      
      // Добавляем обработчики для кнопок цветов
      container.querySelectorAll('.color-button').forEach(button => {
        let clickCount = 0;
        let clickTimer = null;
        
        const clickHandler = function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          clickCount++;
          
          if (clickCount === 1) {
            clickTimer = setTimeout(() => {
              // Первый клик - меняем изображения
              const productId = this.dataset.productId;
              const baseName = this.dataset.baseName;
              const baseSize = this.dataset.baseSize;
              const chosenColor = this.dataset.color;
              
              console.log('First click on color:', chosenColor, 'for product:', productId);
              
              // Находим соответствующий продукт с выбранным цветом
              const matchingProduct = products.find(p =>
                p.name === baseName &&
                p.sizeType === baseSize &&
                p.color === chosenColor
              );
              
              if (matchingProduct) {
                // Обновляем изображения в слайдере
                SwiperService.updateSliderPhotos(productId, matchingProduct.photo);
                
                // Обновляем активную кнопку цвета
                ColorService.updateButtonColor(productId, chosenColor);
              }
              
              clickCount = 0;
            }, 300);
          } else if (clickCount === 2) {
            // Второй клик - переходим к товару
            clearTimeout(clickTimer);
            
            const productId = this.dataset.productId;
            const baseName = this.dataset.baseName;
            const baseSize = this.dataset.baseSize;
            const chosenColor = this.dataset.color;
            
            console.log('Second click on color:', chosenColor, 'navigating to product');
            
            // Находим соответствующий продукт с выбранным цветом
            const matchingProduct = products.find(p =>
              p.name === baseName &&
              p.sizeType === baseSize &&
              p.color === chosenColor
            );
            
            if (matchingProduct) {
              window.location.href = `#product/${matchingProduct.id}`;
            }
            
            clickCount = 0;
          }
        };
        
        HomeComponent.addEventListenerWithCleanup(button, 'click', clickHandler);
      });
      
      // Добавляем обработчики для кнопок "Подробно"
      container.querySelectorAll('.view-all-btn').forEach(button => {
        const clickHandler = function() {
          const productId = this.dataset.productId;
          
          // Находим активную кнопку цвета
          const activeColorButton = container.querySelector(`.color-button[data-product-id="${productId}"][data-active="true"]`);
          
          if (activeColorButton) {
            // Получаем данные о выбранном цвете
            const baseName = activeColorButton.dataset.baseName;
            const baseSize = activeColorButton.dataset.baseSize;
            const chosenColor = activeColorButton.dataset.color;
            
            // Находим соответствующий продукт с выбранным цветом
            const matchingProduct = products.find(p =>
              p.name === baseName &&
              p.sizeType === baseSize &&
              p.color === chosenColor
            );
            
            if (matchingProduct) {
              window.location.href = `#product/${matchingProduct.id}`;
              return;
            }
          }
          
          // Если активной кнопки нет, просто переходим к текущему продукту
          window.location.href = `#product/${productId}`;
        };
        
        HomeComponent.addEventListenerWithCleanup(button, 'click', clickHandler);
      });
    }, 100);
    
    this.timeouts.push(timeoutId);
  }
};

export default HomeComponent;
