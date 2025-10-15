import { readFileSync, writeFileSync } from 'fs';

// Читаем собранные файлы
const html = readFileSync('dist/index.html', 'utf-8');
const css = readFileSync('dist/styles.css', 'utf-8');
const js = readFileSync('dist/js/main.js', 'utf-8');

// Создаем standalone HTML со встроенными CSS и JS
const standaloneHTML = html
  .replace(
    '<link href="./styles.css" rel="stylesheet">',
    `<style>${css}</style>`
  )
  .replace(
    '<script type="module" src="./js/main.js"></script>',
    `<script type="module">${js}</script>`
  );

writeFileSync('dist/standalone.html', standaloneHTML);
console.log('✅ Standalone HTML создан: dist/standalone.html');
