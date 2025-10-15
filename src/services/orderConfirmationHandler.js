
/**
 * Обработчик подтверждения заказов с генерацией уникальных номеров
 * Работает полностью на клиентской стороне без перезагрузок страницы
 */
import { env } from '../utils/env.js';

export const OrderConfirmationHandler = {
  /**
   * Главная функция обработки подтверждения заказа
   * @param {string} orderId - ID заказа для подтверждения
   * @param {HTMLButtonElement} button - Кнопка подтверждения
   */
  async confirmOrder(orderId, button) {
    try {
      // Показываем состояние загрузки
      this.setButtonLoading(button, true);

      // 1. Подсчёт количества заказов на сегодня
      const todayOrdersCount = await this.getTodayOrdersCount();
      console.log(`Количество заказов на сегодня: ${todayOrdersCount}`);

      // 2. Формирование уникального номера заказа
      const orderNumber = this.generateOrderNumber(todayOrdersCount + 1);
      console.log(`Сгенерированный номер заказа: ${orderNumber}`);

      // 3. Обновление заказа в Supabase
      const updateResult = await this.updateOrderInSupabase(orderId, orderNumber);
      
      if (!updateResult.success) {
        throw new Error(`Ошибка обновления заказа: ${updateResult.error}`);
      }

      // 4. Отправка Telegram-сообщения
      await this.sendTelegramNotification(orderNumber);

      // 5. UI-обновление: замена кнопки на благодарность
      this.updateUIAfterConfirmation(button);

      console.log(`Заказ ${orderNumber} успешно подтверждён`);
      return true;

    } catch (error) {
      console.error('Ошибка при подтверждении заказа:', error);
      
      // Показываем ошибку пользователю
      this.showErrorMessage(`Ошибка: ${error.message}`);
      
      // Возвращаем кнопку в исходное состояние
      this.setButtonLoading(button, false);
      
      return false;
    }
  },

  /**
   * Подсчёт количества заказов, подтверждённых сегодня
   * Отправляет запрос в Supabase для подсчёта заказов с confirmed_at на сегодня
   */
  async getTodayOrdersCount() {
    // Получаем сегодняшнюю дату в формате YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    
    const response = await fetch(`${env.supabaseUrl}/rest/v1/orders?select=count()&confirmed_at=gte.${today}T00:00:00&confirmed_at=lte.${today}T23:59:59`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.supabaseAnonKey}`,
        'apikey': env.supabaseAnonKey,
        'Prefer': 'count=exact'
      }
    });

    if (!response.ok) {
      throw new Error(`Ошибка получения количества заказов: ${response.status}`);
    }

    // Получаем количество из заголовка Content-Range
    const contentRange = response.headers.get('Content-Range');
    if (contentRange) {
      const count = parseInt(contentRange.split('/')[1]) || 0;
      return count;
    }
    
    return 0;
  },

  /**
   * Формирование уникального номера заказа в формате ГГГГ-ММ-ДД-N
   * @param {number} sequenceNumber - Порядковый номер заказа на день
   */
  generateOrderNumber(sequenceNumber) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}-${sequenceNumber}`;
  },

  /**
   * Обновление заказа в Supabase
   * Устанавливает status = 'confirmed', confirmed_at и order_number
   * @param {string} orderId - ID заказа
   * @param {string} orderNumber - Номер заказа
   */
  async updateOrderInSupabase(orderId, orderNumber) {
    const updateData = {
      order_status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      order_number: orderNumber
    };

    const response = await fetch(`${env.supabaseUrl}/rest/v1/orders?id=eq.${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.supabaseAnonKey}`,
        'apikey': env.supabaseAnonKey,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`
      };
    }

    return { success: true };
  },

  /**
   * Отправка уведомления через Telegram-бота
   * @param {string} orderNumber - Номер подтверждённого заказа
   */
  async sendTelegramNotification(orderNumber) {
    // Проверяем наличие конфигурации Telegram
    if (!env.telegramToken || !env.telegramChatId) {
      console.warn('Telegram конфигурация отсутствует, уведомление не отправлено');
      return;
    }

    const message = `Заказ №${orderNumber} подтверждён`;

    try {
      const response = await fetch(`https://api.telegram.org/bot${env.telegramToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: env.telegramChatId,
          text: message
        })
      });

      if (!response.ok) {
        console.error('Ошибка отправки Telegram уведомления:', response.status);
      } else {
        console.log('Telegram уведомление отправлено успешно');
      }
    } catch (error) {
      console.error('Ошибка при отправке Telegram уведомления:', error);
    }
  },

  /**
   * Устанавливает состояние загрузки для кнопки
   * @param {HTMLButtonElement} button - Кнопка для изменения
   * @param {boolean} loading - Состояние загрузки
   */
  setButtonLoading(button, loading) {
    if (loading) {
      button.disabled = true;
      button.innerHTML = 'Обработка...';
      button.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
      button.disabled = false;
      button.innerHTML = 'Подтвердить заказ';
      button.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  },

  /**
   * UI-обновление после успешного подтверждения
   * Заменяет кнопку на сообщение благодарности
   * @param {HTMLButtonElement} button - Кнопка для замены
   */
  updateUIAfterConfirmation(button) {
    // Создаём элемент с благодарностью
    const thankYouMessage = document.createElement('div');
    thankYouMessage.className = 'text-green-600 font-semibold text-center py-2 px-4 bg-green-50 rounded border border-green-200';
    thankYouMessage.innerHTML = '✓ Спасибо, что выбрали нас';

    // Заменяем кнопку на сообщение
    button.parentNode.replaceChild(thankYouMessage, button);
  },

  /**
   * Показывает сообщение об ошибке пользователю
   * @param {string} message - Текст ошибки
   */
  showErrorMessage(message) {
    // Создаём временное уведомление об ошибке
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm bg-red-100 text-red-800 border border-red-200';
    notification.innerHTML = `
      <div class="flex items-center">
        <span class="mr-2">⚠️</span>
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(notification);

    // Удаляем уведомление через 7 секунд
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 7000);
  },

  /**
   * Инициализирует обработчики событий для кнопок подтверждения
   * Автоматически находит все кнопки с атрибутом data-order-id
   */
  initializeConfirmationButtons() {
    const confirmButtons = document.querySelectorAll('[data-order-id]');
    
    confirmButtons.forEach(button => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        
        const orderId = button.getAttribute('data-order-id');
        if (!orderId) {
          console.error('Отсутствует data-order-id у кнопки');
          return;
        }
        
        await this.confirmOrder(orderId, button);
      });
    });
    
    console.log(`Инициализировано ${confirmButtons.length} кнопок подтверждения заказов`);
  }
};

// Автоматически инициализируем кнопки при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
  OrderConfirmationHandler.initializeConfirmationButtons();
});

// Экспортируем обработчик для использования в других модулях
window.OrderConfirmationHandler = OrderConfirmationHandler;
