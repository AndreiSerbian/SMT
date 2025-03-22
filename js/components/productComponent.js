
import { products } from '../data/products.js';
import { cartService } from '../services/cartService.js';
import { colorMap } from '../data/products.js';

const ProductComponent = {
  currentSlide: 0,
  swiper: null,

  render(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return HomeComponent.render();

    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="container mx-auto px-4 py-8">
         <button 
          onclick="window.location.href='#'"
          class="mb-8 text-gray-600 hover:text-gray-800 flex items-center"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
          Вернуться к категориям
        </button>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div class="space-y-4">
            <!-- Swiper Slider -->
            <div class="swiper product-slider bg-white rounded-lg shadow-lg overflow-hidden">
              <div class="swiper-wrapper">
                ${product.photo.map(photo => `
                  <div class="swiper-slide">
                    <img src="${photo}" alt="${product.name}" class="w-full h-96 object-contain">
                  </div>
                `).join('')}
              </div>
              <!-- Add Navigation buttons -->
              <div class="swiper-button-next"></div>
              <div class="swiper-button-prev"></div>
              <!-- Add Pagination -->
              <div class="swiper-pagination"></div>
              <!-- Add slide counter -->
              <div class="absolute bottom-2 right-2 bg-white/80 px-2 py-1 rounded text-sm z-10 slide-counter">
                1/${product.photo.length}
              </div>
            </div>

            <!-- Thumbnail Navigation -->
            <div class="grid grid-cols-4 gap-4">
              ${product.photo.map((photo, index) => `
                <img src="${photo}" alt="${product.name}" 
                  class="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-75 transition thumbnail-nav"
                  data-index="${index}">
              `).join('')}
            </div>
            
            <!-- Video Player (conditionally rendered) -->
            ${product.videos && product.videos.length > 0 ? `
              <div class="mt-6 bg-white rounded-lg shadow-lg p-4">
                <h3 class="text-lg font-semibold mb-3">Видео товара</h3>
                <div class="video-container">
                  ${product.videos.map(video => `
                    <video controls class="w-full rounded-lg mb-3">
                      <source src="${video}" type="video/mp4">
                      Ваш браузер не поддерживает видео.
                    </video>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>

          <div class="bg-white rounded-lg shadow-lg p-8">
            <h1 class="text-3xl font-bold text-gray-800 mb-4">${product.name}</h1>
            <p class="text-gray-600 mb-4">Цвет: ${product.color}</p>
            <p class="text-2xl font-bold text-gray-800 mb-6">₽${product.price}</p>
            
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
                    products.some(p => 
                      p.name === product.name && 
                      p.sizeType === product.sizeType && 
                      p.color === color
                    )
                  )
                  .map(([color, hex]) => `
                    <button 
                      class="w-8 h-8 rounded-full border-2 ${product.color === color ? 'border-blue-500' : 'border-transparent'}"
                      style="background-color: ${hex}"
                      onclick="window.location.href='#product/${
                        products.find(p => 
                          p.name === product.name && 
                          p.sizeType === product.sizeType && 
                          p.color === color
                        ).id
                      }'"
                    ></button>
                  `).join('')}
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
      </div>
      ${cartService.renderCart()}
    `;

    this.initProductSlider();
    this.initThumbnailNavigation();
  },

  initProductSlider() {
    // Initialize the Swiper slider
    this.swiper = new Swiper('.product-slider', {
      loop: true,
      navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
      },
      pagination: {
        el: '.swiper-pagination',
        clickable: true,
      },
      on: {
        slideChange: () => {
          // Update the slide counter
          const counter = document.querySelector('.slide-counter');
          if (counter) {
            const activeIndex = this.swiper.realIndex + 1;
            const total = this.swiper.slides.length - 2; // Adjust for loop duplicated slides
            counter.textContent = `${activeIndex}/${total}`;
          }
        }
      }
    });
  },

  initThumbnailNavigation() {
    // Add click handlers to thumbnail images
    const thumbnails = document.querySelectorAll('.thumbnail-nav');
    thumbnails.forEach(thumbnail => {
      thumbnail.addEventListener('click', () => {
        const index = parseInt(thumbnail.dataset.index);
        if (this.swiper) {
          this.swiper.slideTo(index + 1); // +1 because of loop mode
        }
      });
    });
  }
};

// Global function to add to cart (needed for onclick attribute)
window.addToCart = function(productId, quantity) {
  cartService.addToCart(productId, quantity);
  // Refresh cart display
  document.getElementById('cart-container').innerHTML = cartService.renderCart();
};

export default ProductComponent;
