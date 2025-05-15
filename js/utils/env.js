
/**
 * Access environment variables in traditional JS code
 */
export const env = {
  apiUrl: import.meta.env.VITE_API_URL || '',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'https://bsndismiessofvhglzrv.supabase.co',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzbmRpc21pZXNzb2Z2aGdsenJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2ODYyNTIsImV4cCI6MjA1NDI2MjI1Mn0.4pumjrK8SV79xaegTEZaJMmi6lnp-_5uhSytvWpoZHY',
  appName: import.meta.env.VITE_APP_NAME || 'Gift Box Shop',
  debugMode: import.meta.env.VITE_DEBUG_MODE === 'true',
  telegramToken: import.meta.env.VITE_TELEGRAM_TOKEN || '',
  telegramChatId: import.meta.env.VITE_TELEGRAM_CHAT_ID || '',
  googleScriptUrl: import.meta.env.VITE_GOOGLE_SCRIPT_URL || '',
  googleSheetsId: import.meta.env.VITE_GOOGLE_SHEETS_ID || '',
  publicSiteUrl: import.meta.env.VITE_PUBLIC_SITE_URL || '',
  minOrderAmount: parseInt(import.meta.env.VITE_MIN_ORDER_AMOUNT || '10000', 10),
  
  // Helper function to check if we're in development mode
  isDev: () => import.meta.env.MODE === 'development',
  
  // Helper function to check if we're in production mode
  isProd: () => import.meta.env.MODE === 'production',
};
