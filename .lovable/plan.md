# Аудит SMTBoxes / giftboxopt.ru на соответствие 152-ФЗ

Дата оценки требований: 18.08.2026. Код не изменялся, миграции не выполнялись, реальные данные клиентов не выводились, секреты не раскрывались.

---

## 1. Executive Summary

Найдено: **P0 — 5**, **P1 — 7**, **P2 — 9**, **P3 — 4**.

Пять наиболее серьёзных проблем:

1. **P0.** Edge Functions `storage-manager` и `media-manager` работают с `SUPABASE_SERVICE_ROLE_KEY`, объявлены как `verify_jwt = false` и **не содержат ни одной проверки авторизации**. Любой, кто знает URL, может загружать/удалять/переименовывать объекты в бакете и изменять записи товаров.
2. **P0.** Анонимный доступ на **чтение и изменение** таблицы `designs` (пользовательские макеты, комментарии, ссылки на PDF). Подтверждено политикой и живым тестом.
3. **P0.** Первичная запись ПДн российских покупателей происходит в Supabase. Регион проекта из репозитория недоказуем → требования ч.5 ст.18 **не подтверждены**.
4. **P0.** Аутентификация администратора частично идёт по паролю в открытом виде: таблица `admins(login, password)` содержит 2 записи, функция `is_admin_user(login, password)` активно вызывается из `update-price`.
5. **P1.** Microsoft Clarity (session replay) и Google `gtag` запускаются в `<head>` до какого-либо волеизъявления пользователя; cookie-баннер авто-«соглашается» через 10 секунд, кнопка «Закрыть» тоже засчитывается как согласие, кнопки «Отклонить» нет.

---

## 2. Actual Personal Data Inventory

| Данные | Где вводятся/собираются | Точное место |
|---|---|---|
| ФИО | Форма заказа | `js/components/orderComponent.js` L212 (`#customerName`), L432, L531 |
| Телефон | Заказ, обратная связь | `orderComponent.js` L219, L533; `js/components/contactsComponent.js` L75, L172 |
| Email | Форма заказа | `orderComponent.js` L229, L534 |
| Адрес доставки | Форма заказа | `orderComponent.js` L241 (`#yandexAddress`), L534 |
| Комментарий (свободный текст) | Заказ | `orderComponent.js` L248, L535 |
| Сообщение (свободный текст) | Обратная связь | `contactsComponent.js` L76, L173 |
| Признак рассылки | Заказ | `orderComponent.js` L234 (`subscribe`, **checked по умолчанию**) |
| Состав заказа | Заказ | `orderComponent.js` L496, L538 |
| Данные B2B-клиента (компания, контактное лицо, телефон, email) | Формируются в админке/из заказов | таблица `b2b_clients` (12 записей) |
| Пользовательские макеты, загруженные изображения, PDF | Кастомайзер | `js/customizer/canvasController.js` L241 `addImage`, `js/customizer/storageService.js` L13/36/53/78 |
| User-Agent, Referrer | Клик по ссылке Wildberries | `js/components/productComponent.js` L546-566 |
| Корзина | localStorage | `js/services/cartService.js` L12-17 (ключ `cart`) |
| Черновик макета | localStorage | `js/customizer/sceneManager.js` L89-125 |
| Флаг cookie-согласия | localStorage | `js/services/cookieConsentService.js` L2, L15 (ключ `cookieConsent`) |
| Логин/пароль админа | sessionStorage — **мёртвый код** | `js/components/adminComponent.js` L315-317 (компонент не импортирован в `js/router.js`) |
| Поведенческая запись (движение мыши, клики, DOM) | Clarity | `index.html` L34-41 |
| IP-адрес | Не собирается кодом; попадает в логи Supabase/хостинга | НЕВОЗМОЖНО ПОДТВЕРДИТЬ ИЗ РЕПОЗИТОРИЯ |

IndexedDB, UTM-обработка, fingerprint-библиотеки, captcha, error-monitoring SDK (Sentry и т.п.) — **в проекте не обнаружены**.

---

## 3. Data Flow Map

```text
Форма заказа (orderComponent.js L558)
  USER -> FRONTEND -> POST bsndismiessofvhglzrv.supabase.co/functions/v1/order-processing
    -> DATABASE: public.orders (INSERT)
    -> EMAIL: Resend -> покупателю (order-processing L251-253)
    -> EMAIL: Resend -> ADMIN_EMAIL (L356)
    -> MESSENGER: api.telegram.org sendMessage, полный текст с ФИО/тел/email/адресом (L203-206, L297, L325-328)
    -> MESSENGER: api.telegram.org sendDocument, PDF-макет клиента (L163-190)
    -> EXTERNAL: Google Apps Script / Google Sheets (L21, updateGoogleSheets)
    -> ADMIN: админка читает orders через Supabase Auth + has_role

Форма обратной связи (contactsComponent.js -> js/services/contact-service.js)
  USER -> FRONTEND -> POST /rest/v1/contact_requests  (INSERT)
                   -> POST /functions/v1/contact-notify -> Telegram (name, phone, message)

Кастомайзер (js/customizer/*)
  USER -> FRONTEND -> supabase.storage 'product-media' (ПУБЛИЧНЫЙ бакет)
                       пути designs/<uuid>/previews|scene|assets
                   -> DATABASE: public.designs (INSERT/UPDATE)
                   -> /functions/v1/generate-design-pdf -> PDF в тот же публичный бакет
                   -> далее в заказ -> Telegram

Клик по Wildberries (productComponent.js L546-566)
  USER -> FRONTEND -> POST /rest/v1/wb_clicks (product_id, user_agent, referrer)

Аналитика (index.html L34-50) — стартует до выбора пользователя
  USER -> www.clarity.ms  (session replay)
  USER -> www.googletagmanager.com/gtag/js?id=G-1HVF***

Хранение/логи Supabase, хостинг giftboxopt.ru — UNKNOWN
```

Пересечение потоков подтверждено: **Clarity загружается на всех страницах, включая маршруты `#order` и `#contacts`**, где пользователь вводит ФИО, телефон, email и адрес. Masking полей в конфигурации Clarity в репозитории не задан — используется дефолтный тег без параметров (`index.html` L36-40).

---

## 4. Forms & Consent Audit

### Форма заказа — маршрут `#order`, `js/components/orderComponent.js`

| Поле | Строка | Обязательное | Цель | Возможное основание |
|---|---|---|---|---|
| ФИО | L212 | да | заключение/исполнение договора | п.5 ч.1 ст.6 (договор) |
| Телефон | L219 | да | связь по заказу | договор |
| Email | L229 | да | подтверждение заказа | договор |
| Адрес | L241 | нет | доставка | договор |
| Комментарий | L248 | нет | уточнения к заказу | договор |
| Оплата/доставка | L258-276 | да | исполнение | договор |
| `subscribe` | **L234, `checked`** | предустановлено | рекламная рассылка | **согласие, ст.9 + ст.18 ФЗ «О рекламе»** |

Проблемы:
- Отдельного согласия на обработку ПДн на форме **нет вообще**. Для контрактных полей это допустимо, но не для маркетинга.
- Чекбокс рассылки **предустановлен** — это не активное волеизъявление.
- Ссылка на Политику есть только в футере страницы (`orderComponent.js` L312), не рядом с кнопкой отправки.
- Серверная фиксация факта согласия отсутствует: `order-processing` принимает `subscribe` как обычное поле, запись в `orders.subscribe` не сопровождается версией текста согласия, датой предъявления, form ID или источником.
- Валидация полей только клиентская (`orderComponent.js` L432-460); в edge-функции проверки формата нет.

### Форма обратной связи — маршрут `#contacts`, `js/components/contactsComponent.js` L74-76

Поля: имя (обяз.), телефон (обяз.), сообщение (необяз.). Цель формой не объявлена; фактически это смешанная форма — и предконтрактный запрос, и общая коммуникация. Согласия нет, ссылки на Политику рядом нет, серверной валидации нет, доказательства согласия не фиксируются. **LEGAL REVIEW REQUIRED** — квалификация основания зависит от того, как оператор описывает назначение формы.

### Кастомайзер — `customizer.html`, `js/customizer/*`

Загрузка изображений (`canvasController.js` L241). Никакого текста об обработке ПДн, никакого предупреждения не загружать изображения с личными данными, отдельного согласия нет.

### Вход в админку — `js/components/adminAuthComponent.js`

Email + пароль через Supabase Auth + `has_role`. Согласия не требуется (внутренний процесс).

### Cookie-баннер — `js/services/cookieConsentService.js`

- L74-75: формулировка «Продолжая просматривать этот сайт, вы соглашаетесь…» — пассивное согласие.
- L101: кнопка «Закрыть» вызывает `accept()`.
- L105: `setTimeout(() => this.accept(), 10000)` — автоматическое проставление согласия.
- Кнопки отказа нет, категорий нет, отзыва нет, `hasConsent()` ни на что не влияет — скрипты аналитики уже отработали в `<head>`.

---

## 5. Privacy Documents Audit

| Документ | Путь | URL | Состояние |
|---|---|---|---|
| Политика конфиденциальности | `js/components/privacyPolicyComponent.js` | `giftboxopt.ru/#privacy-policy` | Есть, доступна без авторизации |
| Условия пользования | `js/components/termsOfUseComponent.js` | `giftboxopt.ru/#terms-of-use` | Есть |
| Согласие на обработку ПДн (отдельный документ) | — | — | **ОТСУТСТВУЕТ** |
| Согласие на рекламные рассылки | — | — | **ОТСУТСТВУЕТ** |
| Cookie-политика (отдельно) | — | — | **ОТСУТСТВУЕТ** (только §5 внутри Политики) |
| Публичная оферта | — | — | **ОТСУТСТВУЕТ** (Условия пользования её не заменяют) |
| Реквизиты оператора (наименование, ИНН/ОГРН, адрес) | — | — | **ОТСУТСТВУЮТ** во всём репозитории |

Расхождения Политики с фактической реализацией:
- §5 (`privacyPolicyComponent.js` L96) называет **Яндекс.Метрику** — в коде её **нет**.
- **Не названы**: Microsoft Clarity, Google `gtag`, Supabase, Resend, Telegram, Google Sheets / Apps Script, Wildberries-трекинг.
- §4 (L88) утверждает «данные не передаются третьим лицам, кроме курьерских служб» — фактически передаются минимум пяти внешним сервисам.
- §4 (L87) заявляет срок «не позднее 5 лет» — механизма удаления в проекте нет.
- §6 (L109) даёт email для обращений; технической процедуры исполнения запроса нет.
- Раздела о трансграничной передаче нет.
- Раздела о месте нахождения базы данных нет.

---

## 6. Analytics / Cookies / Session Replay

| Сервис | Точное место | Момент запуска | Комментарий |
|---|---|---|---|
| **Microsoft Clarity** | `index.html` L34-41, тег `w8xav***` | Синхронно в `<head>`, до баннера | Session replay + heatmaps. Параметры masking не заданы. Ввод в поля формы потенциально попадает в запись. Opt-out в коде отсутствует. |
| **Google gtag** | `index.html` L43-50, ID `G-1HVF***` | `async` в `<head>`, до баннера | Тип потока (GA4 / Google Ads) из кода **не подтверждается** — есть только `gtag('config', ...)`. Конкретные cookie и срок хранения не подтверждаются из репозитория. |
| **Yandex.Metrika** | не найдена | — | **Отсутствует.** В `index.html` L32 есть только `yandex-verification` meta-тег — он не создаёт сетевого запроса и **не является аналитикой**. |
| **Lovable tagger** | `index.html` L31 `cdn.gpteng.co/gptengineer.js` | Синхронно | Служебный скрипт среды разработки; на проде подлежит проверке. |
| **cdnjs / jsdelivr / Google Fonts** | `index.html` L30, `customizer.html` L10 | Синхронно | CDN получает IP и User-Agent при загрузке ресурса. |

`customizer.html` аналитику **не подключает** — Clarity и gtag там отсутствуют.

Собственных cookie сайт через `document.cookie` не ставит (совпадений в коде нет). localStorage: `cart`, `cookieConsent`, ключ черновика кастомайзера.

---

## 7. Database / Storage / Localization

### Проект Supabase

- API hostname: `bsndismiessofvhglzrv.supabase.co` (`js/utils/supabase.js` L3, `public/env.js` L3, `src/integrations/supabase/client.ts` L6, `supabase/config.toml` L2).
- Ответ API содержит `sb-project-ref` и `server: cloudflare`, `cf-ray: …-AMS`. Это точка присутствия CDN, **не** регион базы.
- **Регион проекта из репозитория недоказуем.**

Ответ по цепочке ч.5 ст.18:

| Операция | Где происходит |
|---|---|
| Первая запись | Supabase Postgres (`orders`, `contact_requests`, `designs`) |
| Систематизация | Supabase Postgres |
| Накопление | Supabase Postgres + Supabase Storage |
| Хранение | Supabase Postgres + Supabase Storage + Google Sheets + Telegram-чат + почтовые ящики Resend |
| Изменение | Supabase Postgres (админка) |
| Извлечение | Supabase Postgres (админка, edge-функции) |

Статус: **P0 CRITICAL — LOCATION NOT VERIFIED**. Российской базы, в которую производилась бы первичная запись, в проекте нет. Утверждать выполнение требований локализации нельзя.

### RLS — фактические политики

| Таблица | RLS | anon | authenticated | Проверено вживую |
|---|---|---|---|---|
| `orders` (18 зап.) | вкл. | INSERT `with_check=true`; SELECT/UPDATE/DELETE закрыты | admin через `has_role` | anon SELECT → пустой ответ, утечки нет |
| `contact_requests` (5) | вкл. | INSERT `true`; SELECT закрыт | admin SELECT | утечки нет |
| `b2b_clients` (12) | вкл. | нет | admin RW+D; отдельная политика `Service role can manage b2b clients` для роли `public` с `qual=true` (ALL) | требует ручной перепроверки — политика назначена роли `public`, а не `service_role` |
| `designs` (16) | вкл. | **SELECT `qual=true`**, **UPDATE `qual=true`**, INSERT `true` | — | anon SELECT → **непустой ответ, HTTP 200** |
| `wb_clicks` (17) | вкл. | INSERT `true`, **SELECT `qual=true`** | — | anon SELECT → **непустой ответ, HTTP 200** |
| `admins` (2) | вкл. | нет | SELECT только admin | Хранит колонку `password` типа `text` |
| `user_roles` | вкл. | нет | own SELECT + admin ALL | корректно |

Отдельной таблицы для фиксации согласий в схеме **нет**.

### Storage

Единственный бакет: **`product-media`, `public = true`**. В нём смешаны:

- A) Публичные ассеты каталога — `images/<размер>/<цвет>/slide*.webp`. Публичность здесь ожидаема и нарушением не является.
- B) **Пользовательский контент** — `designs/<uuid>/previews/*.png`, `designs/<uuid>/scene/scene.json`, `designs/<uuid>/assets/<timestamp>.<ext>`, PDF-макеты (`js/customizer/storageService.js` L42, L56, L81).

Свойства пользовательских объектов: публичный URL без срока жизни (`getPublicUrl`, L26/68/92), signed URL не используются, идентификатор — UUID (непредсказуемый сам по себе), **но** UUID извлекается анонимно из таблицы `designs`, чтение которой открыто. Это превращает непредсказуемость в неработающую защиту.

Валидация загрузки: только `file.size > 25MB` (`canvasController.js` L242). MIME-проверка, whitelist расширений, санитизация имени, снятие EXIF, антивирусная проверка — **отсутствуют**. `contentType` берётся из `file.type`, то есть из значения, контролируемого клиентом (`storageService.js` L86).

Retention / lifecycle / cron: **не найдены** нигде в `supabase/` и `scripts/`.

---

## 8. Third Parties & Cross-Border Processing

| Service | Domain | Purpose | Data Sent | Russian DB Confirmed? | Cross-border Risk | Action |
|---|---|---|---|---|---|---|
| Supabase | `bsndismiessofvhglzrv.supabase.co` | БД, storage, edge, auth | ФИО, телефон, email, адрес, комментарии, файлы | НЕТ | Высокий | INFRASTRUCTURE VERIFICATION REQUIRED |
| Telegram | `api.telegram.org` | Уведомления админа | ФИО, телефон, email, адрес, состав заказа, PDF клиента | НЕТ | Высокий | Минимизировать до номера заказа |
| Resend | через SDK в `order-processing` | Транзакционная почта | Email, ФИО, состав заказа | НЕТ | Высокий | Оценить замену на РФ-провайдера |
| Google Apps Script / Sheets | задаётся секретом `GOOGLE_SCRIPT_URL` | Лог заказов | Полный заказ | НЕТ | Высокий | Оценить отказ |
| Microsoft Clarity | `www.clarity.ms` | Session replay | Поведение, потенциально содержимое полей | НЕТ | Высокий | Гейт по согласию + masking либо отказ |
| Google gtag | `www.googletagmanager.com` | Аналитика | Идентификаторы, IP, URL | НЕТ | Высокий | Гейт по согласию |
| Cloudflare CDN | `cdnjs.cloudflare.com` | FontAwesome | IP, User-Agent | НЕТ | Низкий (ПДн не передаются намеренно) | Самохостинг ресурса |
| jsDelivr | `cdn.jsdelivr.net` | Библиотеки | IP, User-Agent | НЕТ | Низкий | Самохостинг |
| Google Fonts | `fonts.googleapis.com`, `fonts.gstatic.com` | Шрифты | IP, User-Agent | НЕТ | Низкий | Самохостинг |
| Lovable tagger | `cdn.gpteng.co` | Служебный скрипт | Метаданные страницы | НЕТ | Низкий | Проверить отсутствие в прод-сборке |
| Wildberries | `www.wildberries.ru` | Внешние переходы | Referrer при переходе | РФ | Низкий | Раскрыть в Политике |
| WhatsApp | `wa.me` | Ссылка на связь | Инициируется пользователем | НЕТ | Низкий | Раскрыть |
| Хостинг giftboxopt.ru | — | Раздача сайта, access-логи | IP, User-Agent, URL | НЕ ПОДТВЕРЖДЁН | Средний | INFRASTRUCTURE VERIFICATION REQUIRED |

Разграничение: CDN и шрифты — это использование иностранного сервиса без намеренной передачи ПДн. Supabase, Telegram, Resend, Google Sheets, Clarity — это фактическая передача ПДн или поведенческих данных за рубеж.

---

## 9. Security Audit

- **Неавторизованные привилегированные edge-функции.** `supabase/config.toml` L16-20 объявляет `verify_jwt = false` для `storage-manager` и `media-manager`. Обе создают клиент с `SUPABASE_SERVICE_ROLE_KEY` (`storage-manager/index.ts` L42-44, `media-manager/index.ts` L37-39) и не выполняют ни одной проверки прав. Доступные действия: загрузка, удаление, переименование объектов (`storage-manager` L96, L129, L136, L171), обновление записей товаров (`media-manager` L128-130).
- **`update-price`** (`verify_jwt = false`, L13-14 config) принимает `admin_login` + `admin_password` в теле запроса и сверяет их через `is_admin_user` (L48-52) — аутентификация по паролю в открытом виде плюс отсутствие защиты от перебора.
- **Таблица `admins`** содержит колонку `password text`, 2 записи. Функции `is_admin_user`, `set_admin_context`, `set_admin_login_context` работают с plaintext.
- **Legacy-компонент** `js/components/adminComponent.js` пишет логин и пароль в `sessionStorage` (L315-317). В `js/router.js` он **не импортирован**, маршрут на него не ведёт (L65-93 используют только `AdminAuthComponent` и `AdminLayoutComponent`). Классификация: **DEAD LEGACY CODE**, подлежит удалению, но активной уязвимостью в текущей сборке не является.
- **RPC `set_admin_login_context`** вызывается из живых компонентов админки (`adminProductsComponent.js` L1064, `adminOrdersComponent.js` L474, `modernAdminComponent.js` L518/846/959, `modernAdminComponent_media.js` L15/229) — параллельный контур авторизации в обход `has_role`.
- **CORS `Access-Control-Allow-Origin: *`** во всех edge-функциях (`order-processing` L7, `contact-notify` L5, `admin-notify` L4, `update-price` L5, `storage-manager` L5, `media-manager` L5, `generate-design-pdf` L6).
- **Rate-limit, captcha, антиспам** — отсутствуют на всех публичных формах и edge-функциях.
- **Логи:** `orderComponent.js` L554-555 печатает `orderData` целиком (ФИО, телефон, email, адрес) в консоль браузера. `order-processing/index.ts` L249 логирует email покупателя, L142 — chat_id, L417 (`order-confirmation`) — все параметры URL. Токены и ключи в логи не попадают — проверки написаны как «есть/нет» (`order-processing` L13, L26).
- **ПДн в URL:** прямых `?email=`/`?phone=`/`?name=` нет. В ссылке подтверждения заказа используется `order_id` (UUID) — `order-processing` L62, `order-confirmation` L413, L447. Это ссылка одноразового действия, попадающая в почтовый ящик и историю браузера; предсказуемости нет, но токен подтверждения отсутствует — знание `order_id` достаточно для подтверждения заказа.
- **Anon-ключ в клиентском коде** (`js/utils/supabase.js` L4 и ещё 5 мест) — это штатная публичная величина архитектуры Supabase, утечкой секрета не является. Реальный уровень риска определяется политиками RLS выше.
- **Audit-логи действий администратора, алерты, incident-мониторинг** — отсутствуют.

---

## 10. Full Findings Table

| ID | Sev | Finding | Exact Evidence | Personal Data | Data Flow | Legal Req | Current State | Fix Cat | Lovable Fix | User Action | Owner Approval | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F-01 | P0 | `storage-manager` и `media-manager` — service_role без авторизации | `supabase/config.toml` L16-20; `storage-manager/index.ts` L42-44; `media-manager/index.ts` L37-39 | Косвенно (доступ к бакету с пользовательскими файлами) | Любой → edge → Storage/DB | ст.19 | Открыто | A | Да | — | Нет | Высокая |
| F-02 | P0 | Анонимный SELECT/UPDATE `designs` | политики `Anyone can read designs`, `Anyone can update designs`, `qual=true`, роль `public`; anon-запрос вернул непустой ответ | Пользовательские макеты, комментарии, ссылки на PDF | anon → REST → БД | ст.7, ст.19 | Открыто | A | Да | — | Нет | Высокая |
| F-03 | P0 | Локализация ПДн не подтверждена | `js/utils/supabase.js` L3; `supabase/config.toml` L2; заголовок `sb-project-ref` | Все ПДн покупателей | RU-пользователь → Supabase | ч.5 ст.18 | Не подтверждено | C + D | Нет | Да | Да | Высокая (по факту недоказанности) |
| F-04 | P0 | Пароль администратора в открытом виде + аутентификация по нему | таблица `admins(password text)`, 2 записи; `is_admin_user`; `update-price/index.ts` L35-52 | Учётные данные | Клиент → edge → RPC | ст.19 | Активно | A | Да | — | Да | Высокая |
| F-05 | P0 | Пользовательские файлы в публичном бакете + открытая `designs` = свободный доступ | `storage.buckets`: `product-media public=true`; `storageService.js` L26/68/92; связка с F-02 | Загруженные изображения, PDF, макеты | Клиент → Storage → публичный URL | ст.7, ст.19 | Открыто | A | Да | — | Да | Высокая |
| F-06 | P1 | Clarity и gtag стартуют до выбора пользователя | `index.html` L34-50; `cookieConsentService.js` L105 | Поведение, потенциально содержимое полей | Браузер → clarity.ms / googletagmanager.com | ст.9, ст.12 | Открыто | A | Да | Подтвердить необходимость Clarity | Да | Высокая |
| F-07 | P1 | Cookie-баннер не даёт выбора: авто-accept, «Закрыть» = согласие, отказа нет | `cookieConsentService.js` L74-75, L101, L105 | Флаг согласия | localStorage | ст.9 | Открыто | A | Да | — | Нет | Высокая |
| F-08 | P1 | Маркетинговый чекбокс предустановлен и не отделён | `orderComponent.js` L234 (`checked`) | Email, телефон | orders.subscribe | ст.9 + ст.18 ФЗ «О рекламе» | Открыто | A | Да | Подтвердить, ведётся ли рассылка | Нет | Высокая |
| F-09 | P1 | Нет технических доказательств согласия (дата, версия, form ID, источник) | таблица согласий отсутствует в схеме; `order-processing` не пишет метаданные | — | — | ст.9 ч.4 | Отсутствует | A + B | Да | Утвердить тексты согласий | Нет | Высокая |
| F-10 | P1 | Отдельного документа «Согласие на обработку ПДн» нет | ни одного файла в `js/components/` | — | — | ст.9, редакция с 01.09.2025 | Отсутствует | A + D | Да (страница) | Юр. текст | Нет | Высокая |
| F-11 | P1 | Полные ПДн клиента в Telegram | `order-processing/index.ts` L203-206, L297, L325-328; `contact-notify/index.ts` L36-39 | ФИО, телефон, email, адрес, PDF | edge → api.telegram.org | ст.12, ст.19 | Активно | A + D | Да | Подтвердить состав чата | Да | Высокая |
| F-12 | P1 | Политика противоречит реализации | `privacyPolicyComponent.js` L88, L96 (Я.Метрика, «не передаём третьим лицам») | — | — | ст.18.1 | Открыто | A + B | Да (текст) | Реквизиты и подтверждение фактов | Нет | Высокая |
| F-13 | P2 | Загрузка файлов без MIME/расширения/EXIF/санитизации имени | `canvasController.js` L241-244; `storageService.js` L79-86 | Возможные ПДн в изображениях | Клиент → Storage | ст.19 | Открыто | A | Да | — | Нет | Высокая |
| F-14 | P2 | ПДн в консоли браузера | `orderComponent.js` L554-555 | ФИО, телефон, email, адрес | Консоль | ст.19 | Открыто | A | Да | — | Нет | Высокая |
| F-15 | P2 | Email покупателя и параметры URL в логах edge | `order-processing` L249; `order-confirmation` L417 | Email, order_id | Логи Supabase | ст.19 | Открыто | A | Да | — | Нет | Высокая |
| F-16 | P2 | Анонимный SELECT `wb_clicks` | политика `Admins can read WB clicks` фактически `qual=true`, роль `public`; anon-запрос вернул непустой ответ | UA, referrer (не ПДн в узком смысле) | anon → REST | ст.19 | Открыто | A | Да | — | Нет | Высокая |
| F-17 | P2 | Политика `Service role can manage b2b clients` назначена роли `public`, ALL, `qual=true` | `pg_policies` | Данные B2B-клиентов | — | ст.7 | Требует перепроверки | A | Да | — | Нет | Средняя |
| F-18 | P2 | Retention отсутствует | нет cron/cleanup в `supabase/`, `scripts/` | Все ПДн | — | п.7 ч.1 ст.5, ч.4 ст.21 | Отсутствует | A + B | Да (джобы) | RETENTION PERIOD MUST BE DEFINED BY OPERATOR | Да | Высокая |
| F-19 | P2 | Нет механизма поиска/исправления/удаления данных субъекта | в админке нет операций по email/телефону через все системы | Все ПДн | — | ст.14, ст.20, ст.21 | MANUAL PROCESS REQUIRED | A + B | Частично | Регламент | Нет | Высокая |
| F-20 | P2 | CORS `*` на всех edge-функциях | все `supabase/functions/*/index.ts`, строки 4-8 | — | — | ст.19 | Открыто | A | Да | — | Нет | Высокая |
| F-21 | P2 | Нет rate-limit и captcha на публичных формах | `order-processing`, `contact-notify` | — | — | ст.19 | Отсутствует | A | Да | Выбор провайдера captcha | Нет | Высокая |
| F-22 | P3 | Мёртвый legacy-компонент с паролем в sessionStorage | `adminComponent.js` L315-317; не импортирован в `router.js` | Учётные данные | — | ст.19 | DEAD CODE | A | Да | — | Нет | Высокая |
| F-23 | P3 | Anon-ключ продублирован в 6 местах | `js/utils/supabase.js` L4; `public/env.js` L4; `contact-service.js` L5; `orderComponent.js` L562; `productComponent.js` L553; `src/integrations/supabase/client.ts` L7 | — | — | — | Не нарушение, гигиена | A | Да | — | Нет | Высокая |
| F-24 | P3 | Ссылка подтверждения заказа без токена | `order-processing` L62; `order-confirmation` L413 | order_id | Email → браузер | ст.19 | Открыто | A | Да | — | Нет | Высокая |
| F-25 | P3 | Внешние CDN и шрифты вместо самохостинга | `index.html` L30-31; `customizer.html` L10 | IP, User-Agent | Браузер → CDN | — | Открыто | A | Да | — | Нет | Высокая |

**E — NO ISSUE FOUND:** Яндекс.Метрика в проекте отсутствует; `yandex-verification` — не аналитика. Anon-ключ на клиенте — штатное поведение технологии. Публичность каталожных изображений в `product-media` сама по себе нарушением не является. Анонимное чтение `orders` и `contact_requests` заблокировано — проверено.

**OUTSIDE 152-FZ — ADDITIONAL COMPLIANCE ISSUE:** предустановленный чекбокс рассылки (`orderComponent.js` L234) затрагивает ч.1 ст.18 ФЗ «О рекламе» — требуется предварительное согласие абонента. Отсутствие публичной оферты и реквизитов продавца затрагивает Закон «О защите прав потребителей» и Правила продажи товаров дистанционным способом.

---

## 11. LOVABLE CAN FIX NOW

| Priority | Problem | Files | Exact Change | Risk of Change | Dependencies |
|---|---|---|---|---|---|
| P0 | F-01 | `supabase/config.toml`, `supabase/functions/storage-manager/index.ts`, `supabase/functions/media-manager/index.ts` | Включить `verify_jwt = true`; в начале обработчика извлекать JWT и проверять `has_role(user.id,'admin')`; при отказе — 403 | Админка перестанет работать, пока компоненты не начнут передавать токен Supabase Auth | Полный переход админки на Supabase Auth |
| P0 | F-02, F-16, F-17 | миграция | Пересоздать политики: `designs` — SELECT/UPDATE только `service_role` либо по владельцу; `wb_clicks` — SELECT только `has_role(...,'admin')`; политику `b2b_clients` переназначить с `public` на `service_role` | Кастомайзер потеряет чтение своего дизайна без серверного посредника | Edge-функция доступа к дизайну |
| P0 | F-04, F-22 | `supabase/functions/update-price/index.ts`, `supabase/config.toml`, миграция, удалить `js/components/adminComponent.js` | Перевести `update-price` на `verify_jwt = true` + `has_role`; удалить таблицу `admins` и функции `is_admin_user`, `set_admin_context`, `set_admin_login_context`; убрать вызовы `set_admin_login_context` из пяти компонентов админки | Полный отказ legacy-контура авторизации | Проверка, что все админ-операции проходят под Supabase Auth |
| P0 | F-05 | миграция (новый бакет `user-uploads`, `public=false`), `js/customizer/storageService.js`, `supabase/functions/generate-design-pdf/index.ts` | Развести каталожные ассеты и пользовательский контент; для пользовательских — `createSignedUrl` с коротким TTL вместо `getPublicUrl` | Существующие публичные ссылки на макеты перестанут открываться | Миграция существующих объектов |
| P1 | F-06, F-07 | `index.html` L34-50, `js/services/cookieConsentService.js` | Вынести Clarity и gtag в функцию, вызываемую только после явного «Принять»; добавить «Отклонить» и «Настроить»; убрать `AUTO_CLOSE_DELAY`; отвязать «Закрыть» от `accept()`; хранить три состояния вместо `'true'`; добавить точку отзыва в футере | Падение объёма аналитики | Решение владельца о судьбе Clarity |
| P1 | F-08, F-09, F-10 | `js/components/orderComponent.js`, `js/components/contactsComponent.js`, новый компонент страницы согласия, `supabase/functions/order-processing/index.ts`, миграция таблицы `consents` | Снять `checked` с `subscribe`; добавить ссылку на Политику и на текст согласия рядом с кнопкой; на сервере при `subscribe=true` требовать и записывать `consent_version`, `policy_version`, метку времени, `form_id`, `source_url` | Часть покупателей не подпишется на рассылку | Утверждённые владельцем тексты |
| P1 | F-11 | `supabase/functions/order-processing/index.ts` L203-206/L297/L325-328, `supabase/functions/contact-notify/index.ts` L36-39 | В Telegram отправлять номер заказа и ссылку в админку; ФИО/телефон/email/адрес и PDF не пушить | Менеджеру придётся открывать админку | Решение владельца об операционном процессе |
| P1 | F-12 | `js/components/privacyPolicyComponent.js` | Переписать §2-§6 под фактический стек; добавить разделы о трансграничной передаче и месте нахождения БД; убрать упоминание Я.Метрики; вставить реквизиты оператора | Юридический текст требует утверждения | Реквизиты и юр. проверка |
| P2 | F-13 | `js/customizer/canvasController.js` L241, `js/customizer/storageService.js` L78-97 | Whitelist MIME и расширений, перекодирование изображения на canvas для снятия EXIF, генерация безопасного имени файла | Часть форматов перестанет приниматься | — |
| P2 | F-14, F-15 | `js/components/orderComponent.js` L554-555, `supabase/functions/order-processing/index.ts` L249, `supabase/functions/order-confirmation/index.ts` L417 | Убрать вывод `orderData`, email и дампа параметров URL | Усложнится отладка | — |
| P2 | F-18 | миграция с `pg_cron` или scheduled edge-функция | Удаление `wb_clicks`, черновиков `designs` со статусом `draft` и закрытых заказов по истечении срока | Безвозвратное удаление | Срок задаёт владелец |
| P2 | F-19 | новый раздел админки | Поиск по email/телефону во всех таблицах, экспорт выписки, каскадное удаление записи + связанных объектов Storage | Риск ошибочного удаления | Регламент владельца |
| P2 | F-20 | все `supabase/functions/*/index.ts` | Заменить `*` на `https://giftboxopt.ru` | Отвалятся сторонние вызовы, если они есть | Список легитимных источников |
| P2 | F-21 | `supabase/functions/order-processing/index.ts`, `contact-notify/index.ts`, формы | Подключить captcha и лимит запросов по IP | Небольшое трение в UX | Выбор провайдера |
| P3 | F-23 | `js/utils/supabase.js`, `public/env.js`, `contact-service.js`, `orderComponent.js`, `productComponent.js`, `src/integrations/supabase/client.ts` | Единая точка конфигурации | Низкий | — |
| P3 | F-24 | `supabase/functions/order-processing/index.ts`, `order-confirmation/index.ts`, миграция | Добавить одноразовый токен подтверждения с TTL | Старые письма перестанут работать | — |
| P3 | F-25 | `index.html` L30-31, `customizer.html` L10 | Перенести FontAwesome и fabric.js в локальную сборку; проверить отсутствие `cdn.gpteng.co` в проде | Рост размера бандла | — |

---

## 12. USER ACTION REQUIRED

| Priority | Action | Why Lovable Cannot Do It | Exact Steps for Owner | Information Needed | Blocking? |
|---|---|---|---|---|---|
| P0 | Определить регион проекта Supabase | Регион виден только в панели управления аккаунта | Supabase Dashboard → выбрать проект `bsndismiessofvhglzrv` → Project Settings → General → поле Region | Точное название региона и его страна | Да — блокирует вывод по локализации |
| P0 | Подтвердить, где физически размещён сайт giftboxopt.ru | Хостинг не описан в репозитории | Панель хостинг-провайдера → раздел с расположением серверов; либо запрос в поддержку провайдера | Название провайдера, страна размещения, наличие ЦОД в РФ | Да |
| P0 | Установить реквизиты оператора ПДн | Нельзя выдумывать | Подготовить: полное наименование ЮЛ или ФИО ИП, ИНН, ОГРН/ОГРНИП, юридический адрес, email и почтовый адрес для обращений субъектов | Все перечисленные реквизиты | Да — блокирует Политику и Согласие |
| P0 | Проверить статус уведомления Роскомнадзора | Из кода факт подачи неустановим | Портал персональных данных РКН → реестр операторов → поиск по ИНН. Если сведений нет либо они устарели — подать/актуализировать уведомление | См. раздел ниже | Да |
| P1 | Раскрыть состав получателей Telegram-уведомлений | chat_id — секрет, участники видны только в мессенджере | Открыть чат, получающий заказы; зафиксировать: приватный или групповой, список участников, есть ли внешние лица | Тип чата и список лиц | Нет |
| P1 | Подтвердить, ведётся ли фактическая рассылка по `orders.subscribe` | В коде обработчика рассылки нет | Проверить, выгружается ли поле в почтовый сервис или CRM вручную | Да/нет и канал | Нет |
| P1 | Договоры/поручения на обработку с фактически обнаруженными сервисами | Юридические документы | Оформить или подтвердить наличие поручений с: Supabase, Resend, Microsoft (Clarity), Google (Analytics/Apps Script/Sheets), хостинг-провайдером | Реквизиты договоров | Нет |
| P1 | Решить судьбу Microsoft Clarity | Отключение аналитики — бизнес-решение | Оценить, нужен ли session replay; при сохранении — включить masking и гейт по согласию | Решение | Нет |
| P2 | Установить сроки хранения | Закон не задаёт универсального срока | Определить срок для: заказов, заявок обратной связи, макетов кастомайзера, кликов WB, B2B-карточек | Срок по каждой категории | Нет |
| P2 | Назначить ответственного за организацию обработки ПДн | Организационное действие | Издать приказ о назначении | ФИО и должность | Нет |
| P2 | Внутренние локальные акты | OWNER / ORGANIZATIONAL ACTION REQUIRED | Разработать: политику обработки ПДн как ЛНА, перечень обрабатываемых ПДн, регламент доступа, порядок уничтожения, порядок работы с обращениями, порядок реагирования на инциденты | Комплект документов | Нет |
| P2 | Регламент реагирования на инциденты | Организационная процедура | Определить порядок уведомления РКН в установленные сроки, ответственных, каналы связи | Регламент | Нет |

Сведения, которые понадобятся для уведомления Роскомнадзора (собрать заранее):

- оператор: наименование, ИНН, ОГРН, адрес;
- цели: оформление и исполнение договора купли-продажи, обратная связь, изготовление индивидуальных макетов, рекламная рассылка при наличии согласия, веб-аналитика;
- категории субъектов: покупатели-физлица, представители юрлиц, посетители сайта;
- категории ПДн: ФИО, телефон, email, адрес доставки, содержание обращений, изображения и макеты, загруженные пользователем, сетевые идентификаторы;
- действия: сбор, запись, систематизация, накопление, хранение, уточнение, извлечение, использование, передача, удаление, уничтожение;
- правовые основания: договор, согласие для рассылки и аналитики;
- дата начала обработки;
- меры защиты: перечислить фактически внедрённые после устранения P0;
- место нахождения базы данных: заполняется по результатам проверки региона Supabase;
- лицо, ответственное за организацию обработки;
- трансграничная передача: перечень стран по фактическим получателям.

---

## 13. INFRASTRUCTURE VERIFICATION REQUIRED

| Question | Why It Matters | Can Be Determined from Code? | Where I Should Check | Result Needed |
|---|---|---|---|---|
| Регион проекта Supabase | Ключевой факт для ч.5 ст.18 | Нет | Supabase Dashboard → Project Settings → General → Region | Название региона и страна |
| Регион Supabase Storage | Где лежат пользовательские файлы | Нет | Там же; Storage наследует регион проекта | Подтверждение |
| Страна размещения хостинга giftboxopt.ru | Access-логи содержат IP | Нет | Панель хостинг-провайдера | Провайдер и страна |
| Регион почтовой инфраструктуры Resend | Трансграничная передача email | Нет | Dashboard Resend → настройки аккаунта | Регион |
| Расположение Google-аккаунта со Sheets | Трансграничная передача заказов | Нет | Google Workspace/Drive → сведения об аккаунте | Регион данных |
| Настройки Microsoft Clarity: masking, retention | Может ли запись содержать значения полей | Нет — в теге параметров нет | Clarity Dashboard → Settings → Masking / Data retention | Текущие значения |
| Тип потока `G-1HVF***` | GA4 или Google Ads, какие cookie и срок | Нет | Google Analytics/Ads → Admin → Data Streams | Тип и настройки |
| Настройки бэкапов Supabase | Копии ПДн и их география | Нет | Supabase Dashboard → Database → Backups | Частота, срок, регион |
| Присутствует ли `cdn.gpteng.co` в прод-сборке | Сторонний скрипт на проде | Частично — есть в `index.html` L31 | Открыть исходный код опубликованной страницы | Да/нет |
| Наличие CDN перед сайтом | Дополнительные копии и логи | Нет | DNS-записи домена, панель провайдера | Есть/нет, провайдер |
| Реальные получатели `ADMIN_EMAIL` | Круг лиц с доступом к ПДн | Нет — значение секрета | Supabase → Edge Functions → Secrets | Список адресов |

---

## 14. LEGAL REVIEW REQUIRED

1. Квалификация правового основания для формы обратной связи (`contactsComponent.js` L74-76): предконтрактное обращение по инициативе пользователя либо обработка на основании согласия. От этого зависит, нужен ли чекбокс.
2. Допустимость передачи ФИО, телефона, email и адреса покупателя в Telegram как в средство коммуникации, и квалификация Telegram — обработчик или канал связи.
3. Достаточность договорного основания для передачи заказов в Google Sheets и Resend, необходимость оформления поручений и уведомления о трансграничной передаче по ст.12.
4. Требуется ли отдельное согласие на веб-аналитику и session replay в текущей практике правоприменения, и в каком объёме.
5. Возможность признания требований локализации выполненными при любой конфигурации, где Supabase остаётся постоянным местом хранения записей о гражданах РФ. Схема «первичная запись в РФ + постоянная копия в Supabase» **не должна презюмироваться комплаентной** без явного юридического подтверждения.
6. Срок хранения макетов кастомайзера после завершения заказа.

---

## 15. REQUIRES OWNER APPROVAL

- F-03: любое изменение места хранения ПДн — смена или дополнение базы данных.
- F-05: перенос пользовательских файлов в приватный бакет — существующие публичные ссылки на макеты перестанут работать.
- F-04: отключение legacy-контура авторизации — изменение работы админки.
- F-06: отключение или гейтирование Microsoft Clarity и gtag — потеря части аналитики.
- F-11: изменение содержимого Telegram-уведомлений — изменение операционного процесса менеджера.
- F-18: включение автоматического удаления данных по сроку.
- Отказ от Google Sheets как канала учёта заказов.

---

## 16. Recommended Remediation Order

**P0 — сначала (можно начинать без юридических документов):**
1. F-01 — закрыть `storage-manager` и `media-manager` авторизацией.
2. F-02 — исправить RLS на `designs`.
3. F-04 — вывести из эксплуатации plaintext-контур авторизации.
4. F-05 — приватный бакет и signed URL для пользовательского контента.
5. F-03 — запросить регион Supabase и хостинга (действие владельца, параллельно).

**P1 — затем:**
6. F-06, F-07 — гейт аналитики и переработка баннера.
7. F-08, F-09, F-10 — отделение маркетингового согласия, фиксация доказательств, отдельный документ согласия.
8. F-11 — минимизация Telegram-уведомлений.
9. F-12 — актуализация Политики после получения реквизитов.

**P2:**
10. F-13, F-14, F-15, F-16, F-17, F-18, F-19, F-20, F-21.

**P3:**
11. F-22, F-23, F-24, F-25.

---

## 17. Files That Would Need Changes

Frontend:
- `index.html`
- `customizer.html`
- `js/services/cookieConsentService.js`
- `js/components/orderComponent.js`
- `js/components/contactsComponent.js`
- `js/components/privacyPolicyComponent.js`
- `js/components/termsOfUseComponent.js`
- `js/components/productComponent.js`
- `js/components/adminProductsComponent.js`
- `js/components/adminOrdersComponent.js`
- `js/components/modernAdminComponent.js`
- `js/components/modernAdminComponent_media.js`
- `js/components/adminLayoutComponent.js`
- `js/customizer/canvasController.js`
- `js/customizer/storageService.js`
- `js/customizer/designService.js`
- `js/utils/supabase.js`
- `js/services/contact-service.js`
- `js/router.js`
- `public/env.js`
- `src/integrations/supabase/client.ts`
- Новые: страница «Согласие на обработку персональных данных», страница «Согласие на рекламные рассылки», cookie-нотис, раздел админки для обращений субъектов
- Удалить: `js/components/adminComponent.js`

Backend:
- `supabase/config.toml`
- `supabase/functions/storage-manager/index.ts`
- `supabase/functions/media-manager/index.ts`
- `supabase/functions/update-price/index.ts`
- `supabase/functions/order-processing/index.ts`
- `supabase/functions/contact-notify/index.ts`
- `supabase/functions/admin-notify/index.ts`
- `supabase/functions/order-confirmation/index.ts`
- `supabase/functions/generate-design-pdf/index.ts`

Объекты БД:
- Политики RLS: `public.designs`, `public.wb_clicks`, `public.b2b_clients`
- Таблица `public.admins` — вывод из эксплуатации
- Функции `public.is_admin_user`, `public.set_admin_context`, `public.set_admin_login_context` — удаление
- Новая таблица `public.consents`
- Новый бакет `user-uploads` с `public = false`
- Retention-джобы

---

## 18. Compliance Score

Техническая оценка готовности, не юридическое заключение.

| Направление | Оценка |
|---|---|
| Technical compliance readiness | 22 / 100 |
| Consent / Form compliance | 15 / 100 |
| Data localization confidence | 5 / 100 |
| Privacy documentation | 25 / 100 |
| Security controls | 20 / 100 |
| Operator / organizational readiness | 5 / 100 |
| **Overall readiness** | **17 / 100** |

---

## 19. Final Answer

**Есть ли сейчас очевидные технические нарушения / риски по 152-ФЗ?**
Да. Пять проблем уровня P0 подтверждены прямыми доказательствами из кода и метаданных БД.

**Какое самое серьёзное обнаруженное нарушение?**
Два равнозначных. Технически — неавторизованный доступ к привилегированным edge-функциям `storage-manager` и `media-manager` в связке с анонимным чтением и изменением таблицы `designs`, что открывает пользовательский контент. Юридически — отсутствие доказательств выполнения требований локализации ПДн граждан РФ.

**Что Lovable может исправить без вашего участия?**
Авторизацию edge-функций, политики RLS, вывод plaintext-контура авторизации, приватный бакет с signed URL, гейт аналитики и переработку cookie-баннера, снятие предустановленного чекбокса рассылки, фиксацию доказательств согласия, минимизацию Telegram-уведомлений, очистку логов, CORS, валидацию загрузок, retention-джобы, раздел админки для обращений субъектов, удаление мёртвого legacy-кода.

**Что невозможно исправить через Lovable и должны сделать вы?**
Подтвердить регион Supabase и хостинга, предоставить реквизиты оператора и контакт для обращений, проверить и при необходимости актуализировать уведомление Роскомнадзора, оформить поручения на обработку с фактически используемыми сервисами, определить сроки хранения, назначить ответственного, издать внутренние локальные акты и регламент реагирования на инциденты, утвердить юридические тексты Политики и Согласия.

**Есть ли основания считать текущую архитектуру хранения ПДн граждан РФ соответствующей требованиям локализации?**
Нет. Оснований для такого вывода в репозитории не обнаружено. Первичная запись, накопление, хранение, изменение и извлечение выполняются в Supabase, регион которого из проекта недоказуем, а часть данных дополнительно оседает в Google Sheets, Telegram и почтовых ящиках. Статус: **CRITICAL — LOCATION NOT VERIFIED**.

---

Код не изменялся. Миграции не выполнялись. Реальные записи клиентов не отображались — использовались только счётчики строк и проверки статусов HTTP. Секреты, токены, ключи и значения `.env` в отчёте не приводятся.
