
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

// Конфигурация CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Инициализация Supabase клиента
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ID таблицы Google Sheets
const GOOGLE_SHEETS_ID = Deno.env.get("GOOGLE_SHEETS_ID");

// Конфигурация Telegram бота
const TELEGRAM_BOT_TOKEN = "7304653990:AAE0bmI6O8L_8-9WlBplisvFiy-lOoNLtSQ";
const TELEGRAM_CHAT_ID = "-4656195871";

// Отправка уведомления в Telegram
async function sendTelegramNotification(message) {
  try {
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

    // Мы используем Google Apps Script как посредник для работы с Google Sheets
    // Это публичный веб-приложение, развернутое из Google Apps Script
    // Необходимо заменить этот URL на ваш реальный URL веб-приложения Google Apps Script
    const scriptUrl = `https://script.google.com/macros/s/YOUR_GOOGLE_APPS_SCRIPT_DEPLOYMENT_ID/exec`;
    
    const response = await fetch(scriptUrl, {
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

// HTML-страница для подтверждения заказа
function getConfirmationPage(success, message) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Подтверждение заказа</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          padding: 40px;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          text-align: center;
        }
        .success {
          color: #4CAF50;
        }
        .error {
          color: #F44336;
        }
        .icon {
          font-size: 72px;
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        ${success 
          ? `<div class="icon success">✓</div>
             <h1 class="success">Заказ подтвержден!</h1>`
          : `<div class="icon error">✗</div>
             <h1 class="error">Ошибка</h1>`
        }
        <p>${message}</p>
        <p>Спасибо за ваш заказ.</p>
      </div>
    </body>
    </html>
  `;
}

// Обработчик запросов
serve(async (req) => {
  // Обработка CORS preflight запросов
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  
  if (req.method === "GET") {
    try {
      // Получаем id заказа из параметров запроса
      const orderId = url.searchParams.get("order_id");
      
      if (!orderId) {
        return new Response(
          getConfirmationPage(false, "Идентификатор заказа не указан"),
          { 
            headers: { 
              "Content-Type": "text/html",
              ...corsHeaders
            } 
          }
        );
      }
      
      // Получаем информацию о заказе из базы данных
      const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
        
      if (error || !order) {
        return new Response(
          getConfirmationPage(false, "Заказ не найден"),
          { 
            headers: { 
              "Content-Type": "text/html",
              ...corsHeaders
            } 
          }
        );
      }
      
      // Проверяем, не подтвержден ли заказ уже
      if (order.order_status === 'confirmed') {
        return new Response(
          getConfirmationPage(true, "Ваш заказ уже был подтвержден ранее"),
          { 
            headers: { 
              "Content-Type": "text/html",
              ...corsHeaders
            } 
          }
        );
      }
      
      // Обновляем статус заказа
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          order_status: 'confirmed',
          confirmed_at: new Date().toISOString()
        })
        .eq('id', orderId);
        
      if (updateError) {
        return new Response(
          getConfirmationPage(false, "Не удалось обновить статус заказа"),
          { 
            headers: { 
              "Content-Type": "text/html",
              ...corsHeaders
            } 
          }
        );
      }
      
      // Получаем обновленный заказ
      const { data: updatedOrder, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
        
      if (fetchError || !updatedOrder) {
        return new Response(
          getConfirmationPage(false, "Заказ обновлен, но не удалось получить обновленные данные"),
          { 
            headers: { 
              "Content-Type": "text/html",
              ...corsHeaders
            } 
          }
        );
      }
      
      // Отправка уведомления в Telegram
      const telegramMessage = `
✅ *Заказ подтверждён!*
👤 *Имя:* ${updatedOrder.name}
📞 *Телефон:* ${updatedOrder.phone}
✉️ *Email:* ${updatedOrder.email}
💰 *Сумма заказа:* ${updatedOrder.total} ₽
      `;
      
      await sendTelegramNotification(telegramMessage);
      
      // Обновление данных в Google Sheets
      await updateGoogleSheets(updatedOrder);
      
      return new Response(
        getConfirmationPage(true, "Ваш заказ успешно подтвержден"),
        { 
          headers: { 
            "Content-Type": "text/html",
            ...corsHeaders
          } 
        }
      );
    } catch (error) {
      console.error("Error confirming order:", error);
      return new Response(
        getConfirmationPage(false, "Произошла ошибка при обработке запроса"),
        { 
          headers: { 
            "Content-Type": "text/html",
            ...corsHeaders
          } 
        }
      );
    }
  }
  
  // Неизвестный метод или маршрут
  return new Response(
    JSON.stringify({ 
      error: "Unknown route or method" 
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
