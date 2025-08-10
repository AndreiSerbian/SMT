
import { cartService } from '../services/cartService.js';
import SwiperService from '../services/swiperService.js';
import { ColorService } from '../services/colorService.js';
import { fetchProducts } from '../services/productPriceService.js';

const HomeComponent = {
  swipersById: {},
  eventListeners: [],
  timeouts: [],
  productsWithPrices: [],
  
  // Получение уникальных категорий
  getCategories() {
    const categories = new Set();
    this.productsWithPrices.forEach(product => {
      categories.add(`${product.name} (${product.sizeType})`);
    });
    return Array.from(categories);
  },

  // Загрузка товаров с ценами
  async loadProducts() {
    try {
      this.productsWithPrices = await fetchProducts();
      console.log('Товары загружены:', this.productsWithPrices.length);
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error);
      this.productsWithPrices = [];
    }
  },

  // Обновление отображения цены
  updatePriceDisplay(productId, newPrice) {
    // Можно добавить логику обновления цен в UI если нужно
    console.log(`Цена товара ${productId} обновлена до ${newPrice}`);
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
  
  async render(container) {
    if (!container) {
      console.error('Container not provided to HomeComponent');
      return;
    }
    
    // Загружаем товары с актуальными ценами
    await this.loadProducts();
    
    const categories = HomeComponent.getCategories();
    const cartHTML = await cartService.renderCart();
    
    container.innerHTML = `
      <nav class="bg-white shadow-md relative">
        <div class="container mx-auto px-6 py-3">
          <div class="flex justify-between items-center">
            <a href="#" class="flex items-center text-xl font-bold text-gray-800">
              <img src="https://giftboxopt.ru/assets/logo-B0ADOiza.svg" alt="Logo" class="w-8 h-8 mr-2" />
              <span>SMT Premium Box</span>
            </a>
            
            <!-- Десктопное меню -->
            <div class="hidden md:flex space-x-4">
              <a href="#" class="text-gray-600 hover:text-gray-800">Главная</a>
              <a href="#contacts" class="text-gray-600 hover:text-gray-800">Контакты</a>
            </div>
            
            <!-- Мобильный бургер -->
            <button class="md:hidden text-2xl text-gray-800" id="mobile-menu-toggle">
              <span id="burger-icon">☰</span>
            </button>
          </div>
        </div>
        
        <!-- Мобильное меню -->
        <div id="mobile-menu" class="fixed inset-0 bg-white z-50 hidden md:hidden">
          <div class="flex justify-between items-center p-6 border-b">
            <a href="#" class="flex items-center text-xl font-bold text-gray-800">
              <img src="https://giftboxopt.ru/assets/logo-B0ADOiza.svg" alt="Logo" class="w-8 h-8 mr-2" />
              <span>SMT Premium Box</span>
            </a>
            <button class="text-2xl text-gray-800" id="mobile-menu-close">✕</button>
          </div>
          <div class="flex flex-col p-6 space-y-4">
            <a href="#" class="text-xl text-gray-800 py-2 border-b" id="mobile-home">Главная</a>
            <a href="#contacts" class="text-xl text-gray-800 py-2 border-b" id="mobile-contacts">Контакты</a>
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
            const product = this.productsWithPrices.find(p => p.name === name && p.sizeType === sizeType);
            if (!product) return '';

            return `
              <div class="bg-white rounded-lg shadow-lg overflow-hidden transform transition duration-300 hover:scale-110">
                <div class="relative">
                  <div id="product-slider-${product.id}" class="swiper">
                    <div class="swiper-wrapper">
                    ${product.photo.map(image => `
                      <div class="swiper-slide">
                        <img src="${image}" alt="${category}" class="w-full h-80 object-contain hover:scale-105" loading="lazy" decoding="async" fetchpriority="low" />
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
      ${cartHTML}
      
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
          <div class="border-t border-gray-700 mt-8 pt-6 text-center">
            <div class="mb-4 space-x-4">
              <a href="#privacy-policy" class="text-gray-400 hover:text-white">Политика конфиденциальности</a>
              <a href="#terms-of-use" class="text-gray-400 hover:text-white">Условия пользования</a>
            </div>
            <p class="text-gray-400">&copy; 2025 SMT Premium Box. Все права защищены.</p>
          </div>
        </div>
      </footer>
    `;
    
    // Добавляем обработчики для мобильного меню
    const mobileMenuToggle = container.querySelector('#mobile-menu-toggle');
    const mobileMenu = container.querySelector('#mobile-menu');
    const mobileMenuClose = container.querySelector('#mobile-menu-close');
    const mobileHome = container.querySelector('#mobile-home');
    const mobileContacts = container.querySelector('#mobile-contacts');
    
    const openMobileMenu = () => {
      // Проверяем что это действительно мобильное устройство
      if (window.innerWidth < 768) {
        mobileMenu.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
      }
    };
    
    const closeMobileMenu = () => {
      mobileMenu.classList.add('hidden');
      document.body.style.overflow = '';
    };
    
    if (mobileMenuToggle) {
      HomeComponent.addEventListenerWithCleanup(mobileMenuToggle, 'click', openMobileMenu);
    }
    
    if (mobileMenuClose) {
      HomeComponent.addEventListenerWithCleanup(mobileMenuClose, 'click', closeMobileMenu);
    }
    
    if (mobileHome) {
      HomeComponent.addEventListenerWithCleanup(mobileHome, 'click', () => {
        closeMobileMenu();
        window.location.href = '#';
      });
    }
    
    if (mobileContacts) {
      HomeComponent.addEventListenerWithCleanup(mobileContacts, 'click', () => {
        closeMobileMenu();
        window.location.href = '#contacts';
      });
    }
    
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
              const matchingProduct = HomeComponent.productsWithPrices.find(p =>
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
            const matchingProduct = HomeComponent.productsWithPrices.find(p =>
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
            const matchingProduct = HomeComponent.productsWithPrices.find(p =>
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
