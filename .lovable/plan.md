# Аудит Supabase + переносимый архив для Timeweb

Read-only аудит. Ничего в Supabase не меняется: только SELECT, чтение метаданных, скачивание публичных файлов Storage и генерация локальных файлов архива.

## Что уже проверено (факты, не предположения)

- Прямого подключения к базе из песочницы нет: `PGHOST` не задан, `psql`/`pg_dump` не могут соединиться. Значит **`pg_dump` из PRD (пункты 30–31) выполнить нельзя** — доступ к БД идёт только через read-only SQL-канал.
- Read-only SQL-канал работает под пользователем `supabase_read_only_user` и видит системные каталоги: 37 RLS-политик, 7 extensions, 2 пользователя в `auth.users`, 393 объекта в `storage.objects`.
- Storage: один bucket `product-media`, публичный, 393 объекта, суммарно 63 МБ.

## Как обходим отсутствие pg_dump

Вместо `pg_dump` архив собирается **генерацией SQL из системных каталогов** через read-only запросы:

- `schema.sql` — таблицы, колонки, дефолты, PK/FK/unique/check, sequences, ENUM и прочие типы, собранные из `information_schema` и `pg_catalog`.
- `functions.sql`, `triggers.sql`, `policies.sql`, `views.sql`, `indexes.sql` — через `pg_get_functiondef`, `pg_get_triggerdef`, `pg_policies`, `pg_get_viewdef`, `pg_indexes`.
- `data.sql` — постраничная выгрузка строк в `INSERT`-ы (порциями, с ORDER BY по ключу), плюс CSV-копии.
- `full_backup.dump` в формате custom **не создаётся** — вместо него в архиве будет `RESTORE.md` с точной последовательностью применения текстовых дампов и пометкой, что бинарный дамп нужно снять из Supabase Dashboard (Database → Backups) или через `pg_dump` с прямым `DATABASE_URL`, когда он будет у владельца проекта.

## Структура результата

Каталог `supabase-archive/` по структуре из PRD: `manifests/` (CSV-инвентари), `database/` (сгенерированные SQL), `storage/` (manifest + скачанные файлы), `supabase/` (копии edge functions, migrations, config, metadata), `reports/` (аналитика), плюс `README.md`, `AUDIT_SUMMARY.md`, `MIGRATION_TO_TIMEWEB.md` и второй, урезанный `timeweb-portable/`.

## Этапы

1. **Инвентарь схемы.** Схемы с классификацией (application / supabase-internal / optional), таблицы с числом строк и размером, колонки, PK/FK/unique/check, indexes, sequences, views, типы и ENUM, extensions. Всё в `manifests/*.csv`.
2. **Логика БД.** Функции (исходники, `SECURITY DEFINER`, поиск `auth.uid()`, `auth.jwt()`, `storage.*`, `net.*`, `http.*`) и триггеры, с классификацией `PORTABLE_POSTGRES` / `REQUIRES_MODIFICATION` / `SUPABASE_ONLY` / `UNUSED`.
3. **Доступ.** RLS enabled/forced по таблицам, все policies с `USING`/`WITH CHECK`, grants по ролям `anon`/`authenticated`/`service_role`/`public`. Отдельно помечаются критичные комбинации «анонимный доступ + персональные данные».
4. **PII-классификация.** По каждому полю: `PII` / `NON_PII` / `TECHNICAL` / `REVIEW`. Отдельные списки для имён, телефонов, email, адресов, IP, User-Agent, свободных текстовых полей и содержимого `cart_items`/`options`.
5. **Storage.** Manifest всех 393 объектов (bucket, path, mime, size, даты, метаданные), политики на `storage.objects`, физическая выгрузка файлов (63 МБ) в `storage/buckets/product-media/...` с сохранением структуры, затем сверка «скачано == manifest».
6. **Supabase-специфика.** Auth (пользователи, провайдеры, текущая admin-архитектура, зависимости от `auth.users`), Realtime (publication + поиск `.channel(`/`postgres_changes` по коду), Edge Functions (список, зависимости, классификация), webhooks/`pg_net`, `pg_cron`, список имён секретов **без значений**.
7. **Аудит репозитория.** Поиск `supabase`, `createClient`, `.from(`, `.rpc(`, `.storage`, `.functions`, `.channel(`, `SUPABASE_` с картой «файл → текущая зависимость → замена на Timeweb».
8. **Отчёты.** `data_flow.md` (включая отдельный PII-flow), `supabase_dependencies.md`, `timeweb_compatibility.md` (матрица фич), `migration_risks.md`, и решение `KEEP / MIGRATE / MOVE TO BACKEND / MOVE TO OBJECT STORAGE / REMOVE / NEEDS REVIEW` по каждому компоненту.
9. **Второй архив `timeweb-portable/`** — только `schema.sql`, `application_data.sql`, `functions.sql`, `triggers.sql`, `indexes.sql`, `types.sql`, `README.md`; без `auth`, `realtime`, `vault` и внутренних объектов Supabase.
10. **Проверка восстановления.** В песочнице поднимается чистый PostgreSQL, применяется `timeweb-portable`, сверяются количество таблиц, строк, FK, indexes, функции, триггеры, ENUM и views. Результат — `reports/restore_verification.md`. Если чистый PostgreSQL в песочнице поднять не удастся, это фиксируется явно как невыполненный пункт с готовым скриптом для локального запуска.
11. **Git-гигиена.** `.gitignore` в архиве исключает `*.dump`, `data.sql`, `storage/buckets/`, `exports/`, `pii/`, `.env*`; сырые персональные данные в репозиторий не попадают, для них отдельный decision-report.

## Технические детали

- Источник метаданных — read-only SQL (`information_schema`, `pg_catalog`, `pg_policies`, `storage.*`, `auth.users` только в агрегированном виде).
- Данные выгружаются постранично, чтобы не упереться в лимит строк ответа; для больших таблиц пишется CSV, а `INSERT`-ы генерируются из него.
- Файлы Storage скачиваются по публичным URL bucket `product-media`.
- Проект (код, edge functions, `supabase/config.toml`, migrations) копируется в архив как есть.
- Ни одна миграция, RLS-политика, функция, bucket, запись или секрет не изменяется.

## Открытый вопрос по объёму

63 МБ файлов Storage + дамп данных заметно утяжелят репозиторий. По умолчанию план кладёт скачанный Storage и `data.sql` в `/mnt/documents/supabase-archive/` (скачиваемые артефакты, вне Git), а в репозиторий коммитит только безопасную часть: `schema.sql`, `functions.sql`, `triggers.sql`, `policies.sql`, `views.sql`, `indexes.sql`, CSV-манифесты без PII и все отчёты. Если нужно иначе — скажите, и я поменяю размещение.
