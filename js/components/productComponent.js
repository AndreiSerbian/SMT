import { cartService } from '../services/cartService.js';
import { ColorService } from '../services/colorService.js';
import { productsService } from '../services/productsService.js';
import { colorMap } from '../data/products.js';

const ProductComponent = {
  eventListeners: [],
  timeouts: [],
  productsWithPrices: [],
  
  showLoader(container) {
    const loader = document.createElement('div');
    loader.id = 'svg-loader';
    loader.className = 'fixed inset-0 bg-white z-50 flex justify-center items-center';
    loader.innerHTML = `
      <div class="w-60 h-60">
        <svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" width="100%" height="100%" x="0" y="0" viewBox="0 0 60 60" style="enable-background:new 0 0 512 512" xml:space="preserve" class="svg-icon active">
          <g><path fill="#000000" fill-rule="nonzero" d="m57.978 9.457-27-9.31a3.01 3.01 0 0 0-1.957 0l-27 9.31A3 3 0 0 0 0 12.293v35.414a3 3 0 0 0 2.022 2.836l27 9.31a3 3 0 0 0 1.957 0l27-9.31A3 3 0 0 0 60 47.707V12.293a3 3 0 0 0-2.022-2.836zM30.33 19.808a.961.961 0 0 1-.695-.014l-5.427-1.866L50 8.821l6.127 2.113zM10 15.156 20 18.6v12.7l-4.241-4.948a1 1 0 0 0-1.206-.244L10 28.382zm2.437-1.277L38.624 4.9l8.335 2.874-25.794 9.107zM29.675 2.038a.991.991 0 0 1 .651 0l5.224 1.8L9.359 12.82l-5.484-1.886zM2 47.707V12.4l6 2.064V30a1 1 0 0 0 1.447.895l5.3-2.651 5.492 6.407A1 1 0 0 0 22 34V19.283l6.95 2.39c.016.006.034.008.05.014V57.73L2.674 48.652A1 1 0 0 1 2 47.707zm55.326.945L31 57.73V21.69h.015L58 12.4v35.3a1 1 0 0 1-.674.952z" opacity="1" data-original="#000000"></path></g>
        </svg>
        
        <svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" width="100%" height="100%" x="0" y="0" viewBox="0 0 511.992 511.992" style="enable-background:new 0 0 512 512; display: none;" xml:space="preserve" class="svg-icon">
          <g><path d="m462.789 150.002 46.688-74.7c3.478-5.567.733-12.928-5.54-14.857l-195-60a9.999 9.999 0 0 0-11.682 4.701l-41.259 74.266-41.259-74.267A9.997 9.997 0 0 0 203.055.444l-195 60c-6.274 1.93-9.018 9.292-5.539 14.857l46.687 74.7-46.687 74.7c-3.479 5.566-.734 12.928 5.539 14.857l32.941 10.136v192.307a10 10 0 0 0 7.19 9.597l204.815 59.946c1.81.573 3.989.619 5.988 0l204.815-59.946a9.998 9.998 0 0 0 7.191-9.597V249.694l32.94-10.136c6.273-1.93 9.018-9.291 5.54-14.857zm-206.793-39.677 154.739 39.677-154.739 39.676-154.739-39.676zm54.806-88.382 174.819 53.791-39.228 62.765-175.364-44.966zm-109.612 0 39.773 71.59-175.365 44.965-39.227-62.764zM65.598 161.505l175.364 44.965-39.773 71.59c-12.76-3.927-166.584-51.256-174.819-53.791zm137.457 138.054a10 10 0 0 0 11.682-4.701l31.259-56.266v180.064l-185-54.147v-108.66zM60.996 385.348l185 54.146v49.162l-185-54.147zm205 103.307v-49.162l185-54.146v49.161zm185-124.146-185 54.146V238.592l31.259 56.266a9.998 9.998 0 0 0 11.682 4.701l142.06-43.711v108.661zM310.802 278.06l-39.773-71.59 175.364-44.965 39.228 62.765-174.819 53.79z" fill="#000000" opacity="1" data-original="#000000" class=""></path></g>
        </svg>
        
        <svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" width="100%" height="100%" x="0" y="0" viewBox="0 0 511.992 511.992" style="enable-background:new 0 0 512 512; display: none;" xml:space="preserve" class="svg-icon">
          <g><path d="m509.476 254.7-49.944-79.91c-1.297-2.143-3.55-3.879-6.164-4.505l-142.372-36.506V60c0-5.514 4.486-10 10-10s10 4.486 10 10c0 5.522 4.477 10 10 10s10-4.478 10-10c0-16.542-13.458-30-30-30s-30 13.458-30 30v68.65l-25-6.41V80c0-5.522-4.477-10-10-10s-10 4.478-10 10v42.24l-25 6.41V30c0-16.542-13.458-30-30-30s-30 13.458-30 30c0 5.522 4.477 10 10 10s10-4.478 10-10c0-5.514 4.486-10 10-10s10 4.486 10 10v103.779L58.611 170.288a10.088 10.088 0 0 0-6.152 4.503L2.516 254.7c-3.478 5.565-.734 12.928 5.539 14.857l32.941 10.136V442c0 4.441 2.929 8.35 7.191 9.598 194.578 56.949 204.756 59.92 204.862 59.96.146.022 2.606.974 5.934-.012l204.822-59.948a10 10 0 0 0 7.191-9.598V279.693l32.941-10.136c6.273-1.929 9.017-9.291 5.539-14.857zM210.996 180c5.523 0 10-4.477 10-10v-20.702l25-6.41V190c0 5.523 4.477 10 10 10s10-4.477 10-10v-47.112l25 6.41V170c0 5.523 4.477 10 10 10s10-4.477 10-10v-15.574L410.735 180l-154.739 39.677L101.257 180l99.739-25.574V170c0 5.523 4.477 10 10 10zM65.598 191.504l175.364 44.965-39.773 71.59-174.819-53.79zm137.457 138.054a10 10 0 0 0 11.683-4.701l31.258-56.265v150.061l-185-54.146v-78.659zM60.996 385.347l185 54.146v49.16l-185-54.145zm205 103.306v-49.16l185-54.146v49.161zm185-124.146-185 54.146V268.592l31.258 56.265a10 10 0 0 0 11.683 4.701l142.059-43.71zm-140.195-56.448-39.772-71.59 175.364-44.965 39.228 62.765c-9.247 2.844-163.355 50.262-174.82 53.79z" fill="#000000" opacity="1" data-original="#000000" class=""></path><path d="M255.996 50c5.523 0 10-4.478 10-10V30c0-5.522-4.477-10-10-10s-10 4.478-10 10v10c0 5.522 4.477 10 10 10z" fill="#000000" opacity="1" data-original="#000000" class=""></path></g>
        </svg>
        
        <style>
          .svg-icon { display: none; }
          .svg-icon.active { display: block; }
        </style>
      </div>
    `;
    
    document.body.appendChild(loader);
    
    // Анимация переключения SVG
    const svgs = loader.querySelectorAll('.svg-icon');
    let index = 0;
    
    const animationInterval = setInterval(() => {
      svgs.forEach((svg, i) => svg.classList.toggle('active', i === index));
      index = (index + 1) % svgs.length;
    }, 600);
    
    // Сохраняем интервал для очистки
    loader.animationInterval = animationInterval;
  },
  
  hideLoader(container) {
    const loader = document.getElementById('svg-loader');
    if (loader) {
      clearInterval(loader.animationInterval);
      loader.remove();
    }
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
    
    // Очищаем глобальные функции
    if (window.openImageModal) delete window.openImageModal;
    if (window.closeImageModal) delete window.closeImageModal;
    if (window.quantityInput) delete window.quantityInput;
  },
  
  addEventListenerWithCleanup(element, event, handler) {
    if (element && element.addEventListener) {
      element.addEventListener(event, handler);
      this.eventListeners.push({ element, event, handler });
    }
  },

  async loadProductsWithPrices() {
    try {
      this.productsWithPrices = await productsService.getActiveProducts();
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error);
      this.productsWithPrices = [];
    }
  },

  showFullScreenLoader() {
    const loader = document.createElement('div');
    loader.id = 'loading-screen';
    loader.className = 'fixed inset-0 z-[60] bg-white flex justify-center items-center h-screen w-screen';
    loader.innerHTML = `
      <div class="loader-container" style="width: 60px; height: 60px; position: relative;">
        <svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" width="60" height="60" x="0" y="0" viewBox="0 0 60 60" style="enable-background:new 0 0 512 512; position: absolute; top: 0; left: 0; opacity: 0; transition: opacity 0.3s ease;" xml:space="preserve" class="svg-loader">
          <g><path fill="#000000" fill-rule="nonzero" d="m57.978 9.457-27-9.31a3.01 3.01 0 0 0-1.957 0l-27 9.31A3 3 0 0 0 0 12.293v35.414a3 3 0 0 0 2.022 2.836l27 9.31a3 3 0 0 0 1.957 0l27-9.31A3 3 0 0 0 60 47.707V12.293a3 3 0 0 0-2.022-2.836zM30.33 19.808a.961.961 0 0 1-.695-.014l-5.427-1.866L50 8.821l6.127 2.113zM10 15.156 20 18.6v12.7l-4.241-4.948a1 1 0 0 0-1.206-.244L10 28.382zm2.437-1.277L38.624 4.9l8.335 2.874-25.794 9.107zM29.675 2.038a.991.991 0 0 1 .651 0l5.224 1.8L9.359 12.82l-5.484-1.886zM2 47.707V12.4l6 2.064V30a1 1 0 0 0 1.447.895l5.3-2.651 5.492 6.407A1 1 0 0 0 22 34V19.283l6.95 2.39c.016.006.034.008.05.014V57.73L2.674 48.652A1 1 0 0 1 2 47.707zm55.326.945L31 57.73V21.69h.015L58 12.4v35.3a1 1 0 0 1-.674.952z" opacity="1" data-original="#000000"></path></g>
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" width="60" height="60" x="0" y="0" viewBox="0 0 511.992 511.992" style="enable-background:new 0 0 512 512; position: absolute; top: 0; left: 0; opacity: 0; transition: opacity 0.3s ease;" xml:space="preserve" class="svg-loader">
          <g><path d="m462.789 150.002 46.688-74.7c3.478-5.567.733-12.928-5.54-14.857l-195-60a9.999 9.999 0 0 0-11.682 4.701l-41.259 74.266-41.259-74.267A9.997 9.997 0 0 0 203.055.444l-195 60c-6.274 1.93-9.018 9.292-5.539 14.857l46.687 74.7-46.687 74.7c-3.479 5.566-.734 12.928 5.539 14.857l32.941 10.136v192.307a10 10 0 0 0 7.19 9.597l204.815 59.946c1.81.573 3.989.619 5.988 0l204.815-59.946a9.998 9.998 0 0 0 7.191-9.597V249.694l32.94-10.136c6.273-1.93 9.018-9.291 5.54-14.857zm-206.793-39.677 154.739 39.677-154.739 39.676-154.739-39.676zm54.806-88.382 174.819 53.791-39.228 62.765-175.364-44.966zm-109.612 0 39.773 71.59-175.365 44.965-39.227-62.764zM65.598 161.505l175.364 44.965-39.773 71.59c-12.76-3.927-166.584-51.256-174.819-53.791zm137.457 138.054a10 10 0 0 0 11.682-4.701l31.259-56.266v180.064l-185-54.147v-108.66zM60.996 385.348l185 54.146v49.162l-185-54.147zm205 103.307v-49.162l185-54.146v49.161zm185-124.146-185 54.146V238.592l31.259 56.266a9.998 9.998 0 0 0 11.682 4.701l142.06-43.711v108.661zM310.802 278.06l-39.773-71.59 175.364-44.965 39.228 62.765-174.819 53.79z" fill="#000000" opacity="1" data-original="#000000" class=""></path></g>
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" width="60" height="60" x="0" y="0" viewBox="0 0 511.992 511.992" style="enable-background:new 0 0 512 512; position: absolute; top: 0; left: 0; opacity: 0; transition: opacity 0.3s ease;" xml:space="preserve" class="svg-loader">
          <g><path d="m509.476 254.7-49.944-79.91c-1.297-2.143-3.55-3.879-6.164-4.505l-142.372-36.506V60c0-5.514 4.486-10 10-10s10 4.486 10 10c0 5.522 4.477 10 10 10s10-4.478 10-10c0-16.542-13.458-30-30-30s-30 13.458-30 30v68.65l-25-6.41V80c0-5.522-4.477-10-10-10s-10 4.478-10 10v42.24l-25 6.41V30c0-16.542-13.458-30-30-30s-30 13.458-30 30c0 5.522 4.477 10 10 10s10-4.478 10-10c0-5.514 4.486-10 10-10s10 4.486 10 10v103.779L58.611 170.288a10.088 10.088 0 0 0-6.152 4.503L2.516 254.7c-3.478 5.565-.734 12.928 5.539 14.857l32.941 10.136V442c0 4.441 2.929 8.35 7.191 9.598 194.578 56.949 204.756 59.92 204.862 59.96.146.022 2.606.974 5.934-.012l204.822-59.948a10 10 0 0 0 7.191-9.598V279.693l32.941-10.136c6.273-1.929 9.017-9.291 5.539-14.857zM210.996 180c5.523 0 10-4.477 10-10v-20.702l25-6.41V190c0 5.523 4.477 10 10 10s10-4.477 10-10v-47.112l25 6.41V170c0 5.523 4.477 10 10 10s10-4.477 10-10v-15.574L410.735 180l-154.739 39.677L101.257 180l99.739-25.574V170c0 5.523 4.477 10 10 10zM65.598 191.504l175.364 44.965-39.773 71.59-174.819-53.79zm137.457 138.054a10 10 0 0 0 11.683-4.701l31.258-56.265v150.061l-185-54.146v-78.659zM60.996 385.347l185 54.146v49.16l-185-54.145zm205 103.306v-49.16l185-54.146v49.161zm185-124.146-185 54.146V268.592l31.258 56.265a10 10 0 0 0 11.683 4.701l142.059-43.71zm-140.195-56.448-39.772-71.59 175.364-44.965 39.228 62.765c-9.247 2.844-163.355 50.262-174.82 53.79z" fill="#000000" opacity="1" data-original="#000000" class=""></path><path d="M255.996 50c5.523 0 10-4.478 10-10V30c0-5.522-4.477-10-10-10s-10 4.478-10 10v10c0 5.522 4.477 10 10 10z" fill="#000000" opacity="1" data-original="#000000" class=""></path></g>
        </svg>
      </div>
    `;
    
    document.body.appendChild(loader);
    
    // Поэтапное появление SVG
    const svgs = loader.querySelectorAll('.svg-loader');
    let currentIndex = 0;
    
    // Показываем первый SVG
    svgs[0].style.opacity = '1';
    
    const showNextSvg = () => {
      // Скрываем текущий
      svgs[currentIndex].style.opacity = '0';
      
      // Переходим к следующему
      currentIndex = (currentIndex + 1) % svgs.length;
      
      // Показываем следующий через небольшую задержку
      setTimeout(() => {
        svgs[currentIndex].style.opacity = '1';
      }, 100);
    };
    
    // Запускаем анимацию с уменьшенным интервалом
    const loaderInterval = setInterval(showNextSvg, 400);
    
    // Сохраняем интервал для очистки
    loader.loaderInterval = loaderInterval;
  },

  hideFullScreenLoader() {
    const loader = document.getElementById('loading-screen');
    if (loader) {
      if (loader.loaderInterval) {
        clearInterval(loader.loaderInterval);
      }
      loader.remove();
    }
  },

  async render(productId, container) {
    if (!container) {
      console.error('Container not provided to ProductComponent');
      return;
    }
    
    // Показываем SVG-загрузчик на весь экран
    this.showFullScreenLoader();
    
    // Загружаем актуальные цены
    await this.loadProductsWithPrices();
    
    const product = this.productsWithPrices.find(p => p.id === productId);
    if (!product) {
      // Если продукт не найден, перенаправляем на главную
      this.hideFullScreenLoader();
      window.location.href = '#';
      return;
    }

    // Устанавливаем текущий продукт как выбранный цвет
    ColorService.selectedColors[productId] = product.color;

    // Скрываем загрузчик
    this.hideFullScreenLoader();
    
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
         <button 
          class="back-button mb-8 text-gray-600 hover:text-gray-800 flex items-center"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
          Вернуться к категориям
        </button>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div class="space-y-4">
            <div class="bg-white rounded-lg shadow-lg overflow-hidden">
              <img id="main-product-image" src="${product.photo[0]}" alt="${product.name}" class="w-full h-96 object-contain cursor-pointer">
            </div>
            <div class="grid grid-cols-4 gap-4">
              ${product.photo.map(photo => `
                <img 
                  src="${photo}" 
                  alt="${product.name}" 
                  class="product-thumbnail w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-75 transition"
                >
              `).join('')}
            </div>
            ${product.videos && product.videos.length > 0 ? `
              <div class="mt-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">Видео товара</h3>
                <div class="grid grid-cols-1 gap-4">
                  ${product.videos.map(video => `
                    <div class="bg-white rounded-lg shadow-lg overflow-hidden">
                      <video 
                        controls 
                        class="w-full h-64 object-contain"
                        preload="metadata"
                      >
                        <source src="${video}" type="video/mp4">
                        Ваш браузер не поддерживает воспроизведение видео.
                      </video>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>

          <div class="bg-white rounded-lg shadow-lg p-8">
            <h1 class="text-3xl font-bold text-gray-800 mb-4">${product.name}</h1>
            <p class="text-gray-600 mb-4">Цвет: ${product.color}</p>
            <div class="flex items-center justify-between mb-6">
              ${product.price 
                ? `<p class="text-2xl font-bold text-gray-800">₽${product.price}</p>` 
                : `<p class="text-lg text-red-500">Цена уточняется</p>`
              }
              <a href="https://www.wildberries.ru/catalog/${product.idWB}/detail.aspx"
                 target="_blank"
                 rel="nofollow noopener"
                 class="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-2 rounded transition duration-200">
                Купить пробный товар на WB
              </a>
            </div>
            
            <div class="mb-6">
              <h2 class="font-semibold text-gray-800 mb-2">Размеры:</h2>
              <p class="text-gray-600">Длина: ${product.dimensions.length}см</p>
              <p class="text-gray-600">Ширина: ${product.dimensions.width}см</p>
              <p class="text-gray-600">Высота: ${product.dimensions.height}см</p>
              <p class="text-gray-600">Вес: ${product.weight}кг</p>
            </div>

            <div class="mb-6">
              <h2 class="font-semibold text-gray-800 mb-2">Цвета в наличии:</h2>
              <div class="flex flex-wrap gap-2">
                ${Object.entries(colorMap)
                  .filter(([color]) => 
                    this.productsWithPrices.some(p => 
                      p.name === product.name && 
                      p.sizeType === product.sizeType && 
                      p.color === color
                    )
                  )
                  .map(([color, hex]) => {
                    const isSelected = product.color === color;
                    return `
                      <button 
                        class="w-8 h-8 rounded-full border-2 ${isSelected ? 'border-blue-500' : 'border-gray-300'}"
                        style="background-color: ${hex}"
                        onclick="window.location.href='#product/${
                          this.productsWithPrices.find(p => 
                            p.name === product.name && 
                            p.sizeType === product.sizeType && 
                            p.color === color
                          ).id
                        }'"
                      ></button>
                    `;
                  }).join('')}
              </div>
            </div>

            <div class="flex items-center gap-4 mb-6">
              <label class="font-semibold text-gray-800">Количество:</label>
              <div class="flex items-center border rounded">
                <button 
                  class="px-3 py-1 hover:bg-gray-100"
                  onclick="window.quantityInput.value = Math.max(1, parseInt(window.quantityInput.value) - 1)"
                >-</button>
                <input 
                  type="number" 
                  id="quantityInput"
                  value="1" 
                  min="1"
                  class="w-16 text-center border-x"
                >
                <button 
                  class="px-3 py-1 hover:bg-gray-100"
                  onclick="window.quantityInput.value = parseInt(window.quantityInput.value) + 1"
                >+</button>
              </div>
            </div>

            <button 
              onclick="addToCart('${product.id}', parseInt(document.getElementById('quantityInput').value))"
              class="w-full bg-blue-200 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-blue-300 transition duration-300"
            >
              Добавить в корзину
            </button>
          </div>
        </div>

        <!-- Модальное окно для просмотра медиа -->
        <div id="imageModal" class="fixed inset-0 bg-black bg-opacity-75 hidden z-50">
          <div class="relative w-full h-full flex items-center justify-center">
            <button 
              class="close-modal-btn absolute top-4 right-4 text-white hover:text-gray-300 text-4xl font-bold z-20 cursor-pointer"
            >
              ×
            </button>
            
            <!-- Swiper container -->
            <div class="swiper modal-swiper w-full h-full max-w-4xl max-h-4xl">
              <div class="swiper-wrapper" id="modal-swiper-wrapper">
                <!-- Слайды будут добавлены динамически -->
              </div>
              
              <!-- Navigation buttons -->
              <div class="swiper-button-next text-white z-10"></div>
              <div class="swiper-button-prev text-white z-10"></div>
              
              <!-- Pagination -->
              <div class="swiper-pagination z-10"></div>
            </div>
          </div>
        </div>
      </div>
      ${await cartService.renderCart()}
      
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
      ProductComponent.addEventListenerWithCleanup(mobileMenuToggle, 'click', openMobileMenu);
    }
    
    if (mobileMenuClose) {
      ProductComponent.addEventListenerWithCleanup(mobileMenuClose, 'click', closeMobileMenu);
    }
    
    if (mobileHome) {
      ProductComponent.addEventListenerWithCleanup(mobileHome, 'click', () => {
        closeMobileMenu();
        window.location.href = '#';
      });
    }
    
    if (mobileContacts) {
      ProductComponent.addEventListenerWithCleanup(mobileContacts, 'click', () => {
        closeMobileMenu();
        window.location.href = '#contacts';
      });
    }
    
    // Добавляем обработчики событий для изображений
    const timeoutId = setTimeout(() => {
      const mainImage = container.querySelector('#main-product-image');
      const thumbnails = container.querySelectorAll('.product-thumbnail');
      const backButton = container.querySelector('.back-button');
      const closeModalBtn = container.querySelector('.close-modal-btn');
      const imageModal = container.querySelector('#imageModal');
      
      // Обработчик кнопки "Назад"
      if (backButton) {
        const backHandler = () => window.location.href = '#';
        ProductComponent.addEventListenerWithCleanup(backButton, 'click', backHandler);
      }
      
      // Функции для модального окна
      const openImageModal = (startIndex = 0) => {
        const imageModal = container.querySelector('#imageModal');
        const swiperWrapper = container.querySelector('#modal-swiper-wrapper');
        
        if (imageModal && swiperWrapper) {
          // Создаем массив медиа (фото + видео)
          const allMedia = [...product.photo];
          if (product.videos && product.videos.length > 0) {
            allMedia.push(...product.videos);
          }
          
          // Очищаем и заполняем слайды
          swiperWrapper.innerHTML = '';
          allMedia.forEach((media, index) => {
            const isVideo = product.videos && product.videos.includes(media);
            const slide = document.createElement('div');
            slide.className = 'swiper-slide flex items-center justify-center';
            
            if (isVideo) {
              slide.innerHTML = `
                <video 
                  controls 
                  class="max-w-full max-h-full object-contain"
                  preload="metadata"
                >
                  <source src="${media}" type="video/mp4">
                  Ваш браузер не поддерживает воспроизведение видео.
                </video>
              `;
            } else {
              slide.innerHTML = `
                <img src="${media}" alt="${product.name}" class="max-w-full max-h-full object-contain">
              `;
            }
            
            swiperWrapper.appendChild(slide);
          });
          
          // Показываем модальное окно
          imageModal.classList.remove('hidden');
          
          // Инициализируем или обновляем Swiper
          if (window.modalSwiper) {
            window.modalSwiper.destroy(true, true);
          }
          
          window.modalSwiper = new Swiper('.modal-swiper', {
            loop: allMedia.length > 1,
            initialSlide: startIndex,
            navigation: {
              nextEl: '.swiper-button-next',
              prevEl: '.swiper-button-prev',
            },
            pagination: {
              el: '.swiper-pagination',
              clickable: true,
              type: 'bullets',
            },
            keyboard: {
              enabled: true,
              onlyInViewport: false,
            },
            spaceBetween: 10,
          });
        }
      };
      
      const closeImageModal = () => {
        const imageModal = container.querySelector('#imageModal');
        if (imageModal) {
          imageModal.classList.add('hidden');
          
          // Уничтожаем Swiper при закрытии
          if (window.modalSwiper) {
            window.modalSwiper.destroy(true, true);
            window.modalSwiper = null;
          }
        }
      };
      
      if (mainImage) {
        const mainImageHandler = function() {
          openImageModal(0);
        };
        ProductComponent.addEventListenerWithCleanup(mainImage, 'click', mainImageHandler);
      }
      
      thumbnails.forEach((thumbnail, index) => {
        const thumbnailHandler = function() {
          if (mainImage) {
            mainImage.src = this.src;
          }
          openImageModal(index);
        };
        ProductComponent.addEventListenerWithCleanup(thumbnail, 'click', thumbnailHandler);
      });
      
      if (closeModalBtn) {
        ProductComponent.addEventListenerWithCleanup(closeModalBtn, 'click', closeImageModal);
      }
      
      // Закрытие модального окна по клику на фон
      if (imageModal) {
        const modalBackgroundHandler = function(e) {
          if (e.target === this) {
            closeImageModal();
          }
        };
        ProductComponent.addEventListenerWithCleanup(imageModal, 'click', modalBackgroundHandler);
      }
      
      // Сохраняем ссылку на quantityInput
      window.quantityInput = container.querySelector('#quantityInput');
    }, 0);
    
    this.timeouts.push(timeoutId);
  }
};

export default ProductComponent;
