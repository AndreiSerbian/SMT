#!/bin/bash

echo "🧹 Очистка папки dist..."
rm -rf dist
mkdir -p dist/js

echo "🎨 Сборка CSS с Tailwind..."
npx tailwindcss -i ./src/css/input.css -o ./dist/styles.css --minify

echo "📦 Сборка JavaScript..."
node build-scripts/bundle-js.js

echo "📄 Копирование HTML..."
cp index.html dist/

echo "🖼️ Копирование ресурсов..."
cp -r public dist/

echo "✅ Сборка завершена! Файлы в папке dist/"
echo ""
echo "Для просмотра запустите: npm run preview"
