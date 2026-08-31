# FACTUAL SUPABASE AUDIT

Read-only. Ничего не изменялось: только SELECT по каталогам БД и чтение кода репозитория.

Легенда источников: **[DB]** — проверено запросом к базе (`supabase_read_only_user`), **[CODE]** — проверено чтением файлов репозитория, **NOT VERIFIED** — недоступно.

Ограничение доступа: прямого подключения (`PGHOST`/`pg_dump`) нет; `information_schema.role_table_grants` под read-only ролью возвращает пусто, поэтому grants читались из `pg_class.relacl`.

---

## 1. DATABASE INVENTORY (schema `public`) [DB]

Все 15 таблиц имеют RLS = ON, FORCE RLS = OFF.

| Таблица | Строк | Размер | PK | FK | Индексы (кроме PK) | PII | Использование в коде [CODE] |
|---|---:|---|---|---|---|---|---|
| admins | 2 | 48 kB | id | — | admins_login_key (login) | login/пароль в открытом виде — PII/CRED | `.from('admins')` ×1 (legacy) |
| b2b_clients | 13 | 96 kB | id | — | email, lower(email), phone, regexp(phone) | **PII**: email, phone, contact_name, company_name | `.from('b2b_clients')` ×10 (админка, order flow) |
| box_types | 2 | 64 kB | id | — | unique name, slug | нет | `.from('box_types')` ×1 |
| categories | 5 | 64 kB | id | — | unique name, slug | нет | `.from('categories')` ×9 |
| colors | 19 | 64 kB | id | — | unique name, hex_code | нет | `.from('colors')` ×9 |
| contact_requests | 5 | 32 kB | id | — | — | **PII**: name, phone, message | INSERT через REST в `js/services/contact-service.js` |
| designs | 16 | 136 kB | id | — | — | REVIEW: `comment`, `options`, `objects_mm`, `preview_urls` (пользовательский контент) | `.from('designs')` ×6 (customizer, order-processing, generate-design-pdf) |
| orders | 20 | 120 kB | id | client_id → b2b_clients(id) ON DELETE SET NULL | idx_orders_client_id, idx_orders_order_number | **PII**: name, phone, email, yandex_address, comment, cart_items | `.from('orders')` ×12 |
| product_prices | 46 | 64 kB | product_id | — | — | нет | `.from('product_prices')` ×5 |
| products | 56 | 208 kB | id | category_id → categories(id) | artikul unique, idx active/artikul/category_id | нет | `.from('products')` ×27 |
| products_photos_backup_20260509 | 56 | 48 kB | — (нет PK) | — | — | нет | не используется в коде |
| site_settings | 2 | 80 kB | id | — | unique key | нет | NOT VERIFIED в клиентском коде (прямых `.from('site_settings')` не найдено) |
| sizes | 3 | 64 kB | id | — | unique name, value | нет | `.from('sizes')` ×1 |
| user_roles | 2 | 40 kB | id | user_id → **auth.users(id)** ON DELETE CASCADE | unique (user_id, role) | TECHNICAL (ссылка на пользователя) | через `has_role()` RPC |
| wb_clicks | 21 | 48 kB | id | — | idx_wb_clicks_clicked_at | **PII/TECHNICAL**: user_agent, referrer | `.from('wb_clicks')` ×3 |

CHECK-констрейнты [DB]: `designs.status IN (saved, attached_to_cart, ordered)`; `orders.delivery IN (delivery, pickup)`; `orders.payment IN (cash, transfer)`; `orders.order_status IN (created, confirmed, delivered, canceled, processing)`; `product_prices.price_rub >= 0`.

Расхождение, зафиксированное фактом [DB]: CHECK на `orders.order_status` разрешает 5 значений, дефолт колонки — `'pending'`, которого в списке нет.

VIEW `public.client_analytics` [DB] — агрегирует `b2b_clients` + `orders` (total_orders, total_revenue, last_order_date, customer_segment). Содержит PII. Materialized views: NONE FOUND.

---

## 2. FUNCTIONS [DB]

| Функция | Аргументы | Return | Security | Supabase-зависимости | Кто вызывает [CODE] |
|---|---|---|---|---|---|
| public.has_role | _user_id uuid, _role app_role | boolean | DEFINER | читает user_roles (FK на auth.users) | `_shared/adminAuth.ts:62`, `adminAuthComponent.js:108,172`, все RLS-политики |
| public.is_admin_user | login text, password text | boolean | DEFINER | сверка plaintext-пароля в `admins` | не найдено вызовов — UNUSED |
| public.is_current_admin | — | boolean | DEFINER | `current_setting('app.admin_login')` | не найдено прямых вызовов — UNUSED |
| public.set_admin_context | login, password | void | DEFINER | plaintext-пароль + set_config | не найдено — UNUSED |
| public.set_admin_login_context | admin_login text | void | DEFINER | set_config сессии | `adminProductsComponent.js:1078` |
| public.make_user_admin | user_email text | void | DEFINER | **читает auth.users** | не найдено в коде (ручной вызов) |
| public.generate_photo_paths | size_category, color | text[] | INVOKER | хардкод URL `*.supabase.co/storage/...` | не найдено в коде |
| public.get_color_hex | color_name | text | INVOKER | нет | не найдено |
| public.get_product_size | category, dimensions | product_size | INVOKER | нет | не найдено |
| public.parse_dimensions | dimension_str | jsonb | INVOKER | нет | не найдено |
| public.storage_public_url | bucket, rel_path, project_ref | text | INVOKER | хардкод Supabase Storage URL, тело функции ошибочно (не подставляет rel_path) | не найдено |
| public.tg_touch_updated_at | — | trigger | INVOKER | нет | триггеры products, box_types, sizes |
| public.update_updated_at_column | — | trigger | INVOKER | нет | триггеры categories, colors, products, designs, site_settings |
| public.update_b2b_clients_updated_at | — | trigger | INVOKER | нет | триггер b2b_clients |
| public.update_product_prices_updated_at | — | trigger | INVOKER | нет | триггер product_prices |

`auth.jwt()` в пользовательских функциях: не найдено. `pg_net`/`http`/`net.*`: не найдено (extensions не установлены).

---

## 3. TRIGGERS (пользовательские, schema public) [DB]

| Таблица | Триггер | Функция | Назначение |
|---|---|---|---|
| products | update_products_updated_at | update_updated_at_column | timestamps |
| products | tr_products_touch_updated_at | tg_touch_updated_at | timestamps (дубль) |
| categories | update_categories_updated_at | update_updated_at_column | timestamps |
| colors | update_colors_updated_at | update_updated_at_column | timestamps |
| designs | designs_updated_at | update_updated_at_column | timestamps |
| site_settings | update_site_settings_updated_at | update_updated_at_column | timestamps |
| product_prices | update_product_prices_updated_at | update_product_prices_updated_at | timestamps |
| b2b_clients | update_b2b_clients_updated_at_trigger | update_b2b_clients_updated_at | timestamps |
| box_types | tg_box_types_updated_at | tg_touch_updated_at | timestamps |
| sizes | tg_sizes_updated_at | tg_touch_updated_at | timestamps |

Все — BEFORE UPDATE FOR EACH ROW (по метаданным `pg_trigger`). Триггеров с бизнес-логикой, webhook-вызовами или audit-логированием: NONE FOUND. В служебных схемах есть системные триггеры Supabase (`storage.objects`, `storage.buckets`, `realtime.subscription`) — переносу не подлежат.

---

## 4. RLS / POLICIES [DB]

RLS включён на всех 15 таблицах public. Всего политик: 37 (33 в public, 4 на storage.objects).

Опасные политики (факт):

| Таблица | Политика | Cmd | Роль | Выражение | Риск |
|---|---|---|---|---|---|
| designs | Anyone can read designs | SELECT | public (вкл. anon) | USING (true) | **CRITICAL** — чужие дизайны, комментарии, preview_urls доступны анониму |
| designs | Anyone can update designs | UPDATE | public | USING (true) / CHECK (true) | **CRITICAL** — аноним может переписать любой дизайн |
| designs | Anyone can insert designs | INSERT | public | CHECK (true) | ожидаемо для анонимного кастомайзера |
| product_prices | Admin users can modify prices | ALL | public | USING (true) / CHECK (true) | **CRITICAL** — аноним может менять цены |
| site_settings | Allow all operations on site settings | ALL | public | USING (true) | **CRITICAL** — аноним может писать настройки |
| orders | Anyone can create orders | INSERT | public | CHECK (true) | ожидаемо (оформление заказа), чтение закрыто |
| contact_requests | Anyone can insert contact requests | INSERT | public | CHECK (true) | ожидаемо |
| wb_clicks | Anyone can log WB clicks | INSERT | public | CHECK (true) | ожидаемо |

Чтение PII анонимом: `orders`, `b2b_clients`, `contact_requests`, `admins` закрыты — SELECT только `authenticated` + `has_role(auth.uid(),'admin')`. Отдельная проблема: у view `client_analytics` (содержит PII) собственных политик нет — доступ зависит от grants и `security_invoker`; статус `security_invoker` — NOT VERIFIED.

Storage-политики (`storage.objects`, все role = public): SELECT / INSERT / UPDATE / DELETE по условию `bucket_id = 'product-media'`. То есть удаление и перезапись объектов **доступны анониму** — CRITICAL.

---

## 5. GRANTS [DB, из `pg_class.relacl`]

- `anon`: полные права `arwdDxt` (SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER) на **все** таблицы public, кроме `b2b_clients` (grants отсутствуют) и `wb_clicks` (только INSERT `a`).
- `authenticated`: grants присутствуют на всех таблицах (значение отдано в редактированном виде).
- `service_role`: `arwdDxt` на всё.
- `postgres`: `arwdDxt` на всё.
- `PUBLIC`: явных grants нет.

Практический вывод: широкие grants у `anon` компенсируются только RLS. Где RLS-политика = `USING(true)` (designs, product_prices, site_settings) защиты нет вообще.

---

## 6. AUTH [DB + CODE]

- Пользователей в `auth.users`: **2**, оба провайдер `email`, оба имеют роль `admin` в `user_roles` (`serbiyan012@gmail.com`, `mserbiyan@yandex.ru`). OAuth/magic-link пользователей нет.
- Файлы, использующие Auth: `js/components/adminAuthComponent.js` (`signInWithPassword`, `getSession`, `signOut`, `rpc('has_role')`), `supabase/functions/_shared/adminAuth.ts` (`auth.getUser(token)` + `rpc('has_role')`).
- Зависимости от auth в БД: `user_roles.user_id` → FK на `auth.users(id)`; все admin-политики через `has_role(auth.uid(), 'admin')`; `make_user_admin()` читает `auth.users`.
- Legacy-контур: таблица `admins` с plaintext-паролями + функции `is_admin_user`, `set_admin_context`, `set_current_admin`-подобные; активно используется только `set_admin_login_context` (в `adminProductsComponent.js`).
- Непереносимо в чистый PostgreSQL без замены: `auth.uid()` во всех политиках, FK на `auth.users`, `auth.getUser()` в edge-функциях, сам логин по паролю.

---

## 7. EDGE FUNCTIONS [CODE]

| Функция | verify_jwt (config.toml) | Вход | Таблицы | Storage | Внешние сервисы | ENV |
|---|---|---|---|---|---|---|
| order-processing | false | заказ из корзины | orders, designs | скачивание PDF по URL | Telegram sendMessage/sendDocument, Resend, Google Apps Script | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_TOKEN, TELEGRAM_CHAT_ID, RESEND_API_KEY, GOOGLE_SCRIPT_URL, ADMIN_EMAIL, PUBLIC_SITE_URL |
| order-confirmation | false | order_id (GET/POST) | orders | — | Telegram, Resend, Google Apps Script | те же |
| admin-notify | false | текст уведомления | — | — | Telegram | TELEGRAM_TOKEN, TELEGRAM_CHAT_ID |
| contact-notify | false | форма контакта | — | — | Telegram | TELEGRAM_TOKEN, TELEGRAM_CHAT_ID |
| generate-design-pdf | false (задокументированный временный риск) | сцена кастомайзера | designs | product-media (`designs/…`) upload + publicUrl | загрузка изображений по URL | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY |
| group-products-by-categories | не задан в config.toml | — | products, categories | — | — | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY |
| update-price | true + requireAdmin | product_id, price | product_prices | — | — | SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY |
| media-manager | true + requireAdmin | base64-файлы, product_id | products | product-media (`images/…`) | — | те же |
| storage-manager | true + requireAdmin | операции с файлами | — | product-media | — | те же |
| import-products | true + requireAdmin | массив товаров | products, product_prices | — | — | те же |

Используются в проде [CODE]: order-processing / order-confirmation (checkout), contact-notify (форма), generate-design-pdf (кастомайзер), storage-manager + media-manager + update-price + import-products (админка), group-products-by-categories (`productsService.js:324`). `admin-notify` — резервный канал уведомлений.

Секреты (только имена, значения не выгружались): ADMIN_EMAIL, GOOGLE_SCRIPT_URL, GOOGLE_SHEETS_ID, LOVABLE_API_KEY, PUBLIC_SITE_URL, RESEND_API_KEY, SUPABASE_ANON_KEY, SUPABASE_DB_URL, SUPABASE_JWKS, SUPABASE_PUBLISHABLE_KEYS, SUPABASE_SECRET_KEYS, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, TELEGRAM_CHAT_ID, TELEGRAM_TOKEN.

---

## 8. STORAGE [DB + CODE]

Bucket: **product-media**, public = true, объектов **393**, суммарно **63 MB**.

| Префикс | Файлов | Размер | MIME |
|---|---:|---|---|
| images/ | 197 | 14 MB | image/webp, image/jpeg, application/octet-stream |
| designs/ | 191 | 17 MB | application/pdf, application/json, image/png |
| videos/ | 5 | 32 MB | video/mp4 |

- Использование в коде: `js/customizer/storageService.js`, `js/utils/storageHelper.js`, `supabase/functions/storage-manager`, `media-manager`, `generate-design-pdf`; клиентский резолвер `js/services/mediaResolver.js` умеет заменять Supabase-URL на локальные `/images/...`.
- Клиентские файлы: да — `designs/` содержит PDF/PNG/JSON пользовательских макетов (потенциальные ПД).
- Политики: 4 штуки на `storage.objects`, все для роли public по `bucket_id='product-media'` (включая DELETE и UPDATE).
- Нужен при миграции: да — `images/` и `videos/` как каталожная статика, `designs/` как клиентские артефакты.

---

## 9. REALTIME [DB + CODE]

**USED.** Publication `supabase_realtime` содержит ровно одну таблицу: `public.product_prices` [DB]. В коде подписки: `js/services/pricesService.js:126-150` (`.channel('product_prices_changes')` + `postgres_changes` + `.subscribe()`) и `js/services/productsService.js:382-391` (`.channel('products-changes')` + `postgres_changes`). Подписка на `products` работать не будет — таблицы нет в publication.

---

## 10. CRON / WEBHOOKS / EXTENSIONS / TYPES / VIEWS [DB]

- pg_cron: NONE FOUND (расширение не установлено, схемы `cron` нет).
- Database webhooks / `supabase_functions` hooks: NONE FOUND (схема отсутствует).
- pg_net / http: NONE FOUND.
- Extensions (7): pg_stat_statements 1.10, pgcrypto 1.3, pgjwt 0.2.0, pgsodium 3.1.8, plpgsql 1.0, supabase_vault 0.3.1, uuid-ossp 1.1.
- ENUM: `app_role(admin,user)`, `product_size(small,medium,big)`, `size_type_enum(малая,средняя,большая)`. Composite/domain типов: NONE FOUND.
- Views: `public.client_analytics`. Materialized: NONE FOUND.
- Schemas: public, auth, storage, realtime, vault, graphql, graphql_public, extensions, pgsodium, pgsodium_masks, pgbouncer, supabase_migrations (+ системные).

---

## 11. REPOSITORY DEPENDENCY MAP [CODE]

| Файл | Область | Supabase-фича | Объект | Migration action |
|---|---|---|---|---|
| js/utils/supabase.js:1-6 | anon-клиент (hardcoded URL/key) | createClient | — | MOVE_TO_BACKEND (заменить на свой API-клиент) |
| src/integrations/supabase/client.ts:3-12 | React-клиент | createClient | — | MOVE_TO_BACKEND |
| js/services/productsService.js:288, 324, 382 | каталог | .from('products'), functions/v1, realtime | products | MOVE_TO_POSTGRES + MOVE_TO_BACKEND |
| js/services/pricesService.js:126-150 | цены | realtime | product_prices | MOVE_TO_BACKEND (SSE/polling) |
| js/services/contact-service.js:10-34 | форма контакта | REST insert + functions/v1 | contact_requests | MOVE_TO_BACKEND |
| js/services/notificationService.js:11 | уведомления | functions/v1 | — | MOVE_TO_BACKEND |
| js/components/adminAuthComponent.js:100-199 | вход админа | supabase.auth + rpc has_role | auth.users, user_roles | MOVE_TO_BACKEND |
| js/components/adminProductsComponent.js:1078 | админка | rpc set_admin_login_context | admins | REMOVE (legacy) |
| js/utils/storageHelper.js:53-182 | файлы | functions.invoke + storage | product-media | MOVE_TO_OBJECT_STORAGE |
| js/customizer/storageService.js:17-92 | кастомайзер | storage upload/publicUrl | product-media | MOVE_TO_OBJECT_STORAGE |
| js/customizer/exportPipeline.js:114 | PDF | functions.invoke | generate-design-pdf | MOVE_TO_BACKEND |
| js/services/mediaResolver.js:6 | картинки | hardcoded storage URL | product-media | MOVE_TO_OBJECT_STORAGE |
| scripts/export-catalog-snapshot.mjs:10 | сборка каталога | REST | products и др. | MOVE_TO_BACKEND |
| scripts/audit-media-sync.mjs | аудит медиа | createClient + storage.list | product-media | NEEDS_REVIEW (dev-скрипт) |
| supabase/functions/* | 10 функций | Deno + service_role | см. раздел 7 | MOVE_TO_BACKEND |

---

## 12. DATA FLOW (AS-IS) [CODE]

```text
Форма контакта (contactsComponent)
  -> js/services/contact-service.js
  -> POST /rest/v1/contact_requests (anon key)
  -> public.contact_requests
  -> POST /functions/v1/contact-notify -> Telegram

Оформление заказа (orderComponent + cartService)
  -> /functions/v1/order-processing (service_role)
  -> public.orders (+ public.b2b_clients, public.designs)
  -> Telegram sendMessage/sendDocument + Resend email + Google Apps Script
  -> ссылка /functions/v1/order-confirmation?order_id=... -> обновление orders

Кастомайзер
  -> js/customizer/storageService.js -> Storage product-media (designs/…)
  -> /functions/v1/generate-design-pdf -> PDF в product-media -> public.designs

Каталог (публичный)
  -> public/data/products-public.json (JSON-first)
  -> fallback: /rest/v1/products, categories, colors, product_prices (anon)
  -> realtime product_prices

Админка
  -> supabase.auth.signInWithPassword -> has_role() -> RLS
  -> .from(products/orders/b2b_clients/colors/categories/designs)
  -> /functions/v1/update-price | media-manager | storage-manager | import-products

Клик по WB
  -> .from('wb_clicks').insert (anon) -> public.wb_clicks
```

## 13. PII FLOW [CODE + DB]

| Данные | Точка входа | Транспорт | Хранение | Внешние получатели |
|---|---|---|---|---|
| name, phone, message | форма контакта | anon REST | contact_requests (5 строк) | Telegram |
| name, phone, email, yandex_address, comment | checkout | order-processing (service_role) | orders (20 строк) | Telegram, Resend (email), Google Sheets |
| email, phone, contact_name, company_name | из заказов | order-processing | b2b_clients (13 строк) | косвенно Telegram/Sheets |
| агрегаты по клиентам | — | — | view client_analytics | — |
| пользовательские макеты (PDF/PNG/JSON, comment) | кастомайзер | anon Storage + edge | designs (16 строк) + product-media/designs (191 файл) | Telegram (PDF в заказе) |
| user_agent, referrer | клик по WB | anon insert | wb_clicks (21 строка) | — |
| IP-адреса | — | — | в прикладных таблицах NOT FOUND | — |

Отдельный факт: PII уезжает за пределы РФ в Telegram, Resend и Google Apps Script — это самостоятельная задача при переезде на Timeweb.

## 14. TIMEWEB MIGRATION CLASSIFICATION

| Компонент | Решение |
|---|---|
| products, categories, colors, sizes, box_types, product_prices | MOVE_TO_POSTGRES |
| orders, b2b_clients, contact_requests, designs, wb_clicks | MOVE_TO_POSTGRES (+ PII review) |
| products_photos_backup_20260509 | NEEDS_REVIEW (бэкап без PK, не используется) |
| site_settings | NEEDS_REVIEW (2 строки, вызовов в коде не найдено) |
| admins (plaintext-пароли) | REMOVE |
| user_roles | MOVE_TO_POSTGRES, но FK на auth.users заменить на свою users |
| view client_analytics | MOVE_TO_POSTGRES |
| timestamps-триггеры и их функции (5 шт.) | KEEP_AS_POSTGRES |
| has_role() | MOVE_TO_POSTGRES (после замены auth.uid() на параметр) |
| is_admin_user, set_admin_context, is_current_admin, set_admin_login_context | REMOVE |
| generate_photo_paths, storage_public_url | REMOVE (хардкод Supabase URL) |
| get_color_hex, get_product_size, parse_dimensions | NEEDS_REVIEW (не вызываются) |
| RLS-политики на auth.uid() | MOVE_TO_BACKEND |
| политики USING(true) на designs / product_prices / site_settings / storage | REMOVE (переписать на backend-авторизацию) |
| Supabase Auth (2 админа) | MOVE_TO_BACKEND |
| Storage product-media (images, videos) | MOVE_TO_OBJECT_STORAGE |
| Storage product-media (designs) | MOVE_TO_OBJECT_STORAGE + PII review |
| 10 Edge Functions | MOVE_TO_BACKEND |
| Realtime product_prices | REMOVE или MOVE_TO_BACKEND (SSE) |
| Realtime products (подписка без publication) | REMOVE |
| pgjwt, pgsodium, supabase_vault | REMOVE |
| pgcrypto, uuid-ossp | KEEP_AS_POSTGRES |
| pg_cron, pg_net, webhooks | NONE FOUND — ничего переносить не нужно |

---

## 15. ARCHIVE PLAN — что предлагается сделать дальше

Ниже — то, что я готов выполнить следующим шагом (тоже без изменений в Supabase). Всё генерируется из read-only запросов, потому что `pg_dump` из песочницы недоступен: подключение к БД отсутствует, а `SUPABASE_DB_URL` — секрет edge-функций, его значение не читается.

### A. COMPLETE SUPABASE ARCHIVE (`/mnt/documents/supabase-archive/`)

| Файл | Содержимое | Чем создаётся | Нужен для Timeweb restore |
|---|---|---|---|
| database/schema.sql | 15 таблиц, колонки, дефолты, PK/FK/UNIQUE/CHECK, ENUM, view | генерация из pg_catalog | да |
| database/functions.sql | 15 функций через pg_get_functiondef | read-only SQL | частично |
| database/triggers.sql | 10 пользовательских триггеров | pg_get_triggerdef | да |
| database/policies.sql | 37 политик (public + storage) | pg_policies | как справка |
| database/indexes.sql | все индексы public | pg_indexes | да |
| database/views.sql | client_analytics | pg_get_viewdef | да |
| database/data/*.csv + data.sql | данные 15 таблиц (238 строк суммарно) | постраничные SELECT | да |
| manifests/*.csv | tables, columns, fks, indexes, functions, triggers, policies, grants, extensions, enums, buckets, storage_objects, pii_classification | read-only SQL | нет |
| storage/manifest.csv + storage/buckets/product-media/ | 393 объекта, 63 MB | публичные URL bucket | да |
| supabase/ | копии 10 edge-функций, 36 migrations, config.toml, имена секретов без значений | копирование файлов | как справка |
| reports/ | этот аудит + risks, data_flow, pii_map, timeweb_compatibility | генерация | да |

`full_backup.dump` не создаётся — вместо него в архив кладётся `RESTORE.md` с инструкцией снять бинарный дамп из Supabase Dashboard (Database → Backups) или `pg_dump` по прямому `DATABASE_URL`.

### B. TIMEWEB PORTABLE ARCHIVE (`/mnt/documents/timeweb-portable/`)

`schema.sql` (без auth/storage/realtime/vault), `types.sql`, `application_data.sql` (каталог отдельно от PII), `functions.sql` (только portable), `triggers.sql`, `indexes.sql`, `README.md` с последовательностью restore и списком того, что заменяется backend-ом (auth, RLS, storage, edge functions, realtime).

### Что попадает в Git

В репозиторий — только `schema.sql`, `functions.sql`, `triggers.sql`, `policies.sql`, `views.sql`, `indexes.sql`, манифесты без PII и отчёты. Данные, файлы Storage и всё с ПД — только в `/mnt/documents/` (вне Git), с `.gitignore` внутри архива.

### Проверка восстановления

Поднять чистый PostgreSQL в песочнице, применить portable-архив, сверить количество таблиц, строк, FK, индексов, функций, триггеров, ENUM и views; результат — `reports/restore_verification.md`. Если поднять PostgreSQL в песочнице не удастся, это будет зафиксировано явно вместе с готовым скриптом для локального запуска.

---

## 16. INFORMATION STILL MISSING (NOT VERIFIED)

1. `pg_dump` любого формата — нет сетевого доступа к БД и нет значения `SUPABASE_DB_URL`.
2. Точные grants из `information_schema.role_table_grants` — read-only роль их не отдаёт; использованы `relacl`.
3. `security_invoker` у view `client_analytics`.
4. Настройки Auth-провайдеров (подтверждение email, SMTP, срок жизни JWT) — только через Dashboard/Management API.
5. Реальный `verify_jwt` у `group-products-by-categories` (в `config.toml` не задан — действует значение платформы по умолчанию).
6. Storage-квоты bucket (allowed MIME, file size limit) — колонки не читались, требуется отдельный запрос к `storage.buckets`.
7. Логи и статистика фактического использования edge-функций за период.
