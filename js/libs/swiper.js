import Swiper from 'swiper';
import { Navigation, Pagination } from 'swiper/modules';

// Импорт стилей Swiper (будет включен в бандл)
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

// Экспортируем Swiper с нужными модулями
export { Swiper, Navigation, Pagination };

// Делаем Swiper глобальным для совместимости со старым кодом
if (typeof window !== 'undefined') {
  window.Swiper = Swiper;
}

export default Swiper;
