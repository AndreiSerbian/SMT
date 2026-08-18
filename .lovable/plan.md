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

Добавить в `storage-manager/index.ts` и `media-manager/index.ts` единый блок авторизации в начале обработчика: взять `Authorization`, проверить пользователя через анонимный клиент с этим токеном, вызвать `has_role(user.id,'admin')`, и **только после успеха** создавать service-role клиент. Нет токена → 401, невалидный → 401, не админ → 403.

`supabase/config.toml`: `verify_jwt = true` для обеих функций.

Атомарно с этим — фронтенд. `supabase.functions.invoke` автоматически подставляет токен текущей сессии, поэтому два активных вызова в `modernAdminComponent_media.js` L71 и L156 менять не требуется по существу; нужно только убедиться, что клиент из `js/utils/supabase.js` — тот же, в котором выполнен вход (это так: `adminAuthComponent.js` использует его же). Добавляется обработка 401/403 с понятным сообщением.

`storage-manager` активных вызовов не имеет — его защита не ломает ничего.

Прочие функции с той же комбинацией проверяются отдельно: `generate-design-pdf` (`verify_jwt = false` + service_role) вызывается анонимным покупателем из кастомайзера — **её закрывать нельзя**, она остаётся как есть и уходит в раздел deferred.

### PHASE 2 — Plaintext-пароли в active runtime

Активных вызовов `update-price` и `import-products` нет. Поэтому вместо переписывания рабочего кода:

- удалить мёртвые модули `adminComponent.js`, `adminProductsComponent.js`, `mediaManagerComponent.js`, `js/utils/storageHelper.js` (dependency trace доказан выше);
- привести `update-price` и `import-products` к той же JWT + `has_role` модели, что и Phase 1, и убрать приём `admin_login`/`admin_password` — чтобы эндпоинты не оставались публично вызываемым способом дёрнуть `is_admin_user` перебором.

Функции `is_admin_user`, `set_admin_context`, `set_admin_login_context` и таблица `admins` **не удаляются** — только перестают использоваться.

### PHASE 3 — Legacy admin context

В `modernAdminComponent.js` (L20-30, L516, L844, L957) и `modernAdminComponent_media.js` (L15, L229) убрать чтение `admin_session` и обёртки `if (this.adminLogin) rpc(...)`. Эти ветки и так не исполняются; RLS на `products` работает через `has_role`, то есть удаление ничего не разблокирует и ничего не сломает.

В `adminOrdersComponent.js` L465-478 убрать несуществующий `getAdminLogin()` и вызов `set_admin_login_context`, оставив прямой `update` под RLS `has_role`. Это **починка сломанного функционала**, а не изменение логики.

### PHASE 4 — Critical RLS

Только доказанное:

- `wb_clicks`: политика SELECT для роли `public` с `qual = true` заменяется на `has_role(auth.uid(),'admin')`. INSERT для анонима сохраняется — он нужен трекингу (`productComponent.js` L553).
- `b2b_clients`: политика `Service role can manage b2b clients` (роль `public`, ALL, `qual = true`) переназначается на `service_role`. Перед изменением — проверка фактического анонимного доступа запросом к REST; если доступа нет, изменение всё равно безопасно, так как админские политики `has_role` остаются нетронутыми.
- `orders` и `contact_requests`: аноним может только INSERT, SELECT закрыт — это требуется публичным формам. **NO P0 CHANGE REQUIRED.**
- `user_roles`, `products`, справочники — без изменений.
- `storage.objects` — не трогаем (см. Phase 5).

### PHASE 5 — Designs

Минимального безопасного фикса не существует. `design_id` генерируется в браузере (`exportPipeline.js` L23), сервер не хранит признак владения, а `order-processing/index.ts` L429 обновляет `designs` по этому же id. Любое сужение RLS без введения серверного токена владения ломает кастомайзер и оформление заказа с макетом.

→ **F-02 designs: DEFERRED TO TIMEWEB MIGRATION.**
→ **F-05 приватное хранилище клиентских файлов: DEFERRED** — перевод бакета в приватный сломает уже выданные клиентам ссылки на PDF, что прямо запрещено рамками задачи.

Что при этом всё равно закрывается: `storage-manager` и `media-manager`, то есть привилегированные пути произвольной работы с бакетом, перестают быть доступны анониму.

### PHASE 6 — Проверки

Матрица 401/invalid/403/admin по `storage-manager`, `media-manager`, `update-price`, `import-products` — выполнима из sandbox через `curl` (без токена, с мусорным токеном, с анонимным ключом). Проверка «valid admin → success» требует реальной сессии администратора и будет помечена как **MANUAL VERIFICATION REQUIRED**, если войти в админку в рантайме не удастся.

Регрессия админки и публичной части — по чек-листам из задания, с явным разделением STATIC CODE VERIFIED / RUNTIME VERIFIED / MANUAL VERIFICATION REQUIRED. Никаких «PASS» без фактической проверки.

Счётчики строк по `products`, `orders`, `contact_requests`, `b2b_clients`, `designs` снимаются до и после; персональные данные не выводятся.

---

## Rollback

| Изменение | CURRENT | CHANGE | ROLLBACK |
|---|---|---|---|
| `config.toml` | `verify_jwt = false` ×2 | `true` для storage-manager, media-manager | вернуть `false` |
| `storage-manager/index.ts` | нет авторизации | блок JWT + has_role | удалить блок |
| `media-manager/index.ts` | нет авторизации | блок JWT + has_role | удалить блок |
| `update-price`, `import-products` | login/password в теле | JWT + has_role | вернуть прежний обработчик |
| `modernAdminComponent(.js/_media.js)`, `adminOrdersComponent.js` | ветки `set_admin_login_context` | удалены | вернуть блоки |
| Удаление мёртвых файлов | присутствуют | удалены | восстановить из истории |
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

Удаляются как dead code: `js/components/adminComponent.js`, `js/components/adminProductsComponent.js`, `js/components/mediaManagerComponent.js`, `js/utils/storageHelper.js`.

Миграция БД: две политики (`wb_clicks` SELECT, `b2b_clients` ALL). **NO BUSINESS DATABASE SCHEMA CHANGES.**

Не изменяются: публичный каталог, `products-public.json`, `mediaResolver.js`, кастомайзер, формы заказа и обратной связи, Telegram, Sheets, аналитика, тексты политик.

---

## Требует вашего решения перед началом

1. Удаление `adminProductsComponent.js` и `mediaManagerComponent.js` вместе с `adminComponent.js`: они не подключены к роутеру, но содержат функциональность (массовый импорт товаров, отдельный медиа-менеджер, работа с папками Storage), которой нет в активной админке. Удалять их или оставить в репозитории неиспользуемыми?
2. Подтвердите, пожалуйста, работает ли сейчас смена статуса заказа в админке — по коду там должна быть ошибка. Это влияет на то, считать ли Phase 3 починкой или изменением поведения.
