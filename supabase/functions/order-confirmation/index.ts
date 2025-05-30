
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

📋 *Заказ №${order.id}*
👤 *Клиент:* ${order.name}
📞 *Телефон:* ${order.phone}
✉️ *Email:* ${order.email}
🏠 *Адрес:* ${order.yandex_address || 'Не указан'}

💰 *Сумма заказа:* ${order.total} ₽
💳 *Оплата:* ${order.payment === 'cash' ? 'Наличными' : 'Переводом'}
🚚 *Доставка:* ${order.delivery === 'delivery' ? 'Курьер' : 'Самовывоз'}

⏰ *Подтверждено:* ${new Date().toLocaleString('ru-RU')}
    `;

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
    console.log("Telegram уведомление отправлено:", result);
    return result;
  } catch (error) {
    console.error("Ошибка отправки Telegram уведомления:", error);
    // Не прерываем выполнение функции из-за ошибки уведомления
    return { error: error.message };
  }
}

/**
 * Обновляет данные заказа в Google Sheets
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
    
    // Формируем данные для отправки в Google Sheets
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
    
    // Отправляем POST-запрос в Google Apps Script
    const response = await fetch(googleScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sheetId: googleSheetsId,
        action: 'addOrUpdateOrder',
        orderData: sheetValues
      })
    });
    
    const result = await response.json();
    console.log("Google Sheets обновлено:", result);
    return result;
  } catch (error) {
    console.error("Ошибка обновления Google Sheets:", error);
    // Не прерываем выполнение функции из-за ошибки синхронизации
    return { error: error.message };
  }
}

// Основной обработчик HTTP запросов
serve(async (req) => {
  // Обработка CORS preflight запросов
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Обработка POST запросов для подтверждения заказа
  if (req.method === "POST") {
    try {
      // Парсим JSON из тела запроса
      const requestBody = await req.json();
      const { orderId } = requestBody;
      
      console.log("Получен запрос на подтверждение заказа:", orderId);
      
      // Проверяем наличие ID заказа
      if (!orderId) {
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
        
      // Проверяем успешность получения заказа
      if (fetchError || !order) {
        console.error("Ошибка получения заказа:", fetchError);
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
        
      // Проверяем успешность обновления
      if (updateError) {
        console.error("Ошибка обновления заказа:", updateError);
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
      
      console.log("Заказ успешно подтверждён:", updatedOrder);
      
      // Отправляем уведомления асинхронно (не ждём их завершения)
      const notificationPromises = [
        sendTelegramConfirmation(updatedOrder),
        updateGoogleSheets(updatedOrder)
      ];
      
      // Запускаем уведомления в фоне и логируем результаты
      Promise.allSettled(notificationPromises).then(results => {
        console.log("Результаты уведомлений:", 
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
      console.error("Ошибка обработки запроса:", error);
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
  
  // Обработка неподдерживаемых методов
  return new Response(
    JSON.stringify({ 
      error: "Метод не поддерживается" 
    }),
    { 
      status: 405,
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders
      } 
    }
  );
});
