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

const ALL_SIDES = ['top', 'bottom', 'left', 'right', 'front', 'back', 'inside'];
const SIDE_LABELS_RU: Record<string, string> = {
  top: 'Верх', bottom: 'Низ', left: 'Лево', right: 'Право',
  front: 'Перед', back: 'Зад', inside: 'Внутри',
};

// Генерация содержимого email для подтверждения заказа
function generateOrderConfirmationEmail(order: any) {
  const { id, name, cart_items, subtotal, discount, total } = order;
  
  const cartItemsHtml = cart_items.map((item: any) => {
    let designInfo = '';
    if (item.design_id) {
      const customized = item.customized_sides || [];
      const nonCustomized = ALL_SIDES.filter(s => !customized.includes(s));
      designInfo = `<br><small>🎨 Кастомизация: ${customized.map((s: string) => SIDE_LABELS_RU[s] || s).join(', ') || 'нет'}</small>`;
      if (nonCustomized.length > 0 && customized.length > 0) {
        designInfo += `<br><small>Без кастомизации: ${nonCustomized.map(s => SIDE_LABELS_RU[s] || s).join(', ')}</small>`;
      }
      if (item.production_pdf_url) {
        designInfo += `<br><small><a href="${item.production_pdf_url}">📄 Скачать PDF макет</a></small>`;
      }
    }
    return `
    <tr>
      <td style="padding: 10px; border: 1px solid #ddd;">${item.name}${designInfo}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${item.artikul || 'Н/Д'}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${item.quantity}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${item.price} ₽</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${item.quantity * item.price} ₽</td>
    </tr>
  `;
  }).join('');

  const confirmationUrl = `${supabaseUrl}/functions/v1/order-confirmation?order_id=${id}`;
  console.log("Формируем ссылку подтверждения:", confirmationUrl);

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

// Send PDF as Telegram document
async function sendTelegramDocument(pdfUrl: string, filename: string, caption: string) {
  try {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.log("Telegram document skipped: Missing token or chat ID");
      return { skipped: true, reason: "Missing token or chat ID" };
    }

    console.log("Fetching PDF from:", pdfUrl);
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      console.warn("Failed to fetch PDF:", pdfResponse.status);
      return { skipped: true, reason: "Failed to fetch PDF" };
    }
    const pdfBytes = await pdfResponse.arrayBuffer();

    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);
    formData.append('document', new Blob([pdfBytes], { type: 'application/pdf' }), filename);
    formData.append('caption', caption);
    formData.append('parse_mode', 'Markdown');

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    console.log("Telegram document sent:", result);
    return result;
  } catch (error) {
    console.error("Error sending Telegram document:", error);
    throw error;
  }
}

// Обновление данных в Google Sheets
async function updateGoogleSheets(order: any) {
  try {
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

// === ADMIN EMAIL NOTIFICATIONS ===

// TODO: extract parseAdminEmails to shared module when Deno Edge Functions support shared imports
function parseAdminEmails(): string[] {
  const raw = Deno.env.get("ADMIN_EMAIL") || "";
  return [...new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  )];
}

function generateAdminNewOrderHtml(order: any): string {
  const orderNumber = order.order_number || order.id;
  const cartItemsHtml = (order.cart_items || []).map((item: any) => {
    const lineTotal = (item.price || 0) * (item.quantity || 0);
    return `<tr>
      <td style="padding:8px;border:1px solid #ddd;">${item.name || 'Н/Д'}</td>
      <td style="padding:8px;border:1px solid #ddd;">${item.artikul || 'Н/Д'}</td>
      <td style="padding:8px;border:1px solid #ddd;">${item.quantity || 0}</td>
      <td style="padding:8px;border:1px solid #ddd;">${item.price || 0} ₽</td>
      <td style="padding:8px;border:1px solid #ddd;">${lineTotal} ₽</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Новый заказ</title></head><body style="font-family:Arial,sans-serif;color:#333;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <h1 style="color:#e53e3e;">📦 Новый заказ #${orderNumber}</h1>
  <p><strong>Дата:</strong> ${order.created_at ? new Date(order.created_at).toLocaleString('ru-RU') : new Date().toLocaleString('ru-RU')}</p>
  <h3>Клиент</h3>
  <p>👤 ${order.name || 'Не указано'}<br>📞 ${order.phone || 'Не указан'}<br>✉️ ${order.email || 'Не указан'}<br>🏠 ${order.yandex_address || 'Не указан'}</p>
  <h3>Товары</h3>
  <table style="width:100%;border-collapse:collapse;">
    <thead><tr style="background:#f2f2f2;">
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Наименование</th>
      <th style="padding:8px;border:1px solid #ddd;">Артикул</th>
      <th style="padding:8px;border:1px solid #ddd;">Кол-во</th>
      <th style="padding:8px;border:1px solid #ddd;">Цена</th>
      <th style="padding:8px;border:1px solid #ddd;">Итого</th>
    </tr></thead>
    <tbody>${cartItemsHtml}</tbody>
  </table>
  <p style="margin-top:15px;"><strong>Подытог:</strong> ${order.subtotal || 0} ₽<br><strong>Скидка:</strong> ${order.discount || 0} ₽<br><strong>Итого:</strong> ${order.total || 0} ₽</p>
  <p><strong>Оплата:</strong> ${order.payment === 'cash' ? 'Наличными' : 'Перевод'}<br><strong>Доставка:</strong> ${order.delivery === 'delivery' ? 'Курьер' : 'Самовывоз'}</p>
  ${order.comment ? `<p><strong>Комментарий:</strong> ${order.comment}</p>` : ''}
</div></body></html>`;
}

function generateAdminNewOrderText(order: any): string {
  const orderNumber = order.order_number || order.id;
  const items = (order.cart_items || []).map((item: any) => {
    const lineTotal = (item.price || 0) * (item.quantity || 0);
    return `- ${item.name || 'Н/Д'} (Арт. ${item.artikul || 'Н/Д'}) x${item.quantity || 0} = ${lineTotal} ₽`;
  }).join('\n');

  return `Новый заказ #${orderNumber}
Дата: ${order.created_at ? new Date(order.created_at).toLocaleString('ru-RU') : new Date().toLocaleString('ru-RU')}

Клиент: ${order.name || 'Не указано'}
Телефон: ${order.phone || 'Не указан'}
Email: ${order.email || 'Не указан'}
Адрес: ${order.yandex_address || 'Не указан'}

Товары:
${items}

Подытог: ${order.subtotal || 0} ₽
Скидка: ${order.discount || 0} ₽
Итого: ${order.total || 0} ₽
Оплата: ${order.payment === 'cash' ? 'Наличными' : 'Перевод'}
Доставка: ${order.delivery === 'delivery' ? 'Курьер' : 'Самовывоз'}
${order.comment ? `Комментарий: ${order.comment}` : ''}`;
}

async function sendAdminNewOrderEmail(order: any) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.log("Admin email skipped: RESEND_API_KEY not configured");
    return { skipped: true, reason: "RESEND_API_KEY not configured" };
  }

  const recipients = parseAdminEmails();
  if (recipients.length === 0) {
    console.log("Admin email skipped: no recipients in ADMIN_EMAIL");
    return { skipped: true, reason: "No admin email recipients" };
  }

  const orderNumber = order.order_number || order.id;
  try {
    const result = await resend.emails.send({
      from: 'SMT Premium Box <noreply@giftboxopt.ru>',
      to: recipients,
      subject: `Новый заказ #${orderNumber}`,
      html: generateAdminNewOrderHtml(order),
      text: generateAdminNewOrderText(order),
    });

    console.log(JSON.stringify({
      event: "admin_new_order_email",
      orderId: order.id,
      recipientCount: recipients.length,
      resendId: result?.data?.id,
      status: "success"
    }));
    return result;
  } catch (error) {
    console.error(JSON.stringify({
      event: "admin_new_order_email",
      orderId: order.id,
      recipientCount: recipients.length,
      status: "failure",
      errorMessage: error instanceof Error ? error.message : String(error)
    }));
    throw error;
  }
}

// Нормализация значения доставки
function normalizeDeliveryValue(delivery: string | undefined): string {
  if (!delivery) return 'delivery';
  if (delivery === 'pickup_moscow' || delivery === 'pickup_ershovo') {
    return 'pickup';
  }
  return delivery;
}

// Send design PDFs + partial customization messages to Telegram
async function sendDesignNotifications(order: any) {
  const cartItems = order.cart_items || [];
  
  // Group items with design_id by product_id to assign castIndex
  const designItems = cartItems.filter((item: any) => item.design_id);
  if (designItems.length === 0) return;

  // Assign castIndex per product_id
  const productCounters: Record<string, number> = {};
  
  for (const item of designItems) {
    const productId = item.id || item.artikul || 'unknown';
    productCounters[productId] = (productCounters[productId] || 0) + 1;
    const castIndex = productCounters[productId];
    const filename = `${productId}_${castIndex}.pdf`;

    const customizedSides: string[] = item.customized_sides || [];
    const nonCustomizedSides = ALL_SIDES.filter(s => !customizedSides.includes(s));

    // Send PDF as document if available
    if (item.production_pdf_url) {
      const caption = `🎨 *Макет:* ${productId}\n📦 Арт: ${item.artikul || productId}\n🔢 Кол-во: ${item.quantity}\n✅ Стороны: ${customizedSides.map(s => SIDE_LABELS_RU[s] || s).join(', ')}`;
      
      try {
        await sendTelegramDocument(item.production_pdf_url, filename, caption);
      } catch (err) {
        console.warn('Failed to send Telegram document:', err);
      }

      // Update design record with final filename
      if (item.design_id) {
        try {
          await supabase
            .from('designs')
            .update({ production_pdf_filename: filename })
            .eq('id', item.design_id);
        } catch (err) {
          console.warn('Failed to update design filename:', err);
        }
      }
    }

    // Send non-customized sides message
    if (nonCustomizedSides.length > 0 && customizedSides.length > 0) {
      const msg = `📋 ID ${productId} кастомизация частичная.\nБез кастомизации: ${nonCustomizedSides.map(s => SIDE_LABELS_RU[s] || s).join(', ')}`;
      try {
        await sendTelegramNotification(msg);
      } catch (err) {
        console.warn('Failed to send partial customization message:', err);
      }
    }
  }
}

// Обработчик запросов
serve(async (req) => {
  console.log(`========== ORDER-PROCESSING ЗАПРОС ==========`);
  console.log(`Метод: ${req.method}`);
  console.log(`URL: ${req.url}`);
  console.log(`============================================`);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  
  if (url.pathname === "/order-processing" && req.method === "POST") {
    try {
      const requestBody = await req.json();
      const { orderData } = requestBody;
      
      console.log("Получены данные заказа:", orderData);
      
      if (typeof orderData.cart_items === 'string') {
        console.warn("Warning: cart_items is a string, converting to JSON");
        try {
          orderData.cart_items = JSON.parse(orderData.cart_items);
        } catch (parseError) {
          console.error("Error parsing cart_items string:", parseError);
          throw new Error("Invalid cart_items format");
        }
      }
      
      if (!Array.isArray(orderData.cart_items)) {
        console.error("cart_items is not an array:", orderData.cart_items);
        throw new Error("cart_items must be an array");
      }
      
      orderData.delivery = normalizeDeliveryValue(orderData.delivery);
      console.log("Normalized delivery value:", orderData.delivery);

      // === B2B CLIENT MANAGEMENT ===
      const normalizedEmail = orderData.email.toLowerCase().trim();
      const normalizedPhone = orderData.phone.replace(/\D/g, '');
      
      console.log('Searching for client with email:', normalizedEmail, 'phone:', normalizedPhone);
      
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
      
      if (!client && normalizedPhone.length >= 10) {
        const phoneSearchPattern = normalizedPhone.slice(-10);
        console.log('Client not found by email, searching by phone pattern:', phoneSearchPattern);
        
        const { data: allClients, error: phoneError } = await supabase
          .from('b2b_clients')
          .select('*');
        
        if (phoneError) {
          console.error('Error checking for existing client by phone:', phoneError);
        } else if (allClients) {
          client = allClients.find((c: any) => {
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
          }
        }
        
        const updates: any = {};
        if (!client.phone && orderData.phone) updates.phone = orderData.phone;
        if (!client.contact_name && orderData.name) updates.contact_name = orderData.name;
        
        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from('b2b_clients')
            .update(updates)
            .eq('id', clientId);
          
          if (updateError) {
            console.error('Error updating client:', updateError);
          }
        }
      } else {
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

      // Сохраняем заказ
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
      
      // Формируем детальный список товаров для Telegram
      const cartItemsDetails = order.cart_items.map((item: any) => {
        const itemTotal = item.price * item.quantity;
        let line = `- ${item.name} (${item.color || 'Н/Д'}) Арт. ${item.artikul || 'Н/Д'} × ${item.quantity} = ${itemTotal} ₽`;
        if (item.design_id) {
          line += ` 🎨`;
        }
        return line;
      }).join('\n');
      
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
      
      // Wait for main notifications
      const results = await Promise.allSettled(notificationPromises);
      console.log("Результаты уведомлений:", 
        results.map((r, i) => `${i}: ${r.status === 'fulfilled' ? 'успех' : r.reason}`));
      
      // Send design PDFs to Telegram (after main notification)
      try {
        await sendDesignNotifications(order);
      } catch (err) {
        console.warn('Design notifications failed (non-blocking):', err);
      }
      
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
