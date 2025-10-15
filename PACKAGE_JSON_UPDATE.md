# 📝 Обновление package.json

Замените секцию `"scripts"` в файле `package.json` на следующую:

```json
{
  "scripts": {
    "dev": "npm-run-all --parallel dev:css dev:server",
    "dev:css": "tailwindcss -i ./src/css/input.css -o ./dist/styles.css --watch",
    "dev:server": "node build-scripts/dev-server.js",
    "build": "npm-run-all build:clean build:css build:js build:html build:assets",
    "build:clean": "node -e \"const fs=require('fs'); if(fs.existsSync('dist')) fs.rmSync('dist', {recursive:true}); fs.mkdirSync('dist/js', {recursive:true});\"",
    "build:css": "tailwindcss -i ./src/css/input.css -o ./dist/styles.css --minify",
    "build:js": "node build-scripts/bundle-js.js",
    "build:html": "node -e \"const fs=require('fs'); fs.copyFileSync('index.html', 'dist/index.html');\"",
    "build:assets": "node -e \"const fs=require('fs'); fs.cpSync('public', 'dist/public', {recursive:true});\"",
    "preview": "node build-scripts/dev-server.js"
  }
}
```

## Или используйте готовые bash/bat скрипты:

### Linux/Mac:
```bash
chmod +x build-scripts/build.sh
./build-scripts/build.sh
```

### Windows:
```cmd
build-scripts\build.bat
```

## Зависимости которые уже установлены:
- ✅ npm-run-all
- ✅ live-server
- ✅ esbuild
- ✅ swiper
- ✅ @supabase/supabase-js
- ✅ tailwindcss
- ✅ tailwindcss-animate

Все готово к использованию!
