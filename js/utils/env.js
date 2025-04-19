
/**
 * Access environment variables in traditional JS code
 */
export const env = {
  apiUrl: import.meta.env.VITE_API_URL || '',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  appName: import.meta.env.VITE_APP_NAME || 'Gift Box Shop',
  debugMode: import.meta.env.VITE_DEBUG_MODE === 'true',
  telegramToken: import.meta.env.VITE_TELEGRAM_TOKEN || '',
  telegramChatId: import.meta.env.VITE_TELEGRAM_CHAT_ID || '',
  googleScriptUrl: import.meta.env.VITE_GOOGLE_SCRIPT_URL || '',
  publicSiteUrl: import.meta.env.VITE_PUBLIC_SITE_URL || '',
  minOrderAmount: parseInt(import.meta.env.VITE_MIN_ORDER_AMOUNT || '10000', 10),
  
  // Helper function to check if we're in development mode
  isDev: () => import.meta.env.MODE === 'development',
  
  // Helper function to check if we're in production mode
  isProd: () => import.meta.env.MODE === 'production',
};
