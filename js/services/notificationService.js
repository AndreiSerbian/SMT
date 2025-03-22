
// В этом файле оставим функциональность для прямой отправки уведомлений,
// но она больше не будет использоваться для оформления заказов,
// так как теперь это делается через Supabase Edge Functions.

import { products } from '../data/products.js';

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
