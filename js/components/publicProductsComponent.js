import { productsService } from '../services/productsService.js';

/**
 * Компонент для отображения товаров на публичной витрине
 * Читает данные из Supabase через productsService
 */
export const PublicProductsComponent = {
  data: {
    products: [],
    groupedProducts: [],
    categories: [],
    loading: true,
    error: null,
    selectedCategory: null
  },

  /**
   * Рендер всех товаров или товаров по категории
   */
  async render(categorySlug = null) {
    this.data.selectedCategory = categorySlug;
    
    try {
      this.data.loading = true;
      
      // Загружаем сгруппированные товары
      this.data.groupedProducts = await productsService.getGroupedProductsByType();
      this.data.categories = await productsService.getActiveCategories();
      
    } catch (error) {
      console.error('Error loading products:', error);
      this.data.error = error.message;
    } finally {
      this.data.loading = false;
    }

    return this.renderHTML();
  },

  renderHTML() {
    if (this.data.loading) {
      return `
        <div class="products-loading">
          <div class="spinner"></div>
          <p>Загрузка товаров...</p>
        </div>
      `;
    }

    if (this.data.error) {
      return `
        <div class="products-error">
          <p>Ошибка загрузки товаров: ${this.data.error}</p>
          <button onclick="location.reload()" class="retry-btn">
            Повторить попытку
          </button>
        </div>
      `;
    }

    if (!this.data.groupedProducts || this.data.groupedProducts.length === 0) {
      const categoryName = this.data.selectedCategory ? 
        this.getCategoryNameBySlug(this.data.selectedCategory) : 
        'Товары';
        
      return `
        <div class="products-empty">
          <h2>${categoryName}</h2>
          <p>Товары в этой категории временно недоступны</p>
        </div>
      `;
    }

    const categoryName = this.data.selectedCategory ? 
      this.getCategoryNameBySlug(this.data.selectedCategory) : 
      'Каталог товаров';

    return `
      <div class="products-section">
        <h2 class="products-title">${categoryName}</h2>
        
        <!-- Навигация по категориям -->
        ${this.renderCategoriesNav()}
        
        <!-- Сетка товаров -->
        <div class="products-grid">
          ${this.data.groupedProducts.map(group => this.renderGroupedProductCard(group)).join('')}
        </div>
      </div>
    `;
  },

  renderCategoriesNav() {
    if (!this.data.categories || this.data.categories.length === 0) {
      return '';
    }

    return `
      <div class="categories-nav">
        <a href="#" class="category-link ${!this.data.selectedCategory ? 'active' : ''}">
          Все товары
        </a>
        ${this.data.categories.map(category => `
          <a href="#category/${category.slug}" 
             class="category-link ${this.data.selectedCategory === category.slug ? 'active' : ''}">
            ${category.name}
          </a>
        `).join('')}
      </div>
    `;
  },

  renderGroupedProductCard(group) {
    const mainPhoto = group.mainImage || '/images/placeholder.jpg';
    const sizes = Object.keys(group.sizes);
    const firstSize = sizes[0];
    const firstSizeData = group.sizes[firstSize];
    
    return `
      <div class="grouped-product-card">
        <div class="product-slider">
          <div class="slider-container">
            <img src="${mainPhoto}" 
                 alt="${group.baseType}" 
                 loading="lazy"
                 onerror="this.src='/images/placeholder.jpg'" />
          </div>
        </div>
        
        <div class="product-info">
          <h3 class="product-name">${group.baseType}</h3>
          
          <div class="size-variants">
            ${sizes.map(size => {
              const sizeData = group.sizes[size];
              return `
                <div class="size-variant">
                  <span class="size-name">${size}</span>
                  <div class="size-details">
                    <span class="dimensions">${sizeData.dimensions.length}×${sizeData.dimensions.width}×${sizeData.dimensions.height} см</span>
                    <span class="price">${sizeData.price} ₽</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          
          <div class="colors-section">
            <p class="colors-title">Цвета в наличии:</p>
            <div class="color-palette">
              ${firstSizeData.colors.map(color => `
                <div class="color-option" 
                     style="background-color: ${color.hex}"
                     title="${color.name}"
                     onclick="PublicProductsComponent.selectColor('${color.artikul}', '${color.hex}', this)">
                </div>
              `).join('')}
            </div>
          </div>
          
          <div class="product-actions">
            <button class="btn btn-primary" onclick="PublicProductsComponent.showDetails('${group.baseType}')">
              Подробно
            </button>
          </div>
        </div>
      </div>
    `;
  },

  renderProductCard(product) {
    const mainPhoto = product.photos && product.photos[0] ? product.photos[0] : '';
    const colorStyle = product.colorData?.hex_code ? 
      `style="border-left: 4px solid ${product.colorData.hex_code}"` : '';

    return `
      <div class="product-card" ${colorStyle}>
        <div class="product-image">
          <img src="${mainPhoto}" 
               alt="${product.name} - ${product.color}" 
               loading="lazy"
               onerror="this.src='/images/placeholder.jpg'" />
        </div>
        
        <div class="product-info">
          <h3 class="product-name">${product.name}</h3>
          <p class="product-color">${product.color}</p>
          <p class="product-category">${product.categories?.name || ''}</p>
          
          <div class="product-details">
            <span class="product-dimensions">
              ${product.dimensions.length}×${product.dimensions.width}×${product.dimensions.height} см
            </span>
            <span class="product-weight">${product.weight} кг</span>
          </div>
          
          <div class="product-price">
            ${product.price_rub} ₽
          </div>
          
          <div class="product-actions">
            <button class="btn btn-primary" onclick="PublicProductsComponent.viewProduct('${product.artikul}')">
              Подробнее
            </button>
            <button class="btn btn-secondary" onclick="PublicProductsComponent.addToCart('${product.artikul}')">
              В корзину
            </button>
          </div>
        </div>
      </div>
    `;
  },

  getCategoryNameBySlug(slug) {
    const category = this.data.categories.find(c => c.slug === slug);
    return category ? category.name : 'Товары';
  },

  /**
   * Просмотр подробной информации о товаре
   */
  viewProduct(artikul) {
    window.location.hash = `#product/${artikul}`;
  },

  /**
   * Выбор цвета товара
   */
  selectColor(artikul, hex, element) {
    // Убираем активный класс с других цветов
    const colorOptions = element.parentNode.querySelectorAll('.color-option');
    colorOptions.forEach(option => option.classList.remove('selected'));
    
    // Добавляем активный класс к выбранному цвету
    element.classList.add('selected');
    
    this.showNotification(`Выбран цвет: ${hex}`, 'info');
  },

  /**
   * Показать детали группы товаров
   */
  showDetails(baseType) {
    // Здесь можно открыть модальное окно или перейти на страницу с деталями
    console.log('Show details for:', baseType);
    this.showNotification(`Просмотр деталей: ${baseType}`, 'info');
  },

  /**
   * Добавление товара в корзину
   */
  addToCart(artikul) {
    // Ищем товар среди всех сгруппированных товаров
    let product = null;
    
    for (const group of this.data.groupedProducts) {
      for (const sizeKey of Object.keys(group.sizes)) {
        const sizeData = group.sizes[sizeKey];
        const colorData = sizeData.colors.find(c => c.artikul === artikul);
        if (colorData) {
          product = {
            artikul: colorData.artikul,
            name: `${group.baseType} ${sizeKey}`,
            color: colorData.name,
            price_rub: colorData.price,
            photos: colorData.photos,
            dimensions: sizeData.dimensions
          };
          break;
        }
      }
      if (product) break;
    }
    
    if (!product) {
      console.error('Product not found:', artikul);
      return;
    }

    // Добавляем товар в корзину (интеграция с существующим cartService)
    if (window.cartService) {
      window.cartService.addItem({
        id: product.artikul,
        name: product.name,
        color: product.color,
        price: product.price_rub,
        image: product.photos[0],
        dimensions: product.dimensions
      });
      
      this.showNotification(`${product.name} добавлен в корзину`, 'success');
    }
  },

  /**
   * Поиск товаров
   */
  async search(query) {
    try {
      this.data.products = await productsService.searchProducts(query);
      return this.renderHTML();
    } catch (error) {
      console.error('Search error:', error);
      this.data.error = error.message;
      return this.renderHTML();
    }
  },

  /**
   * Получение статистики товаров
   */
  async getStats() {
    try {
      return await productsService.getProductsStats();
    } catch (error) {
      console.error('Stats error:', error);
      return null;
    }
  },

  /**
   * Подписка на изменения товаров
   */
  subscribeToChanges(callback) {
    return productsService.subscribeToChanges((payload) => {
      console.log('Products changed:', payload);
      // Очищаем кэш и перезагружаем данные
      productsService.clearCache();
      if (callback) callback(payload);
    });
  },

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
};

// Глобальный доступ для событий onclick
window.PublicProductsComponent = PublicProductsComponent;