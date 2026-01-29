
# Диагностика и план исправления

## Найденная проблема

**Точная причина** (1-2 предложения):  
Файл `js/utils/supabase.js` (строка 1) импортирует Supabase через CDN Skypack (`https://cdn.skypack.dev/@supabase/supabase-js`), который возвращает **504 Gateway Timeout**. Из-за этого JavaScript не загружается полностью, и приложение зависает на пустом экране.

**Доказательства из Network**:
```
612.58 | GET | ERR | Script | - | https://cdn.skypack.dev/new/@supabase/supabase-js@v2.93.1/dist=es2019
```

**Доказательства из Console**:
```
[error] Failed to load resource: the server responded with a status of 504 ()
(https://cdn.skypack.dev/new/@supabase/supabase-js@v2.93.1/dist=es2019:1)
```

---

## Архитектурная проблема проекта

В проекте есть **два способа импорта Supabase**, которые конфликтуют:

| Файл | Способ импорта | Используется для |
|------|----------------|------------------|
| `js/utils/supabase.js` | CDN Skypack (нестабильный) | Vanilla JS (`js/app.js`, `productsService.js` и др.) |
| `src/integrations/supabase/client.ts` | npm пакет | React компоненты |

Основное приложение (`index.html`) загружает **vanilla JS** через `js/app.js`, а не React. Поэтому используется именно `js/utils/supabase.js`, который падает из-за CDN.

---

## Шаги исправления

### Шаг 1: Исправить `js/utils/supabase.js` — использовать npm вместо CDN

**Файл:** `js/utils/supabase.js`

**Текущий код (проблемный):**
```javascript
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js';
```

**Новый код (исправленный):**
```javascript
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://bsndismiessofvhglzrv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzbmRpc21pZXNzb2Z2aGdsenJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2ODYyNTIsImV4cCI6MjA1NDI2MjI1Mn0.4pumjrK8SV79xaegTEZaJMmi6lnp-_5uhSytvWpoZHY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

**Почему это работает:**  
- `@supabase/supabase-js` уже установлен в `package.json` (версия `^2.49.1`)
- Vite разрешает npm-импорты и бандлит их корректно
- Не зависит от внешнего CDN

---

### Шаг 2: Убедиться, что Vite правильно обрабатывает JS-файлы

**Проверить `vite.config.ts`** — убедиться, что `js/` папка включена в обработку.

Текущая конфигурация уже корректна:
```typescript
build: {
  rollupOptions: {
    input: {
      main: path.resolve(__dirname, 'index.html'),
    },
  },
},
```

Vite следует за импортами из `index.html` → `js/app.js` → `js/utils/supabase.js`, поэтому npm-импорт будет работать.

---

## Альтернативный вариант (если npm-импорт не сработает)

Использовать более стабильный CDN — **esm.sh** вместо Skypack:

```javascript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
```

Но **рекомендуется npm-импорт**, так как:
1. Уже установлен в проекте
2. Бандлится Vite — быстрее загрузка
3. Не зависит от внешних CDN

---

## Проверка после исправления

### Локально:
```bash
npm run dev    # должен работать
npm run build  # должен пройти без ошибок
npm run preview  # должен открыться
```

### В браузере DevTools:
1. **Console**: нет ошибок `504` или `Failed to fetch`
2. **Network**: нет запросов к `cdn.skypack.dev`
3. **UI**: каталог товаров загружается, не висит на "Загрузка..."

### На хостингах (Netlify/Timeweb):
После деплоя приложение должно открываться без зависаний.

---

## Сводка изменений

| Файл | Строка | Действие |
|------|--------|----------|
| `js/utils/supabase.js` | 1 | Заменить CDN импорт на npm: `import { createClient } from '@supabase/supabase-js';` |

---

## Дополнительно: проблема с кнопками цветов (из предыдущего контекста)

После исправления Skypack-проблемы, Swiper и кнопки цветов должны заработать, так как:
1. Swiper-импорты уже исправлены на bundle (`import Swiper from 'swiper/bundle';`)
2. `SwiperService` уже имеет `categorySwipersById` и `updateCategorySlider()`

Если кнопки всё ещё не работают после Supabase-фикса — проверить, сохраняются ли инстансы слайдеров.
