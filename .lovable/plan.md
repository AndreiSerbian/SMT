

# Финальный план миграции Tailwind CSS с CDN на Vite/PostCSS

## Цель

Полностью убрать зависимость от `cdn.tailwindcss.com` и перейти на локальную сборку через Vite/PostCSS с единым Tailwind pipeline для всего проекта.

---

## Текущее состояние

```text
index.html
├── <script src="https://cdn.tailwindcss.com">  ← УДАЛИТЬ
├── <link href="styles.css">  ← файл НЕ существует, УДАЛИТЬ
├── <link href="public/css/*.css"> × 7 файлов
└── <script src="js/app.js" type="module">

src/index.css  ← React часть, уже использует Tailwind ✓
postcss.config.js  ← настроен ✓
tailwind.config.ts  ← НЕ сканирует js/**/*.js
```

---

## Шаг 1: Создать единый Tailwind CSS файл

**Создать файл: `src/styles/tailwind.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 
 * Импорт кастомных стилей из public/css
 * Эти файлы — чистый CSS без Tailwind директив
 */
@import '../../public/css/grouped-products.css';
@import '../../public/css/admin-storage.css';
@import '../../public/css/media-manager.css';
@import '../../public/css/admin-drag-drop.css';
@import '../../public/css/admin-media.css';
@import '../../public/css/admin-media-modal.css';
@import '../../public/css/product-modal.css';
```

**Почему в `src/`**: Vite автоматически отслеживает файлы в `src/`, PostCSS обработает директивы, CSS попадёт в dependency graph.

---

## Шаг 2: Импортировать CSS через JS entry point

**Изменить файл: `js/app.js`**

Добавить импорт в начало файла (использовать alias `@`):

```javascript
// Tailwind CSS через Vite (вместо CDN)
import '@/styles/tailwind.css';

import Router from './router.js';
import { initApp } from './main.js';
import { env } from './utils/env.js';

// ... остальной код без изменений
```

**Почему через alias `@/`**:
- Стабильнее при рефакторинге
- Меньше риска сломать относительные пути
- Alias уже настроен в vite.config.ts

---

## Шаг 3: Обновить tailwind.config.ts

**Изменить файл: `tailwind.config.ts`**

Добавить пути к Vanilla JS файлам в массив `content`:

```typescript
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    // React (существующие)
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    // Vanilla JS (ДОБАВИТЬ)
    "./js/**/*.js",
    "./index.html",
    "./*.html",
  ],
  prefix: "",
  theme: {
    // ... существующая конфигурация без изменений
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

---

## Шаг 4: Удалить CDN и неиспользуемые ссылки из index.html

**Изменить файл: `index.html`**

**Удалить строки:**
```html
<script src="https://cdn.tailwindcss.com"></script>
<link href="styles.css" rel="stylesheet">
<link rel="stylesheet" href="public/css/grouped-products.css">
<link rel="stylesheet" href="public/css/admin-storage.css">
<link rel="stylesheet" href="public/css/media-manager.css">
<link rel="stylesheet" href="public/css/admin-drag-drop.css">
<link rel="stylesheet" href="public/css/admin-media.css">
<link rel="stylesheet" href="public/css/admin-media-modal.css">
<link rel="stylesheet" href="public/css/product-modal.css">
```

**Итоговый `<head>`:**
```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SMT Premium Box</title>
  <meta name="description" content="Коробки оптом для бизнеса, ИП и магазинов" />
  <link rel="icon" href="/public/images/logo.svg" type="image/png">
  
  <!-- Внешние библиотеки (остаются) -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@9/swiper-bundle.min.css"/>
  <script src="https://unpkg.com/swiper/swiper-bundle.min.js"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <script src="https://cdn.gpteng.co/gptengineer.js" type="module"></script>
  <meta name="yandex-verification" content="7018a17094c7c62f" />
</head>
```

CSS теперь подключается через `js/app.js` — Vite автоматически инжектит стили.

---

## Шаг 5: Обновить vite.config.ts (минимальные изменения)

**Изменить файл: `vite.config.ts`**

Добавить явное указание PostCSS и настройку build:

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
    // Явно указываем PostCSS
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
  };
});
```

---

## Шаг 6: Обработка других HTML файлов

**`import-products.html` и `simple-import.html`**

Эти файлы — инструменты разработки/импорта. Два варианта:

**Вариант A** (рекомендуется): Оставить CDN в этих файлах, не включать в production сборку. Они не нужны пользователям.

**Вариант B**: Если нужны в production — добавить в `rollupOptions.input` и убрать CDN аналогично index.html.

---

## Сводка изменений

| Файл | Действие |
|------|----------|
| `src/styles/tailwind.css` | **Создать** — единый CSS с @tailwind + @import кастомных стилей |
| `js/app.js` | **Изменить** — добавить `import '@/styles/tailwind.css';` |
| `tailwind.config.ts` | **Изменить** — добавить `./js/**/*.js`, `./index.html`, `./*.html` в content |
| `index.html` | **Изменить** — удалить CDN скрипт и все `<link>` к CSS |
| `vite.config.ts` | **Изменить** — добавить `css.postcss` и `build.rollupOptions` |

---

## Проверка после миграции

### Development
```bash
npm run dev
```
- Открыть http://localhost:8080
- Проверить публичку (`/`) — все Tailwind классы работают
- Проверить админку (`#admin`) — стили применяются
- DevTools → Network → без запросов к `cdn.tailwindcss.com`
- DevTools → Console → без ошибок CSS

### Production
```bash
npm run build
npm run preview
```
- Проверить `dist/assets/` — должен быть CSS файл **~20-50KB** (не 3MB)
- Протестировать все страницы
- Проверить из РФ — белого экрана больше не будет

### Деплой на TimeWeb
1. Загрузить содержимое папки `dist/` на хостинг
2. Проверить из разных регионов РФ

---

## Результат

| До | После |
|----|-------|
| Tailwind CDN ~3MB | Локальный CSS ~20-50KB |
| Нет tree-shaking | Только используемые классы |
| Зависимость от CDN (блокировки РФ) | Полностью автономно |
| Нет кастомной конфигурации в публичке | Единый tailwind.config.ts везде |
| 8 отдельных `<link>` тегов | 1 бандл через Vite |
| Белый экран при недоступности CDN | Стабильная работа |

---

## Технические детали

### Почему CSS файлы из public/css безопасно импортировать

Все 7 файлов проверены — они содержат только:
- Чистый CSS (свойства, селекторы, медиа-запросы)
- HEX цвета (#e5e7eb, #3b82f6)
- Кастомные классы (.media-card, .category-card)
- Никаких `@tailwind`, `@apply` или Tailwind классов внутри CSS

### Почему alias `@/` вместо относительного пути

```javascript
// ❌ Относительный путь — хрупкий
import '../src/styles/tailwind.css';

// ✅ Alias — стабильный, уже настроен в vite.config.ts
import '@/styles/tailwind.css';
```

### Что НЕ нужно делать

- ❌ НЕ использовать Tailwind CLI отдельно
- ❌ НЕ делать второй CSS pipeline
- ❌ НЕ подключать CSS через `<link>` в HTML
- ❌ НЕ трогать React часть (src/index.css) — она уже работает

