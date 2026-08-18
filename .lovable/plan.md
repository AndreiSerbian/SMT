# SAFE P0 Security Patch (migration-aware) — план

PHASE 0 выполнена как read-only трассировка. Код не изменялся. Ниже — фактическая карта зависимостей и минимальный патч, который из неё следует.

Главный вывод трассировки: **объём реального патча существенно меньше, чем предполагал предыдущий аудит.** Значительная часть «опасных» вызовов находится в модулях, которые не подключены к работающей админке.

---

## PHASE 0 — Dependency Trace (факты)

### Что реально загружается

`index.html` L60 → `js/app.js` → `js/router.js`.

Роутер импортирует только `AdminAuthComponent` и `AdminLayoutComponent` (L9-10). `AdminLayoutComponent` L140-160 динамически подгружает ровно шесть модулей:

```text
#admin
  → AdminAuthComponent            (Supabase Auth + rpc has_role)
  → AdminLayoutComponent
        ├─ modernAdminComponent.js       (товары)  → modernAdminComponent_media.js
        ├─ adminCategoriesComponent.js
        ├─ adminColorsComponent.js
        ├─ adminOrdersComponent.js
        ├─ adminClientsComponent.js
        └─ adminAnalyticsComponent.js
```

### Статус модулей

| Модуль | Статус | Доказательство |
|---|---|---|
| `adminAuthComponent.js` | **ACTIVE** | импорт в `router.js` L9 |
| `adminLayoutComponent.js` | **ACTIVE** | импорт в `router.js` L10 |
| `modernAdminComponent.js` (+`_media.js`) | **ACTIVE** | `adminLayoutComponent.js` L140; `_media` — L67 внутри modernAdmin |
| `adminCategories/Colors/Orders/Clients/Analytics` | **ACTIVE** | `adminLayoutComponent.js` L144-160 |
| `adminComponent.js` | **DEAD CODE** | ни одного `import` во всём проекте; совпадения — только `window.adminComponent`, которое присваивает себе `modernAdminComponent.js` L62 |
| `adminProductsComponent.js` | **DEAD CODE (транзитивно)** | единственный импорт — `adminComponent.js` L213 |
| `mediaManagerComponent.js` | **DEAD CODE (транзитивно)** | единственный импорт — `adminComponent.js` L225 |
| `js/utils/storageHelper.js` | **DEAD CODE (транзитивно)** | единственный импортёр — `adminProductsComponent.js` |
| `js/data/products.js` | **DEAD CODE** | импортируется только из `adminProductsComponent.js` L1005 |

### Цепочки по endpoint'ам

**storage-manager** — 5 вызовов, все в `js/utils/storageHelper.js` (L39, L64, L89, L113, L136). Единственный импортёр — мёртвый `adminProductsComponent.js`.
→ **ACTIVE CALLERS: НЕТ.** Функция при этом остаётся публично вызываемой (`verify_jwt = false` + `SERVICE_ROLE_KEY`, `storage-manager/index.ts` L42-44, без единой проверки прав).

**media-manager** — вызовы в `modernAdminComponent_media.js` L71 и L156 (**ACTIVE**), а также в мёртвых `adminProductsComponent.js` (8) и `mediaManagerComponent.js` (4).
→ **ACTIVE CALLERS: 2, action `upload_images`.** Функция: `verify_jwt = false` + `SERVICE_ROLE_KEY` (L37-39), без проверки прав, умеет писать в Storage и в `products`.

**update-price** — единственный вызов: `adminComponent.js` L405, `fetch` с `admin_login`/`admin_password` в теле.
→ **ACTIVE CALLERS: НЕТ.** Активная админка меняет цену прямой записью `products.price_rub` (`modernAdminComponent.js` L914) под RLS `has_role`.

**import-products** — единственный вызов: `adminProductsComponent.js` L1007, с `admin_login`/`admin_password`.
→ **ACTIVE CALLERS: НЕТ.**

**Legacy admin context** — `set_admin_login_context` вызывается в `modernAdminComponent.js` L518/L846/L959, `modernAdminComponent_media.js` L15/L229 (все под условием `if (this.adminLogin)`) и в `adminOrdersComponent.js` L474.
Источник `this.adminLogin` — `sessionStorage.getItem('admin_session')` (`modernAdminComponent.js` L20-24). **Ключ `admin_session` не записывается нигде в проекте** — единственный код, писавший сессию, это мёртвый `adminComponent.js` L315-317, и он пишет другие ключи. Следовательно `this.adminLogin === null`, и все пять вызовов в modernAdmin **фактически не выполняются**.
В `adminOrdersComponent.js` L467 вызывается `AdminAuthComponent.getAdminLogin()` — **такого метода в `adminAuthComponent.js` не существует** (там только `isAuthenticated`, `getAdminEmail`, `logout`). Это выбросит `TypeError` до запроса к БД.
→ **Смена статуса заказа в админке, вероятнее всего, сейчас не работает. NOT VERIFIED IN RUNTIME — требует ручной проверки.**

**Admin login** — `adminAuthComponent.js` L100 `signInWithPassword` → L108 `rpc('has_role')` → при отсутствии роли `signOut()`. Единственный работающий контур аутентификации. `sessionStorage` не используется.

**Designs** — `designService.js` (INSERT/SELECT/UPDATE от анонима), `storageService.js` (upload в публичный бакет), `exportPipeline.js` L23 генерирует `designId` на клиенте через `crypto.randomUUID()` и передаёт его как первичный ключ. Владение макетом на сервере не фиксируется ничем.

---

## Что предлагается сделать (и чего не делать)

### PHASE 1 — Edge authorization

Защита строится в два независимых слоя, а не только на `verify_jwt`:

```text
1. Gateway: verify_jwt = true        → «токен вообще валидный?»
2. In-code: getUser(token)           → «кто именно это?»
3. In-code: has_role(user.id,'admin')→ «имеет ли право на ADMIN-операцию?»
4. Только после (3) создаётся service_role клиент
```

`verify_jwt = true` сам по себе пропускает любого авторизованного пользователя, включая обычного. Поэтому проверка роли в коде обязательна и не заменяется настройкой шлюза; наоборот, настройка шлюза не заменяется проверкой в коде. Оба слоя ставятся одновременно.

Реализация в `storage-manager/index.ts` и `media-manager/index.ts`: в начале обработчика (после CORS-preflight) взять `Authorization`, создать клиент с anon-ключом и этим токеном, `auth.getUser()`, затем `rpc('has_role', { _user_id, _role: 'admin' })`. Нет токена → 401, невалидный → 401, не админ → 403. Service-role клиент создаётся строго ниже этого блока.

`supabase/config.toml`: `verify_jwt = true` для обеих функций.

Фронтенд: `supabase.functions.invoke` подставляет токен текущей сессии автоматически, поэтому два активных вызова в `modernAdminComponent_media.js` L71 и L156 по существу не меняются; нужно лишь убедиться, что клиент из `js/utils/supabase.js` — тот же, в котором выполнен вход (это так: `adminAuthComponent.js` использует его же). Добавляется обработка 401/403 с понятным сообщением вместо «Unknown error».

`storage-manager` активных вызовов не имеет — его защита не ломает ничего.

`generate-design-pdf` (`verify_jwt = false` + service_role) вызывается анонимным покупателем из кастомайзера — **её закрывать нельзя**, остаётся как есть, уходит в deferred.

### PHASE 2 — Plaintext-пароли в active runtime

Активных вызовов `update-price` и `import-products` нет: цена в рабочей админке пишется напрямую в `products.price_rub` (`modernAdminComponent.js` L914) под RLS `has_role`. Поэтому фронтенд не переделывается под эти эндпоинты — они просто перестают быть публично вызываемым способом перебирать `is_admin_user`:

- обе функции переводятся на ту же трёхслойную модель, что и Phase 1 (`verify_jwt = true` + `getUser` + `has_role`);
- приём `admin_login` / `admin_password` из тела запроса убирается.

**Мёртвые модули НЕ удаляются** (решение принято): `adminComponent.js`, `adminProductsComponent.js`, `mediaManagerComponent.js`, `js/utils/storageHelper.js` остаются в репозитории со статусом `DEPRECATED / DEAD CODE — DO NOT REACTIVATE`. Они не подключены к роутеру, не создают runtime-риска и служат документацией по массовому импорту, медиа-менеджеру и работе с папками Storage перед миграцией на Timeweb. Единственное изменение — комментарий-маркер в шапке каждого файла. Удаление — после успешной миграции, вместе со старым Supabase-контуром.

Функции `is_admin_user`, `set_admin_context`, `set_admin_login_context` и таблица `admins` **не удаляются** — только перестают использоваться.

### PHASE 3 — Legacy admin context

В `modernAdminComponent.js` (L20-30, L516, L844, L957) и `modernAdminComponent_media.js` (L15, L229) убрать чтение `admin_session` и обёртки `if (this.adminLogin) rpc(...)`. Эти ветки не исполняются (`admin_session` никем не записывается); RLS на `products` работает через `has_role`, то есть удаление ничего не разблокирует и ничего не сломает.

В `adminOrdersComponent.js` L465-478 убрать несуществующий `AdminAuthComponent.getAdminLogin()` и вызов `set_admin_login_context`, оставив прямой `update` под RLS `has_role`:

```text
Admin вошёл через Supabase Auth → auth.uid() → RLS has_role(...,'admin') → UPDATE orders
```

Статус результата: **CODE FIXED / RUNTIME MANUAL VERIFICATION REQUIRED.** Текущая работоспособность смены статуса вручную не подтверждалась — считаем **NOT VERIFIED IN RUNTIME**; проверка выполняется вами после деплоя.



### PHASE 4 — Critical RLS

Анонимная REST-проверка уже выполнена (BEFORE-состояние зафиксировано):

| Запрос от анонима | HTTP | Результат |
|---|---|---|
| `GET /rest/v1/b2b_clients?select=id&limit=1` | **200** | вернулась реальная строка → **EXPOSED** |
| `GET /rest/v1/wb_clicks?select=id&limit=1` | **200** | вернулась реальная строка → **EXPOSED** |
| `GET /rest/v1/orders?select=id&limit=1` | 200 | `[]` — RLS блокирует, утечки нет |

Миграция (единственная в патче, схема бизнес-таблиц не меняется):

- `b2b_clients`: **DROP** политики `Service role can manage b2b clients` (роль `public`, ALL, `USING (true)`). Замещающая политика для `service_role` **не создаётся** — service-role обходит RLS. Админские политики `has_role` остаются нетронутыми. Дополнительно `REVOKE ALL ... FROM anon`.
- `wb_clicks`: **DROP** политики `Admins can read WB clicks` (роль `public`, `USING (true)`) и создание её же для роли `authenticated` с `has_role(auth.uid(),'admin')`. Анонимный INSERT сохраняется — от него зависит трекинг (`productComponent.js` L553). `REVOKE ALL FROM anon` + `GRANT INSERT TO anon`.
- Гранты — минимальные: `SELECT, INSERT, UPDATE, DELETE` вместо `ALL`; дополнительные табличные привилегии (`TRUNCATE`, `REFERENCES`, `TRIGGER`) текущим функциям не нужны.
- `orders`, `contact_requests`: **NO P0 CHANGE REQUIRED** (проверено выше).
- `user_roles`, `products`, справочники, `storage.objects` — без изменений.

Runtime-проверки сразу после миграции, до перехода к остальным фазам:

1. анонимный SELECT `b2b_clients` → DENIED, 0 строк;
2. SELECT `b2b_clients` под админом → SUCCESS;
3. анонимный SELECT `wb_clicks` → DENIED;
4. анонимный INSERT `wb_clicks` → SUCCESS;
5. полный список оставшихся политик по обеим таблицам + проверка отсутствия любой другой permissive `SELECT ... USING (true)`.

Пункт 2 требует реальной админ-сессии; если её не удастся получить в песочнице — статус **MANUAL VERIFICATION REQUIRED**, без пометки PASS.

### PHASE 5 — Designs

Минимального безопасного фикса не существует. `design_id` генерируется в браузере (`exportPipeline.js` L23), сервер не хранит признак владения, а `order-processing/index.ts` L429 обновляет `designs` по этому же id. Любое сужение RLS без введения серверного токена владения ломает кастомайзер и оформление заказа с макетом.

→ **F-02 designs: DEFERRED TO TIMEWEB MIGRATION.**
→ **F-05 приватное хранилище клиентских файлов: DEFERRED** — перевод бакета в приватный сломает уже выданные клиентам ссылки на PDF.
→ **`generate-design-pdf`: KNOWN TEMPORARY SERVICE_ROLE RISK — DEFERRED TO TIMEWEB MIGRATION.** Функция остаётся `verify_jwt = false` + `SERVICE_ROLE_KEY` и не переделывается в этом патче, потому что от неё зависит анонимный кастомайзер. Этот пункт обязателен в финальном отчёте.

Формулировка «все анонимные service-role пути устранены» в отчёте **запрещена**. Закрываются только `storage-manager` и `media-manager`; `generate-design-pdf` и `order-processing` остаются анонимно вызываемыми по бизнес-необходимости.

### PHASE 6 — Проверки

Матрица 401 / невалидный токен / 403 / админ по `storage-manager`, `media-manager`, `update-price`, `import-products` — выполнима из песочницы через `curl`. «Valid admin → success» требует реальной сессии и помечается **MANUAL VERIFICATION REQUIRED**, если войти не удастся.

Финальный отчёт строго разделён на **STATIC CODE VERIFIED / RUNTIME VERIFIED / MANUAL VERIFICATION REQUIRED**, с BEFORE/AFTER и фактическими HTTP-кодами. Ручные админ-тесты не помечаются PASS без реального выполнения. Персональные данные не выводятся — только счётчики и коды ответов.


---

## Rollback

| Изменение | CURRENT | CHANGE | ROLLBACK |
|---|---|---|---|
| `config.toml` | `verify_jwt = false` ×2 | `true` для storage-manager, media-manager | вернуть `false` |
| `storage-manager/index.ts` | нет авторизации | блок JWT + has_role | удалить блок |
| `media-manager/index.ts` | нет авторизации | блок JWT + has_role | удалить блок |
| `update-price`, `import-products` | login/password в теле | JWT + has_role | вернуть прежний обработчик |
| `modernAdminComponent(.js/_media.js)`, `adminOrdersComponent.js` | ветки `set_admin_login_context` | удалены | вернуть блоки |
| Мёртвые модули | присутствуют | остаются, добавлен маркер DEPRECATED | удалить комментарий |
| RLS `wb_clicks`, `b2b_clients` | текущие политики | заменены миграцией | обратная миграция, текст готовится заранее |

Необратимых изменений нет. Бизнес-схема не меняется, данные не трогаются, Storage не мигрирует.

---

## Migration handoff (документация, не реализация)

| Текущий компонент | Статус | Будущая замена на Timeweb | Долг миграции |
|---|---|---|---|
| Supabase Auth + `has_role` | ВРЕМЕННО | собственная админ-авторизация на российском API | НЕТ |
| `storage-manager` | ВРЕМЕННО | `/api/admin/media` | НЕТ |
| `media-manager` | ВРЕМЕННО | `/api/admin/media` | НЕТ |
| `update-price` | ВРЕМЕННО | `PATCH /api/admin/products/:id/price` | НЕТ |
| `import-products` | ВРЕМЕННО | `POST /api/admin/products/import` | НЕТ |
| Supabase Postgres | ВРЕМЕННО | Timeweb Managed PostgreSQL | НЕТ |
| Supabase Storage | ВРЕМЕННО | приватное хранилище в РФ | НЕТ |
| `designs` + публичный бакет | ВРЕМЕННО, риск принят | PostgreSQL + приватное хранилище + серверный токен владения | НЕТ |
| JSON-first каталог | ОСТАЁТСЯ | остаётся без изменений | НЕТ |

Новых Supabase-специфичных механизмов не вводится: единственная добавляемая конструкция — стандартная проверка «Bearer-токен → пользователь → роль», которая один в один переносится в любой REST-бэкенд.

---

## Файлы, которых коснётся патч

Изменяются: `supabase/config.toml`, `supabase/functions/storage-manager/index.ts`, `supabase/functions/media-manager/index.ts`, `supabase/functions/update-price/index.ts`, `supabase/functions/import-products/index.ts`, `js/components/modernAdminComponent.js`, `js/components/modernAdminComponent_media.js`, `js/components/adminOrdersComponent.js`.

Помечаются как DEPRECATED, но **остаются в репозитории**: `js/components/adminComponent.js`, `js/components/adminProductsComponent.js`, `js/components/mediaManagerComponent.js`, `js/utils/storageHelper.js`. Ни один файл проекта не удаляется.

Миграция БД: две политики (`wb_clicks` SELECT, `b2b_clients` ALL). **NO BUSINESS DATABASE SCHEMA CHANGES.**

Не изменяются: публичный каталог, `products-public.json`, `mediaResolver.js`, кастомайзер, формы заказа и обратной связи, Telegram, Sheets, аналитика, тексты политик.

---

## Ручная приёмка после деплоя

Оба открытых вопроса закрыты вашими решениями: файлы не удаляем, смена статуса заказа считается NOT VERIFIED IN RUNTIME и чинится по коду. Ничего блокирующего не осталось.

Короткий приёмочный сценарий после деплоя:

1. Войти в `/admin`
2. Выйти
3. Войти повторно
4. Открыть товар
5. Изменить тестовое поле и вернуть обратно
6. Загрузить изображение
7. Проверить управление изображением (удаление, назначение главным)
8. Открыть заказ
9. Изменить статус заказа и вернуть обратно
10. Открыть раздел B2B clients

Пункты 6-7 — основная зона риска Phase 1 (единственные активные вызовы `media-manager`). Пункт 9 — проверка исправления Phase 3.
