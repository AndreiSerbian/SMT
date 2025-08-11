// Клиент больше не хранит ключи и не стучится в REST напрямую.
// Отправляем форму в единую Edge Function (insert + Telegram).
const SUPABASE_URL = 'https://bsndismiessofvhglzrv.supabase.co';

export async function sendContactRequest(formData) {
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/contact-handler`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`contact-handler failed: ${resp.status} ${text}`);
    }
    return { success: true };
  } catch (error) {
    console.error('Contact service error:', error);
    throw error;
  }
}
