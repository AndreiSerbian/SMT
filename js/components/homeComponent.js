
import { products } from '../data/products.js';
import { cartService } from '../services/cartService.js';
import SwiperService from '../services/swiperService.js';
import { ColorService } from '../services/colorService.js';

const HomeComponent = {
  swipersById: {},
  selectedColors: {}, // Состояние выбранных цветов для каждого продукта
  
  // Получение уникальных категорий
  getCategories() {
    const categories = new Set();
    products.forEach(product => {
      categories.add(`${product.name} (${product.sizeType})`);
    });
    return Array.from(categories);
  },
  
  // Инициализация обработчиков событий
  initEventListeners() {
    // Делегирование событий для кнопок цвета
    document.addEventListener('click', (e) => {
      if (e.target.matches('.color-button')) {
        this.handleColorButtonClick(e);
      }
      
      if (e.target.matches('.view-all-btn')) {
        this.handleViewAllClick(e);
      }
    });
  },
  
  // Обработка клика по кнопке цвета
  handleColorButtonClick(e) {
    e.preventDefault();
    
    const button = e.target;
    const productId = button.dataset.productId;
    const baseName = button.dataset.baseName;
    const baseSize = button.dataset.baseSize;
    const chosenColor = button.dataset.color;
    
    // Проверяем, был ли уже выбран этот цвет
    const currentSelectedColor = this.selectedColors[productId];
    const isSecondClick = currentSelectedColor === chosenColor;
    
    if (isSecondClick) {
      // Второй клик - переходим на страницу товара
      const matchingProduct = this.findMatchingProduct(baseName, baseSize, chosenColor);
      if (matchingProduct) {
        window.location.href = `#product/${matchingProduct.id}`;
      }
      return;
    }
    
    // Первый клик - обновляем слайдер и состояние
    this.selectedColors[productId] = chosenColor;
    
    // Находим соответствующий продукт
    const matchingProduct = this.findMatchingProduct(baseName, baseSize, chosenColor);
    if (matchingProduct) {
      // Обновляем слайдер
      this.updateSliderForProduct(productId, matchingProduct.photo);
      
      // Обновляем визуальное состояние кнопок
      this.updateColorButtonsVisual(productId, chosenColor);
    }
  },
  
  // Обработка клика по кнопке "Посмотреть все"
  handleViewAllClick(e) {
    e.preventDefault();
    
    const productId = e.target.dataset.productId;
    const selectedColor = this.selectedColors[productId];
    
    if (selectedColor) {
      // Если есть выбранный цвет, ищем соответствующий продукт
      const button = document.querySelector(`.color-button[data-product-id="${productId}"][data-color="${selectedColor}"]`);
      if (button) {
        const baseName = button.dataset.baseName;
        const baseSize = button.dataset.baseSize;
        const matchingProduct = this.findMatchingProduct(baseName, baseSize, selectedColor);
        if (matchingProduct) {
          window.location.href = `#product/${matchingProduct.id}`;
          return;
        }
      }
    }
    
    // Если нет выбранного цвета, переходим к базовому продукту
    window.location.href = `#product/${productId}`;
  },
  
  // Поиск соответствующего продукта
  findMatchingProduct(baseName, baseSize, color) {
    return products.find(p =>
      p.name === baseName &&
      p.sizeType === baseSize &&
      p.color === color
    );
  },
  
  // Обновление слайдера для продукта
  updateSliderForProduct(productId, newPhotos) {
    SwiperService.updateSliderPhotos(productId, newPhotos);
  },
  
  // Обновление визуального состояния кнопок цвета
  updateColorButtonsVisual(productId, selectedColor) {
    const colorButtons = document.querySelectorAll(`.color-button[data-product-id="${productId}"]`);
    colorButtons.forEach(button => {
      const buttonColor = button.dataset.color;
      if (buttonColor === selectedColor) {
        button.classList.remove('border-gray-300');
        button.classList.add('border-blue-500');
        button.dataset.active = 'true';
      } else {
        button.classList.remove('border-blue-500');
        button.classList.add('border-gray-300');
        button.dataset.active = 'false';
      }
    });
  },
  
  // Рендер кнопок цвета
  renderColorButtons(product) {
    const colorMap = {
      'Розовая': '#FFB6C1',
      'Тиффани': '#0ABAB5',
      'Черная': '#000000',
      'Белая': '#FFFFFF',
      'Красная': '#DC143C',
      'Оранжевая': '#FF8C00',
      'Синий бархат': '#191970',
      'Белый бриллиант': '#F8F8FF',
      'Розовая пудра': '#F0E68C',
      'Черный муар': '#2F2F2F',
      'Золотая': '#FFD700',
      'Ванильная': '#F3E5AB',
      'Голубой лед': '#B0E0E6',
      'Лавандовая': '#E6E6FA'
    };

    return Object.entries(colorMap)
      .filter(([color]) =>
        products.some(p =>
          p.name === product.name &&
          p.sizeType === product.sizeType &&
          p.color === color
        )
      )
      .map(([color, hex]) => {
        const isActive = color === product.color;
        const isLight = this.isLightColor(hex);
        
        return `
          <button
            class="color-button w-9 h-9 rounded-full border-2 ${isActive ? 'border-blue-500' : 'border-gray-300'}"
            style="background-color: ${hex}"
            data-product-id="${product.id}"
            data-base-name="${product.name}"
            data-base-size="${product.sizeType}"
            data-color="${color}"
            data-active="${isActive}"
          ></button>
        `;
      }).join('');
  },
  
  // Проверка, является ли цвет светлым
  isLightColor(hex) {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 180;
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
              <div class="bg-white rounded-lg shadow-lg overflow-hidden transform transition duration-300 hover:scale-105">
                <div class="relative">
                  <div id="product-slider-${product.id}" class="swiper">
                    <div class="swiper-wrapper">
                    ${product.photo.map(image => `
                      <div class="swiper-slide">
                        <img src="${image}" alt="${category}" class="w-full h-80 object-contain" />
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
                    <h3 class="font-semibold text-gray-800 mb-2">Цвета в наличии:</h3>
                    <div class="flex flex-wrap gap-2 mb-4">
                      ${this.renderColorButtons(product)}
                    </div>

                    <button
                      data-product-id="${product.id}"
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
    
    // Инициализируем слайдеры
    setTimeout(() => {
      SwiperService.initSwipers();
      this.initEventListeners();
    }, 100);
  }
};

export default HomeComponent;
