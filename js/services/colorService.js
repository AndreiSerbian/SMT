
import SwiperService from './swiperService.js';
import { eventBus } from '../utils/eventBus.js';
import { productsService } from './productsService.js';

export const ColorService = {
  // Сохраняем выбранный цвет для каждого продукта
  selectedColors: {},
  
  // Получаем цветовую карту из Supabase
  async getColorMap() {
    try {
      const colors = await productsService.getActiveColors();
      const colorMap = {};
      colors.forEach(color => {
        colorMap[color.russian_name || color.name] = color.hex_code;
      });
      return colorMap;
    } catch (error) {
      console.error('Ошибка загрузки цветов:', error);
      return {};
    }
  },
  
  // Render color buttons for product card
  async renderColorButtons(product) {
    const colorMap = await this.getColorMap();
    const allProducts = await productsService.getActiveProducts();
    
    // Subscribe to color change events
    eventBus.subscribe('color-changed', (data) => {
      if (data.productId === product.id) {
        this.handleColorChange(data);
      }
    });
    
    return Object.entries(colorMap)
      .filter(([color]) =>
        allProducts.some(p =>
          p.category_id === product.category_id &&
          p.color === color
        )
      )
      .map(([color, hex]) => {
        const isActive = color === product.color;
        const isLight = this.isLightColor(hex);
        
        // Устанавливаем начальный выбранный цвет
        if (isActive && !this.selectedColors[product.id]) {
          this.selectedColors[product.id] = color;
        }
        
        return `
          <button
            class="color-button w-9 h-9 rounded-full border-2 ${this.getButtonBorderClass(color, product.id, isLight)}"
            style="background-color: ${hex}"
            data-product-id="${product.id}"
            data-base-name="${product.name}"
            data-base-size="${product.sizeType}"
            data-color="${color}"
            data-category-id="${product.category_id || ''}"
            data-active="${isActive}"
          ></button>
        `;
      }).join('');
  },
  
  // Получает правильный класс окантовки для кнопки цвета
  getButtonBorderClass(color, productId, isLight) {
    const selectedColor = this.selectedColors[productId];
    const isSelected = selectedColor === color;
    
    if (isSelected) {
      return 'border-blue-500'; // Синяя окантовка для активного цвета
    } else {
      return 'border-gray-300'; // Серая окантовка для неактивных цветов
    }
  },
  
  // Проверяет, является ли цвет светлым
  isLightColor(hex) {
    // Удаляем # если есть
    hex = hex.replace('#', '');
    
    // Преобразуем hex в RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Вычисляем яркость цвета
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    // Если яркость больше 155, считаем цвет светлым
    return brightness > 180;
  },
  
  // Update color button states
  async updateButtonColor(productId, color) {
    const allProducts = await productsService.getActiveProducts();
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    // Обновляем выбранный цвет
    this.selectedColors[productId] = color;
    
    const colorButtons = document.querySelectorAll(`.color-button[data-product-id="${productId}"]`);
    if (colorButtons.length === 0) return; // Выходим если кнопки не найдены
    
    colorButtons.forEach(button => {
      const buttonColor = button.dataset.color;
      const isSelected = buttonColor === color;
      
      // Проверяем наличие style.backgroundColor перед проверкой яркости
      let isLight = false;
      if (button.style.backgroundColor) {
        try {
          isLight = this.isLightColor(button.style.backgroundColor);
        } catch (e) {
          console.warn('Ошибка при определении яркости цвета:', e);
        }
      }
      
      // Удаляем все классы окантовки
      button.classList.remove('border-blue-500', 'border-gray-300');
      
      // Добавляем правильный класс окантовки
      if (isSelected) {
        button.classList.add('border-blue-500');
      } else {
        button.classList.add('border-gray-300');
      }
      
      // Обновляем атрибут data-active для отслеживания текущего активного цвета
      button.dataset.active = isSelected ? 'true' : 'false';
    });
  },
  
  // Find matching product by parameters
  async findMatchingProduct(baseName, baseSize, color, categoryId) {
    const allProducts = await productsService.getActiveProducts();
    if (categoryId) {
      return allProducts.find(p =>
        p.category_id === categoryId && p.color === color
      );
    }
    // Legacy fallback
    return allProducts.find(p =>
      p.name === baseName &&
      p.sizeType === baseSize &&
      p.color === color
    );
  },
  
  // Handle color change event
  async handleColorChange(data) {
    const { productId, baseName, baseSize, chosenColor, categoryId } = data;
    
    // Если этот цвет уже выбран (повторный клик), вернем true, что значит "нужен редирект"
    if (this.selectedColors[productId] === chosenColor) {
      return true;
    }
    
    // Find the matching product
    const matchingProduct = await this.findMatchingProduct(baseName, baseSize, chosenColor, categoryId);
    
    if (!matchingProduct) return false;
    
    // Запоминаем текущее положение скролла перед обновлением
    const currentScrollY = window.scrollY;
    
    // Update slider photos
    SwiperService.updateSliderPhotos(productId, matchingProduct.photo);
    
    // Update button colors
    await this.updateButtonColor(productId, chosenColor);
    
    // Восстанавливаем положение скролла после обновления DOM
    requestAnimationFrame(() => {
      window.scrollTo(0, currentScrollY);
    });
    
    // Не нужен редирект при первом клике
    return false;
  }
};
