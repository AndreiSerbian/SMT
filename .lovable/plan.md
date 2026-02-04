
# План отключения PageSpeed на TimeWeb

## Найденная проблема

Ошибка:
```
Refused to apply style from 'https://www.giftboxopt.ru/assets/A.main-C2YBo3W3.css.pagespeed.cf.RdKhIsWaK7.css' because its MIME type ('text/html') is not a supported stylesheet MIME type
```

**Причина**: На хостинге TimeWeb включён модуль **Google PageSpeed** (`mod_pagespeed`), который:
1. Перехватывает CSS файлы Vite (`main-C2YBo3W3.css`)
2. Переименовывает их (`A.main-C2YBo3W3.css.pagespeed.cf.RdKhIsWaK7.css`)
3. При ошибке возвращает HTML страницу (404) вместо CSS
4. Браузер отказывается применять стили из-за неправильного MIME type

---

## Решение

Добавить директивы отключения PageSpeed в `.htaccess`:

### Изменения в `public/.htaccess`

```apache
# ОТКЛЮЧЕНИЕ PageSpeed (критично для Vite-сборок)
<IfModule pagespeed_module>
  ModPagespeed off
</IfModule>
<IfModule mod_pagespeed.c>
  ModPagespeed off
</IfModule>

# MIME Types (критично для CSS/JS)
AddType text/css .css
AddType application/javascript .js
AddType application/json .json
AddType image/svg+xml .svg
AddType image/webp .webp
AddType font/woff2 .woff2
AddType font/woff .woff

# Кодировка
AddDefaultCharset UTF-8

# SPA Routing — все запросы на index.html
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Не перезаписывать существующие файлы и директории
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  
  # Все остальные запросы → index.html
  RewriteRule ^(.*)$ /index.html [L,QSA]
</IfModule>

# Кэширование статики
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>

# Gzip сжатие
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml
</IfModule>
```

---

## Почему PageSpeed конфликтует с Vite

| Vite | PageSpeed | Конфликт |
|------|-----------|----------|
| Генерирует файлы с хешем: `main-C2YBo3W3.css` | Добавляет свой суффикс: `.pagespeed.cf.XXX.css` | URL меняется, но файл не существует |
| Файлы статичные, неизменные | Пытается "оптимизировать" на лету | Кэширование ломается |
| Работает с Content-Type: text/css | Возвращает 404.html при ошибке | MIME type = text/html |

---

## После исправления

1. Пересобрать проект: `npm run build`
2. Загрузить **всю папку `dist/`** на TimeWeb (включая обновлённый `.htaccess`)
3. Очистить кэш браузера (Ctrl+Shift+R)
4. Проверить что стили применяются на `prod.giftboxop.ru`

---

## Проверка успешности

В DevTools → Network → Filter: CSS:
- URL должен быть `assets/index-XXXXX.css` (без `.pagespeed`)
- Статус: `200 OK`
- Content-Type: `text/css`

---

## Сводка изменений

| Файл | Изменение |
|------|-----------|
| `public/.htaccess` | Добавить директивы `ModPagespeed off` в начало файла |
