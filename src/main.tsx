
import './index.css'
import { env } from './utils/env'

// Prefer legacy app in preview: boot legacy router and UI instead of React
async function bootLegacy() {
  // Ensure legacy container exists
  let app = document.getElementById('app') as HTMLElement | null
  if (!app) {
    app = document.createElement('div')
    app.id = 'app'
    document.body.appendChild(app)
  }

  // Helpers to load external assets once
  const ensureLink = (href: string) => {
    if (!document.querySelector(`link[href="${href}"]`)) {
      const l = document.createElement('link')
      l.rel = 'stylesheet'
      l.href = href
      document.head.appendChild(l)
    }
  }
  const ensureScript = (src: string) => new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve()
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.body.appendChild(s)
  })

  // Load dependencies expected by legacy UI
  ensureLink('https://cdn.jsdelivr.net/npm/swiper@9/swiper-bundle.min.css')
  ensureLink('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css')
  await ensureScript('https://unpkg.com/swiper/swiper-bundle.min.js')

  // Import legacy modules and start the app
  // @ts-ignore - legacy modules live in /js and are not typed
  const RouterMod: any = await import(/* @vite-ignore */ '/js/router.js')
  // @ts-ignore - legacy modules live in /js and are not typed
  const MainMod: any = await import(/* @vite-ignore */ '/js/main.js')
  const Router = RouterMod.default
  const { initApp } = MainMod
  const router = new Router()
  if ((router as any).adminComponent) {
    ;(window as any).adminComponent = (router as any).adminComponent
  }
  initApp()
}

// Log environment information in development mode
if (env.isDev()) {
  console.log('Running in development mode')
  console.log('App name:', env.appName)
}

bootLegacy().catch((e) => console.error('Legacy boot failed:', e))

