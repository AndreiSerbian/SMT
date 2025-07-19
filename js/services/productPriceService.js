import { supabase } from '../utils/supabase.js';
import { products as staticProducts } from '../data/products.js';

/**
 * Сервис для работы с динамическими ценами товаров из Supabase
 */
export async function fetchProducts() {
  try {
    // Получаем цены из Supabase
    const { data: rows, error } = await supabase
      .from('product_prices')
      .select('product_id, price_rub');

    if (error) {
      console.error('Ошибка загрузки цен:', error);
    }

    // Создаем карту цен
    const priceMap = Object.fromEntries((rows ?? []).map(r => [r.product_id, r.price_rub]));

    // Склеиваем статические товары с ценами
    return staticProducts.map(p => ({
      ...p,
      price: priceMap[p.id] // может быть undefined
    }));
  } catch (error) {
    console.error('Критическая ошибка загрузки товаров:', error);
    // Возвращаем товары без цен
    return staticProducts.map(p => ({
      ...p,
      price: undefined
    }));
  }
}

/**
 * Сохранение цены товара (только для админов)
 */
export async function savePrice(productId, newPrice) {
  try {
    const { error } = await supabase
      .from('product_prices')
      .upsert({ 
        product_id: productId, 
        price_rub: Number(newPrice) 
      }, { 
        onConflict: 'product_id' 
      });

    if (error) {
      console.error('Ошибка сохранения цены:', error);
      throw new Error(error.message);
    }

    return true;
  } catch (error) {
    throw new Error(`Не удалось сохранить цену: ${error.message}`);
  }
}