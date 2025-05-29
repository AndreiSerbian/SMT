
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

// Конфигурация CORS для всех запросов
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Инициализация Supabase клиента с service role для обхода RLS
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Конфигурация для внешних сервисов
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_TOKEN") || "";
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID") || "";

/**
 * Генерирует простую HTML-страницу подтверждения без редиректов
 */
function generateSuccessHTML(orderNumber: string) {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Заказ подтверждён</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc;
            margin: 0;
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
            width: 100%;
        }
        .icon {
            font-size: 48px;
            margin-bottom: 16px;
            color: #10b981;
        }
        h1 {
            color: #1f2937;
            margin: 0 0 12px 0;
            font-size: 24px;
        }
        p {
            color: #6b7280;
            font-size: 16px;
            margin: 0 0 20px 0;
        }
        .order-info {
            background: #f3f4f6;
            padding: 16px;
            border-radius: 8px;
            font-family: monospace;
            color: #374151;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">✅</div>
        <h1>Заказ подтверждён!</h1>
        <p>Спасибо! Ваш заказ успешно подтверждён.</p>
        <div class="order-info">Заказ №${orderNumber}</div>
        <p style="margin-top: 20px; font-size: 14px; color: #9ca3af;">
            Это окно можно закрыть
        </p>
    </div>
</body>
</html>
  `;
}

/**
 * Генерирует HTML-страницу с ошибкой
 */
function generateErrorHTML(error: string) {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ошибка</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #fef2f2;
            margin: 0;
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
            width: 100%;
        }
        .icon {
            font-size: 48px;
            margin-bottom: 16px;
            color: #ef4444;
        }
        h1 {
            color: #1f2937;
            margin: 0 0 12px 0;
            font-size: 24px;
        }
        p {
            color: #6b7280;
            font-size: 16px;
            margin: 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">❌</div>
        <h1>Ошибка</h1>
        <p>${error}</p>
    </div>
</body>
</html>
  `;
}

/**
 * Отправляет уведомление в Telegram
 */
async function sendTelegramNotification(order: any): Promise<{ success: boolean; error?: string }> {
  try {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.log("⚠️ Telegram: конфигурация отсутствует, уведомление пропущено");
      return { success: false, error: "Конфигурация Telegram отсутствует" };
    }

    const message = `
✅ *Заказ подтверждён клиентом!*

📋 *Заказ №${order.order_number || order.id}*
👤 *Клиент:* ${order.name}
📞 *Телефон:* ${order.phone}
✉️ *Email:* ${order.email}
💰 *Сумма:* ${order.total} ₽

⏰ *Подтверждено:* ${new Date().toLocaleString('ru-RU')}
    `;

    console.log("🔔 Отправка Telegram уведомления...");
    
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "Markdown"
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ Telegram API ошибка:", response.status, errorData);
      return { success: false, error: `Telegram API ошибка: ${response.status}` };
    }
    
    const result = await response.json();
    console.log("✅ Telegram уведомление отправлено:", result.message_id);
    return { success: true };
    
  } catch (error) {
    console.error("❌ Ошибка Telegram уведомления:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Обновляет Google Sheets
 */
async function updateGoogleSheets(order: any): Promise<{ success: boolean; error?: string }> {
  try {
    const googleScriptUrl = Deno.env.get("GOOGLE_SCRIPT_URL");
    const googleSheetsId = Deno.env.get("GOOGLE_SHEETS_ID");
    
    if (!googleScriptUrl || !googleSheetsId) {
      console.log("⚠️ Google Sheets: конфигурация отсутствует, обновление пропущено");
      return { success: false, error: "Конфигурация Google Sheets отсутствует" };
    }
    
    // Подготавливаем данные для Google Sheets
    const sheetData = [
      order.id,
      order.name || "",
      order.phone || "",
      order.email || "",
      order.yandex_address || "Не указан",
      order.payment || "Не указан",
      order.delivery || "Не указан",
      JSON.stringify(order.cart_items || []),
      order.subtotal || 0,
      order.discount || 0,
      order.total || 0,
      order.order_status || "confirmed",
      order.created_at || "",
      order.confirmed_at || new Date().toISOString()
    ];
    
    const requestBody = {
      sheetId: googleSheetsId,
      action: 'addOrUpdateOrder',
      orderData: sheetData
    };
    
    console.log("📊 Отправка данных в Google Sheets...");
    console.log("📊 URL:", googleScriptUrl);
    console.log("📊 Данные:", JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(googleScriptUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Supabase-Edge-Function/1.0'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log("📊 Google Sheets ответ:", response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Google Sheets HTTP ошибка:", response.status, errorText);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }
    
    const result = await response.json();
    console.log("✅ Google Sheets обновлено успешно:", result);
    return { success: true };
    
  } catch (error) {
    console.error("❌ Критическая ошибка Google Sheets:", error);
    return { success: false, error: error.message };
  }
}

// Основной обработчик
serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  const timestamp = new Date().toISOString();
  
  console.log(`\n🚀 [${requestId}] ${timestamp} - Новый запрос: ${req.method} ${req.url}`);
  
  // Обработка CORS preflight
  if (req.method === "OPTIONS") {
    console.log(`✅ [${requestId}] CORS preflight обработан`);
    return new Response(null, { headers: corsHeaders });
  }

  // Обработка GET запросов (основной сценарий из email)
  if (req.method === "GET") {
    try {
      const url = new URL(req.url);
      const orderId = url.searchParams.get('order_id');
      
      console.log(`📋 [${requestId}] GET запрос с order_id: ${orderId}`);
      
      if (!orderId) {
        console.error(`❌ [${requestId}] Отсутствует order_id`);
        return new Response(
          generateErrorHTML("ID заказа не указан"),
          { 
            status: 400,
            headers: { 
              "Content-Type": "text/html; charset=utf-8",
              ...corsHeaders
            }
          }
        );
      }
      
      // Получаем заказ из БД
      console.log(`🔍 [${requestId}] Поиск заказа в Supabase...`);
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
        
      if (fetchError || !order) {
        console.error(`❌ [${requestId}] Заказ не найден:`, fetchError);
        return new Response(
          generateErrorHTML("Заказ не найден"),
          { 
            status: 404,
            headers: { 
              "Content-Type": "text/html; charset=utf-8",
              ...corsHeaders
            }
          }
        );
      }
      
      console.log(`📦 [${requestId}] Заказ найден: ${order.id}, статус: ${order.order_status}`);
      
      // Проверяем, не подтверждён ли уже
      if (order.order_status === 'confirmed') {
        console.log(`⚠️ [${requestId}] Заказ уже подтверждён`);
        return new Response(
          generateSuccessHTML(order.order_number || order.id),
          { 
            status: 200,
            headers: { 
              "Content-Type": "text/html; charset=utf-8",
              ...corsHeaders
            }
          }
        );
      }
      
      // Обновляем статус заказа
      console.log(`🔄 [${requestId}] Обновление статуса заказа...`);
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
        
      if (updateError || !updatedOrder) {
        console.error(`❌ [${requestId}] Ошибка обновления заказа:`, updateError);
        return new Response(
          generateErrorHTML("Не удалось обновить статус заказа"),
          { 
            status: 500,
            headers: { 
              "Content-Type": "text/html; charset=utf-8",
              ...corsHeaders
            }
          }
        );
      }
      
      console.log(`✅ [${requestId}] Заказ успешно подтверждён: ${updatedOrder.id}`);
      
      // Запускаем уведомления в фоне (не блокируем ответ)
      Promise.allSettled([
        sendTelegramNotification(updatedOrder),
        updateGoogleSheets(updatedOrder)
      ]).then(results => {
        console.log(`📊 [${requestId}] Результаты уведомлений:`);
        results.forEach((result, index) => {
          const service = index === 0 ? "Telegram" : "Google Sheets";
          if (result.status === 'fulfilled') {
            console.log(`✅ [${requestId}] ${service}:`, result.value);
          } else {
            console.error(`❌ [${requestId}] ${service}:`, result.reason);
          }
        });
      });
      
      // Возвращаем успешную HTML-страницу
      console.log(`🎉 [${requestId}] Возврат HTML страницы подтверждения`);
      return new Response(
        generateSuccessHTML(updatedOrder.order_number || updatedOrder.id),
        { 
          status: 200,
          headers: { 
            "Content-Type": "text/html; charset=utf-8",
            ...corsHeaders
          }
        }
      );
      
    } catch (error) {
      console.error(`💥 [${requestId}] Критическая ошибка:`, error);
      return new Response(
        generateErrorHTML(`Системная ошибка: ${error.message}`),
        { 
          status: 500,
          headers: { 
            "Content-Type": "text/html; charset=utf-8",
            ...corsHeaders
          }
        }
      );
    }
  }

  // Обработка неподдерживаемых методов
  console.log(`❌ [${requestId}] Неподдерживаемый метод: ${req.method}`);
  return new Response(
    generateErrorHTML("Метод не поддерживается"),
    { 
      status: 405,
      headers: { 
        "Content-Type": "text/html; charset=utf-8",
        ...corsHeaders
      }
    }
  );
});
