// ===========================================
// ТОЧКА ВХОДА VANILLA JS ПРИЛОЖЕНИЯ
// ===========================================

// 1️⃣ Импорт всех стилей (Tailwind + кастомные)
import './styles/main.css';

// 2️⃣ Импорт библиотек
import Swiper from 'swiper';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

// Font Awesome
import '@fortawesome/fontawesome-free/css/all.min.css';

// 3️⃣ Импорт Supabase клиента
import { supabase } from './utils/supabase.js';

// 4️⃣ Запуск приложения
import './app.js';

// 5️⃣ Экспорт в глобальную область (для совместимости)
window.Swiper = Swiper;
window.supabase = supabase;

// Логирование старта приложения
if (import.meta.env.DEV) {
  console.log('✅ Vanilla JS App initialized');
  console.log('📦 Swiper version:', Swiper.VERSION);
}
