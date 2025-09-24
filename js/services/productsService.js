import { supabase } from '../utils/supabase.js';

export class ProductsService {
  constructor() {
    this.cache = new Map();
    this.loading = false;
  }

  /**
   * Получить все активные товары с категориями и цветами
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
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories(id, name, slug),
          colors(id, name, hex_code)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Преобразуем данные в формат, совместимый с текущим кодом
      const products = data.map(product => ({
        ...product,
        id: product.artikul, // Используем artikul как ID для совместимости
        sizeType: this.mapCategoryToSize(product.categories.slug),
        color: product.colors.name,
        photo: product.photos,
        videos: product.videos || [],
        price: product.price_rub,
        category: product.categories,
        colorData: product.colors
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
   * Получить товары по категории
   */
  async getProductsByCategory(categorySlug) {
    const allProducts = await this.getActiveProducts();
    return allProducts.filter(product => 
      product.categories.slug === categorySlug
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
   * Маппинг slug категории в sizeType для совместимости
   */
  mapCategoryToSize(slug) {
    const mapping = {
      'small': 'малая',
      'medium': 'средняя',
      'large': 'большая',
      'with_handle': 'с ручками'
    };
    return mapping[slug] || slug;
  }

  /**
   * Получить статистику товаров
   */
  async getProductsStats() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('is_active, category_id, categories(name)', { count: 'exact' });

      if (error) throw error;

      const stats = {
        total: data.length,
        active: data.filter(p => p.is_active).length,
        inactive: data.filter(p => !p.is_active).length,
        byCategory: {}
      };

      // Группировка по категориям
      data.forEach(product => {
        const categoryName = product.categories?.name || 'Без категории';
        if (!stats.byCategory[categoryName]) {
          stats.byCategory[categoryName] = { total: 0, active: 0 };
        }
        stats.byCategory[categoryName].total++;
        if (product.is_active) {
          stats.byCategory[categoryName].active++;
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
   * Поиск товаров
   */
  async searchProducts(query) {
    const allProducts = await this.getActiveProducts();
    const searchTerm = query.toLowerCase();

    return allProducts.filter(product => 
      product.name.toLowerCase().includes(searchTerm) ||
      product.artikul.toLowerCase().includes(searchTerm) ||
      product.color.toLowerCase().includes(searchTerm) ||
      product.categories.name.toLowerCase().includes(searchTerm)
    );
  }
}

// Экспортируем singleton instance
export const productsService = new ProductsService();