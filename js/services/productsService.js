import { supabase } from '../utils/supabase.js';

export class ProductsService {
  constructor() {
    this.cache = new Map();
    this.loading = false;
    this.colorsCache = null;
  }

  /**
   * Получить все активные товары
   */
  async getActiveProducts() {
    if (this.loading) {
      await this.waitForLoading();
    }

    if (this.cache.has('activeProducts')) {
      return this.cache.get('activeProducts');
    }

    this.loading = true;

    try {
      // Сначала загружаем цвета для корректного маппинга
      await this.getColorsMap();

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Преобразуем данные в формат, совместимый с текущим кодом
      const products = data.map(product => ({
        ...product,
        id: product.artikul, // Используем artikul как ID для совместимости
        sizeType: this.mapSizeToRussian(product.size),
        color: this.getColorNameFromHex(product.color_hex),
        photo: product.photos,
        videos: product.videos || [],
        price: product.price_rub
      }));

      this.cache.set('activeProducts', products);
      return products;

    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Получить товары по категории (размеру)
   */
  async getProductsByCategory(categorySlug) {
    const allProducts = await this.getActiveProducts();
    const sizeMapping = {
      'small': 'small',
      'medium': 'medium', 
      'large': 'big'
    };
    const targetSize = sizeMapping[categorySlug];
    return allProducts.filter(product => 
      product.size === targetSize
    );
  }

  /**
   * Получить товар по артикулу
   */
  async getProductByArtikul(artikul) {
    const allProducts = await this.getActiveProducts();
    return allProducts.find(product => product.artikul === artikul);
  }

  /**
   * Получить все категории
   */
  async getActiveCategories() {
    if (this.cache.has('categories')) {
      return this.cache.get('categories');
    }

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;

      this.cache.set('categories', data);
      return data;

    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  /**
   * Получить все цвета
   */
  async getActiveColors() {
    if (this.cache.has('colors')) {
      return this.cache.get('colors');
    }

    try {
      const { data, error } = await supabase
        .from('colors')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;

      this.cache.set('colors', data);
      return data;

    } catch (error) {
      console.error('Error fetching colors:', error);
      throw error;
    }
  }

  /**
   * Маппинг размера в русский язык для совместимости
   */
  mapSizeToRussian(size) {
    const mapping = {
      'small': 'малая',
      'medium': 'средняя', 
      'big': 'большая'
    };
    return mapping[size] || size;
  }

  /**
   * Получить все цвета из БД с кешированием
   */
  async getColorsMap() {
    if (this.colorsCache) {
      return this.colorsCache;
    }

    try {
      const { data, error } = await supabase
        .from('colors')
        .select('hex_code, russian_name, name')
        .eq('is_active', true);

      if (error) throw error;

      // Создаем маппинг hex -> russian_name
      const colorsMap = {};
      data.forEach(color => {
        colorsMap[color.hex_code.toUpperCase()] = color.russian_name || color.name;
      });

      this.colorsCache = colorsMap;
      return colorsMap;
    } catch (error) {
      console.error('Error loading colors:', error);
      return {};
    }
  }

  /**
   * Получить название цвета по hex коду из таблицы colors
   */
  getColorNameFromHex(hex) {
    if (!this.colorsCache) {
      // Возвращаем hex если кеш еще не загружен
      return hex;
    }
    
    const normalizedHex = hex.toUpperCase();
    return this.colorsCache[normalizedHex] || hex;
  }

  /**
   * Получить статистику товаров
   */
  async getProductsStats() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('is_active, size');

      if (error) throw error;

      const stats = {
        total: data.length,
        active: data.filter(p => p.is_active).length,
        inactive: data.filter(p => !p.is_active).length,
        bySize: {}
      };

      // Группировка по размерам
      data.forEach(product => {
        const sizeName = this.mapSizeToRussian(product.size);
        if (!stats.bySize[sizeName]) {
          stats.bySize[sizeName] = { total: 0, active: 0 };
        }
        stats.bySize[sizeName].total++;
        if (product.is_active) {
          stats.bySize[sizeName].active++;
        }
      });

      return stats;

    } catch (error) {
      console.error('Error fetching products stats:', error);
      throw error;
    }
  }

  /**
   * Очистить кэш
   */
  clearCache() {
    this.cache.clear();
    this.colorsCache = null;
  }

  /**
   * Подписка на изменения товаров в реальном времени
   */
  subscribeToChanges(callback) {
    return supabase
      .channel('products-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          console.log('Products change:', payload);
          this.clearCache();
          if (callback) callback(payload);
        }
      )
      .subscribe();
  }

  /**
   * Ожидание завершения загрузки
   */
  async waitForLoading() {
    while (this.loading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Группировка товаров по категориям через edge-функцию
   */
  async getGroupedProductsByCategories() {
    if (this.cache.has('groupedCategories')) {
      return this.cache.get('groupedCategories');
    }

    try {
      const response = await fetch('https://bsndismiessofvhglzrv.supabase.co/functions/v1/group-products-by-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzbmRpc21pZXNzb2Z2aGdsenJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2ODYyNTIsImV4cCI6MjA1NDI2MjI1Mn0.4pumjrK8SV79xaegTEZaJMmi6lnp-_5uhSytvWpoZHY'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to group products');
      }

      this.cache.set('groupedCategories', result.data);
      return result.data;

    } catch (error) {
      console.error('Error grouping products by categories:', error);
      // Fallback к старому методу
      return this.getGroupedProductsByType();
    }
  }

  /**
   * Группировка товаров по типу коробки (устаревший метод)
   */
  async getGroupedProductsByType() {
    const products = await this.getActiveProducts();
    const grouped = {};

    products.forEach(product => {
      // Извлекаем базовый тип коробки из названия
      let baseType = this.extractBaseType(product.name);
      
      if (!grouped[baseType]) {
        grouped[baseType] = {
          baseType: baseType,
          sizes: {},
          mainImage: product.photos?.[0] || '',
          allPhotos: []
        };
      }

      // Группируем по размерам
      const size = this.mapSizeToRussian(product.size);
      if (!grouped[baseType].sizes[size]) {
        grouped[baseType].sizes[size] = {
          colors: [],
          price: product.price_rub,
          dimensions: product.dimensions
        };
      }

      // Добавляем цвет
      grouped[baseType].sizes[size].colors.push({
        hex: product.color_hex,
        name: this.getColorNameFromHex(product.color_hex),
        artikul: product.artikul,
        photos: product.photos || [],
        price: product.price_rub
      });

      // Собираем все фото
      if (product.photos) {
        grouped[baseType].allPhotos.push(...product.photos);
      }
    });

    return Object.values(grouped);
  }

  /**
   * Извлекает базовый тип коробки из полного названия
   */
  extractBaseType(fullName) {
    // Убираем размеры из названия
    let baseName = fullName
      .replace(/\s+(Большая|Средняя|Малая)\s+/gi, ' ')
      .replace(/\s+(Big|Medium|Small)\s+/gi, ' ')
      .replace(/\s+[A-Za-z\s]+$/, '') // убираем цвет в конце
      .trim();

    // Нормализуем названия
    if (baseName.includes('бантом на магнитах')) {
      return 'Подарочная коробка с бантом на магнитах';
    } else if (baseName.includes('лентой')) {
      return 'Подарочная коробка с лентой';
    } else if (baseName.includes('ручкой')) {
      return 'Подарочная коробка с ручкой';
    }
    
    return baseName;
  }

  /**
   * Поиск товаров
   */
  async searchProducts(query) {
    const allProducts = await this.getActiveProducts();
    const searchTerm = query.toLowerCase();

    return allProducts.filter(product => 
      product.name.toLowerCase().includes(searchTerm) ||
      product.artikul.toLowerCase().includes(searchTerm) ||
      product.color.toLowerCase().includes(searchTerm) ||
      product.sizeType.toLowerCase().includes(searchTerm)
    );
  }
}

// Экспортируем singleton instance
export const productsService = new ProductsService();