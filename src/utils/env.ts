
/**
 * A type-safe way to access environment variables in React components
 */
export const env = {
  apiUrl: import.meta.env.VITE_API_URL || '',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  appName: import.meta.env.VITE_APP_NAME || 'Gift Box Shop',
  debugMode: import.meta.env.VITE_DEBUG_MODE === 'true',
  
  // Helper function to check if we're in development mode
  isDev: () => import.meta.env.MODE === 'development',
  
  // Helper function to check if we're in production mode
  isProd: () => import.meta.env.MODE === 'production',
};
