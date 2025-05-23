
import { products, colorMap } from '../data/products.js';
import SwiperService from './swiperService.js';
import { eventBus } from '../utils/eventBus.js';

export const ColorService = {
  // Сохраняем выбранный цвет для каждого продукта
  selectedColors: {},
  
  // Render color buttons for product card
  renderColorButtons(product) {
    // Subscribe to color change events
    eventBus.subscribe('color-changed', (data) => {
      if (data.productId === product.id) {
        this.handleColorChange(data);
      }
    });
    
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
        
        // Устанавливаем начальный выбранный цвет
        if (isActive && !this.selectedColors[product.id]) {
          this.selectedColors[product.id] = color;
        }
        
        return `
          <button
            class="color-button w-10 h-10 rounded-full border-2 ${this.getButtonBorderClass(color, product.id, isLight)}"
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
  updateButtonColor(productId, color) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    // Обновляем выбранный цвет
    this.selectedColors[productId] = color;
    
    const colorButtons = document.querySelectorAll(`.color-button[data-product-id="${productId}"]`);
    colorButtons.forEach(button => {
      const buttonColor = button.dataset.color;
      const isSelected = buttonColor === color;
      const isLight = this.isLightColor(button.style.backgroundColor);
      
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
  findMatchingProduct(baseName, baseSize, color) {
    return products.find(p =>
      p.name === baseName &&
      p.sizeType === baseSize &&
      p.color === color
    );
  },
  
  // Handle color change event
  handleColorChange(data) {
    const { productId, baseName, baseSize, chosenColor } = data;
    
    // Если этот цвет уже выбран (повторный клик), вернем true, что значит "нужен редирект"
    if (this.selectedColors[productId] === chosenColor) {
      return true;
    }
    
    // Find the matching product
    const matchingProduct = this.findMatchingProduct(baseName, baseSize, chosenColor);
    
    if (!matchingProduct) return false;
    
    // Update slider photos
    SwiperService.updateSliderPhotos(productId, matchingProduct.photo);
    
    // Update button colors
    this.updateButtonColor(productId, chosenColor);
    
    // Не нужен редирект при первом клике
    return false;
  }
};
