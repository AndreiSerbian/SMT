

# План исправления логотипа

## Проблема

Логотип не загружается потому что во всех навигационных компонентах используется **внешняя ссылка на устаревший домен**:
```
https://giftboxopt.ru/assets/logo-B0ADOiza.svg
```

Файл логотипа при этом **есть в проекте**: `public/images/logo.svg`

---

## Решение

Заменить все внешние ссылки на локальный путь `/images/logo.svg` в 4 файлах:

---

### Файл 1: `js/components/homeComponent.js`

**Строки 112 и 133** — заменить:
```javascript
// Было (в 2 местах):
<img src="https://giftboxopt.ru/assets/logo-B0ADOiza.svg" alt="Logo" class="w-8 h-8 mr-2" />

// Станет:
<img src="/images/logo.svg" alt="Logo" class="w-8 h-8 mr-2" />
```

---

### Файл 2: `js/components/productComponent.js`

**Строки 208 и 229** — заменить:
```javascript
// Было (в 2 местах):
<img src="https://giftboxopt.ru/assets/logo-B0ADOiza.svg" alt="Logo" class="w-8 h-8 mr-2" />

// Станет:
<img src="/images/logo.svg" alt="Logo" class="w-8 h-8 mr-2" />
```

---

### Файл 3: `js/components/contactsComponent.js`

**Строки 35 и 56** — заменить:
```javascript
// Было (в 2 местах):
<img src="https://giftboxopt.ru/assets/logo-B0ADOiza.svg" alt="Logo" class="w-8 h-8 mr-2" />

// Станет:
<img src="/images/logo.svg" alt="Logo" class="w-8 h-8 mr-2" />
```

---

### Файл 4: `js/components/orderComponent.js`

**Строки 138 и 159** — заменить:
```javascript
// Было (в 2 местах):
<img src="https://giftboxopt.ru/assets/logo-B0ADOiza.svg" alt="Logo" class="w-8 h-8 mr-2" />

// Станет:
<img src="/images/logo.svg" alt="Logo" class="w-8 h-8 mr-2" />
```

---

## Почему это работает

1. Файл `public/images/logo.svg` уже существует в проекте
2. Vite копирует содержимое `public/` в корень `dist/` при сборке
3. Путь `/images/logo.svg` будет работать везде: dev, preview, Netlify, TimeWeb

---

## После исправления

1. Пересобрать проект: `npm run build`
2. Загрузить `dist/` на TimeWeb
3. Проверить что логотип отображается в навигации на всех страницах

---

## Сводка изменений

| Файл | Количество замен |
|------|------------------|
| `js/components/homeComponent.js` | 2 |
| `js/components/productComponent.js` | 2 |
| `js/components/contactsComponent.js` | 2 |
| `js/components/orderComponent.js` | 2 |
| **Всего** | **8 замен** |

