
/**
 * Пример использования сервиса подтверждения заказов
 * Демонстрирует различные способы интеграции в веб-приложение
 */

// Импортируем сервис подтверждения заказов
import { orderConfirmationService } from '../services/orderConfirmationService.js';

/**
 * Пример 1: Использование с HTML кнопкой с data-атрибутом
 * 
 * HTML:
 * <button 
 *   data-order-id="12345" 
 *   class="bg-blue-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-blue-300"
 * >
 *   Подтвердить заказ
 * </button>
 * 
 * JavaScript автоматически найдёт эту кнопку и добавит обработчик
 */

/**
 * Пример 2: Программное подтверждение заказа
 */
async function confirmOrderProgrammatically() {
  const orderId = "12345"; // ID заказа из вашей системы
  
  // Находим кнопку (опционально)
  const button = document.getElementById('confirm-button');
  
  // Подтверждаем заказ
  const success = await orderConfirmationService.confirmOrder(orderId, button);
  
  if (success) {
    console.log('Заказ успешно подтверждён!');
    // Дополнительная логика после подтверждения
  } else {
    console.log('Ошибка при подтверждении заказа');
    // Обработка ошибки
  }
}

/**
 * Пример 3: Использование в email письме
 * 
 * В HTML email можно использовать ссылку:
 * <a href="https://your-site.com/confirm-order?id=12345" 
 *    style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none;">
 *   Подтвердить заказ
 * </a>
 * 
 * На странице подтверждения:
 */
function handleEmailConfirmation() {
  // Получаем ID заказа из URL
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');
  
  if (orderId) {
    // Автоматически подтверждаем заказ при переходе по ссылке
    orderConfirmationService.confirmOrder(orderId)
      .then(success => {
        if (success) {
          // Показываем страницу успешного подтверждения
          document.body.innerHTML = `
            <div class="text-center p-8">
              <h1 class="text-2xl font-bold text-green-600 mb-4">
                ✓ Заказ подтверждён!
              </h1>
              <p class="text-gray-600">
                Спасибо за подтверждение заказа №${orderId}
              </p>
            </div>
          `;
        }
      });
  }
}

/**
 * Пример 4: Обработка множественных заказов
 */
async function confirmMultipleOrders(orderIds) {
  const results = [];
  
  // Подтверждаем заказы последовательно
  for (const orderId of orderIds) {
    console.log(`Подтверждаем заказ ${orderId}...`);
    const success = await orderConfirmationService.confirmOrder(orderId);
    results.push({ orderId, success });
    
    // Небольшая пауза между запросами
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('Результаты подтверждения:', results);
  return results;
}

/**
 * Пример 5: Интеграция с системой уведомлений
 */
function setupCustomNotifications() {
  // Переопределяем методы показа уведомлений
  const originalShowSuccess = orderConfirmationService.showSuccessMessage;
  const originalShowError = orderConfirmationService.showErrorMessage;
  
  orderConfirmationService.showSuccessMessage = function(message) {
    // Используем вашу систему уведомлений
    if (window.showToast) {
      window.showToast(message, 'success');
    } else {
      // Fallback к оригинальному методу
      originalShowSuccess.call(this, message);
    }
  };
  
  orderConfirmationService.showErrorMessage = function(message) {
    // Используем вашу систему уведомлений
    if (window.showToast) {
      window.showToast(message, 'error');
    } else {
      // Fallback к оригинальному методу
      originalShowError.call(this, message);
    }
  };
}

// Экспортируем примеры для использования
export {
  confirmOrderProgrammatically,
  handleEmailConfirmation,
  confirmMultipleOrders,
  setupCustomNotifications
};
