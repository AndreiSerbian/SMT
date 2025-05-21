
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
        const isLight = this.isLightColor(hex); // Определяем светлый ли цвет
        
        return `
          <button
            class="color-button w-6 h-6 rounded-full ${isLight ? 'border-2 border-gray-300' : 'border-2 border-transparent'} ${isActive ? 'border-blue-500' : ''}"
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
    
    const colorButtons = document.querySelectorAll(`.color-button[data-product-id="${productId}"]`);
    colorButtons.forEach(button => {
      const isActive = button.dataset.color === color;
      button.classList.toggle('border-blue-500', isActive);
      button.classList.toggle('border-transparent', !isActive && !this.isLightColor(button.style.backgroundColor));
      
      // Обновляем атрибут data-active для отслеживания текущего активного цвета
      button.dataset.active = isActive ? 'true' : 'false';
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
    
    // Сохраняем выбранный цвет
    this.selectedColors[productId] = chosenColor;
    
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
