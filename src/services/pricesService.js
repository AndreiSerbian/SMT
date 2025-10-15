/**
 * Сервис для работы с ценами товаров из Supabase
 */
import { supabase } from '../utils/supabase.js';

class PricesService {
  constructor() {
    this.priceCache = new Map();
    this.isLoading = false;
    this.hasError = false;
    this.realtimeChannel = null;
  }

  /**
   * Загружает цены из Supabase и объединяет с данными товаров
   * @param {Array} products - массив товаров из data.js
   * @returns {Promise<Array>} - товары с актуальными ценами
   */
  async loadProductsWithPrices(products) {
    try {
      this.isLoading = true;
      this.hasError = false;

      // Получаем цены из Supabase
      const { data: prices, error } = await supabase
        .from('product_prices')
        .select('product_id, price_rub');

      if (error) {
        console.error('Ошибка загрузки цен:', error);
        this.hasError = true;
        return this.fallbackToPriceDefault(products);
      }

      // Создаем карту цен для быстрого поиска
      const priceMap = new Map();
      prices?.forEach(price => {
        priceMap.set(price.product_id, price.price_rub);
        this.priceCache.set(price.product_id, price.price_rub);
      });

      // Объединяем товары с ценами
      const productsWithPrices = products.map(product => ({
        ...product,
        price: priceMap.get(product.id) ?? product.price_default
      }));

      this.isLoading = false;
      return productsWithPrices;

    } catch (error) {
      console.error('Критическая ошибка при загрузке цен:', error);
      this.hasError = true;
      this.isLoading = false;
      return this.fallbackToPriceDefault(products);
    }
  }

  /**
   * Возвращает товары с дефолтными ценами при ошибке
   */
  fallbackToPriceDefault(products) {
    return products.map(product => ({
      ...product,
      price: product.price_default
    }));
  }

  /**
   * Сохраняет новую цену товара (только для админов)
   * @param {string} productId - ID товара
   * @param {number} newPrice - новая цена
   * @returns {Promise<boolean>} - успешность операции
   */
  async savePrice(productId, newPrice) {
    try {
      const price = Number(newPrice);
      
      if (isNaN(price) || price < 0) {
        throw new Error('Некорректная цена');
      }

      const { error } = await supabase
        .from('product_prices')
        .upsert({ 
          product_id: productId, 
          price_rub: price 
        }, { 
          onConflict: 'product_id' 
        });

      if (error) {
        console.error('Ошибка сохранения цены:', error);
        return false;
      }

      // Обновляем кэш
      this.priceCache.set(productId, price);
      return true;

    } catch (error) {
      console.error('Ошибка при сохранении цены:', error);
      return false;
    }
  }

  /**
   * Получает текущую цену товара
   * @param {string} productId - ID товара
   * @returns {number|null} - цена или null если не найдена
   */
  getPrice(productId) {
    return this.priceCache.get(productId) || null;
  }

  /**
   * Подписывается на realtime обновления цен
   * @param {Function} onPriceUpdate - коллбек при обновлении цены
   */
  subscribeToRealtimeUpdates(onPriceUpdate) {
    if (this.realtimeChannel) {
      this.unsubscribeFromRealtime();
    }

    this.realtimeChannel = supabase
      .channel('product_prices_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_prices'
        },
        (payload) => {
          console.log('Обновление цены:', payload);
          
          const { product_id, price_rub } = payload.new || payload.old;
          
          if (payload.eventType === 'DELETE') {
            this.priceCache.delete(product_id);
          } else {
            this.priceCache.set(product_id, price_rub);
          }
          
          if (onPriceUpdate) {
            onPriceUpdate(product_id, price_rub, payload.eventType);
          }
        }
      )
      .subscribe();
  }

  /**
   * Отписывается от realtime обновлений
   */
  unsubscribeFromRealtime() {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  /**
   * Показывает баннер о том, что цены уточняются
   */
  showPriceUpdateBanner() {
    const existingBanner = document.getElementById('price-update-banner');
    if (existingBanner) return;

    const banner = document.createElement('div');
    banner.id = 'price-update-banner';
    banner.className = 'fixed top-0 left-0 right-0 bg-yellow-500 text-black text-center py-2 z-50';
    banner.innerHTML = `
      <p class="text-sm font-medium">
        ⚠️ Цены уточняются. Показаны базовые цены.
        <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-black hover:text-gray-700">✕</button>
      </p>
    `;
    
    document.body.prepend(banner);
    
    // Автоматически убираем баннер через 10 секунд
    setTimeout(() => {
      banner?.remove();
    }, 10000);
  }

  /**
   * Проверяет статус загрузки
   */
  get status() {
    return {
      isLoading: this.isLoading,
      hasError: this.hasError,
      cacheSize: this.priceCache.size
    };
  }
}

// Экспортируем единственный экземпляр сервиса
export const pricesService = new PricesService();