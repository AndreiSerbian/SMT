// В этом файле оставим функциональность для прямой отправки уведомлений,
// но она больше не будет использоваться для оформления заказов,
// так как теперь это делается через Supabase Edge Functions.

import { productsService } from './productsService.js';

export const NotificationService = {
  async sendTelegramMessage(message, isAdminNotification = false) {
    try {
      const functionName = isAdminNotification ? 'admin-notify' : 'contact-notify';
      const response = await fetch(`https://bsndismiessofvhglzrv.supabase.co/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzbmRpc21pZXNzb2Z2aGdsenJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2ODYyNTIsImV4cCI6MjA1NDI2MjI1Mn0.4pumjrK8SV79xaegTEZaJMmi6lnp-_5uhSytvWpoZHY'
        },
        body: JSON.stringify({ message })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      throw error;
    }
  },

  // Форматирование товара для сообщения
  async formatProductForMessage(item) {
    try {
      const allProducts = await productsService.getActiveProducts();
      const product = allProducts.find(p => p.id === item.id);
      return product ? 
        `${product.name} (${product.color}, ${product.sizeType}) - ${item.quantity} шт.` :
        `Товар ID: ${item.id} - ${item.quantity} шт.`;
    } catch (error) {
      console.error('Ошибка получения данных товара:', error);
      return `Товар ID: ${item.id} - ${item.quantity} шт.`;
    }
  },

  // Форматирование корзины для сообщения
  async formatCartForMessage(cartItems) {
    if (!cartItems || cartItems.length === 0) return 'Корзина пуста';
    
    const formattedItems = await Promise.all(
      cartItems.map(item => this.formatProductForMessage(item))
    );
    
    return formattedItems.join('\n');
  }
};

export const notificationService = {
  // Отправка уведомления в Телеграм (устаревший метод)
  async sendTelegramNotification(order) {
    const botToken = "7304653990:AAE0bmI6O8L_8-9WlBplisvFiy-lOoNLtSQ";
    const chatId = "-4656195871"; // ID чата или группы
    
    const allProducts = await productsService.getActiveProducts();
    
    const message = `
📦 *Новый заказ!*
👤 *Имя:* ${order.customerName}
📞 *Телефон:* ${order.phone}
✉️ *Email:* ${order.email}
🏠 *Адрес:* ${order.yandexAddress || 'Не указан'}
🛍 *Товары:* ${order.cart.map(item => {
  const product = allProducts.find(p => p.id === item.id);
  return product ? `\n- ${product.name} (${product.color}) [Артикул: ${product.artikul}] x${item.quantity}` : '';
}).join('')}
💰 *Сумма заказа:* ${order.total ? `${order.total} ₽` : 'Ошибка при расчете суммы'}
💳 *Оплата:* ${order.payment === 'cash' ? 'Наличными' : 'Перевод'}
🚚 *Доставка:* ${order.delivery === 'delivery' ? 'Курьер' : 'Самовывоз'}
📝 *Комментарий:* ${order.comment || 'Без комментария'}
`;

    fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    }).catch(error => console.error('Error sending Telegram notification:', error));
  }
};