# Аудит архитектуры данных SMT Premium Box (DIAGNOSTIC ONLY)

Код не изменялся, миграции не выполнялись, ресурсы Supabase не удалялись, переменные окружения не трогались.

---

## 1. Executive Summary

Архитектура **гибридная и асимметричная**:

- **Публичный каталог** уже не зависит от Supabase в горячем пути — он читает `public/data/products-public.json` (JSON-first, 56 SKU, версия `27c00555`), а Supabase остаётся только аварийным фоллбеком с таймаутом 4 с.
- **Всё остальное** — заказы, заявки, кастомайзер, изображения товаров, аналитика, админка — по-прежнему полностью на Supabase (БД + Storage + Auth + Edge Functions).
- **Источник истины по товарам — Supabase**, JSON является производным снапшотом, генерируемым скриптом. Двойного независимого источника нет, но есть риск рассинхронизации: правки в админке не появятся на сайте без повторного экспорта и деплоя.
- **Персональные данные российских покупателей пишутся в Supabase**, регион которого из репозитория недоказуем, и дополнительно расходятся в Telegram, Resend и Google Sheets.
- **Браузер обращается к БД напрямую** через anon-ключ; защита держится исключительно на RLS, и в двух таблицах RLS фактически открыта.

Ключевой вывод: миграция «website DB» на Timeweb Managed PostgreSQL технически реалистична, потому что публичный каталог уже отвязан. Основной объём работы — не каталог, а контур заказов, кастомайзера и админки.

---

## 2. Current Architecture Diagram

```text
                       ┌──────────────────────────────────────┐
   Посетитель ────────▶│ Timeweb shared hosting (giftboxopt.ru)│
                       │  статика: index.html, js/, images/   │
                       └───────────────┬──────────────────────┘
                                       │
        ┌──────────────────────────────┼───────────────────────────────┐
        │                              │                               │
   JSON-first                     прямые вызовы                  внешние скрипты
        │                          из браузера                         │
        ▼                              ▼                               ▼
 /data/products-public.json    supabase.co (REST/Storage/Auth)   clarity.ms, gtag,
 /data/catalog-version.json    /functions/v1/*                    CDN, шрифты
 /images/**  (локально)               │
                                      ▼
                          ┌───────────────────────────┐
                          │ Supabase (регион UNKNOWN) │
                          │  Postgres: products,      │
                          │   orders, designs, ...    │
                          │  Storage: product-media   │
                          │  Auth: админы             │
                          │  Edge Functions: 10 шт.   │
                          └────────────┬──────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
             api.telegram.org      Resend (email)   Google Apps Script
             (ФИО, тел, email,     покупателю        → Google Sheets
              адрес, PDF)          и админу          (полный заказ)
```

---

## 3. Database Inventory

| Component | Technology | File(s) | Purpose | Reads | Writes | Critical? |
|---|---|---|---|---|---|---|
| Supabase client (публичный) | supabase-js | `js/utils/supabase.js`, `public/env.js`, `js/utils/env.js` | Единый клиент для всего фронта | да | да | Да |
| Supabase client (React-часть) | supabase-js | `src/integrations/supabase/client.ts`, `src/utils/env.ts` | Клиент React-слоя | да | да | Нет (React-слой в проде не является основным) |
| JSON-каталог | статический файл | `public/data/products-public.json`, `public/data/catalog-version.json` | Публичный каталог, JSON-first | да | нет | **Да** |
| Загрузчик снапшота | JS | `js/services/catalogFallbackService.js` | Загрузка и адаптация JSON | да | нет | Да |
| Сервис товаров | JS | `js/services/productsService.js` | JSON-first для public, Supabase-only для admin | да | нет | Да |
| Экспортёр снапшота | Node | `scripts/export-catalog-snapshot.mjs` | Генерация JSON из Supabase, таблица `ARTIKUL_PHOTO_REMAP` | да | пишет файлы | Да (build-time) |
| Аудит медиа | Node | `scripts/audit-media-sync.mjs` | Сверка фото Supabase ↔ локальные | да | нет | Нет |
| Резолвер медиа | JS | `js/services/mediaResolver.js` | Локальные пути + fallback на Supabase Storage | да | нет | Да |
| Сервис цен | JS | `js/services/pricesService.js` | `product_prices` + Realtime-канал | да | нет | Средне |
| Корзина | localStorage | `js/services/cartService.js`, `js/customizer/app.js` | Ключ `cart` | да | да | Да |
| Согласие на cookie | localStorage | `js/services/cookieConsentService.js` | Ключ `cookieConsent` | да | да | Нет |
| Черновик кастомайзера | localStorage | `js/customizer/sceneManager.js` | Сохранение сцены | да | да | Средне |
| Сессия админа (legacy) | sessionStorage | `js/components/adminComponent.js` | `admin_login`, `admin_password` — **мёртвый код** | да | да | Нет |
| Логин админа (частично живой) | sessionStorage | `js/components/adminProductsComponent.js` (`adminLogin`), `modernAdminComponent.js` (`admin_session`) | Контекст для `set_admin_login_context` | да | да | Да |
| Supabase Auth | Supabase | `js/components/adminAuthComponent.js` | Вход админа, `has_role` | да | нет | Да |
| Supabase Storage | Supabase | `js/utils/storageHelper.js`, `js/components/adminProductsComponent.js`, `js/customizer/storageService.js` | Бакет `product-media` | да | да | Да |
| Supabase Realtime | Supabase | `js/services/productsService.js` L382, `js/services/pricesService.js` L126 | Живое обновление товаров и цен | да | нет | Нет |
| Edge Functions | Deno | `supabase/functions/*` (10 шт.) | Заказы, уведомления, медиа, PDF, импорт | да | да | Да |
| Legacy-каталог | JS-модуль | `js/data/products.js` | Захардкоженный каталог, **выведен из эксплуатации** | нет | нет | Нет |
| Импортные утилиты | HTML/JS | `import-products.html`, `import-script.js`, `run-import.js`, `simple-import.html` | Разовый импорт товаров | да | да | Нет (артефакты) |
| Внешние сервисы | HTTP | Edge Functions | Telegram, Resend, Google Apps Script | — | да | Да |
| Аналитика | JS | `index.html` L34-50 | Clarity, gtag | — | да (наружу) | Нет |

Переменные окружения, связанные с БД: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` (`.env`), плюс дублирование значений в `public/env.js`. Серверные секреты Edge Functions: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `RESEND_API_KEY`, `TELEGRAM_TOKEN`, `TELEGRAM_CHAT_ID`, `GOOGLE_SCRIPT_URL`, `GOOGLE_SHEETS_ID`, `ADMIN_EMAIL`, `PUBLIC_SITE_URL`, `LOVABLE_API_KEY`.

---

## 4. Supabase Dependency Map

| File | Function/module | Supabase feature | Table/bucket | Operation | Called by |
|---|---|---|---|---|---|
| `js/services/productsService.js` | `_fetchProductsFromSupabase` | Database | `products` | SELECT | публичный каталог (только фоллбек), админка |
| `js/services/productsService.js` | `_loadColorsFromSupabase` | Database | `colors` | SELECT | тот же сервис |
| `js/services/productsService.js` | загрузка категорий | Database | `categories` | SELECT | каталог |
| `js/services/productsService.js` L382 | `subscribeToChanges` | Realtime | `products` | подписка | `publicProductsComponent.js` L585 |
| `js/services/productsService.js` | вызов группировки | Edge Function | `group-products-by-categories` | POST | каталог |
| `js/services/pricesService.js` | загрузка цен | Database | `product_prices` | SELECT | публичные компоненты |
| `js/services/pricesService.js` L126 | Realtime-канал | Realtime | `product_prices` | подписка | тот же |
| `js/services/mediaResolver.js` | fallback URL | Storage | `product-media` | публичный URL | каталог, карточка товара |
| `js/components/orderComponent.js` L562 | отправка заказа | Edge Function | `order-processing` | POST | форма заказа |
| `js/services/contact-service.js` | заявка | Database + Edge Function | `contact_requests`, `contact-notify` | INSERT + POST | форма обратной связи |
| `js/services/orderConfirmationService.js` | подтверждение | Edge Function | `order-confirmation` | GET | ссылка из письма |
| `js/services/orderConfirmationHandler.js` | обработка ответа | — | — | — | роутер |
| `js/components/productComponent.js` L553 | трекинг | Database | `wb_clicks` | INSERT | клик по ссылке WB |
| `js/customizer/designService.js` | макеты | Database | `designs` | INSERT/SELECT/UPDATE | кастомайзер |
| `js/customizer/storageService.js` | файлы макета | Storage | `product-media` (`designs/**`) | upload + getPublicUrl | кастомайзер |
| `js/customizer/exportPipeline.js` | PDF | Edge Function | `generate-design-pdf` | invoke | кастомайзер |
| `js/customizer/app.js` | товар для кастомайзера | Database | `products` | SELECT | страница кастомайзера |
| `js/components/adminAuthComponent.js` | вход | Auth + RPC | `has_role` | signInWithPassword, rpc | админка |
| `js/components/adminProductsComponent.js` | CRUD товаров | Database + Storage + Edge | `products`, `product_prices`, `colors`, `categories`, `orders`, `wb_clicks`, `product-media`, `media-manager`, `import-products` | все | админка |
| `js/components/adminOrdersComponent.js` | заказы | Database + RPC | `orders`, `set_admin_login_context` | SELECT/UPDATE | админка |
| `js/components/adminClientsComponent.js` | клиенты | Database | `orders`, **`client_analytics`** | SELECT | админка |
| `js/components/adminAnalyticsComponent.js` | аналитика | Database | `orders` | SELECT | админка |
| `js/components/adminCategoriesComponent.js` | категории | Database | `categories` | CRUD | админка |
| `js/components/adminColorsComponent.js` | цвета | Database | `colors` | CRUD | админка |
| `js/components/mediaManagerComponent.js` | медиа | Database + Edge | `products`, `colors`, `categories`, `media-manager` | CRUD | админка |
| `js/components/modernAdminComponent.js` | сводная админка | Database + RPC | `products`, `orders`, `colors`, `categories`, `sizes`, `box_types`, `wb_clicks`, `set_admin_login_context` | все | админка |
| `js/components/modernAdminComponent_media.js` | медиа | Database + Edge | `products`, `media-manager` | UPDATE | админка |
| `js/utils/storageHelper.js` | папки/файлы | Edge Function | `storage-manager` | invoke ×5 | админка |
| `js/components/adminComponent.js` | legacy | Database + Edge | `admins`, `update-price` | SELECT/POST | **не подключён к роутеру** |
| `supabase/functions/order-processing` | приём заказа | Database + внешние | `orders`, `designs` | INSERT/SELECT | форма заказа |
| `supabase/functions/order-confirmation` | подтверждение | Database | `orders` | SELECT/UPDATE | письмо |
| `supabase/functions/update-price` | цены | Database + RPC | `product_prices`, `is_admin_user` | UPDATE | админка |
| `supabase/functions/media-manager` | медиа | Storage + Database | `product-media`, `products` | upload/UPDATE | админка |
| `supabase/functions/storage-manager` | папки | Storage | `product-media` | create/move/delete | админка |
| `supabase/functions/generate-design-pdf` | PDF | Storage + Database | `product-media`, `designs` | upload/UPDATE | кастомайзер |
| `supabase/functions/import-products` | импорт | Database + RPC | `products`, `product_prices`, `is_admin_user` | INSERT | админка |
| `supabase/functions/group-products-by-categories` | группировка | Database | `products`, `categories` | SELECT | каталог |
| `supabase/functions/contact-notify` | заявка | внешние | — | POST Telegram | форма |
| `supabase/functions/admin-notify` | алерты | внешние | — | POST | edge-функции |

### Если Supabase исчезнет завтра

**Продолжит работать:**
- Главная страница и каталог — читаются из `products-public.json`.
- Карточка товара — тот же снапшот.
- Все изображения каталога — локальные `/images/**` (миграция завершена).
- Корзина — localStorage.
- Статические страницы, навигация, фильтры, поиск по снапшоту.
- Кастомайзер как редактор в браузере — до момента сохранения.

**Перестанет работать:**
- Оформление заказа целиком (`order-processing`).
- Подтверждение заказа по ссылке из письма.
- Форма обратной связи.
- Сохранение макета кастомайзера, генерация PDF, загрузка ассетов.
- Трекинг кликов Wildberries.
- Вся админка: вход, товары, заказы, клиенты, категории, цвета, медиа, аналитика.
- Realtime-обновления цен и товаров.
- Актуализация цен (`product_prices` читается напрямую, а не из снапшота — **требует проверки**, покрывает ли снапшот все отображаемые цены).

---

## 5. Database Tables / Entities

| Table/entity | Fields used by frontend | CRUD | Related feature | Personal data? |
|---|---|---|---|---|
| `products` | id, artikul, name, price_rub, id_wb, dimensions, weight, photos, videos, is_active, size, color_hex, category_id | R (public), CRUD (admin) | Каталог, карточка, кастомайзер | Нет |
| `product_prices` | product_id, price_rub, updated_at | R (public), U (admin через edge) | Цены + Realtime | Нет |
| `categories` | id, name, slug, is_active, sort_order | R, CRUD (admin) | Категории, группировка | Нет |
| `colors` | name, russian_name, hex_code, is_active, sort_order | R, CRUD (admin) | Цветовые варианты | Нет |
| `sizes` | name, value, sort_order, is_active | R (admin) | Справочник | Нет |
| `box_types` | name, slug, sort_order, is_active | R (admin) | Справочник | Нет |
| `orders` | name, phone, email, yandex_address, comment, payment, delivery, cart_items, subtotal, discount, total, order_status, order_number, subscribe, client_id, confirmed_at | C (публично), RUD (admin) | Заказы | **Да** |
| `contact_requests` | name, phone, message | C (публично), R (admin) | Обратная связь | **Да** |
| `b2b_clients` | email, phone, company_name, contact_name | CRUD (admin/edge) | CRM-заготовка | **Да** |
| `designs` | product_id, sku, qty, comment, options, objects_mm, preview_urls, production_pdf_url, customized_sides, status | C/R/U (публично) | Кастомайзер | **Да** (комментарии, загруженные изображения) |
| `wb_clicks` | product_id, user_agent, referrer | C (публично), R (admin) | Трекинг переходов | Сетевые идентификаторы |
| `admins` | login, password | R (legacy/edge) | Legacy-авторизация | Учётные данные |
| `user_roles` | user_id, role | R | RBAC | Нет |
| `site_settings` | key, value | R/W | Настройки | Нет |
| `products_photos_backup_20260509` | — | — | Разовый бэкап | Нет |
| **`client_analytics`** | `*`, `last_order_date` | R | Страница клиентов в админке | **Да, вероятно** |

**Schema cannot be fully determined from repository** для `client_analytics`: объект запрашивается в `js/components/adminClientsComponent.js` L49, но **отсутствует в перечне таблиц проекта**. Скорее всего это представление (view) поверх `orders`/`b2b_clients`, но его определение в репозитории не найдено.

Также не выводится из репозитория: фактические типы и ограничения колонок (репозиторий содержит только 7 файлов миграций, что явно меньше текущего состояния схемы), наличие индексов, фактические объёмы строк, состав `cart_items`, `options`, `objects_mm`, `preview_urls`.

### Что нужно достать из Supabase Dashboard

1. Table Editor → полные DDL всех таблиц (`Definition`), особенно `orders`, `designs`, `products`, `b2b_clients`.
2. SQL Editor → `select table_name, table_type from information_schema.tables where table_schema='public';` — подтвердить, view ли `client_analytics`, и получить её определение.
3. Database → Indexes → перечень индексов.
4. Количество строк по каждой таблице.
5. Database → Backups → настройки и регион копий.
6. Project Settings → General → **Region**.
7. Storage → перечень бакетов и суммарный объём, отдельно размер префикса `designs/`.
8. Edge Functions → Secrets → фактическое значение `ADMIN_EMAIL` (список получателей) — не для отчёта, а для планирования.

---

## 6. Personal Data Audit

| Data field | Where collected | Where sent | Where stored | Third-party | Personal? | Risk |
|---|---|---|---|---|---|---|
| ФИО | `orderComponent.js` L212 | `order-processing` | `orders.name` | Supabase, Telegram, Resend, Sheets | Да | **HIGH PRIORITY FOR MIGRATION** |
| Телефон | `orderComponent.js` L219; `contactsComponent.js` L75 | order-processing / contact-notify | `orders.phone`, `contact_requests.phone` | те же | Да | **HIGH PRIORITY** |
| Email | `orderComponent.js` L229 | order-processing | `orders.email` | Supabase, Resend, Telegram, Sheets | Да | **HIGH PRIORITY** |
| Адрес доставки | `orderComponent.js` L241 | order-processing | `orders.yandex_address` | Supabase, Telegram, Sheets | Да | **HIGH PRIORITY** |
| Комментарий к заказу | `orderComponent.js` L248 | order-processing | `orders.comment` | те же | Да (свободный текст) | **HIGH PRIORITY** |
| Сообщение обратной связи | `contactsComponent.js` L76 | contact-notify | `contact_requests.message` | Supabase, Telegram | Да | **HIGH PRIORITY** |
| Согласие на рассылку | `orderComponent.js` L234 | order-processing | `orders.subscribe` | Supabase | Да (связано с email) | NEEDS REVIEW |
| Состав заказа | корзина | order-processing | `orders.cart_items` | Supabase, Telegram, Sheets | Косвенно | NEEDS REVIEW |
| Компания, контактное лицо | админка/агрегация | — | `b2b_clients` | Supabase | Да | **HIGH PRIORITY** |
| Загруженные клиентом изображения | `canvasController.js` L241 | Storage | `product-media/designs/*/assets/` | Supabase | Возможно | **HIGH PRIORITY** |
| Макет и комментарий к макету | кастомайзер | Storage + DB | `designs`, `product-media/designs/**` | Supabase, Telegram (PDF) | Да | **HIGH PRIORITY** |
| Производственный PDF | `generate-design-pdf` | Storage → Telegram | `product-media/designs/*/production/` | Supabase, Telegram | Да | **HIGH PRIORITY** |
| User-Agent, Referrer | `productComponent.js` L546-566 | REST | `wb_clicks` | Supabase | Сетевые идентификаторы | NEEDS REVIEW |
| IP-адрес | кодом не собирается | — | логи Supabase и хостинга | — | Да, в логах | NEEDS REVIEW — UNKNOWN |
| Корзина | браузер | — | localStorage `cart` | — | Нет | LOW RISK |
| Поведение на сайте | Clarity, gtag | clarity.ms, googletagmanager.com | вне проекта | Microsoft, Google | Да | NEEDS REVIEW |
| Учётные данные админа | форма входа | Supabase Auth; legacy — `admins.password` plaintext | Supabase | — | Да | **HIGH PRIORITY** |

Поток:

```text
USER → FORM (orderComponent / contactsComponent / customizer)
     → FRONTEND (браузер, anon-ключ)
     → EDGE FUNCTION (order-processing / contact-notify / generate-design-pdf)
     → DATABASE (orders / contact_requests / designs) + STORAGE (product-media)
     → ADMIN (adminOrdersComponent, adminClientsComponent)
     → TELEGRAM (полный текст заказа + PDF)
     → RESEND (письмо покупателю и админу)
     → GOOGLE SHEETS (полный заказ)
```

Пишутся ли ПДн россиян за пределы РФ: **технически данные уходят в Supabase, Telegram, Resend и Google — все инфраструктурно иностранные сервисы. Регион самого проекта Supabase из репозитория недоказуем — UNKNOWN, requires verification.** Юридический вывод не делается.

---

## 7. Product Data vs Customer Data

### A. Product data — где реально живёт

Проверено по коду, не по предположению:

| Сущность | Источник истины | Публичное чтение | Примечание |
|---|---|---|---|
| Товары | **Supabase `products`** | `products-public.json` | JSON — производный снапшот |
| Цены | Supabase `products.price_rub` + `product_prices` | цена есть в снапшоте; `pricesService` при этом отдельно ходит в `product_prices` | **дублирование механизмов, требует проверки** |
| Категории | Supabase `categories` | в снапшоте | — |
| Цвета | Supabase `colors` | в снапшоте | — |
| Размеры, типы коробок | Supabase `sizes`, `box_types` | не в снапшоте, только админка | — |
| Фото | пути в `products.photos`, файлы — **локально `public/images/**`** | локально | ремап зафиксирован в `ARTIKUL_PHOTO_REMAP` |
| Видео | `products.videos` | локально `/videos/` | — |
| Остатки | **отсутствуют в схеме** | — | функционала складского учёта нет |
| Опции кастомизации | геометрия задаётся кодом кастомайзера, не таблицей | — | — |

### B. Customer / transaction data

Полностью в Supabase: `orders`, `contact_requests`, `b2b_clients`, `designs`, `wb_clicks`. Локальных копий нет. Экспорта в JSON нет.

### Проверка исходной гипотезы

Гипотеза «product data JSON-based, customer data Supabase» **подтверждается частично**:
- Верно, что публичное чтение каталога идёт из JSON и что клиентские данные целиком в Supabase.
- Неверно, что каталог JSON-based по своей природе: **записи по-прежнему делаются в Supabase**, JSON только читается. Админка работает исключительно через Supabase (`source: 'admin'`, Supabase-only, таймаут 18 с).

---

## 8. Product CRUD Flow

```text
АДМИН (adminProductsComponent / modernAdminComponent / mediaManagerComponent)
  → supabase.from('products').insert/update/delete       ← прямая запись из браузера
  → supabase.functions.invoke('media-manager')           ← загрузка фото, обновление products.photos
  → supabase.functions.invoke('storage-manager')         ← создание/перенос/удаление папок в бакете
  → supabase.functions.invoke('import-products')         ← массовый импорт
  → supabase.rpc('set_admin_login_context')              ← параллельный legacy-контур авторизации
        │
        ▼
  Supabase Postgres + Storage  (ИСТОЧНИК ИСТИНЫ)
        │
        │  ручной шаг: npm run export:catalog
        ▼
  public/data/products-public.json + catalog-version.json
        │
        │  ручной шаг: npm run build → загрузка dist/ на Timeweb
        ▼
  ПУБЛИЧНЫЙ КАТАЛОГ
```

Ответы:

1. **Источник истины** — Supabase Postgres (таблица `products`), плюс бакет `product-media` для файлов, загруженных через админку. Локальные `public/images/**` — источник истины для файлов, которые уже мигрированы.
2. **Изменяет ли админ-CRUD JSON?** Нет. Ни один компонент админки не пишет в `products-public.json`.
3. **Пишет ли админ-CRUD в Supabase?** Да, напрямую из браузера и через edge-функции.
4. **Дублируются ли товары между JSON и Supabase?** Да, но это односторонний снапшот, а не два независимых источника. Расхождение возможно и вероятно.
5. **Как обрабатываются загруженные изображения?** Через `media-manager` в бакет `product-media`, затем URL дописывается в массив `products.photos`.
6. **Где хранятся URL изображений?** В `products.photos` / `products.videos` (Supabase) и в снапшоте `products-public.json` в виде локальных путей после ремапа в `scripts/export-catalog-snapshot.mjs`.
7. **Что после перезагрузки страницы?** Публичный каталог перечитает JSON и покажет состояние на момент последнего экспорта. Изменения админа не появятся.
8. **Что после деплоя/сборки?** `dist/` содержит снапшот, зафиксированный на момент экспорта. Если экспорт не выполнялся, деплой откатит публичный каталог к более старому состоянию данных.
9. **Могут ли изменения админа быть перезаписаны деплоем?** Данные в Supabase — нет. **Публичное отображение — да**: деплой со старым JSON визуально «откатит» правки. Это реальный операционный риск текущей схемы.

---

## 9. Storage / Images / Customer Files

Бакет в проекте **один**.

| Bucket | Content | Uploaded by | Public/private | Referenced from |
|---|---|---|---|---|
| `product-media` | `images/<размер>/<цвет>/slide*.webp` — каталожные фото | админ / первичный импорт | **public** | `mediaResolver.js` (только как fallback), карточка товара |
| `product-media` | `videos/*` | админ | public | каталог |
| `product-media` | `designs/<uuid>/previews/<side>.png` | покупатель | public | `storageService.js` L42 |
| `product-media` | `designs/<uuid>/scene/scene.json` | покупатель | public | `storageService.js` L56 |
| `product-media` | `designs/<uuid>/assets/<timestamp>.<ext>` — **файлы, загруженные клиентом** | покупатель | public | `storageService.js` L81 |
| `product-media` | `designs/<uuid>/production/<filename>` — производственные PDF | edge-функция | public | `generate-design-pdf/index.ts` |

Разделение по чувствительности:

- **Публичные фото каталога** — публичность корректна; кроме того, каталог уже читает локальные копии с Timeweb.
- **Загруженные админом фото товаров** — те же префиксы `images/**`; для 11 артикулов ранее выполнен ремап на локальные файлы.
- **Файлы, загруженные клиентом** — `designs/*/assets/**`. **Отмечено отдельно: могут содержать логотипы, макеты и иные коммерчески чувствительные данные заказчика.**
- **Артворк кастомизации** — `designs/*/previews/**`, `scene.json`.
- **Производственные PDF** — `designs/*/production/**`, дополнительно уходят в Telegram.

Все перечисленное лежит в **одном публичном бакете**, доступ по постоянному публичному URL, signed URL не используются. Валидация загрузки — только ограничение 25 МБ (`canvasController.js` L242).

---

## 10. Authentication / Admin

1. **Существует ли Supabase Auth?** Да. `adminAuthComponent.js` L100 — `signInWithPassword`, затем `rpc('has_role', ...)`; при отсутствии роли выполняется `signOut()` (L117). Сессия проверяется на L168/L191.
2. **Один админ или несколько?** Модель многопользовательская: `user_roles` + enum `app_role('admin','user')`. **Фактическое число пользователей — UNKNOWN, requires verification** (Dashboard → Authentication → Users). Таблица `admins` содержит записи legacy-контура.
3. **Нужна ли аутентификация публичному покупателю?** Нет. Заказ, заявка и кастомайзер работают анонимно.
4. **Какие операции требуют аутентификации?** По RLS — чтение и изменение `orders`, `contact_requests`, `b2b_clients`, `admins`, запись в `products`/`categories`/`colors`/`sizes`/`box_types`. Не требуют: чтение активного каталога, INSERT в `orders`, `contact_requests`, `wb_clicks`, а также **SELECT/INSERT/UPDATE в `designs`** и **SELECT в `wb_clicks`**.
5. **Есть ли RLS?** Да, включена на всех таблицах. Но политики `designs` (`Anyone can read/update designs`, `qual=true`) и `wb_clicks` (SELECT `qual=true`) фактически открыты для анонимов; политика `Service role can manage b2b clients` назначена роли `public` с `qual=true`.
6. **Может ли фронтенд напрямую писать в БД?** Да — и публичный (INSERT в `orders`, `contact_requests`, `wb_clicks`, INSERT/UPDATE в `designs`), и админский (полный CRUD по товарам и справочникам).

Риски безопасности (**не исправляются в рамках этой задачи**):

- `storage-manager` и `media-manager`: `verify_jwt = false` + `SUPABASE_SERVICE_ROLE_KEY` + **отсутствие любой проверки прав** → неавторизованное управление бакетом и обновление товаров.
- `update-price` и `import-products`: аутентификация по логину и паролю в открытом виде через `is_admin_user`.
- Таблица `admins` хранит пароль в колонке `text`.
- Параллельный контур `set_admin_login_context` в 5 живых компонентах админки в обход `has_role`.
- Анонимные чтение и изменение `designs`; анонимное чтение `wb_clicks`.
- Публичный бакет с клиентскими файлами.
- CORS `*` во всех edge-функциях, отсутствие rate-limit и captcha.
- Мёртвый `adminComponent.js` пишет пароль в `sessionStorage` (не в роутинге).

---

## 11. Frontend → Database Access

Браузер **напрямую** обращается к Supabase REST, Storage, Auth и Realtime, используя публичный anon-ключ. Пароль Postgres в браузер не попадает и сейчас, поэтому «утечки кредов БД» в текущей схеме нет — но вся модель доступа держится на RLS, а RLS в двух местах открыта.

Операции из браузера напрямую в БД: SELECT `products`/`colors`/`categories`/`product_prices`; INSERT `orders` (через edge), INSERT `contact_requests`, INSERT `wb_clicks`, INSERT/SELECT/UPDATE `designs`; весь админский CRUD; upload в Storage; подписки Realtime.

Оценка целевой схемы «frontend → API в РФ → Managed PostgreSQL в РФ»: **подходит и является естественным следующим шагом**, потому что:

- публичный каталог уже не требует БД в рантайме, значит API нужен не для чтения каталога, а только для записи и админки — объём эндпоинтов небольшой;
- прямые записи из браузера уже частично проксируются edge-функциями, то есть шаблон «форма → серверная функция» в коде уже существует и будет заменён один в один;
- главное следствие — придётся отказаться от Realtime и от Supabase Auth, заменив их на обычный polling и собственную сессионную авторизацию администратора.

---

## 12. Target Architecture Options

### OPTION A — Timeweb Managed PostgreSQL + лёгкий Node.js API (VPS/Cloud Apps)

- **Плюсы:** полный контроль, единый язык с фронтом, прямая замена edge-функций, БД и API в РФ, простая работа с файлами, можно оставить статику на shared-хостинге.
- **Минусы:** появляется сервер, который надо обновлять и мониторить; нужен процесс-менеджер, TLS, бэкапы конфигурации.
- **Сложность:** средняя. **Миграция:** средняя. **Поддержка:** средняя.
- **Совместимость:** высокая — 10 edge-функций переносятся почти построчно.

### OPTION B — Timeweb Managed PostgreSQL + PHP-бэкенд на существующем shared-хостинге

- **Плюсы:** не нужен отдельный сервер и отдельная оплата; shared-хостинг Timeweb штатно поддерживает PHP и подключение к Managed PostgreSQL; ничего не надо администрировать; самая низкая стоимость; в проекте уже обсуждался PHP-слой как способ обхода недоступности внешних сервисов.
- **Минусы:** PHP как второй язык в проекте; нет фоновых задач и long-running процессов; генерация PDF на shared-хостинге ограничена; предсказуемо потребуется отдельное решение для `generate-design-pdf`.
- **Сложность:** низкая. **Миграция:** средняя. **Поддержка:** низкая.
- **Совместимость:** высокая для CRUD и форм, **низкая для PDF-пайплайна кастомайзера**.

### OPTION C — Self-hosted Supabase в РФ

- **Плюсы:** максимальная совместимость с существующим кодом — сохраняются `supabase-js`, RLS, Storage, Auth, Realtime; изменения во фронте минимальны.
- **Минусы:** Docker и около десяти сервисов, которые надо администрировать и обновлять; нужен полноценный VPS с заметным объёмом ресурсов; вся ответственность за безопасность и бэкапы на владельце; это ровно тот вариант, который в постановке задачи помечен как нежелательный.
- **Сложность:** высокая. **Миграция:** низкая. **Поддержка:** высокая.
- **Совместимость:** максимальная.

### Рекомендация

**OPTION B как основа, с одним небольшим Node-сервисом только под PDF, если PHP-решение окажется недостаточным.**

Обоснование: публичный каталог уже статический, поэтому нагрузка на бэкенд сводится к формам, кастомайзеру и админке — это укладывается в возможности PHP на shared-хостинге. Это самый дешёвый и наименее обслуживаемый вариант, он не требует нового сервера и сохраняет текущую схему деплоя. Option A остаётся запасным, если владелец захочет один язык на всём стеке. Option C противоречит заданным ограничениям.

---

## 13. Proposed PostgreSQL Schema (минимальная, только под существующий функционал)

| TABLE | COLUMN | TYPE | NULLABLE | INDEX | RELATION | PURPOSE |
|---|---|---|---|---|---|---|
| `categories` | id | uuid PK | нет | PK | — | категория |
| | slug | text | нет | unique | — | ключ для фронта |
| | name | text | нет | — | — | название |
| | sort_order | int default 0 | нет | — | — | порядок |
| | is_active | bool default true | нет | idx | — | видимость |
| `colors` | id | uuid PK | нет | PK | — | цвет |
| | name, russian_name | text | russian_name — да | — | — | названия |
| | hex_code | text | нет | unique | — | ключ сопоставления |
| | sort_order, is_active | int / bool | нет | — | — | — |
| `products` | id | text PK (артикул) | нет | PK | — | товар |
| | name | text | нет | — | — | — |
| | category_id | uuid | да | idx | → categories.id | категория |
| | color_hex | text | нет | idx | → colors.hex_code (логически) | цвет |
| | size | text | нет | — | — | размер |
| | price_rub | numeric(10,2) | нет | — | — | цена |
| | id_wb | text | да | — | — | ссылка на WB |
| | dimensions | jsonb | нет | — | — | length/width/height |
| | weight | numeric | нет | — | — | вес |
| | is_active | bool default true | нет | idx | — | публикация |
| | created_at, updated_at | timestamptz | нет | — | — | — |
| `product_images` | id | bigserial PK | нет | PK | — | фото |
| | product_id | text | нет | idx | → products.id ON DELETE CASCADE | связь |
| | path | text | нет | — | — | относительный путь |
| | kind | text ('photo'/'video') | нет | — | — | тип |
| | position | int | нет | idx(product_id, position) | — | порядок слайдов |
| `orders` | id | uuid PK | нет | PK | — | заказ |
| | order_number | text | да | unique | — | MM-N-YYYY |
| | client_id | uuid | да | idx | → clients.id | связь с клиентом |
| | name, phone, email | text | нет | idx(phone), idx(email) | — | **ПДн** |
| | address | text | да | — | — | **ПДн** |
| | comment | text | да | — | — | **ПДн** |
| | payment, delivery | text | да | — | — | условия |
| | subtotal, discount, total | numeric(10,2) | нет | — | — | суммы |
| | status | text default 'pending' | нет | idx | — | 10 статусов |
| | subscribe | bool default false | нет | — | — | согласие на рассылку |
| | created_at, confirmed_at | timestamptz | confirmed_at — да | idx(created_at) | — | — |
| `order_items` | id | bigserial PK | нет | PK | — | позиция |
| | order_id | uuid | нет | idx | → orders.id ON DELETE CASCADE | связь |
| | product_id | text | да | — | → products.id | товар |
| | sku, name | text | нет | — | — | снимок на момент заказа |
| | qty | int | нет | — | — | количество |
| | unit_price, line_total | numeric(10,2) | нет | — | — | цены |
| | design_id | uuid | да | idx | → designs.id | кастомизация |
| `clients` | id | uuid PK | нет | PK | — | клиент (замена `b2b_clients`) |
| | email, phone | text | да | unique(email), idx(phone) | — | **ПДн**, ключи слияния дублей |
| | company_name, contact_name | text | да | — | — | **ПДн** |
| | created_at, updated_at | timestamptz | нет | — | — | — |
| `contact_requests` | id | uuid PK | нет | PK | — | заявка |
| | name, phone | text | нет | — | — | **ПДн** |
| | message | text | да | — | — | **ПДн** |
| | created_at | timestamptz | нет | idx | — | — |
| `designs` | id | uuid PK | нет | PK | — | макет |
| | product_id, sku | text | нет | idx | → products.id | товар |
| | qty | int default 1 | нет | — | — | — |
| | comment | text | да | — | — | **ПДн** |
| | options, objects_mm, preview_urls, customized_sides | jsonb | нет, default | — | — | состояние сцены |
| | production_pdf_path, production_pdf_filename | text | да | — | — | PDF |
| | status | text default 'saved' | нет | — | — | — |
| | created_at, updated_at | timestamptz | нет | — | — | — |
| `design_files` | id | bigserial PK | нет | PK | — | файл клиента |
| | design_id | uuid | нет | idx | → designs.id ON DELETE CASCADE | связь |
| | path | text | нет | — | — | путь в приватном хранилище |
| | original_name, mime, size_bytes | text/int | да | — | — | метаданные |
| | uploaded_at | timestamptz | нет | — | — | retention |
| `admin_users` | id | uuid PK | нет | PK | — | администратор |
| | email | text | нет | unique | — | логин |
| | password_hash | text | нет | — | — | **только хеш** |
| | role | text | нет | — | — | роль |
| | created_at, last_login_at | timestamptz | last_login_at — да | — | — | — |
| `site_settings` | key | text PK | нет | PK | — | настройки |
| | value | jsonb | да | — | — | — |

**Не создавать:** `product_variants` — в текущем коде вариант = отдельный товар с собственным артикулом, отдельная таблица вариантов сейчас функционала не добавит; `leads`/`customization_requests` как отдельные сущности — их роль уже выполняют `contact_requests` и `designs`; таблицы складских остатков — функционала нет; аналитические таблицы — по принципу разделения систем аналитика не должна жить в операционной БД.

**Отдельно `wb_clicks`:** это аналитика, а не операционные данные. По заявленному принципу разделения систем её место — не в website DB. Варианты: вынести в отдельную схему/базу либо отказаться в пользу событий веб-аналитики. **Решение за владельцем.**

**Что имеет смысл оставить в JSON:** публичный снапшот каталога (`products-public.json`, `catalog-version.json`) — он остаётся правильным решением независимо от смены БД, потому что даёт мгновенную отдачу со статики и устойчивость к недоступности бэкенда. Геометрию коробок и конфигурацию сторон кастомайзера тоже нет смысла переносить в SQL — это код, а не данные.

---

## 14. Required API

Все пути — под общим префиксом `/api`. Формат ответа — JSON.

| Method | Path | Purpose | Input | Output | Auth | Personal data |
|---|---|---|---|---|---|---|
| GET | `/api/catalog/version` | Версия снапшота для инвалидации кэша | — | `{version, generatedAt, productsCount}` | нет | нет |
| GET | `/api/products` | Каталог (резерв, если снапшот недоступен) | `?category&color&size` | массив товаров | нет | нет |
| GET | `/api/products/:id` | Карточка | id | товар | нет | нет |
| POST | `/api/orders` | Создание заказа + сопоставление клиента + уведомления | ФИО, телефон, email, адрес, комментарий, оплата, доставка, позиции, subscribe | `{order_id, order_number}` | нет + rate-limit/captcha | **да** |
| GET | `/api/orders/confirm` | Подтверждение по ссылке из письма | `order_id`, одноразовый `token` | редирект | по токену | да |
| POST | `/api/contact-requests` | Заявка обратной связи | имя, телефон, сообщение | `{ok}` | нет + rate-limit/captcha | **да** |
| POST | `/api/designs` | Сохранение макета | sku, qty, comment, options, objects_mm, стороны | `{design_id}` | нет | **да** |
| PATCH | `/api/designs/:id` | Обновление макета | те же поля | `{ok}` | владение по серверному токену макета | да |
| POST | `/api/designs/:id/files` | Загрузка изображения клиента | multipart, whitelist MIME, лимит размера | `{path}` | токен макета | **да** |
| POST | `/api/designs/:id/pdf` | Генерация производственного PDF | — | `{pdf_path}` | токен макета | да |
| GET | `/api/designs/:id/file` | Выдача файла макета | `path` | поток | подписанная ссылка с TTL | **да** |
| POST | `/api/track/wb-click` | Клик по WB (если сохраняем) | product_id | `{ok}` | нет | сетевые идентификаторы |
| POST | `/api/admin/login` | Вход администратора | email, пароль | httpOnly-cookie сессии | нет | учётные данные |
| POST | `/api/admin/logout` | Выход | — | `{ok}` | да | нет |
| GET | `/api/admin/session` | Проверка сессии | — | `{user, role}` | да | нет |
| GET | `/api/admin/products` | Список для админки | фильтры, пагинация | массив | да | нет |
| POST | `/api/admin/products` | Создание | поля товара | товар | да | нет |
| PATCH | `/api/admin/products/:id` | Изменение | поля | товар | да | нет |
| DELETE | `/api/admin/products/:id` | Удаление | id | `{ok}` | да | нет |
| POST | `/api/admin/products/:id/images` | Загрузка фото | multipart | пути | да | нет |
| DELETE | `/api/admin/products/:id/images` | Удаление фото | path | `{ok}` | да | нет |
| PATCH | `/api/admin/products/:id/images/order` | Порядок слайдов | массив путей | `{ok}` | да | нет |
| POST | `/api/admin/products/import` | Массовый импорт | массив товаров | отчёт | да | нет |
| GET/POST/PATCH/DELETE | `/api/admin/categories[/:id]` | Справочник категорий | — | — | да | нет |
| GET/POST/PATCH/DELETE | `/api/admin/colors[/:id]` | Справочник цветов | — | — | да | нет |
| GET | `/api/admin/orders` | Список заказов | фильтры, период | массив | да | **да** |
| GET | `/api/admin/orders/:id` | Карточка заказа | id | заказ + позиции | да | **да** |
| PATCH | `/api/admin/orders/:id` | Смена статуса | status | заказ | да | да |
| DELETE | `/api/admin/orders/:id` | Удаление | id | `{ok}` | да | **да** |
| GET | `/api/admin/contact-requests` | Заявки | период | массив | да | **да** |
| GET | `/api/admin/clients` | Клиенты с агрегатами (замена `client_analytics`) | — | массив | да | **да** |
| PATCH | `/api/admin/clients/:id` | Правка клиента | поля | клиент | да | да |
| POST | `/api/admin/clients/merge` | Слияние дублей | source_id, target_id | `{ok}` | да | **да** |
| GET | `/api/admin/analytics/summary` | Сводка по продажам | период | агрегаты | да | нет |
| POST | `/api/admin/catalog/export` | Пересборка публичного снапшота | — | `{version}` | да | нет |

Отдельно: эндпоинт пересборки снапшота закрывает главный операционный разрыв текущей схемы — публикацию правок админа без ручного запуска скрипта и полного деплоя.

---

## 15. Migration Plan

| Фаза | Задача | Файлы | Данные | Сложность | Риск | Откат |
|---|---|---|---|---|---|---|
| 0. Бэкап | Полный дамп Supabase (БД + Storage), архив текущего `dist/` | — | все | Низкая | Низкий | — |
| 1. Достоверная инвентаризация | Получить DDL всех таблиц, определение `client_analytics`, регион проекта, объёмы, число админов | — | метаданные | Низкая | Низкий | — |
| 2. Создание Managed PostgreSQL | Заказать инстанс в РФ, включить бэкапы, настроить доступ по списку IP и TLS | — | — | Низкая | Низкий | Удалить инстанс |
| 3. Схема | Применить схему из раздела 13 на пустую БД | новые SQL-миграции | — | Средняя | Низкий | Пересоздать БД |
| 4. Экспорт из Supabase | Выгрузить `products`, `product_prices`, `categories`, `colors`, `orders`, `contact_requests`, `b2b_clients`, `designs`, при необходимости `wb_clicks` | новый скрипт `scripts/export-supabase-dump.mjs` | все | Средняя | Низкий | Повторить выгрузку |
| 5. Импорт и трансформация | Развернуть `photos[]` в `product_images`, `cart_items` в `order_items`, `b2b_clients` в `clients`, сверить контрольные суммы по количеству строк и суммам заказов | новый `scripts/import-to-pg.mjs` | все | **Высокая** | **Средний** | Очистить целевую БД и повторить |
| 6. Перенос файлов | Скачать `designs/**` из бакета, разложить в приватное хранилище на Timeweb; каталожные `images/**` уже локальны | `scripts/` | Storage | Средняя | Средний | Файлы остаются в Supabase до финального шага |
| 7. Реализация API | Публичные эндпоинты форм и кастомайзера, затем админские, затем экспорт снапшота | новый серверный слой | — | **Высокая** | Средний | API не подключён к фронту, влияния нет |
| 8. Подключение форм | Переключить заказ, обратную связь, кастомайзер на новый API | `orderComponent.js`, `contact-service.js`, `designService.js`, `storageService.js`, `exportPipeline.js`, `productComponent.js` | новые записи | Средняя | **Высокий** | Вернуть URL edge-функций |
| 9. Подключение админки | Заменить прямые вызовы Supabase на API, реализовать собственную авторизацию, убрать `set_admin_login_context`, отключить Realtime в пользу periodic refresh | все `js/components/admin*`, `modernAdmin*`, `mediaManagerComponent.js`, `storageHelper.js`, `pricesService.js`, `productsService.js` | — | **Высокая** | Средний | Вернуть предыдущую сборку админки |
| 10. Тестирование | Сквозные сценарии: заказ, подтверждение, заявка, макет и PDF, CRUD товара с фото, пересборка снапшота, сверка витрины | — | тестовые | Средняя | Низкий | — |
| 11. Двойная запись (опционально) | Некоторое время писать заказы и в Supabase, и в PostgreSQL для сверки | серверный слой | новые записи | Средняя | Низкий | Отключить второй приёмник |
| 12. Переключение прода | Деплой, финальная досинхронизация записей, созданных после фазы 5 | `dist/` | все | Средняя | **Высокий** | Откат `dist/` и возврат на Supabase |
| 13. Наблюдение | 2–4 недели: заказы, письма, Telegram, PDF, витрина | — | — | Низкая | Низкий | — |
| 14. Вывод Supabase | Финальный архив, удаление проекта | `supabase/**` удаляется из репозитория | все | Низкая | **Высокий, необратимо** | Только из архива |

---

## 16. Files That Will Need Changes

Публичный фронт: `js/services/productsService.js`, `js/services/pricesService.js`, `js/services/catalogFallbackService.js`, `js/services/mediaResolver.js`, `js/services/contact-service.js`, `js/services/orderConfirmationService.js`, `js/services/orderConfirmationHandler.js`, `js/services/notificationService.js`, `js/components/orderComponent.js`, `js/components/productComponent.js`, `js/components/publicProductsComponent.js`, `js/components/contactsComponent.js`.

Кастомайзер: `js/customizer/app.js`, `designService.js`, `storageService.js`, `exportPipeline.js`.

Админка: `adminAuthComponent.js`, `adminProductsComponent.js`, `adminOrdersComponent.js`, `adminClientsComponent.js`, `adminAnalyticsComponent.js`, `adminCategoriesComponent.js`, `adminColorsComponent.js`, `mediaManagerComponent.js`, `modernAdminComponent.js`, `modernAdminComponent_media.js`, `adminLayoutComponent.js`, `js/utils/storageHelper.js`.

Инфраструктура фронта: `js/utils/supabase.js` (удаляется), `js/utils/env.js`, `public/env.js`, `src/integrations/supabase/client.ts`, `src/utils/env.ts`, `.env`, `vercel.json`.

Скрипты: `scripts/export-catalog-snapshot.mjs` (переписывается на новый источник), `scripts/audit-media-sync.mjs`, `package.json`.

Удаляются после миграции: `supabase/functions/**` (10 функций), `supabase/config.toml`, `supabase/migrations/**`, `js/components/adminComponent.js`, `js/data/products.js`, `import-products.html`, `import-script.js`, `run-import.js`, `simple-import.html`.

Создаются: серверный API-слой, скрипты экспорта и импорта, приватное хранилище файлов макетов.

---

## 17. Risks / Edge Cases

- **Заказы, созданные между экспортом и переключением**, могут потеряться. Нужна финальная досинхронизация в фазе 12.
- **`cart_items` — jsonb произвольной формы.** Реальный набор ключей из репозитория полностью не выводится; разбор в `order_items` может потерять поля кастомизации. Требуется анализ фактических значений перед фазой 5.
- **`client_analytics` — объект неизвестной природы.** Если это view с нетривиальной логикой, поведение страницы клиентов после миграции изменится.
- **Потеря Realtime.** `pricesService` и `productsService` подписаны на изменения; после миграции нужен другой механизм обновления.
- **Публичные ссылки на PDF и превью макетов** перестанут открываться при переходе на приватное хранилище — это затронет уже отправленные клиентам ссылки.
- **Генерация PDF на shared-хостинге** — главный технический риск Option B.
- **Отправка email из РФ.** Замена Resend потребует нового провайдера и прогрева домена; иначе письма подтверждения начнут попадать в спам.
- **Доступность Telegram API с сервера в РФ** — требует проверки перед переключением.
- **Одновременная смена авторизации админа и источника данных** — если делать в один шаг, диагностика сбоя усложняется. Фазы 8 и 9 стоит разносить.
- **Кириллица и пробелы в путях изображений** уже вызывали инциденты; при переносе файлов эти же ошибки могут повториться.
- **Расхождение снапшота и БД** сохранится, пока не появится эндпоинт пересборки.
- **Дублирование цен** между `products.price_rub` и `product_prices` — перед миграцией нужно решить, какое поле является истиной.
- **Число активных админов неизвестно** — при переносе учётных записей кого-то можно потерять.

---

## 18. Rollback Plan

- **Фазы 0–7:** прод не затронут, откат — удаление созданных ресурсов.
- **Фаза 8 (формы):** вернуть предыдущую сборку `dist/`. Supabase к этому моменту жив, edge-функции работают. Заказы, попавшие в новую БД, переносятся обратно вручную.
- **Фаза 9 (админка):** откат сборки админки независимо от публичной части.
- **Фаза 12 (переключение):** заранее подготовить архив предыдущего `dist/` и держать Supabase-проект нетронутым минимум 30 дней. Откат — загрузка старого `dist/` плюс перенос записей, созданных за время работы новой схемы.
- **Фаза 14:** после удаления проекта Supabase откат возможен только из полного архива БД и Storage. **Точка невозврата — выполняется только по явному подтверждению владельца.**

---

## 19. What Lovable Can Do

- SQL-схема и миграции для новой БД.
- Скрипты экспорта из Supabase и импорта в PostgreSQL, включая разворачивание `photos[]` и `cart_items`.
- Скрипт переноса файлов бакета.
- Полная реализация API-слоя из раздела 14, включая валидацию входных данных, rate-limit и сессионную авторизацию администратора.
- Замена всех клиентских обращений к Supabase на вызовы нового API.
- Собственная авторизация админки с хешированием паролей.
- Замена Realtime на периодическое обновление.
- Эндпоинт пересборки публичного снапшота и переписывание `export-catalog-snapshot.mjs`.
- Приватная выдача файлов макетов по ссылкам с ограниченным сроком.
- Валидация загрузок: whitelist MIME, лимит размера, безопасные имена файлов.
- Скрипты сверки данных до и после миграции.
- Удаление legacy-кода и артефактов импорта.
- Документация по деплою.

## 20. What You Must Do Manually

- Аккаунт Timeweb Cloud, заказ Managed PostgreSQL в РФ, оплата.
- Получение и безопасная передача реквизитов подключения; настройка списка разрешённых IP и TLS.
- Решение по хостингу бэкенда: PHP на текущем shared-хостинге либо отдельный Cloud Apps/VPS.
- Выгрузка дампа Supabase и файлов Storage.
- Выбор и настройка почтового провайдера, верификация домена отправителя.
- Проверка доступности Telegram API с нового сервера.
- Настройки DNS и TLS при появлении отдельного хоста для API.
- Предоставление региона проекта Supabase, числа админов, определения `client_analytics`.
- Определение сроков хранения данных.
- Решения по разделению систем: что уходит в Bitrix24, что в аналитику.
- Юридические решения и документы.

## 21. Requires Owner Approval

- Фаза 5 — перенос реальных заказов и клиентских данных.
- Фаза 6 — перенос клиентских файлов и последующее закрытие публичного доступа к ним (сломает существующие ссылки).
- Фаза 12 — переключение прода, возможный простой.
- Фаза 14 — удаление проекта Supabase, необратимо.
- Смена почтового провайдера — влияет на доставляемость писем клиентам.
- Изменение состава Telegram-уведомлений — меняет рабочий процесс менеджера.
- Решение по `product_prices` — какое поле цены становится истиной.
- Решение о выносе `wb_clicks` из операционной БД.

---

## 22. Missing Information / Questions

1. Supabase Dashboard → Project Settings → General → **Region** проекта `bsndismiessofvhglzrv`. Пришлите точное название региона.
2. SQL Editor → выполните `select table_name, table_type from information_schema.tables where table_schema='public' order by 1;` и пришлите результат. Нужно подтвердить, является ли `client_analytics` представлением, и получить его определение (`select pg_get_viewdef('public.client_analytics', true);`).
3. Table Editor → пришлите DDL таблиц `orders`, `designs`, `products`, `b2b_clients` (кнопка Definition).
4. SQL Editor → количество строк по каждой таблице: `select relname, n_live_tup from pg_stat_user_tables order by n_live_tup desc;`.
5. Пришлите 2–3 примера значения `orders.cart_items` **с обезличенными ПДн** — нужен только состав ключей, включая поля кастомизации.
6. Storage → размер бакета `product-media` и отдельно объём префикса `designs/`.
7. Authentication → Users → сколько активных администраторов и какие email должны сохраниться после миграции.
8. Подтвердите: таблицы `orders`, `contact_requests`, `b2b_clients`, `designs` содержат **боевые** данные клиентов, а не тестовые?
9. Какое поле цены считать истиной — `products.price_rub` или `product_prices.price_rub`? Сейчас используются оба.
10. Хостинг Timeweb: shared-тариф с поддержкой PHP и внешних подключений к PostgreSQL, или планируется отдельный Cloud Apps/VPS? От этого зависит выбор между Option A и Option B.
11. Нужен ли Realtime в админке после миграции, или достаточно обновления по кнопке и по таймеру?
12. `wb_clicks` — переносить в новую БД, вынести в аналитический контур или отказаться?
13. Нужна ли клиентам возможность открывать ранее выданные публичные ссылки на PDF макетов после миграции?

---

Диагностика завершена. Реализация не начиналась: код не изменялся, данные не мигрировались, ресурсы Supabase не затрагивались, переменные окружения не менялись. Юридические выводы не делались.
