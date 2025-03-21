
import { products, colorMap } from '../data/products.js';
import SwiperService from './swiperService.js';
import { eventBus } from '../utils/eventBus.js';

export const ColorService = {
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
        const matchingProduct = products.find(p =>
          p.name === product.name &&
          p.sizeType === product.sizeType &&
          p.color === color
        );
        
        return `
          <button
            class="color-button w-6 h-6 rounded-full border-2 ${isActive ? 'border-blue-500' : 'border-transparent'}"
            style="background-color: ${hex}"
            data-product-id="${product.id}"
            data-base-name="${product.name}"
            data-base-size="${product.sizeType}"
            data-color="${color}"
          ></button>
        `;
      }).join('');
  },
  
  // Update color button states
  updateButtonColor(productId, color) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const colorButtons = document.querySelectorAll(`.color-button[data-product-id="${productId}"]`);
    colorButtons.forEach(button => {
      const isActive = button.dataset.color === color;
      button.classList.toggle('border-blue-500', isActive);
      button.classList.toggle('border-transparent', !isActive);
    });
  },
  
  // Update hrefs for color buttons
  updateHrefs(productId) {
    let product = products.find(p => p.id === productId);
    if (!product) return;
    
    const colorButtons = document.querySelectorAll(`.color-button[data-product-id="${productId}"]`);
    colorButtons.forEach(button => {
      const matchingProduct = products.find(p =>
        p.name === product.name &&
        p.sizeType === product.sizeType &&
        p.color === button.dataset.color
      );
      
      if (matchingProduct) {
        button.addEventListener('click', () => {
          window.location.href = `#product/${matchingProduct.id}`;
        });
      }
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
    
    // Find the matching product
    const matchingProduct = this.findMatchingProduct(baseName, baseSize, chosenColor);
    
    if (!matchingProduct) return;
    
    // Update slider photos
    SwiperService.updateSliderPhotos(productId, matchingProduct.photo);
    
    // Update button colors
    this.updateButtonColor(productId, chosenColor);
    
    // Update hrefs
    this.updateHrefs(productId);
  }
};
