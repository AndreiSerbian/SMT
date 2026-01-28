

# План исправления: белый экран и ошибка 504/401 при загрузке

## Диагноз

При загрузке главной страницы вызывается edge-функция `group-products-by-categories` (строка 270 в `productsService.js`).

**Проблемы:**

1. **В `supabase/config.toml` отсутствует конфигурация** для функции `group-products-by-categories`
2. По умолчанию Supabase требует JWT-авторизацию для edge-функций
3. Код вызывает функцию **без `apikey` и без `Authorization` заголовков** → Supabase возвращает **401 Unauthorized**
4. Ошибка 504 может возникать из-за таймаута при повторных попытках

---

## Шаги исправления

### Шаг 1: Добавить функцию в `supabase/config.toml`

Добавить конфигурацию `verify_jwt = false` для публичной функции:

```toml
[functions.group-products-by-categories]
verify_jwt = false
```

Это позволит вызывать функцию без JWT токена.

---

### Шаг 2: Добавить `apikey` в заголовки запроса

В файле `js/services/productsService.js` (строки 270-275) добавить Supabase anon key в заголовки:

```javascript
const response = await fetch('https://bsndismiessofvhglzrv.supabase.co/functions/v1/group-products-by-categories', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzbmRpc21pZXNzb2Z2aGdsenJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2ODYyNTIsImV4cCI6MjA1NDI2MjI1Mn0.4pumjrK8SV79xaegTEZaJMmi6lnp-_5uhSytvWpoZHY'
  }
});
```

`apikey` обязателен для вызова edge-функций даже с `verify_jwt = false`.

---

## Сводка изменений

| Файл | Изменения |
|------|-----------|
| `supabase/config.toml` | Добавить `[functions.group-products-by-categories]` с `verify_jwt = false` |
| `js/services/productsService.js` | Добавить `apikey` в заголовки fetch запроса (строка 272) |

---

## Ожидаемый результат

1. Edge-функция станет доступна для публичных запросов
2. Запрос к функции будет успешным (200 вместо 401)
3. Главная страница загрузится с каталогом товаров
4. Белый экран исчезнет

---

## Техническое примечание

Supabase edge-функции требуют минимум один из:
- `apikey` заголовок (anon key) — для публичных функций с `verify_jwt = false`
- `Authorization: Bearer <jwt>` — для авторизованных функций

Без `apikey` даже функции с `verify_jwt = false` возвращают 401.

