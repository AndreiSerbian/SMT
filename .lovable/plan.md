# Замер объёма данных перед миграцией — запросы и правило принятия решения

Только диагностика. Код не изменяется, реализация не предлагается.

Важное уточнение по связи макетов и заказов, установленное из кода: **отдельной колонки-связи между `designs` и `orders` не существует**. Связь есть только внутри `orders.cart_items` — элементы корзины могут содержать поле `design_id` (`js/components/orderComponent.js` L502, `supabase/functions/order-processing/index.ts` L40, L398, L429). Поэтому запросы ниже используют разбор jsonb.

Также: факт загрузки клиентом собственных файлов **в таблице `designs` не хранится**. Файлы уходят в Storage по пути `designs/<uuid>/assets/**` (`js/customizer/storageService.js` L81), а в БД пишутся только `preview_urls`, `objects_mm` и `production_pdf_url`. Точный ответ про клиентские файлы даёт только запрос к `storage.objects` (раздел 4).

---

## 1. Общие количества строк

Все запросы выполняются в Supabase Dashboard → SQL Editor.

```sql
select 'orders'            as table_name, count(*) from public.orders
union all select 'contact_requests', count(*) from public.contact_requests
union all select 'b2b_clients',      count(*) from public.b2b_clients
union all select 'designs',          count(*) from public.designs
union all select 'wb_clicks',        count(*) from public.wb_clicks
union all select 'products',         count(*) from public.products
union all select 'product_prices',   count(*) from public.product_prices
union all select 'categories',       count(*) from public.categories
union all select 'colors',           count(*) from public.colors
order by 1;
```

Дополнительно — быстрый обзор всей схемы, включая объекты, которых нет в списке выше (в частности `client_analytics`, назначение которого из репозитория не выводится):

```sql
select table_name, table_type
from information_schema.tables
where table_schema = 'public'
order by table_type, table_name;
```

Если `client_analytics` окажется представлением:

```sql
select pg_get_viewdef('public.client_analytics', true);
```

---

## 2. Заказы

Сводка одним запросом:

```sql
select
  count(*)                     as total_orders,
  min(created_at)              as earliest_order,
  max(created_at)              as latest_order,
  count(*) filter (where confirmed_at is not null) as confirmed_orders,
  count(distinct email)        as distinct_emails,
  count(distinct phone)        as distinct_phones,
  count(*) filter (where client_id is not null)    as linked_to_client,
  sum(total)                   as sum_total
from public.orders;
```

Разбивка по статусам:

```sql
select
  coalesce(order_status, '(null)') as order_status,
  count(*)                         as orders,
  min(created_at)                  as first_seen,
  max(created_at)                  as last_seen,
  sum(total)                       as sum_total
from public.orders
group by 1
order by orders desc;
```

Распределение по месяцам — показывает, живой ли поток заказов и насколько критично окно переключения:

```sql
select date_trunc('month', created_at)::date as month, count(*) as orders
from public.orders
group by 1
order by 1;
```

Состав ключей в `cart_items` — нужен, чтобы понять, во что разворачивать позиции заказа:

```sql
select key, count(*) as occurrences
from public.orders o,
     lateral jsonb_array_elements(o.cart_items) item,
     lateral jsonb_object_keys(item) key
group by key
order by occurrences desc;
```

Общее число позиций во всех заказах:

```sql
select
  count(*)                                   as total_line_items,
  round(avg(items_per_order), 2)             as avg_items_per_order
from (
  select jsonb_array_length(cart_items) as items_per_order
  from public.orders
  where jsonb_typeof(cart_items) = 'array'
) t, lateral generate_series(1, greatest(items_per_order, 1));
```

Если предыдущий запрос покажется избыточным, достаточно простого варианта:

```sql
select sum(jsonb_array_length(cart_items)) as total_line_items
from public.orders
where jsonb_typeof(cart_items) = 'array';
```

---

## 3. Макеты (designs)

Сводка:

```sql
select
  count(*)                                                        as total_designs,
  count(*) filter (where production_pdf_url is not null)          as with_production_pdf,
  count(*) filter (where status = 'saved')                        as status_saved,
  count(*) filter (where status is distinct from 'saved')         as status_other,
  count(*) filter (where preview_urls <> '{}'::jsonb)             as with_previews,
  count(distinct product_id)                                      as distinct_products,
  min(created_at)                                                 as earliest,
  max(created_at)                                                 as latest
from public.designs;
```

Макеты, реально попавшие в заказы (связь через `cart_items[].design_id`):

```sql
with order_design_ids as (
  select distinct (item ->> 'design_id')::uuid as design_id
  from public.orders o,
       lateral jsonb_array_elements(o.cart_items) item
  where item ? 'design_id'
    and item ->> 'design_id' is not null
)
select
  (select count(*) from order_design_ids)                              as designs_referenced_by_orders,
  (select count(*) from public.designs d
     join order_design_ids od on od.design_id = d.id)                  as matched_in_designs_table,
  (select count(*) from public.designs d
     where not exists (select 1 from order_design_ids od where od.design_id = d.id))
                                                                       as orphan_designs;
```

Если предыдущий запрос упадёт из-за нечислового значения в `design_id`, используйте безопасный вариант:

```sql
select count(distinct item ->> 'design_id') as design_ids_in_orders
from public.orders o,
     lateral jsonb_array_elements(o.cart_items) item
where item ? 'design_id';
```

Макеты с загруженными клиентом файлами — **из таблицы не определяются**, только через Storage:

```sql
select count(distinct split_part(name, '/', 2)) as designs_with_uploaded_files
from storage.objects
where bucket_id = 'product-media'
  and name like 'designs/%/assets/%';
```

---

## 4. Storage

Все файлы под `designs/**`:

```sql
select
  count(*)                                                          as total_files,
  pg_size_pretty(sum((metadata ->> 'size')::bigint))                as total_size,
  sum((metadata ->> 'size')::bigint)                                as total_bytes,
  count(distinct split_part(name, '/', 2))                          as distinct_design_folders
from storage.objects
where bucket_id = 'product-media'
  and name like 'designs/%';
```

Разбивка по типу содержимого (previews / scene / assets / production):

```sql
select
  split_part(name, '/', 3)                             as subfolder,
  count(*)                                             as files,
  pg_size_pretty(sum((metadata ->> 'size')::bigint))   as size
from storage.objects
where bucket_id = 'product-media'
  and name like 'designs/%'
group by 1
order by files desc;
```

Список папок верхнего уровня (UUID макетов) с объёмом:

```sql
select
  split_part(name, '/', 2)                             as design_uuid,
  count(*)                                             as files,
  pg_size_pretty(sum((metadata ->> 'size')::bigint))   as size,
  min(created_at)                                      as first_upload,
  max(created_at)                                      as last_upload
from storage.objects
where bucket_id = 'product-media'
  and name like 'designs/%'
group by 1
order by max(created_at) desc;
```

Для сравнения — объём каталожных изображений, которые уже мигрированы на TimeWeb и переносить их повторно не нужно:

```sql
select
  case
    when name like 'designs/%' then 'designs (клиентские)'
    when name like 'images/%'  then 'images (каталог)'
    when name like 'videos/%'  then 'videos'
    else 'прочее'
  end                                                  as area,
  count(*)                                             as files,
  pg_size_pretty(sum((metadata ->> 'size')::bigint))   as size
from storage.objects
where bucket_id = 'product-media'
group by 1
order by files desc;
```

Папки макетов, у которых больше нет записи в таблице `designs` (кандидаты на невынос):

```sql
select distinct split_part(o.name, '/', 2) as orphan_folder
from storage.objects o
where o.bucket_id = 'product-media'
  and o.name like 'designs/%'
  and not exists (
    select 1 from public.designs d
    where d.id::text = split_part(o.name, '/', 2)
  );
```

---

## 5. Администраторы

```sql
select
  (select count(*) from public.user_roles where role = 'admin') as admin_roles,
  (select count(*) from public.user_roles)                      as all_roles,
  (select count(*) from public.admins)                          as legacy_admins_table;
```

Кто именно (email из `auth.users` доступен только в SQL Editor, не через клиентский API):

```sql
select u.id, u.email, u.created_at, u.last_sign_in_at, r.role
from auth.users u
left join public.user_roles r on r.user_id = u.id
order by u.created_at;
```

Legacy-контур — сколько записей в отдельной таблице с паролями:

```sql
select id, login, created_at from public.admins order by created_at;
```

Пароли не выводите и не пересылайте — нужен только перечень логинов и их количество.

---

## 6. Правило принятия решения

Оценивайте по результатам замеров. Достаточно, чтобы условие выполнялось для большинства пунктов — решающими являются заказы, макеты и объём Storage.

### A. Ручная миграция / CSV — предпочтительна, когда

- `orders` ≤ ~200 строк и `contact_requests` ≤ ~200;
- `designs` ≤ ~50, из них с производственными PDF — единицы;
- суммарный объём `designs/**` ≤ ~200 МБ и число UUID-папок ≤ ~50;
- `cart_items` имеет стабильный набор ключей и не более 3–5 позиций в заказе;
- поток новых заказов редкий — единицы в неделю, окно переключения можно выбрать спокойно;
- админов 1–2.

Как это выглядит на практике: выгрузка каждой таблицы в CSV через Table Editor, разворачивание `cart_items` вручную или полуручным разбором, скачивание папки `designs/` архивом, единоразовая загрузка в новую БД. Проверка результата — глазами, по контрольным суммам числа заказов и итоговых сумм.

### B. Один разовый скрипт миграции — предпочтителен, когда

- `orders` в диапазоне ~200–3000, либо суммарное число позиций в заказах превышает ~1000;
- `designs` от ~50 до ~500, либо `designs/**` от ~200 МБ до ~5 ГБ;
- `cart_items` содержит разнородные ключи, встречаются позиции с `design_id`, `production_pdf_url`, `preview_urls` — то есть разбор в `order_items` нельзя сделать глазами без ошибок;
- есть заметное число «сирот»: макеты без заказов, папки Storage без записей в `designs`;
- поток заказов есть, но переключение можно сделать в короткое окно.

Скрипт при этом остаётся одноразовым: читает дамп, трансформирует, пишет в целевую БД, печатает отчёт сверки. Повторный прогон допускается только на очищенную базу.

### C. Полноценный автоматизированный пайплайн — оправдан только когда

- `orders` > ~3000 либо поток новых заказов такой, что окно простоя недопустимо;
- `designs/**` > ~5 ГБ, перенос файлов заведомо не укладывается в одно окно;
- требуется период двойной записи и последующая инкрементальная досинхронизация;
- нужна повторяемость: несколько прогонов на тестовой базе, идемпотентность, возобновление после сбоя, детальный отчёт расхождений по каждой таблице;
- миграция разбивается на несколько дней и в это время в старой системе продолжают появляться новые записи.

### Как читать результат

- Если по разделам 1–4 всё попадает в диапазон **A** — автоматизация не оправдана, и сложный пайплайн будет стоить дороже, чем сама миграция.
- Если хотя бы **заказы или Storage** попадают в диапазон **B**, а остальное в **A** — правильный выбор всё равно **B**: разбор `cart_items` руками не делается надёжно.
- **C** выбирается только при выполнении условий по объёму **и** по недопустимости окна простоя одновременно. Один только большой объём файлов решается предварительным переносом Storage заранее, без инкрементального пайплайна.

---

## 7. Что прислать по итогам

Достаточно результата семи запросов: сводка по строкам (раздел 1), сводка и разбивка по статусам заказов (раздел 2), состав ключей `cart_items`, сводка по `designs`, связь макетов с заказами, сводка по Storage с разбивкой по областям, число администраторов. По этим цифрам определяется A, B или C, и только после этого имеет смысл проектировать миграцию.
