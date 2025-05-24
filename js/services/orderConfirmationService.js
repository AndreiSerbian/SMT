
/**
 * Сервис для обработки подтверждения заказов
 * Отвечает за обновление статуса заказа и отправку уведомлений
 */
import { env } from '../utils/env.js';

export const orderConfirmationService = {
  /**
   * Основная функция для подтверждения заказа
   * @param {string} orderId - ID заказа для подтверждения
   * @param {HTMLButtonElement} button - Кнопка подтверждения (для изменения состояния)
   * @returns {Promise<boolean>} - Успешность операции
   */
  async confirmOrder(orderId, button = null) {
    try {
      // Блокируем кнопку и показываем состояние загрузки
      if (button) {
        this.setButtonLoading(button, true);
      }

      // Отправляем запрос на подтверждение заказа в Supabase Edge Function
      const response = await this.sendConfirmationRequest(orderId);
      
      // Проверяем успешность ответа от сервера
      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`);
      }

      // Парсим JSON ответ от сервера
      const result = await response.json();

      // Проверяем результат операции
      if (result.success) {
        // Показываем сообщение об успехе
        this.showSuccessMessage('Заказ успешно подтверждён!');
        
        // Обновляем интерфейс для подтверждённого заказа
        if (button) {
          this.setButtonConfirmed(button);
        }
        
        return true;
      } else {
        // Обрабатываем ошибку от сервера
        throw new Error(result.error || 'Неизвестная ошибка при подтверждении заказа');
      }

    } catch (error) {
      // Логируем ошибку для отладки
      console.error('Ошибка при подтверждении заказа:', error);
      
      // Показываем ошибку пользователю
      this.showErrorMessage(`Ошибка: ${error.message}`);
      
      // Возвращаем кнопку в исходное состояние
      if (button) {
        this.setButtonLoading(button, false);
      }
      
      return false;
    }
  },

  /**
   * Отправляет POST-запрос на Edge Function для подтверждения заказа
   * @param {string} orderId - ID заказа
   * @returns {Promise<Response>} - Промис с ответом сервера
   */
  async sendConfirmationRequest(orderId) {
    // Формируем URL для Edge Function подтверждения заказа
    const confirmationUrl = `${env.supabaseUrl}/functions/v1/order-confirmation`;
    
    // Отправляем POST-запрос с ID заказа
    return await fetch(confirmationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Добавляем anon key для авторизации в Supabase
        'Authorization': `Bearer ${env.supabaseAnonKey}`,
      },
      body: JSON.stringify({
        orderId: orderId
      })
    });
  },

  /**
   * Устанавливает состояние загрузки для кнопки
   * @param {HTMLButtonElement} button - Кнопка для изменения
   * @param {boolean} loading - Состояние загрузки
   */
  setButtonLoading(button, loading) {
    if (loading) {
      // Блокируем кнопку и меняем текст на "Обработка..."
      button.disabled = true;
      button.innerHTML = 'Обработка...';
      button.classList.add('opacity-50');
    } else {
      // Возвращаем кнопку в исходное состояние
      button.disabled = false;
      button.innerHTML = 'Подтвердить заказ';
      button.classList.remove('opacity-50');
    }
  },

  /**
   * Устанавливает состояние подтверждённого заказа для кнопки
   * @param {HTMLButtonElement} button - Кнопка для изменения
   */
  setButtonConfirmed(button) {
    // Блокируем кнопку и показываем успешное состояние
    button.disabled = true;
    button.innerHTML = '✓ Заказ подтверждён';
    button.classList.remove('bg-blue-200', 'hover:bg-blue-300');
    button.classList.add('bg-green-500', 'text-white');
  },

  /**
   * Показывает сообщение об успехе пользователю
   * @param {string} message - Текст сообщения
   */
  showSuccessMessage(message) {
    // Создаём временное уведомление об успехе
    const notification = this.createNotification(message, 'success');
    document.body.appendChild(notification);
    
    // Удаляем уведомление через 5 секунд
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  },

  /**
   * Показывает сообщение об ошибке пользователю
   * @param {string} message - Текст сообщения об ошибке
   */
  showErrorMessage(message) {
    // Создаём временное уведомление об ошибке
    const notification = this.createNotification(message, 'error');
    document.body.appendChild(notification);
    
    // Удаляем уведомление через 7 секунд (дольше для ошибок)
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 7000);
  },

  /**
   * Создаёт HTML элемент уведомления
   * @param {string} message - Текст уведомления
   * @param {string} type - Тип уведомления ('success' или 'error')
   * @returns {HTMLElement} - HTML элемент уведомления
   */
  createNotification(message, type) {
    // Создаём контейнер для уведомления
    const notification = document.createElement('div');
    
    // Базовые стили для уведомления
    notification.className = `
      fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm
      transform transition-all duration-300 ease-in-out
      ${type === 'success' 
        ? 'bg-green-100 text-green-800 border border-green-200' 
        : 'bg-red-100 text-red-800 border border-red-200'
      }
    `;
    
    // Добавляем текст уведомления
    notification.innerHTML = `
      <div class="flex items-center">
        <span class="mr-2">
          ${type === 'success' ? '✓' : '⚠️'}
        </span>
        <span>${message}</span>
      </div>
    `;
    
    return notification;
  },

  /**
   * Инициализирует обработчики событий для кнопок подтверждения
   * Автоматически находит все кнопки с атрибутом data-order-id
   */
  initializeConfirmationButtons() {
    // Находим все кнопки подтверждения на странице
    const confirmButtons = document.querySelectorAll('[data-order-id]');
    
    // Добавляем обработчик клика для каждой кнопки
    confirmButtons.forEach(button => {
      button.addEventListener('click', async (event) => {
        // Предотвращаем стандартное поведение ссылки/кнопки
        event.preventDefault();
        
        // Получаем ID заказа из data-атрибута
        const orderId = button.getAttribute('data-order-id');
        
        // Подтверждаем заказ
        await this.confirmOrder(orderId, button);
      });
    });
    
    console.log(`Инициализировано ${confirmButtons.length} кнопок подтверждения заказов`);
  }
};

// Автоматически инициализируем кнопки при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
  orderConfirmationService.initializeConfirmationButtons();
});

// Экспортируем сервис для использования в других модулях
window.orderConfirmationService = orderConfirmationService;
