
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_RESEND_API_KEY: string
  readonly VITE_TELEGRAM_TOKEN: string
  readonly VITE_TELEGRAM_CHAT_ID: string
  readonly VITE_GOOGLE_SCRIPT_URL: string
  readonly VITE_GOOGLE_SHEETS_ID: string
  readonly VITE_PUBLIC_SITE_URL: string
  readonly VITE_APP_NAME: string
  readonly VITE_DEBUG_MODE: string
  readonly VITE_MIN_ORDER_AMOUNT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
