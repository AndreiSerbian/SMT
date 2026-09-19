# Аудит commerce-flow и план интеграции конфигуратора коробок

Отчёт основан на чтении реального кода. Реализация не начиналась.

---

## A. Текущий путь товара

1. Карточка товара — `js/components/productComponent.js` (строки 471–485): кнопка предпросмотра появляется, если `mockupService.getModelForProduct(product)` нашёл модель по `product.category_slug`.
2. Конфигуратор — `js/components/mockupPreviewModal.js`. Метод `_openPhoto` держит выбор цвета в локальной переменной `state[zone]`, зоны берутся из `mockups.json` (`main`, `side`, `bow` / `handles`). **Кнопки «в корзину» в модалке нет вообще** — в шапке файла прямо написано: «Только предпросмотр. Никаких записей в Supabase / корзину / заказ». При закрытии модалки выбор цветов теряется полностью.
3. Корзина — `js/services/cartService.js`. Элемент: `{ id, quantity }`, поиск строго `cart.find(item => item.id === productId)`.
4. Оформление — `js/components/orderComponent.js` (`render` + `submitOrder`).
5. Сервер — `supabase/functions/order-processing/index.ts`: сопоставление B2B-клиента, вставка в `orders`, письмо клиенту со ссылкой-подтверждением, Telegram/Email менеджеру, Google Sheets.
6. Подтверждение — `supabase/functions/order-confirmation/index.ts` (переход по ссылке из письма).

Отдельно существует **второй, несвязанный конфигуратор** — печать на сторонах коробки (`js/customizer/*`, `customizer.html`, таблица `designs`). Он уже умеет класть в корзину поля `design_id`, `preview_urls`, `production_pdf_url`, `customized_sides`, `options`. Это другой продукт-флоу; mask-конфигуратор с ним не связан, но формат cart item нужно расширять совместимо.

## B. Текущая схема cart item

localStorage ключ `cart`:
```
{ id, quantity }                                  // обычный товар
{ id, quantity, design_id, preview_urls,          // печать (js/customizer)
  production_pdf_url, customized_sides, options }
```
`id` — это `product.id` для обычного пути и `product.artikul` для customizer (несогласованность, отдельный риск).

## C. Текущий pricing

- Базовая цена — `products.price_rub` + переопределение из `product_prices` (`js/services/pricesService.js`).
- Сумма корзины — `cartService.getCartTotal()`: `price * quantity`, без надбавок.
- Скидка — **захардкожена дважды** в `orderComponent.js` (строки 50–62 и 514–526): 20000→2%, 30000→3%, 40000→4%, 50000→5%. Единого discount-движка нет.
- Минимальная сумма заказа — `env.minOrderAmount` (по умолчанию 10000).
- Конфигуратор уже показывает «+10%» (`mockupService.estimatePrice`, `price_modifier_percent` из `mockups.json`), но эта цифра **никуда не передаётся** — чистый UI-текст.

## D. Текущий order payload

```
{ name, phone, email, yandex_address, comment, payment, delivery,
  cart_items: [{ id, quantity, name, artikul, color, price, ...design-поля }],
  subtotal, discount, total, subscribe }
```
`price` в позиции — базовая цена товара на момент оформления. Ни надбавки, ни скидки на позицию, ни итога по позиции сейчас нет.

## E. Хранение

Таблица `orders`, колонка `cart_items` типа `jsonb` — payload сохраняется целиком, как пришёл. Новые колонки под цвета не нужны.

## F. Уведомления

Всё внутри `order-processing`:
- Telegram менеджеру (строки 606–632) — строка на позицию: имя, цвет, артикул, кол-во, сумма, «🎨» если есть `design_id`.
- Email менеджеру — `generateAdminNewOrderHtml` / `...Text` (строки 279–339).
- Email клиенту — `generateOrderConfirmationEmail` (строка 35), содержит ссылку «подтвердить заказ».
- Google Sheets — `updateGoogleSheets`, кладёт `JSON.stringify(cart_items)`.

## G. Проверка ваших требований против кода

- **Цвета.** Таблица `colors`: `id`, `name`, `russian_name`, `hex_code`. Поля `name_en` нет — английское название сейчас это `name`. Важно: конфигуратор использует `id = hex_code.toLowerCase()`, а не uuid (`mockupService.getPalette`). Предложение: хранить в конфигурации `colorId` = **uuid из `colors.id`**, плюс снапшот `hex`, `nameRu` (`russian_name`), `nameEn` (`name`).
- **Определение платной кастомизации.** Ваше правило (MAIN/SIDE → +10% один раз; только BOW/HANDLES → 0%) в коде сейчас отсутствует — модалка применяет +10% ко всему безусловно и только в тексте. Правило нужно вводить с нуля, по бизнес-конфигурации (сравнение выбранного цвета зоны с базовым цветом товара), не по наличию маски. Это соответствует вашему PRD.
- **Идентичность строки корзины.** Сейчас merge строго по `id`, смешанная корзина невозможна — это подтверждённый блокер.
- **Backend-валидация.** `order-processing` **не пересчитывает** ни `subtotal`, ни `discount`, ни `total` — вставляет то, что прислал браузер. Это существующая уязвимость, и её нужно закрывать в этой же задаче.
- **Сообщение клиенту.** Письмо клиенту сейчас — не «заказ подтверждён», а «подтвердите заказ по ссылке»; окончательное подтверждение — действие клиента, не менеджера, цена в нём не пересогласовывается. Формулировку про «менеджер свяжется для подтверждения деталей и итоговой стоимости» добавим, автоподтверждения цены в системе нет.

## H. Предлагаемый контракт данных (минимальное расширение)

Cart item и позиция в `cart_items` — одна и та же форма.

Обычный товар — без изменений:
```
{ id, quantity }
```

Кастомизированный товар — добавляются два поля:
```
{
  id, quantity,
  lineKey: "<id>|<mainId>|<sideId>|<accentType>|<accentId>",
  customization: {
    mockupType: "ribbon_box" | "bag_box" | "magnetic_box",
    main:   { colorId, hex, nameRu, nameEn, changed: bool },
    side:   { colorId, hex, nameRu, nameEn, changed: bool },
    accent: { type: "bow" | "handles" | null, colorId, hex, nameRu, nameEn, changed: bool } | null,
    paidBoxCustomization: bool,   // main.changed || side.changed
    surchargePct: 0 | 10
  }
}
```
`lineKey` — единственный ключ merge/удаления/изменения количества. Для обычного товара `lineKey = id`. Растровые данные не сохраняются.

В `cart_items` при оформлении к позиции добавляется pricing-снапшот:
```
pricing: { baseUnitPrice, surchargePct, unitPriceBeforeDiscount,
           cartDiscountPct, finalUnitPrice, quantity, lineTotal }
```
`customizationAmount` и `unitDiscountAmount` — производные, не храним.

## I. Формула цены

```
unitPriceBeforeDiscount = round(baseUnitPrice * (1 + surchargePct/100))
subtotal                = Σ unitPriceBeforeDiscount * quantity
cartDiscountPct         = текущая лестница 20/30/40/50k → 2/3/4/5%
discount                = floor(subtotal * pct / 100)
total                   = subtotal - discount
```
Примеры (база 1000 ₽): обычный → 1000; только бант → 1000; SIDE → 1100; MAIN+SIDE+BOW → 1100 (не 1200). Кастомные позиции входят в общий subtotal и получают ту же скидку.

## J. Что будет изменено

| Файл | Изменение |
|---|---|
| `js/services/pricingService.js` *(новый)* | единый расчёт: лестница скидок, надбавка, итоги. Источник правды для фронта |
| `js/services/cartService.js` | `lineKey` вместо `id` в add/update/remove; расчёт через pricingService; отображение конфигурации в строке корзины |
| `js/components/mockupPreviewModal.js` | кнопка «Добавить в корзину», сбор конфигурации, расчёт `changed` от базового цвета товара |
| `js/services/mockupService.js` | палитра отдаёт `colorId` (uuid) + `nameRu`/`nameEn` вместе с hex |
| `js/components/orderComponent.js` | убрать дублирующую лестницу скидок, вывод конфигурации в таблице и карточках, pricing-снапшот в payload |
| `js/main.js` | глобальные хелперы корзины принимают `lineKey` |
| `supabase/functions/order-processing/index.ts` | **авторитетный пересчёт** цен по `product_prices`/`products` и правилу +10%, расхождение с клиентом логируется и переопределяется; конфигурация в Telegram и email менеджеру; текст письма клиенту «заказ принят, менеджер свяжется» |
| `supabase/functions/order-confirmation/index.ts` | согласовать формулировки |

Миграции БД **не требуются** — `cart_items` уже `jsonb`.

## K. Риски и краевые случаи

- Несогласованность `id` vs `artikul` между обычным путём и `js/customizer` — при вводе `lineKey` это нужно выровнять, иначе позиции печати перестанут находиться.
- Старые корзины в localStorage без `lineKey` — нужна мягкая миграция при чтении.
- Старые заказы без `pricing` — уведомления и админка должны переживать отсутствие поля.
- `colors.id` (uuid) против текущего hex-как-id в конфигураторе — если цвет удалят/переименуют, снапшот имени спасает.
- Серверный пересчёт может разойтись с ценой, показанной клиенту (цена изменилась между добавлением и оформлением) — нужно решить: считать авторитетной серверную и показать предупреждение.
- Round vs floor при надбавке и скидке должен совпадать на фронте и на сервере, иначе копеечные расхождения.

## Открытые вопросы перед реализацией

1. `colorId` — переходим на uuid из `colors.id` (правильно, но меняет палитру конфигуратора) или оставляем hex-ключ?
2. Если серверная цена разошлась с показанной клиенту — принимать заказ по серверной цене молча или помечать для менеджера?

## STOP

Это только аудит и контракт. Реализацию не начинаю до отдельного подтверждения.
