
// В этом файле оставим функциональность для прямой отправки уведомлений,
// но она больше не будет использоваться для оформления заказов,
// так как теперь это делается через Supabase Edge Functions.

import { products } from '../data/products.js';

export const NotificationService = {
  async sendTelegramMessage(message, isAdminNotification = false) {
    try {
      const functionName = isAdminNotification ? 'admin-notify' : 'contact-notify';
      const response = await fetch(`https://bsndismiessofvhglzrv.supabase.co/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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
  }
};

export const notificationService = {
  // Отправка уведомления в Телеграм
  sendTelegramNotification(order) {
    const botToken = "7304653990:AAE0bmI6O8L_8-9WlBplisvFiy-lOoNLtSQ";
    const chatId = "-4656195871"; // ID чата или группы
    const message = `
📦 *Новый заказ!*
👤 *Имя:* ${order.customerName}
📞 *Телефон:* ${order.phone}
✉️ *Email:* ${order.email}
🏠 *Адрес:* ${order.yandexAddress || 'Не указан'}
🛍 *Товары:* ${order.cart.map(item => {
  const product = products.find(p => p.id === item.id);
  return product ? `\n- ${product.name} (${product.color}) [Артикул: ${product.artikul}] x${item.quantity}` : '';
}).join('')}
💰 *Сумма заказа:* ${order.total ? `${order.total} ₽` : 'Ошибка при расчете суммы'}
💳 *Оплата:* ${order.payment === 'cash' ? 'Наличными' : 'Перевод'}
🚚 *Доставка:* ${order.delivery === 'delivery' ? 'Курьер' : 'Самовывоз'}
📝 *Комментарий:* ${order.comment || 'Без комментария'}
`;

    fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown"
      })
    })
    .then(response => response.json())
    .then(data => {
      console.log("Уведомление отправлено в Телеграм:", data);
    })
    .catch(error => {
      console.error("Ошибка отправки в Телеграм:", error);
    });
  }
};
