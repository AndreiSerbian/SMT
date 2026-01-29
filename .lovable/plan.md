

# План исправления стилей на TimeWeb (prod.giftboxop.ru)

## Найденная проблема

Проект работает на Netlify и локально, но на TimeWeb стили не применяются. Проверено:
- Font Awesome CSS загружается корректно (`Content-Type: text/css`)
- Товары загружаются (`Товары загружены: 46`)
- Приложение работает (`Products catalog loaded successfully`)

**Причина**: TimeWeb — это Apache-хостинг, который требует `.htaccess` для:
1. Правильной раздачи SPA (все роуты → index.html)
2. Правильных MIME-типов для CSS/JS файлов

В проекте есть `netlify.toml` и `vercel.json`, но **нет `.htaccess`** для Apache-хостингов.

---

## Шаг 1: Создать `.htaccess` для TimeWeb

Создать файл `.htaccess` в корне проекта (рядом с `index.html`):

```apache
# MIME Types (критично для CSS/JS)
AddType text/css .css
AddType application/javascript .js
AddType application/json .json
AddType image/svg+xml .svg
AddType image/webp .webp
AddType font/woff2 .woff2
AddType font/woff .woff

# Кодировка
AddDefaultCharset UTF-8

# SPA Routing — все запросы на index.html
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Не перезаписывать существующие файлы и директории
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  
  # Все остальные запросы → index.html
  RewriteRule ^(.*)$ /index.html [L,QSA]
</IfModule>

# Кэширование статики
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>

# Gzip сжатие
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml
</IfModule>
```

---

## Шаг 2: Добавить `.htaccess` в сборку Vite

Файл `.htaccess` должен автоматически копироваться в `dist/` при сборке.

Изменить `vite.config.ts`:

```typescript
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      mode === 'development' && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    css: {
      postcss: './postcss.config.js',
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
        },
      },
    },
    // НОВОЕ: Копировать .htaccess в dist
    publicDir: 'public',
  };
});
```

**Альтернатива**: Положить `.htaccess` в папку `public/` — Vite автоматически скопирует его в `dist/`.

---

## Шаг 3: Пересобрать и загрузить на TimeWeb

1. Положить `.htaccess` в папку `public/`
2. Запустить `npm run build`
3. Загрузить **всю папку `dist/`** на TimeWeb
4. Очистить кэш браузера (Ctrl+Shift+R)

---

## Шаг 4: Проверка на TimeWeb

После загрузки открыть DevTools → Network:

1. Найти CSS файл Vite (например `assets/index-XXXXX.css`)
2. Проверить заголовок `Content-Type: text/css`
3. Убедиться что статус `200 OK`

---

## Дополнительно: Диагностика

Если стили всё ещё не работают, проверь в DevTools на prod.giftboxop.ru:

**Network → Filter: CSS:**
- Какие CSS файлы загружаются?
- Какой статус (200/404)?
- Какой Content-Type?

**Console:**
- Есть ли ошибка `Refused to apply style from '...' because its MIME type ('text/plain') is not a supported stylesheet MIME type`?

---

## Сводка изменений

| Файл | Действие |
|------|----------|
| `public/.htaccess` | Создать — MIME types + SPA routing для TimeWeb |

---

## Ожидаемый результат

После добавления `.htaccess`:
1. CSS файлы Vite будут раздаваться с правильным `Content-Type: text/css`
2. SPA роутинг будет работать (refresh страницы не даст 404)
3. Стили будут применяться корректно

