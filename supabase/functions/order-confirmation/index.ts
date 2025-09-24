
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

// Конфигурация CORS для веб-запросов
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Инициализация Supabase клиента с правами сервиса
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Конфигурация Telegram бота для уведомлений
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_TOKEN") || "";
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID") || "";

/**
 * Генерирует HTML-страницу подтверждения заказа
 * @param orderNumber - Номер заказа или ID
 * @param isAlreadyConfirmed - Был ли заказ уже подтверждён
 */
function generateConfirmationHTML(orderNumber: string, isAlreadyConfirmed: boolean = false) {
  const title = isAlreadyConfirmed ? "Заказ уже подтверждён" : "Заказ подтверждён";
  const message = isAlreadyConfirmed 
    ? `Заказ №${orderNumber} уже был подтверждён ранее`
    : `Спасибо! Заказ №${orderNumber} успешно подтверждён`;
  
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 500px;
            width: 100%;
        }
        .icon {
            font-size: 64px;
            margin-bottom: 20px;
            color: #22c55e;
        }
        h1 {
            color: #1f2937;
            margin-bottom: 10px;
            font-size: 24px;
        }
        p {
            color: #6b7280;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 20px;
        }
        .order-number {
            background: #f3f4f6;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 18px;
            color: #374151;
            margin: 20px 0;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #9ca3af;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">✅</div>
        <h1>${title}</h1>
        <p>${message}</p>
        <div class="order-number">Заказ №${orderNumber}</div>
        <p>Мы свяжемся с вами в ближайшее время для уточнения деталей доставки.</p>
        <div class="footer">
            Это окно можно закрыть
        </div>
    </div>
</body>
</html>
  `;
}

/**
 * Генерирует HTML-страницу с ошибкой
 * @param error - Текст ошибки
 */
function generateErrorHTML(error: string) {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ошибка подтверждения</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 500px;
            width: 100%;
        }
        .icon {
            font-size: 64px;
            margin-bottom: 20px;
            color: #ef4444;
        }
        h1 {
            color: #1f2937;
            margin-bottom: 10px;
            font-size: 24px;
        }
        p {
            color: #6b7280;
            font-size: 16px;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">❌</div>
        <h1>Ошибка подтверждения</h1>
        <p>${error}</p>
        <p>Пожалуйста, свяжитесь с нами для решения проблемы.</p>
    </div>
</body>
</html>
  `;
}

/**
 * Отправляет уведомление о подтверждении заказа в Telegram
 * @param order - Объект заказа с информацией о клиенте
 */
async function sendTelegramConfirmation(order: any) {
  try {
    // Проверяем наличие конфигурации Telegram
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.log("Telegram уведомление пропущено: отсутствует токен или chat ID");
      return { skipped: true, reason: "Отсутствует конфигурация Telegram" };
    }

    // Формируем сообщение о подтверждении заказа
    const message = `
✅ *Заказ подтверждён клиентом!*

📋 *Заказ №${order.order_number || order.id}*
👤 *Клиент:* ${order.name}
📞 *Телефон:* ${order.phone}
✉️ *Email:* ${order.email}
🏠 *Адрес:* ${order.yandex_address || 'Не указан'}

💰 *Сумма заказа:* ${order.total} ₽
💳 *Оплата:* ${order.payment === 'cash' ? 'Наличными' : 'Переводом'}
🚚 *Доставка:* ${order.delivery === 'delivery' ? 'Курьер' : 'Самовывоз'}

⏰ *Подтверждено:* ${new Date().toLocaleString('ru-RU')}
    `;

    console.log("Отправляем Telegram уведомление...");
    
    // Отправляем POST-запрос в Telegram API
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
    
    if (!response.ok) {
      console.error("Ошибка Telegram API:", result);
      return { error: `Telegram API ошибка: ${result.description || 'Неизвестная ошибка'}` };
    }
    
    console.log("Telegram уведомление отправлено успешно:", result);
    return { success: true, result };
  } catch (error) {
    console.error("Ошибка отправки Telegram уведомления:", error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Обновляет данные заказа в Google Sheets с улучшенным логированием
 * @param order - Объект заказа для обновления
 */
async function updateGoogleSheets(order: any) {
  try {
    // Получаем конфигурацию Google Sheets
    const googleScriptUrl = Deno.env.get("GOOGLE_SCRIPT_URL");
    const googleSheetsId = Deno.env.get("GOOGLE_SHEETS_ID");
    
    // Проверяем наличие необходимой конфигурации
    if (!googleScriptUrl || !googleSheetsId) {
      console.log("Google Sheets обновление пропущено: отсутствует URL скрипта или ID таблицы");
      return { skipped: true, reason: "Отсутствует конфигурация Google Sheets" };
    }
    
    console.log("Начинаем обновление Google Sheets...");
    console.log("Google Script URL:", googleScriptUrl);
    console.log("Google Sheets ID:", googleSheetsId);
    
    // Формируем данные для отправки в Google Sheets
    const sheetValues = [
      order.id,
      order.name || "",
      order.phone || "",
      order.email || "",
      order.yandex_address || "Не указан",
      order.payment || "Не указан",
      order.delivery || "Не указан",
      JSON.stringify(order.cart_items || []), // Убеждаемся, что JSON корректный
      order.subtotal || 0,
      order.discount || 0,
      order.total || 0,
      order.order_status || "confirmed",
      order.created_at || "",
      order.confirmed_at || new Date().toISOString() // Добавляем confirmed_at
    ];
    
    console.log("Данные для отправки в Google Sheets:", sheetValues);
    
    const requestBody = {
      sheetId: googleSheetsId,
      action: 'addOrUpdateOrder',
      orderData: sheetValues
    };
    
    console.log("Тело запроса:", JSON.stringify(requestBody, null, 2));
    
    // Отправляем POST-запрос в Google Apps Script
    const response = await fetch(googleScriptUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Supabase-Edge-Function/1.0'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log("Google Sheets ответ статус:", response.status);
    console.log("Google Sheets ответ заголовки:", Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google Sheets HTTP ошибка ${response.status}:`, errorText);
      return { 
        error: `HTTP ${response.status}: ${errorText}`,
        status: response.status,
        statusText: response.statusText
      };
    }
    
    const result = await response.json();
    console.log("Google Sheets успешно обновлено:", result);
    return { success: true, result };
    
  } catch (error) {
    console.error("Критическая ошибка при обновлении Google Sheets:", error);
    console.error("Стек ошибки:", error instanceof Error ? error.stack : 'No stack');
    return { 
      error: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : 'No stack'
    };
  }
}

// Основной обработчик HTTP запросов
serve(async (req) => {
  console.log(`========== НОВЫЙ ЗАПРОС ==========`);
  console.log(`Метод: ${req.method}`);
  console.log(`URL: ${req.url}`);
  console.log(`Заголовки:`, Object.fromEntries(req.headers.entries()));
  console.log(`=====================================`);
  
  // Обработка CORS preflight запросов
  if (req.method === "OPTIONS") {
    console.log("Обработка CORS preflight запроса");
    return new Response(null, { headers: corsHeaders });
  }

  // Обработка GET запросов (из email ссылок)
  if (req.method === "GET") {
    try {
      const url = new URL(req.url);
      const orderId = url.searchParams.get('order_id');
      
      console.log("=== GET ЗАПРОС НА ПОДТВЕРЖДЕНИЕ ЗАКАЗА ===");
      console.log("Извлечённый order_id:", orderId);
      console.log("Все параметры URL:", Object.fromEntries(url.searchParams.entries()));
      
      if (!orderId) {
        console.error("ОШИБКА: Отсутствует order_id в GET параметрах");
        return new Response(
          generateErrorHTML("ID заказа не указан в ссылке"),
          { 
            status: 400,
            headers: { "Content-Type": "text/html; charset=utf-8" }
          }
        );
      }
      
      console.log("Поиск заказа в базе данных...");
      // Получаем заказ из базы данных
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
        
      console.log("Результат поиска заказа:", { order, fetchError });
      
      // Проверяем успешность получения заказа
      if (fetchError || !order) {
        console.error("ОШИБКА: Заказ не найден или ошибка получения:", fetchError);
        return new Response(
          generateErrorHTML("Заказ не найден в системе"),
          { 
            status: 404,
            headers: { "Content-Type": "text/html; charset=utf-8" }
          }
        );
      }
      
      console.log("Заказ найден:", order);
      console.log("Текущий статус заказа:", order.order_status);
      
      // Проверяем, не подтверждён ли заказ уже
      if (order.order_status === 'confirmed') {
        console.log("Заказ уже был подтверждён:", order.id);
        return new Response(
          generateConfirmationHTML(order.order_number || order.id, true),
          { 
            headers: { "Content-Type": "text/html; charset=utf-8" }
          }
        );
      }
      
      console.log("Обновление статуса заказа на 'confirmed'...");
      // Обновляем статус заказа на "confirmed"
      const confirmedAt = new Date().toISOString();
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({ 
          order_status: 'confirmed',
          confirmed_at: confirmedAt
        })
        .eq('id', orderId)
        .select()
        .single();
        
      console.log("Результат обновления заказа:", { updatedOrder, updateError });
      
      // Проверяем успешность обновления
      if (updateError) {
        console.error("ОШИБКА: Не удалось обновить заказ:", updateError);
        return new Response(
          generateErrorHTML("Не удалось обновить статус заказа"),
          { 
            status: 500,
            headers: { "Content-Type": "text/html; charset=utf-8" }
          }
        );
      }
      
      console.log("Заказ успешно подтверждён:", updatedOrder);
      
      // Отправляем уведомления асинхронно и логируем результаты
      console.log("Начинаем отправку уведомлений...");
      Promise.allSettled([
        sendTelegramConfirmation(updatedOrder),
        updateGoogleSheets(updatedOrder)
      ]).then(results => {
        console.log("=== РЕЗУЛЬТАТЫ УВЕДОМЛЕНИЙ ===");
        results.forEach((result, index) => {
          const serviceName = index === 0 ? "Telegram" : "Google Sheets";
          if (result.status === 'fulfilled') {
            console.log(`${serviceName} - Успех:`, result.value);
          } else {
            console.error(`${serviceName} - Ошибка:`, result.reason);
          }
        });
        console.log("=== КОНЕЦ РЕЗУЛЬТАТОВ ===");
      });
      
      // Возвращаем HTML страницу подтверждения
      return new Response(
        generateConfirmationHTML(updatedOrder.order_number || updatedOrder.id),
        { 
          headers: { "Content-Type": "text/html; charset=utf-8" }
        }
      );
      
    } catch (error) {
      console.error("КРИТИЧЕСКАЯ ОШИБКА в GET обработчике:", error);
      console.error("Стек ошибки:", error instanceof Error ? error.stack : 'No stack');
      return new Response(
        generateErrorHTML(`Системная ошибка: ${error instanceof Error ? error.message : 'Unknown error'}`),
        { 
          status: 500,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        }
      );
    }
  }

  // Обработка POST запросов для подтверждения заказа (для совместимости)
  if (req.method === "POST") {
    try {
      console.log("=== POST ЗАПРОС НА ПОДТВЕРЖДЕНИЕ ЗАКАЗА ===");
      
      // Парсим JSON из тела запроса
      const requestBody = await req.json();
      const { orderId } = requestBody;
      
      console.log("POST запрос с данными:", requestBody);
      console.log("Извлечённый orderId:", orderId);
      
      // Проверяем наличие ID заказа
      if (!orderId) {
        console.error("ОШИБКА: orderId не указан в POST запросе");
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "ID заказа не указан" 
          }),
          { 
            status: 400,
            headers: { 
              "Content-Type": "application/json",
              ...corsHeaders
            } 
          }
        );
      }
      
      // Получаем заказ из базы данных
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
        
      console.log("Результат поиска заказа в POST:", { order, fetchError });
      
      // Проверяем успешность получения заказа
      if (fetchError || !order) {
        console.error("ОШИБКА: Заказ не найден в POST запросе:", fetchError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Заказ не найден" 
          }),
          { 
            status: 404,
            headers: { 
              "Content-Type": "application/json",
              ...corsHeaders
            } 
          }
        );
      }
      
      // Проверяем, не подтверждён ли заказ уже
      if (order.order_status === 'confirmed') {
        console.log("POST: Заказ уже был подтверждён:", order.id);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Заказ уже был подтверждён ранее",
            order 
          }),
          { 
            headers: { 
              "Content-Type": "application/json",
              ...corsHeaders
            } 
          }
        );
      }
      
      // Обновляем статус заказа на "confirmed"
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({ 
          order_status: 'confirmed',
          confirmed_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();
        
      console.log("POST: Результат обновления заказа:", { updatedOrder, updateError });
      
      // Проверяем успешность обновления
      if (updateError) {
        console.error("POST: ОШИБКА обновления заказа:", updateError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Не удалось обновить статус заказа" 
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
      
      console.log("POST: Заказ успешно подтверждён:", updatedOrder);
      
      // Отправляем уведомления асинхронно
      Promise.allSettled([
        sendTelegramConfirmation(updatedOrder),
        updateGoogleSheets(updatedOrder)
      ]).then(results => {
        console.log("POST: Результаты уведомлений:", 
          results.map((r, i) => `${i}: ${r.status === 'fulfilled' ? 'успех' : r.reason}`));
      });
      
      // Возвращаем успешный ответ клиенту
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Заказ успешно подтверждён",
          order: updatedOrder 
        }),
        { 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          } 
        }
      );
      
    } catch (error) {
      console.error("КРИТИЧЕСКАЯ ОШИБКА в POST обработчике:", error);
      console.error("Стек ошибки:", error instanceof Error ? error.stack : 'No stack');
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
  
  // Обработка неподдерживаемых методов
  console.log("Неподдерживаемый метод:", req.method);
  return new Response(
    generateErrorHTML("Метод не поддерживается"),
    { 
      status: 405,
      headers: { "Content-Type": "text/html; charset=utf-8" }
    }
  );
});
