import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { Resend } from "https://esm.sh/resend@3.2.0";

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
function generateOrderConfirmationEmail(order: any) {
  const { id, name, cart_items, subtotal, discount, total } = order;
  
  // Формирование HTML строк для товаров в корзине
  const cartItemsHtml = cart_items.map((item: any) => `
    <tr>
      <td style="padding: 10px; border: 1px solid #ddd;">${item.name}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${item.artikul || 'Н/Д'}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${item.quantity}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${item.price} ₽</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${item.quantity * item.price} ₽</td>
    </tr>
  `).join('');

  // ИСПРАВЛЕНО: Используем правильный URL для Edge Function
  const confirmationUrl = `${supabaseUrl}/functions/v1/order-confirmation?order_id=${id}`;
  console.log("Формируем ссылку подтверждения:", confirmationUrl);

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
        .button { display: inline-block; background-color: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; }
        .button:hover { background-color: #45a049; }
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
        
        <p><strong>Важно!</strong> Пожалуйста, подтвердите ваш заказ, нажав на кнопку ниже:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${confirmationUrl}" class="button" style="display: inline-block; background-color: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px;">ПОДТВЕРДИТЬ ЗАКАЗ</a>
        </p>
        
        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
          Если кнопка не работает, скопируйте и вставьте эту ссылку в браузер:<br>
          <a href="${confirmationUrl}" style="color: #4CAF50; word-break: break-all;">${confirmationUrl}</a>
        </p>
        
        <p>Если у вас возникли вопросы по заказу, пожалуйста, свяжитесь с нами.</p>
        <p>С уважением,<br>Команда поддержки Gift Box Shop</p>
      </div>
    </body>
    </html>
  `;
}

// Отправка уведомления в Telegram
async function sendTelegramNotification(message: string) {
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
async function updateGoogleSheets(order: any) {
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

    const googleScriptUrl = Deno.env.get("GOOGLE_SCRIPT_URL");
    
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
async function sendOrderConfirmationEmail(order: any) {
  try {
    const { email, name, id } = order;
    
    console.log("Attempting to send confirmation email to:", email);
    
    const data = await resend.emails.send({
      from: 'SMT Premium Box <noreply@giftboxopt.ru>',
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
function normalizeDeliveryValue(delivery: string | undefined): string {
  // Приводим к стандартным значениям, которые соответствуют ограничениям в базе
  if (!delivery) return 'delivery'; // значение по умолчанию
  
  if (delivery === 'pickup_moscow' || delivery === 'pickup_ershovo') {
    return 'pickup'; // обобщаем до просто "самовывоз"
  }
  
  return delivery; // оставляем как есть, если это уже стандартное значение
}

// Обработчик запросов
serve(async (req) => {
  console.log(`========== ORDER-PROCESSING ЗАПРОС ==========`);
  console.log(`Метод: ${req.method}`);
  console.log(`URL: ${req.url}`);
  console.log(`============================================`);
  
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
      
      console.log("Получены данные заказа:", orderData);
      
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

      // === B2B CLIENT MANAGEMENT ===
      // Normalize email and phone for consistent comparison
      const normalizedEmail = orderData.email.toLowerCase().trim();
      const normalizedPhone = orderData.phone.replace(/\D/g, ''); // Only digits
      
      console.log('Searching for client with email:', normalizedEmail, 'phone:', normalizedPhone);
      
      // Step 1: Check if client exists by email
      const { data: clientByEmail, error: emailError } = await supabase
        .from('b2b_clients')
        .select('*')
        .ilike('email', normalizedEmail)
        .maybeSingle();
      
      if (emailError) {
        console.error('Error checking for existing client by email:', emailError);
      }
      
      let client = clientByEmail;
      let foundBy = client ? 'email' : null;
      
      // Step 2: If not found by email, search by phone (last 10 digits)
      if (!client && normalizedPhone.length >= 10) {
        const phoneSearchPattern = normalizedPhone.slice(-10);
        console.log('Client not found by email, searching by phone pattern:', phoneSearchPattern);
        
        const { data: allClients, error: phoneError } = await supabase
          .from('b2b_clients')
          .select('*');
        
        if (phoneError) {
          console.error('Error checking for existing client by phone:', phoneError);
        } else if (allClients) {
          // Find client with matching phone (last 10 digits)
          client = allClients.find(c => {
            if (!c.phone) return false;
            const clientPhone = c.phone.replace(/\D/g, '');
            return clientPhone.slice(-10) === phoneSearchPattern;
          });
          
          if (client) {
            foundBy = 'phone';
            console.log('Found existing client by phone:', client.id);
          }
        }
      }
      
      let clientId = null;

      if (client) {
        clientId = client.id;
        console.log('Found existing client by', foundBy, ':', clientId);
        
        // Update email if found by phone and email differs (client corrected typo)
        if (foundBy === 'phone' && client.email?.toLowerCase() !== normalizedEmail) {
          console.log('Updating client email from', client.email, 'to', normalizedEmail);
          const { error: updateError } = await supabase
            .from('b2b_clients')
            .update({ 
              email: normalizedEmail,
              updated_at: new Date().toISOString()
            })
            .eq('id', clientId);
          
          if (updateError) {
            console.error('Error updating client email:', updateError);
          } else {
            console.log('Successfully updated client email');
          }
        }
        
        // Soft update: only update fields that are currently empty
        const updates: any = {};
        
        if (!client.phone && orderData.phone) {
          updates.phone = orderData.phone;
        }
        
        if (!client.contact_name && orderData.name) {
          updates.contact_name = orderData.name;
        }
        
        // Only update if there are fields to update
        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from('b2b_clients')
            .update(updates)
            .eq('id', clientId);
          
          if (updateError) {
            console.error('Error updating client:', updateError);
          } else {
            console.log('Updated existing client with new data:', updates);
          }
        }
      } else {
        // Create new client
        console.log('No existing client found, creating new one');
        const { data: newClient, error: createError } = await supabase
          .from('b2b_clients')
          .insert({
            email: normalizedEmail,
            phone: orderData.phone,
            contact_name: orderData.name,
            company_name: null
          })
          .select()
          .single();
        
        if (createError) {
          console.error('Error creating new client:', createError);
        } else if (newClient) {
          clientId = newClient.id;
          console.log('Created new client:', clientId);
        }
      }

      // Сохраняем заказ в базе данных Supabase с client_id
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          ...orderData,
          client_id: clientId,
          order_status: 'created',
          created_at: new Date().toISOString(),
          subscribe: orderData.subscribe !== undefined ? orderData.subscribe : true
        })
        .select()
        .single();
        
      if (error) {
        console.error("Error inserting order:", error);
        throw error;
      }
      
      console.log("Заказ создан успешно, начинаем отправку уведомлений...");
      
      // Формируем детальный список товаров для Telegram с суммами
      const cartItemsDetails = order.cart_items.map((item: any) => {
        const itemTotal = item.price * item.quantity;
        return `- ${item.name} (${item.color || 'Н/Д'}) Арт. ${item.artikul || 'Н/Д'} × ${item.quantity} = ${itemTotal} ₽`;
      }).join('\n');
      
      // Отправляем уведомление в Telegram с информацией о клиенте
      const telegramMessage = `
📦 *Новый заказ!*
${clientId ? `🏢 *Клиент ID:* \`${clientId}\`` : ''}
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
        console.log("Добавляем в очередь Telegram уведомление...");
        notificationPromises.push(sendTelegramNotification(telegramMessage));
      } catch (telegramError) {
        console.error("Failed to queue Telegram notification:", telegramError);
      }
      
      try {
        console.log("Добавляем в очередь обновление Google Sheets...");
        notificationPromises.push(updateGoogleSheets(order));
      } catch (sheetsError) {
        console.error("Failed to queue Google Sheets update:", sheetsError);
      }
      
      try {
        console.log("Добавляем в очередь отправку email подтверждения...");
        notificationPromises.push(sendOrderConfirmationEmail(order));
      } catch (emailError) {
        console.error("Failed to queue confirmation email:", emailError);
      }
      
      // Ждем завершения всех уведомлений
      const results = await Promise.allSettled(notificationPromises);
      console.log("Результаты уведомлений:", 
        results.map((r, i) => `${i}: ${r.status === 'fulfilled' ? 'успех' : r.reason}`));
      
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
      console.error("Ошибка обработки заказа:", error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error'
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
