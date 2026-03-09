import { productsService } from '../services/productsService.js';
import SwiperService from '../services/swiperService.js';
/**
 * Компонент для отображения товаров на публичной витрине
 * Читает данные из Supabase через productsService
 */
export const PublicProductsComponent = {
  data: {
    products: [],
    groupedProducts: [],
    categoryCards: [],
    categories: [],
    loading: true,
    error: null,
    selectedCategory: null
  },

  /**
   * Рендер карточек категорий или товаров по категории
   */
  async render(categorySlug = null) {
    this.data.selectedCategory = categorySlug;
    
    try {
      this.data.loading = true;
      
      if (categorySlug) {
        // Загружаем товары конкретной категории
        this.data.products = await this.getProductsByCategory(categorySlug);
        this.data.categories = await productsService.getActiveCategories();
      } else {
        // Создаем карточки категорий по принципу админки
        this.data.categoryCards = await this.createCategoryCards();
      }
      
    } catch (error) {
      console.error('Error loading products:', error);
      this.data.error = error.message;
    } finally {
      this.data.loading = false;
    }

    return this.renderHTML();
  },

  /**
   * Получение товаров по категории (аналогично логике админки)
   */
  async getProductsByCategory(categorySlug) {
    const allProducts = await productsService.getActiveProducts();
    
    switch(categorySlug) {
      case 'small':
        return allProducts.filter(product => product.size === 'small' && !product.name.toLowerCase().includes('ручк'));
      case 'medium':
        return allProducts.filter(product => product.size === 'medium');
      case 'big':
        return allProducts.filter(product => product.size === 'big');
      case 'with_handle':
        return allProducts.filter(product => product.name.toLowerCase().includes('ручк'));
      default:
        return allProducts;
    }
  },

  /**
   * Создание карточек категорий с данными о товарах
   */
  async createCategoryCards() {
    const allProducts = await productsService.getActiveProducts();
    const colorMap = await this.getColorMap();
    
    const categories = [
      {
        slug: 'small',
        name: 'Малая коробка',
        description: 'Идеальна для небольших подарков и украшений'
      },
      {
        slug: 'medium', 
        name: 'Средняя коробка',
        description: 'Универсальный размер для большинства подарков'
      },
      {
        slug: 'big',
        name: 'Большая коробка', 
        description: 'Для объемных подарков и особых случаев'
      },
      {
        slug: 'with_handle',
        name: 'Коробка с ручками',
        description: 'Удобно носить, стильно дарить'
      }
    ];

    return categories.map(category => {
      const categoryProducts = this.filterProductsByCategory(allProducts, category.slug);
      
      if (categoryProducts.length === 0) return null;

      // Получаем уникальные цвета для категории
      const categoryColors = [...new Set(categoryProducts.map(p => p.color_hex))];
      
      // Диапазон цен
      const prices = categoryProducts.map(p => p.price_rub);
      const priceRange = {
        min: Math.min(...prices),
        max: Math.max(...prices)
      };

      // Главное изображение
      const mainImage = categoryProducts[0]?.photos?.[0] || '';

      return {
        ...category,
        products: categoryProducts,
        colors: categoryColors,
        colorMap,
        priceRange,
        mainImage,
        totalProducts: categoryProducts.length
      };
    }).filter(Boolean);
  },

  /**
   * Фильтрация товаров по категории
   */
  filterProductsByCategory(products, categorySlug) {
    switch(categorySlug) {
      case 'small':
        return products.filter(product => product.size === 'small' && !product.name.toLowerCase().includes('ручк'));
      case 'medium':
        return products.filter(product => product.size === 'medium');
      case 'big':
        return products.filter(product => product.size === 'big');
      case 'with_handle':
        return products.filter(product => product.name.toLowerCase().includes('ручк'));
      default:
        return products;
    }
  },

  /**
   * Получение карты цветов
   */
  async getColorMap() {
    try {
      const colors = await productsService.getActiveColors();
      const colorMap = {};
      colors.forEach(color => {
        colorMap[color.hex_code] = color.russian_name || color.name;
      });
      return colorMap;
    } catch (error) {
      console.error('Error loading color map:', error);
      return {};
    }
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

    // Если выбрана конкретная категория - показываем товары
    if (this.data.selectedCategory) {
      return this.renderCategoryProducts();
    }

    // Иначе показываем карточки категорий
    return this.renderCategoryCards();
  },

  /**
   * Рендер карточек категорий на главной странице
   */
  renderCategoryCards() {
    if (!this.data.categoryCards || this.data.categoryCards.length === 0) {
      return `
        <div class="products-empty">
          <p>Категории товаров временно недоступны</p>
        </div>
      `;
    }

    return `
      <div class="products-section">
        <div class="category-cards-grid">
          ${this.data.categoryCards.map(category => this.renderCategoryCard(category)).join('')}
        </div>
      </div>
    `;
  },

  /**
   * Рендер карточки категории
   */
  renderCategoryCard(category) {
    const categoryId = `category-${category.slug}`;
    const selectedColor = this.selectedColors?.[category.slug] || category.colors[0];
    
    // Найти товар выбранного цвета для отображения его фото
    const selectedProduct = category.products.find(p => p.color_hex === selectedColor);
    const currentPhotos = selectedProduct?.photos || [category.mainImage];
    
    return `
      <div class="category-card" data-category="${category.slug}">
        <!-- Слайдер с фотографиями -->
        <div class="category-slider-container">
          <div class="swiper" id="${categoryId}-slider">
            <div class="swiper-wrapper">
              ${currentPhotos.map(photo => `
                <div class="swiper-slide">
                  <img src="${this.getImageUrl(photo)}" 
                       alt="${category.name}" 
                       class="category-slide-image"
                       loading="lazy"
                       onerror="this.src='/images/placeholder.jpg'" />
                </div>
              `).join('')}
            </div>
            
            <!-- Навигация слайдера -->
            <div class="swiper-button-next"></div>
            <div class="swiper-button-prev"></div>
            <div class="swiper-pagination"></div>
          </div>
        </div>
        
        <div class="category-info">
          <h3 class="category-name">${category.name}</h3>
          <p class="category-description">${category.description}</p>
          
          <div class="category-details">
            <!-- Переключатель цветов -->
            <div class="category-colors">
              <span class="colors-label">Доступные цвета:</span>
              <div class="color-options">
                ${category.colors.map(hex => `
                  <div class="color-dot ${selectedColor === hex ? 'selected' : ''}" 
                       style="background-color: ${hex}" 
                       title="${category.colorMap[hex] || 'Цвет'}"
                       data-color="${hex}"
                       data-category="${category.slug}"
                       onclick="PublicProductsComponent.selectCategoryColor('${category.slug}', '${hex}')"
                       ondblclick="PublicProductsComponent.goToProductByColor('${category.slug}', '${hex}')">
                  </div>
                `).join('')}
              </div>
            </div>
            
            <div class="category-stats">
              <span class="products-count">${category.totalProducts} товаров</span>
              <span class="price-range">от ${category.priceRange.min}₽</span>
            </div>
          </div>
          
          <div class="category-actions">
            <button class="category-product-btn w-full ${selectedColor ? '' : 'disabled'}" 
                    ${selectedColor ? `onclick="PublicProductsComponent.goToProductByColor('${category.slug}', '${selectedColor}')"` : 'disabled'}>
              К товару
            </button>
          </div>
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
    const mainPhoto = this.getImageUrl(group.mainImage) || '/images/placeholder.jpg';
    
    return `
      <div class="grouped-product-card">
        <div class="product-slider">
          <div class="slider-container">
            <img src="${mainPhoto}" 
                 alt="${group.categoryName}" 
                 loading="lazy"
                 onerror="this.src='/images/placeholder.jpg'" />
          </div>
        </div>
        
        <div class="product-info">
          <h3 class="product-name">${group.categoryName}</h3>
          
          <div class="size-variants">
            ${Object.entries(group.sizes).map(([size, products]) => {
              const sizeRussian = this.mapSizeToRussian(size);
              const firstProduct = products[0];
              return `
                <div class="size-variant">
                  <span class="size-name">${sizeRussian}</span>
                  <div class="size-details">
                    <span class="dimensions">${firstProduct.dimensions.length}×${firstProduct.dimensions.width}×${firstProduct.dimensions.height} см</span>
                    <span class="price">${group.priceRange.min}${group.priceRange.min !== group.priceRange.max ? ` - ${group.priceRange.max}` : ''} ₽</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          
          <div class="colors-section">
            <p class="colors-title">Цвета в наличии:</p>
            <div class="color-palette">
              ${group.colors.map(hex => `
                <div class="color-option" 
                     style="background-color: ${hex}"
                     title="${this.getColorNameFromHex(hex)}"
                     onclick="PublicProductsComponent.selectColor('${hex}', this)">
                </div>
              `).join('')}
            </div>
          </div>
          
          <div class="product-actions">
            <button class="btn btn-primary" onclick="PublicProductsComponent.showDetails('${group.categorySlug}')">
              Подробно
            </button>
          </div>
        </div>
      </div>
    `;
  },

  mapSizeToRussian(size) {
    const mapping = {
      'small': 'Малая',
      'medium': 'Средняя', 
      'big': 'Большая'
    };
    return mapping[size] || size;
  },

  getColorNameFromHex(hex) {
    const colorMapping = {
      '#FFB6C1': 'Розовая',
      '#1a1a1a': 'Черная',
      '#FFFFFF': 'Белая', 
      '#FFD700': 'Золотая',
      '#C0C0C0': 'Серебряная',
      '#FF0000': 'Красная',
      '#FFA500': 'Оранжевая',
      '#FFCBA4': 'Персиковая',
      '#B0E0E6': 'Голубая ледяная',
      '#003366': 'Синяя бархатная',
      '#0ABAB5': 'Тиффани',
      '#F3E5AB': 'Ванильная',
      '#F8F8FF': 'Белая алмазная',
      '#2F2F2F': 'Черная муар',
      '#E6E6FA': 'Лавандовая',
      '#DDA0DD': 'Сиреневая'
    };
    return colorMapping[hex] || hex;
  },

  getImageUrl(photo) {
    if (!photo) return '';
    if (photo.startsWith('http')) {
      return photo;
    }
    return `https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/${photo}`;
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
            <span class="product-weight">${(product.weight / 1000).toFixed(2)} кг</span>
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

  /**
   * Получение названия категории по slug
   */
  getCategoryNameBySlug(slug) {
    const categories = {
      'small': 'Малая коробка',
      'medium': 'Средняя коробка', 
      'big': 'Большая коробка',
      'with_handle': 'Коробка с ручками'
    };
    return categories[slug] || 'Товары';
  },

  /**
   * Просмотр подробной информации о товаре
   */
  viewProduct(artikul) {
    window.location.hash = `#product/${artikul}`;
  },

  /**
   * Выбор цвета в карточке категории
   */
  selectCategoryColor(categorySlug, colorHex) {
    // Сохраняем выбранный цвет
    if (!this.selectedColors) this.selectedColors = {};
    this.selectedColors[categorySlug] = colorHex;
    
    // Обновляем активный цвет
    const categoryCard = document.querySelector(`[data-category="${categorySlug}"]`);
    if (categoryCard) {
      const colorDots = categoryCard.querySelectorAll('.color-dot');
      colorDots.forEach(dot => {
        if (dot.dataset.color === colorHex) {
          dot.classList.add('selected');
        } else {
          dot.classList.remove('selected');
        }
      });
      
      // Находим товар выбранного цвета
      const category = this.data.categoryCards.find(c => c.slug === categorySlug);
      if (category) {
        const selectedProduct = category.products.find(p => p.color_hex === colorHex);
        if (selectedProduct && selectedProduct.photos) {
          this.updateCategorySlider(categorySlug, selectedProduct.photos);
        }
      }
      
      // Активируем кнопку "К товару"
      const productBtn = categoryCard.querySelector('.category-product-btn');
      if (productBtn) {
        productBtn.classList.remove('disabled');
        productBtn.onclick = () => this.goToProductByColor(categorySlug, colorHex);
      }
    }
  },

  /**
   * Переход к товару по выбранному цвету
   */
  goToProductByColor(categorySlug, colorHex) {
    const category = this.data.categoryCards.find(c => c.slug === categorySlug);
    if (category) {
      const selectedProduct = category.products.find(p => p.color_hex === colorHex);
      if (selectedProduct) {
        this.viewProduct(selectedProduct.artikul);
      }
    }
  },

  /**
   * Обновление слайдера категории с новыми фотографиями
   */
  updateCategorySlider(categorySlug, newPhotos) {
    SwiperService.updateCategorySlider(categorySlug, newPhotos, this.getImageUrl.bind(this));
  },

  /**
   * Инициализация слайдеров для карточек категорий
   */
  initCategorySliders() {
    SwiperService.initCategorySliders();
  },

  /**
   * Выбор цвета товара
   */
  selectColor(hex, element) {
    // Убираем активный класс с других цветов
    const colorOptions = element.parentNode.querySelectorAll('.color-option');
    colorOptions.forEach(option => option.classList.remove('selected'));
    
    // Добавляем активный класс к выбранному цвету
    element.classList.add('selected');
  },

  /**
   * Показать детали группы товаров
   */
  showDetails(categorySlug) {
    // Здесь можно открыть модальное окно или перейти на страницу с деталями
    window.location.hash = `#category/${categorySlug}`;
    console.log('Show details for category:', categorySlug);
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