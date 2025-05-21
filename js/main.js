import Router from './router.js';
import { cartService } from './services/cartService.js';
import { eventBus } from './utils/eventBus.js';
import { supabase } from '@/integrations/supabase/client';
import { Toaster } from "@/components/ui/toaster";
import { ColorService } from './services/colorService.js';
import { products } from './data/products.js'; // Import products directly

// Initialize all global event listeners and app state
export function initApp() {
  // Set up the router
  const router = new Router();
  
  // Add toaster to the DOM
  const toasterContainer = document.createElement('div');
  toasterContainer.id = 'toaster-container';
  document.body.appendChild(toasterContainer);
  
  // Render the Toaster component
  const toaster = document.createElement('div');
  toaster.innerHTML = '<div id="toaster"></div>';
  document.body.appendChild(toaster);
  
  // Initialize global event listeners
  document.addEventListener('click', (e) => {
    // Проверяем, кликнули ли по элементу .color-button
    if (e.target.matches('.color-button')) {
      e.preventDefault();
      
      // Получаем атрибуты
      const productId = e.target.dataset.productId; 
      const baseName = e.target.dataset.baseName; 
      const baseSize = e.target.dataset.baseSize;
      const chosenColor = e.target.dataset.color;
      const isActive = e.target.dataset.active === 'true';
      
      // Если кнопка уже активна (второй клик), переходим на страницу товара
      if (isActive || ColorService.selectedColors[productId] === chosenColor) {
        // Найти соответствующий продукт и перейти на его страницу
        window.location.href = `#product/${productId}`;
        return;
      }
      
      // Иначе просто вызываем событие смены цвета (обновление слайдера)
      const needsRedirect = eventBus.emit('color-changed', {
        productId,
        baseName,
        baseSize,
        chosenColor
      });
      
      // Если функция обработки события вернула true, выполняем редирект
      if (needsRedirect) {
        window.location.href = `#product/${productId}`;
      }
    }
    
    // Проверяем клик по миниатюрам в карточке товара
    if (e.target.matches('.product-thumbnail')) {
      e.preventDefault();
      const mainImage = document.getElementById('main-product-image');
      if (mainImage) {
        mainImage.src = e.target.src;
      }
    }
    
    // Проверяем клик по основному изображению для открытия лайтбокса
    if (e.target.matches('#main-product-image')) {
      e.preventDefault();
      openLightbox(e.target.src);
    }
  });
  
  // Listen for cart updates
  eventBus.subscribe('cart-updated', () => {
    cartService.updateCartUI();
  });
  
  // Register cart toggle functionality
  window.toggleCart = () => {
    const modal = document.getElementById('cartModal');
    modal.classList.toggle('hidden');
    
    const isOpen = !modal.classList.contains('hidden');
    
    // Блокируем прокрутку страницы при открытой корзине
    document.body.style.overflow = isOpen ? 'hidden' : '';
    
    const transformEl = modal.querySelector('.transform');
    if (isOpen) {
      transformEl.classList.add('translate-x-0');
      transformEl.classList.remove('translate-x-full');
    } else {
      transformEl.classList.remove('translate-x-0');
      transformEl.classList.add('translate-x-full');
    }
  };
  
  // Register add to cart functionality
  window.addToCart = (productId, quantity) => {
    cartService.addToCart(productId, quantity);
  };
  
  // Register remove from cart functionality
  window.removeFromCart = (productId) => {
    cartService.removeFromCart(productId);
  };
  
  // Register update cart quantity functionality
  window.updateCartQuantity = (productId, newQuantity) => {
    const cart = cartService.getCart();
    const item = cart.find(item => item.id === productId);
    
    if (item) {
      item.quantity = Math.max(1, newQuantity);
      cartService.saveCart(cart);
    }
  };
  
  // Register go to order page functionality
  window.goToOrderPage = () => {
    window.toggleCart();
    window.location.hash = '#order';
  };
  
  // Функция для открытия лайтбокса
  window.openLightbox = (initialImage = null) => {
    // Создаем лайтбокс, если его еще нет
    let lightbox = document.getElementById('product-lightbox');
    
    if (!lightbox) {
      lightbox = document.createElement('div');
      lightbox.id = 'product-lightbox';
      lightbox.className = 'fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center';
      
      const content = document.createElement('div');
      content.className = 'relative max-w-4xl w-full';
      
      // Добавляем кнопку закрытия
      const closeButton = document.createElement('button');
      closeButton.className = 'absolute top-2 right-2 text-white text-3xl z-20';
      closeButton.innerHTML = '&times;';
      closeButton.onclick = closeLightbox;
      
      // Добавляем контейнер для изображения
      const imageContainer = document.createElement('div');
      imageContainer.className = 'relative';
      
      const image = document.createElement('img');
      image.id = 'lightbox-image';
      image.className = 'w-full max-h-[80vh] object-contain';
      
      // Добавляем навигационные кнопки
      const prevButton = document.createElement('button');
      prevButton.className = 'absolute left-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-50 rounded-full p-2 z-10';
      prevButton.innerHTML = '&lt;';
      prevButton.onclick = showPrevImage;
      
      const nextButton = document.createElement('button');
      nextButton.className = 'absolute right-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-50 rounded-full p-2 z-10';
      nextButton.innerHTML = '&gt;';
      nextButton.onclick = showNextImage;
      
      // Добавляем миниатюры
      const thumbnails = document.createElement('div');
      thumbnails.id = 'lightbox-thumbnails';
      thumbnails.className = 'flex justify-center gap-2 mt-4';
      
      // Собираем все вместе
      imageContainer.appendChild(image);
      imageContainer.appendChild(prevButton);
      imageContainer.appendChild(nextButton);
      
      content.appendChild(closeButton);
      content.appendChild(imageContainer);
      content.appendChild(thumbnails);
      
      lightbox.appendChild(content);
      document.body.appendChild(lightbox);
      
      // Останавливаем прокрутку страницы
      document.body.style.overflow = 'hidden';
    }
    
    if (initialImage) {
      // Находим все изображения в продукте
      const productId = window.location.hash.split('/')[1];
      
      // Fix: Make sure products is accessible - use imported products variable
      if (productId && products) {
        const product = products.find(p => p.id === productId);
        
        if (product && product.photo) {
          window.lightboxImages = product.photo;
          window.currentLightboxIndex = product.photo.indexOf(initialImage);
          if (window.currentLightboxIndex < 0) window.currentLightboxIndex = 0;
          
          updateLightboxImage();
          updateLightboxThumbnails();
        } else {
          // Если не нашли продукт, просто показываем одно изображение
          console.log('Product not found, showing single image:', initialImage);
          document.getElementById('lightbox-image').src = initialImage;
          document.getElementById('lightbox-thumbnails').innerHTML = '';
          
          // Use the initial image as a fallback
          window.lightboxImages = [initialImage];
          window.currentLightboxIndex = 0;
        }
      } else {
        console.log('No product ID found or products not defined, showing single image');
        document.getElementById('lightbox-image').src = initialImage;
        document.getElementById('lightbox-thumbnails').innerHTML = '';
        
        // Use the initial image as a fallback
        window.lightboxImages = [initialImage];
        window.currentLightboxIndex = 0;
      }
    }
    
    lightbox.style.display = 'flex';
  };
  
  // Функция для обновления главного изображения в лайтбоксе
  window.updateLightboxImage = () => {
    const image = document.getElementById('lightbox-image');
    if (image && window.lightboxImages && window.lightboxImages.length > 0) {
      image.src = window.lightboxImages[window.currentLightboxIndex];
    }
  };
  
  // Функция для обновления миниатюр в лайтбоксе
  window.updateLightboxThumbnails = () => {
    const thumbnails = document.getElementById('lightbox-thumbnails');
    if (thumbnails && window.lightboxImages) {
      thumbnails.innerHTML = window.lightboxImages.map((src, index) => `
        <img 
          src="${src}" 
          class="w-16 h-16 object-cover cursor-pointer ${index === window.currentLightboxIndex ? 'border-2 border-blue-500' : ''}" 
          onclick="window.currentLightboxIndex = ${index}; window.updateLightboxImage(); window.updateLightboxThumbnails();"
        />
      `).join('');
    }
  };
  
  // Функция для показа предыдущего изображения
  window.showPrevImage = () => {
    if (window.lightboxImages && window.lightboxImages.length > 0) {
      window.currentLightboxIndex = (window.currentLightboxIndex - 1 + window.lightboxImages.length) % window.lightboxImages.length;
      window.updateLightboxImage();
      window.updateLightboxThumbnails();
    }
  };
  
  // Функция для показа следующего изображения
  window.showNextImage = () => {
    if (window.lightboxImages && window.lightboxImages.length > 0) {
      window.currentLightboxIndex = (window.currentLightboxIndex + 1) % window.lightboxImages.length;
      window.updateLightboxImage();
      window.updateLightboxThumbnails();
    }
  };
  
  // Функция для закрытия лайтбокса
  window.closeLightbox = () => {
    const lightbox = document.getElementById('product-lightbox');
    if (lightbox) {
      lightbox.style.display = 'none';
      // Возвращаем прокрутку страницы
      document.body.style.overflow = '';
    }
  };
}

// Make these functions available in the window object to avoid ReferenceError
window.updateLightboxImage = () => {
  const image = document.getElementById('lightbox-image');
  if (image && window.lightboxImages && window.lightboxImages.length > 0) {
    image.src = window.lightboxImages[window.currentLightboxIndex];
  }
};

window.updateLightboxThumbnails = () => {
  const thumbnails = document.getElementById('lightbox-thumbnails');
  if (thumbnails && window.lightboxImages) {
    thumbnails.innerHTML = window.lightboxImages.map((src, index) => `
      <img 
        src="${src}" 
        class="w-16 h-16 object-cover cursor-pointer ${index === window.currentLightboxIndex ? 'border-2 border-blue-500' : ''}" 
        onclick="window.currentLightboxIndex = ${index}; window.updateLightboxImage(); window.updateLightboxThumbnails();"
      />
    `).join('');
  }
};

window.showPrevImage = () => {
  if (window.lightboxImages && window.lightboxImages.length > 0) {
    window.currentLightboxIndex = (window.currentLightboxIndex - 1 + window.lightboxImages.length) % window.lightboxImages.length;
    window.updateLightboxImage();
    window.updateLightboxThumbnails();
  }
};

window.showNextImage = () => {
  if (window.lightboxImages && window.lightboxImages.length > 0) {
    window.currentLightboxIndex = (window.currentLightboxIndex + 1) % window.lightboxImages.length;
    window.updateLightboxImage();
    window.updateLightboxThumbnails();
  }
};

window.closeLightbox = () => {
  const lightbox = document.getElementById('product-lightbox');
  if (lightbox) {
    lightbox.style.display = 'none';
    // Возвращаем прокрутку страницы
    document.body.style.overflow = '';
  }
};
