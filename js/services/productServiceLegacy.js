import { supabase } from '../utils/supabase.js';

class ProductServiceLegacy {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  }

  isCacheValid(key) {
    const expiry = this.cacheExpiry.get(key);
    return expiry ? expiry > Date.now() : false;
  }

  setCache(key, data) {
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION);
  }

  getCache(key) {
    if (this.isCacheValid(key)) {
      return this.cache.get(key);
    }
    return null;
  }

  async getProducts() {
    const cacheKey = 'products_legacy';
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          color:colors(*),
          images:product_images(*),
          videos:product_videos(*)
        `)
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        console.error('Error fetching products from Supabase:', error);
        // Fallback to importing products from local file
        const { products } = await import('../data/products.js');
        const { colorMap } = await import('../data/products.js');
        
        this.setCache(cacheKey, { products, colorMap });
        return { products, colorMap };
      }

      // Transform Supabase data to legacy format
      const products = (data || []).map(product => ({
        id: product.legacy_id || product.id,
        name: product.name,
        artikul: product.artikul,
        idWB: product.id_wb,
        color: product.color?.name || '',
        sizeType: product.size_type,
        dimensions: this.parseDimensions(product.dimensions),
        weight: parseFloat(product.weight?.replace(/[^\d.]/g, '') || '0'),
        photo: product.images?.sort((a, b) => a.sort_order - b.sort_order).map(img => img.url) || [],
        videos: product.videos?.sort((a, b) => a.sort_order - b.sort_order).map(video => video.url) || []
      }));

      // Create legacy colorMap
      const { data: colorsData } = await supabase
        .from('colors')
        .select('*')
        .order('sort_order');

      const colorMap = {};
      (colorsData || []).forEach(color => {
        colorMap[color.name] = color.hex_code;
      });

      const result = { products, colorMap };
      this.setCache(cacheKey, result);
      return result;

    } catch (error) {
      console.error('Error in getProducts:', error);
      // Final fallback to local data
      try {
        const { products } = await import('../data/products.js');
        const { colorMap } = await import('../data/products.js');
        return { products, colorMap };
      } catch (fallbackError) {
        console.error('Failed to load fallback data:', fallbackError);
        return { products: [], colorMap: {} };
      }
    }
  }

  parseDimensions(dimensionString) {
    if (!dimensionString) return { length: 0, width: 0, height: 0 };
    
    // Parse "23x17x7 см" format
    const matches = dimensionString.match(/(\d+)x(\d+)x(\d+)/);
    if (matches) {
      return {
        length: parseInt(matches[1]),
        width: parseInt(matches[2]),
        height: parseInt(matches[3])
      };
    }
    
    return { length: 0, width: 0, height: 0 };
  }

  async getProductById(id) {
    const { products } = await this.getProducts();
    return products.find(product => product.id === id) || null;
  }

  clearCache() {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}

export const productServiceLegacy = new ProductServiceLegacy();