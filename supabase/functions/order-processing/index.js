
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { Resend } from "npm:resend@1.0.0";

// Конфигурация CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Инициализация Resend для отправки email
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
console.log("Resend initialized with API key:", Deno.env.get("RESEND_API_KEY") ? "API key provided" : "No API key");

// Инициализация Supabase клиента
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ID таблицы Google Sheets
const GOOGLE_SHEETS_ID = Deno.env.get("GOOGLE_SHEETS_ID");

// Конфигурация Telegram бота
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_TOKEN") || "";
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID") || "";
console.log("Telegram config:", TELEGRAM_BOT_TOKEN ? "Token provided" : "No token", TELEGRAM_CHAT_ID ? "Chat ID provided" : "No chat ID");

// Генерация содержимого email для подтверждения заказа
function generateOrderConfirmationEmail(order) {
  const { id, name, cart_items, subtotal, discount, total } = order;
  
  // Формирование HTML строк для товаров в корзине
  const cartItemsHtml = cart_items.map((item) => `
    <tr>
      <td style="padding: 10px; border: 1px solid #ddd;">${item.name}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${item.artikul || 'Н/Д'}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${item.quantity}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${item.price} ₽</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${item.quantity * item.price} ₽</td>
    </tr>
  `).join('');

  const publicSiteUrl = Deno.env.get("PUBLIC_SITE_URL") || supabaseUrl;

  // Формирование HTML для всего письма
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Подтверждение заказа</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background-color: #f2f2f2; text-align: left; padding: 10px; border: 1px solid #ddd; }
        .total { font-weight: bold; }
        .button { display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Подтверждение заказа №${id}</h1>
        <p>Здравствуйте, ${name}!</p>
        <p>Спасибо за ваш заказ. Пожалуйста, проверьте детали заказа ниже:</p>
        
        <table>
          <thead>
            <tr>
              <th>Наименование</th>
              <th>Артикул</th>
              <th>Количество</th>
              <th>Цена за шт.</th>
              <th>Итого</th>
            </tr>
          </thead>
          <tbody>
            ${cartItemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" class="total" style="text-align: right; padding: 10px; border: 1px solid #ddd;">Подытог:</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${subtotal} ₽</td>
            </tr>
            <tr>
              <td colspan="4" class="total" style="text-align: right; padding: 10px; border: 1px solid #ddd;">Скидка:</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${discount || 0} ₽</td>
            </tr>
            <tr>
              <td colspan="4" class="total" style="text-align: right; padding: 10px; border: 1px solid #ddd;">Итого:</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${total} ₽</td>
            </tr>
          </tfoot>
        </table>
        
        <p>Пожалуйста, подтвердите ваш заказ, нажав на кнопку ниже:</p>
        <a href="${publicSiteUrl}/functions/v1/order-confirmation?order_id=${id}" class="button" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Подтвердить заказ</a>
        
        <p>Если у вас возникли вопросы по заказу, пожалуйста, свяжитесь с нами.</p>
        <p>С уважением,<br>Команда поддержки</p>
      </div>
    </body>
    </html>
  `;
}

// Отправка уведомления в Telegram
async function sendTelegramNotification(message) {
  try {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.log("Telegram notification skipped: Missing token or chat ID");
      return { skipped: true, reason: "Missing token or chat ID" };
    }

    console.log("Sending Telegram notification to chat:", TELEGRAM_CHAT_ID);
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "Markdown"
      })
    });
    
    const result = await response.json();
    console.log("Telegram notification sent:", result);
    return result;
  } catch (error) {
    console.error("Error sending Telegram notification:", error);
    throw error;
  }
}

// Обновление данных в Google Sheets
async function updateGoogleSheets(order) {
  try {
    // Формирование данных для отправки в Sheets API
    const sheetValues = [
      order.id,
      order.name,
      order.phone,
      order.email,
      order.yandex_address || "Не указан",
      order.payment || "Не указан",
      order.delivery || "Не указан",
      JSON.stringify(order.cart_items),
      order.subtotal,
      order.discount || 0,
      order.total,
      order.order_status,
      order.created_at,
      order.confirmed_at || ""
    ];

    const googleScriptUrl = Deno.env.get("GOOGLE_SCRIPT_URL") || "";
    
    if (!googleScriptUrl || !GOOGLE_SHEETS_ID) {
      console.log("Google Sheets update skipped: Missing script URL or sheet ID");
      return { skipped: true, reason: "Missing script URL or sheet ID" };
    }
    
    const response = await fetch(googleScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sheetId: GOOGLE_SHEETS_ID,
        action: 'addOrUpdateOrder',
        orderData: sheetValues
      })
    });
    
    const result = await response.json();
    console.log("Google Sheets update result:", result);
    return result;
  } catch (error) {
    console.error("Error updating Google Sheets:", error);
    throw error;
  }
}

// Отправка email подтверждения
async function sendOrderConfirmationEmail(order) {
  try {
    const { email, name, id } = order;
    
    console.log("Attempting to send confirmation email to:", email);
    
    const data = await resend.emails.send({
      from: 'Подтверждение заказа <onboarding@resend.dev>',
      to: email,
      subject: `Подтвердите ваш заказ №${id}`,
      html: generateOrderConfirmationEmail(order),
    });
    
    console.log("Email sent successfully:", data);
    return data;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

// Нормализация значения доставки в соответствии с ограничениями базы данных
function normalizeDeliveryValue(delivery) {
  // Приводим к стандартным значениям, которые соответствуют ограничениям в базе
  if (!delivery) return 'delivery'; // значение по умолчанию
  
  if (delivery === 'pickup_moscow' || delivery === 'pickup_ershovo') {
    return 'pickup'; // обобщаем до просто "самовывоз"
  }
  
  return delivery; // оставляем как есть, если это уже стандартное значение
}

// Обработчик запросов
serve(async (req) => {
  // Обработка CORS preflight запросов
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Маршрутизация запросов
  const url = new URL(req.url);
  
  // Обработка создания нового заказа
  if (url.pathname === "/order-processing" && req.method === "POST") {
    try {
      const requestBody = await req.json();
      const { orderData } = requestBody;
      
      console.log("Received order data:", orderData);
      
      // Проверяем, что cart_items - это массив объектов, а не строка
      if (typeof orderData.cart_items === 'string') {
        console.warn("Warning: cart_items is a string, converting to JSON");
        try {
          orderData.cart_items = JSON.parse(orderData.cart_items);
        } catch (parseError) {
          console.error("Error parsing cart_items string:", parseError);
          throw new Error("Invalid cart_items format");
        }
      }
      
      // Убедимся, что cart_items - это массив
      if (!Array.isArray(orderData.cart_items)) {
        console.error("cart_items is not an array:", orderData.cart_items);
        throw new Error("cart_items must be an array");
      }
      
      // Нормализуем значение доставки
      orderData.delivery = normalizeDeliveryValue(orderData.delivery);
      console.log("Normalized delivery value:", orderData.delivery);

      // Сохраняем заказ в базе данных Supabase
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          ...orderData,
          order_status: 'created', // Используем 'created' в соответствии с CHECK CONSTRAINT
          created_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (error) {
        console.error("Error inserting order:", error);
        throw error;
      }
      
      console.log("Order created successfully:", order);
      
      // Формируем детальный список товаров для Telegram с суммами
      const cartItemsDetails = order.cart_items.map((item) => {
        const itemTotal = item.price * item.quantity;
        return `- ${item.name} (${item.color || 'Н/Д'}) Арт. ${item.artikul || 'Н/Д'} × ${item.quantity} = ${itemTotal} ₽`;
      }).join('\n');
      
      // Отправляем уведомление в Telegram
      const telegramMessage = `
📦 *Новый заказ!*
👤 *Имя:* ${order.name}
📞 *Телефон:* ${order.phone}
✉️ *Email:* ${order.email}
🏠 *Адрес:* ${order.yandex_address || 'Не указан'}

🛒 *Товары:*
${cartItemsDetails}

💰 *Подытог:* ${order.subtotal} ₽
🏷️ *Скидка:* ${order.discount || 0} ₽
💵 *Итого:* ${order.total} ₽
💳 *Оплата:* ${order.payment === 'cash' ? 'Наличными' : 'Перевод'}
🚚 *Доставка:* ${order.delivery === 'delivery' ? 'Курьер' : 'Самовывоз'}
${order.comment ? `📝 *Комментарий:* ${order.comment}` : ''}
      `;
      
      // Отправляем все уведомления асинхронно и параллельно
      const notificationPromises = [];
      
      try {
        notificationPromises.push(sendTelegramNotification(telegramMessage));
        console.log("Telegram notification queued");
      } catch (telegramError) {
        console.error("Failed to queue Telegram notification:", telegramError);
      }
      
      try {
        notificationPromises.push(updateGoogleSheets(order));
        console.log("Google Sheets update queued");
      } catch (sheetsError) {
        console.error("Failed to queue Google Sheets update:", sheetsError);
      }
      
      try {
        notificationPromises.push(sendOrderConfirmationEmail(order));
        console.log("Confirmation email queued");
      } catch (emailError) {
        console.error("Failed to queue confirmation email:", emailError);
      }
      
      // Ждем завершения всех уведомлений
      const results = await Promise.allSettled(notificationPromises);
      console.log("Notification results:", 
        results.map((r, i) => `${i}: ${r.status === 'fulfilled' ? 'success' : r.reason}`));
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Заказ успешно создан и обработан",
          order 
        }),
        { 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          } 
        }
      );
    } catch (error) {
      console.error("Error processing order:", error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message 
        }),
        { 
          status: 500,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          } 
        }
      );
    }
  }
  
  // Неизвестный маршрут
  return new Response(
    JSON.stringify({ 
      error: "Unknown route" 
    }),
    { 
      status: 404,
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders
      } 
    }
  );
});
