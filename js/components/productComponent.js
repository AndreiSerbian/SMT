
import { products } from '../data/products.js';
import { cartService } from '../services/cartService.js';
import { colorMap } from '../data/products.js';

const ProductComponent = {
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
            <div class="bg-white rounded-lg shadow-lg overflow-hidden">
              <img id="main-product-image" src="${product.photo[0]}" alt="${product.name}" class="w-full h-96 object-cover cursor-pointer">
            </div>
            <div class="grid grid-cols-4 gap-4">
              ${product.photo.map(photo => `
                <img 
                  src="${photo}" 
                  alt="${product.name}" 
                  class="product-thumbnail w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-75 transition"
                >
              `).join('')}
            </div>
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
                  .map(([color, hex]) => {
                    const isLight = this.isLightColor(hex);
                    return `
                      <button 
                        class="w-8 h-8 rounded-full border-2 ${isLight ? 'border-gray-300' : 'border-transparent'} ${product.color === color ? 'border-blue-500' : ''}"
                        style="background-color: ${hex}"
                        onclick="window.location.href='#product/${
                          products.find(p => 
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
      </div>
      ${cartService.renderCart()}
    `;
  },
  
  // Определяет, является ли цвет светлым
  isLightColor(hex) {
    // Удаляем # если есть
    hex = hex.replace('#', '');
    
    // Преобразуем hex в RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Вычисляем яркость цвета
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    // Если яркость больше 180, считаем цвет светлым
    return brightness > 180;
  }
};

export default ProductComponent;
