
import { env } from '../utils/env.js';

const SUPABASE_URL = 'https://bsndismiessosfvhglzrv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzbmRpc21pZXNzb2Z2aGdsenJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2ODYyNTIsImV4cCI6MjA1NDI2MjI1Mn0.4pumjrK8SV79xaegTEZaJMmi6lnp-_5uhSytvWpoZHY';

export async function sendContactRequest(formData) {
  try {
    // 1) Сохраняем в таблицу contact_requests через REST API
    const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/contact_requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(formData)
    });

    if (!insertResponse.ok) {
      throw new Error(`Database insert failed: ${insertResponse.status}`);
    }

    // 2) Вызываем Edge Function для Telegram-уведомления
    const notifyResponse = await fetch(`${SUPABASE_URL}/functions/v1/contact-notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(formData)
    });

    if (!notifyResponse.ok) {
      console.warn('Telegram notification failed, but contact saved');
    }

    return { success: true };
  } catch (error) {
    console.error('Contact service error:', error);
    throw error;
  }
}
