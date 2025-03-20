
import { products, colorMap } from '../data/products.js';
import SwiperService from './swiperService.js';
import { eventBus } from '../utils/eventBus.js';

export const ColorService = {
  // Render color buttons for product card
  renderColorButtons(product) {
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
        const matchingProduct = products.find(p =>
          p.name === product.name &&
          p.sizeType === product.sizeType &&
          p.color === color
        );
        
        if (!matchingProduct) return '';
        
        return `
          <button
            class="color-button w-6 h-6 rounded-full border-2 ${isActive ? 'border-blue-500' : 'border-transparent'}"
            style="background-color: ${hex}"
            data-product-id="${product.id}"
            data-base-name="${product.name}"
            data-base-size="${product.sizeType}"
            data-color="${color}"
            onclick="ColorService.handleColorButtonClick(event, '${product.id}', '${product.name}', '${product.sizeType}', '${color}')"
          ></button>
        `;
      }).join('');
  },
  
  // Update color button states
  updateButtonColor(productId, color) {
    const colorButtons = document.querySelectorAll(`.color-button[data-product-id="${productId}"]`);
    colorButtons.forEach(button => {
      const isActive = button.dataset.color === color;
      button.classList.toggle('border-blue-500', isActive);
      button.classList.toggle('border-transparent', !isActive);
    });
  },
  
  // Handle color button click
  handleColorButtonClick(event, productId, baseName, baseSize, chosenColor) {
    event.preventDefault();
    
    // Find the matching product
    const matchingProduct = products.find(p =>
      p.name === baseName &&
      p.sizeType === baseSize &&
      p.color === chosenColor
    );
    
    if (!matchingProduct) return;
    
    // Update button colors
    this.updateButtonColor(productId, chosenColor);
    
    // Update slider photos
    setTimeout(() => {
      try {
        SwiperService.updateSliderPhotos(productId, matchingProduct.photo);
      } catch (error) {
        console.error('Ошибка при обновлении фото слайдера:', error);
      }
    }, 50);
  },
  
  // Expose to window for onclick handlers
  init() {
    window.ColorService = this;
  }
};

// Initialize ColorService globally
ColorService.init();
