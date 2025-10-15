@echo off
echo 🧹 Очистка папки dist...
if exist dist rmdir /s /q dist
mkdir dist\js

echo 🎨 Сборка CSS с Tailwind...
call npx tailwindcss -i ./src/css/input.css -o ./dist/styles.css --minify

echo 📦 Сборка JavaScript...
node build-scripts/bundle-js.js

echo 📄 Копирование HTML...
copy index.html dist\

echo 🖼️ Копирование ресурсов...
xcopy /E /I /Y public dist\public

echo ✅ Сборка завершена! Файлы в папке dist/
echo.
echo Для просмотра запустите: npm run preview
