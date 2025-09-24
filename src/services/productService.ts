import { supabase } from "@/integrations/supabase/client";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sort_order: number;
}

export interface Color {
  id: string;
  name: string;
  slug: string;
  hex_code: string;
  sort_order: number;
}

export interface ProductImage {
  id: string;
  product_id: string;
  storage_path: string;
  url: string;
  alt_text?: string;
  sort_order: number;
  is_primary: boolean;
}

export interface ProductVideo {
  id: string;
  product_id: string;
  storage_path: string;
  url: string;
  title?: string;
  sort_order: number;
}

export interface Product {
  id: string;
  legacy_id?: string;
  artikul?: string;
  id_wb?: string;
  name: string;
  category_id?: string;
  color_id?: string;
  size_type: string;
  dimensions?: string;
  weight?: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  
  // Relations
  category?: Category;
  color?: Color;
  images?: ProductImage[];
  videos?: ProductVideo[];
  
  // Legacy compatibility fields
  photo?: string[];
  videos_legacy?: string[];
}

class ProductService {
  private cache = new Map<string, any>();
  private cacheExpiry = new Map<string, number>();
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return expiry ? expiry > Date.now() : false;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION);
  }

  private getCache(key: string): any {
    if (this.isCacheValid(key)) {
      return this.cache.get(key);
    }
    return null;
  }

  async getCategories(): Promise<Category[]> {
    const cacheKey = 'categories';
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order');

    if (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }

    this.setCache(cacheKey, data || []);
    return data || [];
  }

  async getColors(): Promise<Color[]> {
    const cacheKey = 'colors';
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    const { data, error } = await supabase
      .from('colors')
      .select('*')
      .order('sort_order');

    if (error) {
      console.error('Error fetching colors:', error);
      throw error;
    }

    this.setCache(cacheKey, data || []);
    return data || [];
  }

  async getProducts(): Promise<Product[]> {
    const cacheKey = 'products';
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

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
      console.error('Error fetching products:', error);
      throw error;
    }

    // Transform to legacy format for backward compatibility
    const transformedProducts = (data || []).map(product => ({
      ...product,
      // Legacy compatibility fields
      photo: product.images?.map(img => img.url) || [],
      videos_legacy: product.videos?.map(video => video.url) || [],
    }));

    this.setCache(cacheKey, transformedProducts);
    return transformedProducts;
  }

  async getProductById(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        color:colors(*),
        images:product_images(*),
        videos:product_videos(*)
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return null;
      }
      console.error('Error fetching product:', error);
      throw error;
    }

    // Transform to legacy format
    return {
      ...data,
      photo: data.images?.map(img => img.url) || [],
      videos_legacy: data.videos?.map(video => video.url) || [],
    };
  }

  async getProductByLegacyId(legacyId: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        color:colors(*),
        images:product_images(*),
        videos:product_videos(*)
      `)
      .eq('legacy_id', legacyId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return null;
      }
      console.error('Error fetching product by legacy ID:', error);
      throw error;
    }

    return {
      ...data,
      photo: data.images?.map(img => img.url) || [],
      videos_legacy: data.videos?.map(video => video.url) || [],
    };
  }

  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        color:colors(*),
        images:product_images(*),
        videos:product_videos(*)
      `)
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      console.error('Error fetching products by category:', error);
      throw error;
    }

    return (data || []).map(product => ({
      ...product,
      photo: product.images?.map(img => img.url) || [],
      videos_legacy: product.videos?.map(video => video.url) || [],
    }));
  }

  async getProductsByColor(colorId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        color:colors(*),
        images:product_images(*),
        videos:product_videos(*)
      `)
      .eq('color_id', colorId)
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      console.error('Error fetching products by color:', error);
      throw error;
    }

    return (data || []).map(product => ({
      ...product,
      photo: product.images?.map(img => img.url) || [],
      videos_legacy: product.videos?.map(video => video.url) || [],
    }));
  }

  // Create legacy colorMap for backward compatibility
  async getLegacyColorMap(): Promise<Record<string, string>> {
    const colors = await this.getColors();
    const colorMap: Record<string, string> = {};
    colors.forEach(color => {
      colorMap[color.name] = color.hex_code;
    });
    return colorMap;
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}

export const productService = new ProductService();