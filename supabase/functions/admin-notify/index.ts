import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AdminNotifyRequest {
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message }: AdminNotifyRequest = await req.json();
    
    if (!message) {
      throw new Error('Сообщение не может быть пустым');
    }

    const telegramToken = Deno.env.get('TELEGRAM_TOKEN');
    const telegramChatId = Deno.env.get('TELEGRAM_CHAT_ID');

    if (!telegramToken || !telegramChatId) {
      throw new Error('Не настроены токен или chat_id Telegram');
    }

    console.log('Отправляем уведомление в Telegram:', message);

    // Отправляем сообщение в Telegram
    const telegramResponse = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: message,
        parse_mode: 'HTML'
      }),
    });

    if (!telegramResponse.ok) {
      const errorText = await telegramResponse.text();
      throw new Error(`Ошибка Telegram API: ${errorText}`);
    }

    const telegramData = await telegramResponse.json();
    console.log('Уведомление отправлено в Telegram:', telegramData);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Ошибка в admin-notify функции:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);