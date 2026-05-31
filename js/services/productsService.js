import { supabase } from '../utils/supabase.js';
import { withTimeout } from '../utils/withTimeout.js';
import {
  loadLocalCatalogSnapshot,
  clearLocalCatalogCache,
  toProductShape,
} from './catalogFallbackService.js';

const PUBLIC_TIMEOUT_MS = 4000;   // public Supabase fallback
const ADMIN_TIMEOUT_MS  = 18000;  // admin Supabase soft timeout

export class ProductsService {
  constructor() {
    this.cache = new Map();        // public + admin keys are namespaced
    this.colorsCache = null;
    this.loading = false;
    this._source = null;           // 'json' | 'supabase' | 'supabase-admin' | 'none'
    this._lastError = null;
  }

  // ────────────────────────────────────────────────────────────
  // PRODUCTS
  // ────────────────────────────────────────────────────────────

  /**
   * Get active products.
   * @param {{source?: 'public'|'admin'}} opts
   *   - 'public' (default): JSON-first → Supabase fallback (4s).
   *   - 'admin': Supabase-only, soft 18s timeout, throws on error.
   */
  async getActiveProducts(opts = {}) {
    const source = opts.source === 'admin' ? 'admin' : 'public';

    if (source === 'admin') {
      const key = 'admin:products';
      if (this.cache.has(key)) return this.cache.get(key);
      try {
        await this._loadColorsFromSupabase();
        const data = await withTimeout(
          this._fetchProductsFromSupabase(),
          ADMIN_TIMEOUT_MS,
          'admin products'
        );
        this.cache.set(key, data);
        this._source = 'supabase-admin';
        return data;
      } catch (e) {
        this._lastError = e;
        console.error('[productsService][admin] failed:', e);
        throw e;
      }
    }

    // public
    const key = 'public:products';
    if (this.cache.has(key)) return this.cache.get(key);
    if (this.loading) {
      await this._waitForLoading();
      if (this.cache.has(key)) return this.cache.get(key);
    }
    this.loading = true;
    try {
      // 1) JSON-first
      try {
        const snap = await loadLocalCatalogSnapshot();
        const products = (snap.products || []).map(toProductShape);
        this.cache.set(key, products);
        this._source = 'json';
        // Populate colorsCache from snapshot for color name lookup
        if (Array.isArray(snap.colors)) {
          const map = {};
          snap.colors.forEach(c => {
            if (c.hex_code) map[c.hex_code.toUpperCase()] = c.russian_name || c.name;
          });
          this.colorsCache = map;
        }
        return products;
      } catch (jsonErr) {
        this._lastError = jsonErr;
        console.warn('[productsService] JSON snapshot failed, falling back to Supabase:', jsonErr.message);
      }

      // 2) Supabase fallback with timeout
      try {
        await this._loadColorsFromSupabase();
        const data = await withTimeout(
          this._fetchProductsFromSupabase(),
          PUBLIC_TIMEOUT_MS,
          'public products'
        );
        this.cache.set(key, data);
        this._source = 'supabase';
        return data;
      } catch (sbErr) {
        this._lastError = sbErr;
        this._source = 'none';
        console.error('[productsService] Supabase fallback failed:', sbErr);
        return [];
      }
    } finally {
      this.loading = false;
    }
  }

  async _fetchProductsFromSupabase() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(product => ({
      ...product,
      id: product.artikul,
      artikul: product.artikul,
      sizeType: this.mapSizeToRussian(product.size),
      color: this.getColorNameFromHex(product.color_hex),
      photo: product.photos,
      photos: product.photos,
      videos: product.videos || [],
      price: product.price_rub,
      price_rub: product.price_rub,
      category_slug: null, // admin path doesn't rely on slug here
      category: null,
    }));
  }

  // ────────────────────────────────────────────────────────────
  // CATEGORIES
  // ────────────────────────────────────────────────────────────

  async getActiveCategories(opts = {}) {
    const source = opts.source === 'admin' ? 'admin' : 'public';
    const key = `${source}:categories`;
    if (this.cache.has(key)) return this.cache.get(key);

    if (source === 'admin') {
      try {
        const data = await withTimeout(this._fetchCategoriesFromSupabase(), ADMIN_TIMEOUT_MS, 'admin categories');
        this.cache.set(key, data);
        return data;
      } catch (e) {
        this._lastError = e;
        throw e;
      }
    }

    // public
    try {
      const snap = await loadLocalCatalogSnapshot();
      const cats = (snap.categories || []).map(c => ({
        id: c.id, slug: c.slug, name: c.name,
        sort_order: c.sort_order ?? 0, is_active: true,
      }));
      this.cache.set(key, cats);
      return cats;
    } catch (jsonErr) {
      this._lastError = jsonErr;
    }
    try {
      const data = await withTimeout(this._fetchCategoriesFromSupabase(), PUBLIC_TIMEOUT_MS, 'public categories');
      this.cache.set(key, data);
      return data;
    } catch (e) {
      this._lastError = e;
      return [];
    }
  }

  async _fetchCategoriesFromSupabase() {
    const { data, error } = await supabase
      .from('categories').select('*').eq('is_active', true).order('sort_order');
    if (error) throw error;
    return data;
  }

  // ────────────────────────────────────────────────────────────
  // COLORS
  // ────────────────────────────────────────────────────────────

  async getActiveColors(opts = {}) {
    const source = opts.source === 'admin' ? 'admin' : 'public';
    const key = `${source}:colors`;
    if (this.cache.has(key)) return this.cache.get(key);

    if (source === 'admin') {
      try {
        const data = await withTimeout(this._fetchColorsFromSupabase(), ADMIN_TIMEOUT_MS, 'admin colors');
        this.cache.set(key, data);
        return data;
      } catch (e) {
        this._lastError = e;
        throw e;
      }
    }

    try {
      const snap = await loadLocalCatalogSnapshot();
      const colors = (snap.colors || []).map((c, i) => ({
        hex_code: c.hex_code, name: c.name, russian_name: c.russian_name,
        is_active: true, sort_order: i,
      }));
      this.cache.set(key, colors);
      return colors;
    } catch (jsonErr) {
      this._lastError = jsonErr;
    }
    try {
      const data = await withTimeout(this._fetchColorsFromSupabase(), PUBLIC_TIMEOUT_MS, 'public colors');
      this.cache.set(key, data);
      return data;
    } catch (e) {
      this._lastError = e;
      return [];
    }
  }

  async _fetchColorsFromSupabase() {
    const { data, error } = await supabase
      .from('colors').select('*').eq('is_active', true).order('sort_order');
    if (error) throw error;
    return data;
  }

  async _loadColorsFromSupabase() {
    if (this.colorsCache) return this.colorsCache;
    try {
      const data = await withTimeout(
        (async () => {
          const { data, error } = await supabase
            .from('colors').select('hex_code, russian_name, name').eq('is_active', true);
          if (error) throw error;
          return data;
        })(),
        PUBLIC_TIMEOUT_MS,
        'colors map'
      );
      const map = {};
      data.forEach(c => { map[c.hex_code.toUpperCase()] = c.russian_name || c.name; });
      this.colorsCache = map;
      return map;
    } catch (e) {
      console.warn('[productsService] colors map failed:', e.message);
      this.colorsCache = this.colorsCache || {};
      return this.colorsCache;
    }
  }

  // ────────────────────────────────────────────────────────────
  // Helpers (used by other services / search / stats)
  // ────────────────────────────────────────────────────────────

  async getProductsByCategory(categorySlug) {
    const allProducts = await this.getActiveProducts();
    const cats = await this.getActiveCategories();
    const cat = cats.find(c => c.slug === categorySlug);
    if (cat) {
      return allProducts.filter(p => p.category_id === cat.id);
    }
    // legacy size mapping fallback
    const sizeMap = { small: 'small', medium: 'medium', large: 'big' };
    const target = sizeMap[categorySlug];
    return allProducts.filter(p => p.size === target);
  }

  async getProductByArtikul(artikul) {
    const allProducts = await this.getActiveProducts();
    return allProducts.find(p => p.artikul === artikul);
  }

  mapSizeToRussian(size) {
    const m = { small: 'малая', medium: 'средняя', big: 'большая' };
    return m[size] || size;
  }

  getColorNameFromHex(hex) {
    if (!this.colorsCache || !hex) return hex;
    return this.colorsCache[hex.toUpperCase()] || hex;
  }

  async getColorsMap() {
    if (this.colorsCache) return this.colorsCache;
    return this._loadColorsFromSupabase();
  }

  async getProductsStats() {
    try {
      const { data, error } = await supabase.from('products').select('is_active, size');
      if (error) throw error;
      const stats = {
        total: data.length,
        active: data.filter(p => p.is_active).length,
        inactive: data.filter(p => !p.is_active).length,
        bySize: {},
      };
      data.forEach(p => {
        const sn = this.mapSizeToRussian(p.size);
        if (!stats.bySize[sn]) stats.bySize[sn] = { total: 0, active: 0 };
        stats.bySize[sn].total++;
        if (p.is_active) stats.bySize[sn].active++;
      });
      return stats;
    } catch (e) {
      console.error('Error fetching products stats:', e);
      throw e;
    }
  }

  async searchProducts(query) {
    const allProducts = await this.getActiveProducts();
    const q = query.toLowerCase();
    return allProducts.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.artikul || '').toLowerCase().includes(q) ||
      (p.color || '').toLowerCase().includes(q) ||
      (p.sizeType || '').toLowerCase().includes(q)
    );
  }

  async getGroupedProductsByCategories() {
    if (this.cache.has('groupedCategories')) return this.cache.get('groupedCategories');
    try {
      const response = await fetch(
        'https://bsndismiessofvhglzrv.supabase.co/functions/v1/group-products-by-categories',
        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to group products');
      this.cache.set('groupedCategories', result.data);
      return result.data;
    } catch (e) {
      console.error('Error grouping products by categories:', e);
      return this.getGroupedProductsByType();
    }
  }

  async getGroupedProductsByType() {
    const products = await this.getActiveProducts();
    const grouped = {};
    products.forEach(product => {
      let baseType = this.extractBaseType(product.name);
      if (!grouped[baseType]) {
        grouped[baseType] = { baseType, sizes: {}, mainImage: product.photos?.[0] || '', allPhotos: [] };
      }
      const size = this.mapSizeToRussian(product.size);
      if (!grouped[baseType].sizes[size]) {
        grouped[baseType].sizes[size] = { colors: [], price: product.price_rub, dimensions: product.dimensions };
      }
      grouped[baseType].sizes[size].colors.push({
        hex: product.color_hex,
        name: this.getColorNameFromHex(product.color_hex),
        artikul: product.artikul,
        photos: product.photos || [],
        price: product.price_rub,
      });
      if (product.photos) grouped[baseType].allPhotos.push(...product.photos);
    });
    return Object.values(grouped);
  }

  extractBaseType(fullName) {
    let baseName = (fullName || '')
      .replace(/\s+(Большая|Средняя|Малая)\s+/gi, ' ')
      .replace(/\s+(Big|Medium|Small)\s+/gi, ' ')
      .replace(/\s+[A-Za-z\s]+$/, '')
      .trim();
    if (baseName.includes('бантом на магнитах')) return 'Подарочная коробка с бантом на магнитах';
    if (baseName.includes('лентой')) return 'Подарочная коробка с лентой';
    if (baseName.includes('ручкой')) return 'Подарочная коробка с ручкой';
    return baseName;
  }

  clearCache() {
    this.cache.clear();
    this.colorsCache = null;
    clearLocalCatalogCache();
  }

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

  async _waitForLoading() {
    while (this.loading) {
      await new Promise(r => setTimeout(r, 100));
    }
  }
}

export const productsService = new ProductsService();
