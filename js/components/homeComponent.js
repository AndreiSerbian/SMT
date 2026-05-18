import { cartService } from "../services/cartService.js";
import SwiperService from "../services/swiperService.js";
import { ColorService } from "../services/colorService.js";
import { productsService } from "../services/productsService.js";
import { PublicProductsComponent } from "./publicProductsComponent.js";
import CookieConsentService from "../services/cookieConsentService.js";

const HomeComponent = {
  swipersById: {},
  eventListeners: [],
  timeouts: [],
  productsWithPrices: [],

  // Получение уникальных категорий
  getCategories() {
    const categories = new Set();
    this.productsWithPrices.forEach((product) => {
      categories.add(`${product.name} (${product.sizeType})`);
    });
    return Array.from(categories);
  },

  // Загрузка товаров с ценами
  async loadProducts() {
    try {
      this.productsWithPrices = await productsService.getActiveProducts();
      console.log("Товары загружены:", this.productsWithPrices.length);
    } catch (error) {
      console.error("Ошибка загрузки товаров:", error);
      this.productsWithPrices = [];
    }
  },

  // Обновление отображения цены
  updatePriceDisplay(productId, newPrice) {
    // Можно добавить логику обновления цен в UI если нужно
    console.log(`Цена товара ${productId} обновлена до ${newPrice}`);
  },

  destroy(container) {
    // Очищаем таймеры
    this.timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    this.timeouts = [];

    // Очищаем слушатели событий
    this.eventListeners.forEach(({ element, event, handler }) => {
      if (element && element.removeEventListener) {
        element.removeEventListener(event, handler);
      }
    });
    this.eventListeners = [];

    // Очищаем слайдеры
    if (SwiperService && SwiperService.destroyAll) {
      SwiperService.destroyAll();
    }
    this.swipersById = {};
  },

  addEventListenerWithCleanup(element, event, handler) {
    element.addEventListener(event, handler);
    this.eventListeners.push({ element, event, handler });
  },

  // Загрузка каталога товаров
  async loadProductsCatalog(container) {
    const catalogContainer = container.querySelector("#products-catalog-container");
    if (catalogContainer) {
      try {
        // Показываем индикатор загрузки
        catalogContainer.innerHTML = `
          <div class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p class="mt-2 text-gray-500">Загрузка каталога товаров...</p>
          </div>
        `;

        const catalogHTML = await PublicProductsComponent.render();
        catalogContainer.innerHTML = catalogHTML;
        // Initialize Swiper AFTER DOM insertion to avoid race condition
        PublicProductsComponent.initCategorySliders();
        console.log("Products catalog loaded successfully");
      } catch (error) {
        console.error("Error loading products catalog:", error);
        catalogContainer.innerHTML = `
          <div class="text-center py-8">
            <p class="text-gray-500">Ошибка загрузки каталога товаров: ${error.message}</p>
            <button onclick="location.reload()" class="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Повторить попытку
            </button>
          </div>
        `;
      }
    }
  },

  async render(container) {
    if (!container) {
      console.error("Container not provided to HomeComponent");
      return;
    }

    // Shell-first: рендерим оболочку синхронно, без ожидания Supabase.
    // Каталог и корзина наполняются асинхронно ниже.
    const cartHTML = `
      <div class="fixed bottom-4 right-4 z-50">
        <button onclick="toggleCart()"
          class="bg-blue-200 text-gray-800 p-4 rounded-full shadow-lg hover:bg-blue-300 transition duration-300 relative">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
        </button>
      </div>
      <div id="cartModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-40">
        <div class="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-lg p-6 transform transition-transform duration-300 translate-x-full flex flex-col"></div>
      </div>
    `;

    container.innerHTML = `
      <nav class="bg-white shadow-md relative">
        <div class="container mx-auto px-6 py-3">
          <div class="flex justify-between items-center">
            <a href="#" class="flex items-center text-xl font-bold text-gray-800">
              <img src="/images/logo.svg" alt="Logo" class="w-8 h-8 mr-2" />
              <span>SMT Premium Box</span>
            </a>
            
            <!-- Десктопное меню -->
            <div class="hidden md:flex space-x-4">
              <a href="#" class="text-gray-600 hover:text-gray-800">Главная</a>
              <a href="#contacts" class="text-gray-600 hover:text-gray-800">Контакты</a>
            </div>
            
            <!-- Мобильный бургер -->
            <button class="md:hidden text-2xl text-gray-800" id="mobile-menu-toggle">
              <span id="burger-icon">☰</span>
            </button>
          </div>
        </div>
        
        <!-- Мобильное меню -->
        <div id="mobile-menu" class="fixed inset-0 bg-white z-50 hidden md:hidden">
          <div class="flex justify-between items-center p-6 border-b">
            <a href="#" class="flex items-center text-xl font-bold text-gray-800">
              <img src="/images/logo.svg" alt="Logo" class="w-8 h-8 mr-2" />
              <span>SMT Premium Box</span>
            </a>
            <button class="text-2xl text-gray-800" id="mobile-menu-close">✕</button>
          </div>
          <div class="flex flex-col p-6 space-y-4">
            <a href="#" class="text-xl text-gray-800 py-2 border-b" id="mobile-home">Главная</a>
            <a href="#contacts" class="text-xl text-gray-800 py-2 border-b" id="mobile-contacts">Контакты</a>
          </div>
        </div>
      </nav>


<!-- Hero-блок -->
<section class="relative bg-white overflow-hidden">
  <div class="absolute inset-0">
    <img src="/images/hero.webp"
         alt="Подарочные коробки оптом — SMT Premium Box"
         loading="eager"
         decoding="async"
         fetchpriority="high"
         class="w-full h-full object-cover" />
    <div class="absolute inset-0 bg-white/60"></div>
  </div>
  <div class="relative max-w-6xl mx-auto px-4 py-20 md:py-28">
    <div class="text-center">
      <h1 class="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
        SMT Premium Box
      </h1>
      <p class="text-lg md:text-xl text-gray-600 mt-4">
        Оптовые продажи подарочных упаковок
      </p>
      <div class="mt-7 flex justify-center">
        <a href="#catalog"
           class="inline-flex items-center justify-center bg-blue-900 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition">
          Перейти в каталог коробок
        </a>
      </div>
    </div>
  </div>
</section>

<!-- Section: Что мы продаём  -->
<section class="bg-white py-16 px-4" id="about-boxes">
  <div class="max-w-6xl mx-auto">
    <h2 class="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
      Что мы продаём
    </h2>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

      <!-- 1. Самосборные коробки -->
      <article class="bg-gray-50 rounded-xl p-6 shadow-sm hover:shadow transition h-full">
        <div class="flex items-start gap-4">
          <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden">
            <svg xmlns="http://www.w3.org/2000/svg"
                 viewBox="0 0 512 512"
                 aria-hidden="true"
                 class="h-12 w-12 block">
              <g>
                <path fill="#80d261" d="M486.245 0H25.755C11.531 0 0 11.531 0 25.755v144L342.245 512h144C500.469 512 512 500.469 512 486.245V25.755C512 11.531 500.469 0 486.245 0z"/>
                <path fill="#68ca44" d="M486.245 0h-5.666a25.86 25.86 0 0 1 .515 5.151v408.632c0 42.865-34.749 77.613-77.613 77.613h-81.839L342.245 512h144C500.469 512 512 500.469 512 486.245V25.755C512 11.531 500.469 0 486.245 0z"/>
                <path fill="#ffc344" d="M342.245 144H25.755C11.531 144 0 155.531 0 169.755v144L198.245 512h144C356.469 512 368 500.469 368 486.245v-316.49C368 155.531 356.469 144 342.245 144z"/>
                <path fill="#feb237" d="M177.642 491.396 198.245 512h144c12.46 0 22.853-8.848 25.239-20.604z"/>
                <path fill="#fd6930" d="M198.245 288H25.755C11.531 288 0 299.531 0 313.755v172.491C0 500.469 11.531 512 25.755 512h172.491C212.469 512 224 500.469 224 486.245v-172.49C224 299.531 212.469 288 198.245 288z"/>
                <path fill="#fd5426" d="M.515 491.396C2.902 503.152 13.295 512 25.755 512h172.491c12.46 0 22.853-8.848 25.239-20.604z"/>
                <path fill="#000000" d="M458.539 48H341.472c-4.866 0-7.302 5.883-3.862 9.323l41.563 41.563L98.886 379.173 57.323 337.61c-3.44-3.441-9.323-1.004-9.323 3.862v117.067A5.461 5.461 0 0 0 53.461 464h117.067c4.865 0 7.302-5.883 3.862-9.323l-41.563-41.563 280.288-280.288 41.563 41.563c3.44 3.441 9.323 1.004 9.323-3.862V53.461A5.463 5.463 0 0 0 458.539 48z"/>
              </g>
              <g transform="translate(56 56) scale(12.5)">
                <g fill="#2979ff">
                  <path d="M20.44 11C18.14 11 15 11 15 8.83 15 7.44 19.49 2 22.67 2c5.1 0 7.24 9-2.22 9zM17 9c.67.27 2.68 0 3.44 0 6.64 0 4.81-5 2.22-5-1.74 0-4.99 3.73-5.67 5z" fill="#2563eb"/>
                  <path d="M11.56 11c-9.54 0-7.28-9-2.23-9C12.51 2 17 7.44 17 8.83 17 11 13.85 11 11.56 11zM9.34 4C8.05 4 7.01 5.12 7.01 6.5c0 2.26 3.19 2.5 4.56 2.5.77 0 2.77.27 3.44 0-.68-1.27-3.93-5-5.67-5zM27 14H5c-.55 0-1 .45-1 1v12c0 1.65 1.35 3 3 3h18c1.65 0 3-1.35 3-3V15c0-.55-.45-1-1-1z" fill="#2563eb"/>
                  <rect width="28" height="7" x="2" y="9" rx="1" fill="#2563eb"/>
                </g>
                <path fill="#1e3a8a" d="M4 16h24v1H4z"/>
                <path fill="#1e3a8a" d="M13 9h6v21h-6z"/>
              </g>
            </svg>
          </div>

          <div>
            <h3 class="text-xl font-semibold text-gray-800">
              Самосборные подарочные коробки
            </h3>
            <p class="text-gray-600 mt-1 leading-relaxed">
              Продаём самосборные подарочные упаковки оптом, разных цветов, размеров и форматов.
            </p>
          </div>
        </div>
      </article>

      <!-- Удобная упаковка -->
      <article class="bg-gray-50 rounded-xl p-6 shadow-sm hover:shadow transition h-full">
        <div class="flex items-start gap-4">
          <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden">
            <svg xmlns="http://www.w3.org/2000/svg"
                 viewBox="0 0 96 96"
                 xml:space="preserve"
                 aria-hidden="true"
                 class="h-12 w-12 block">
              <g>
                <path d="m86.73 27.65-5-4.29-2.52-4.08a1 1 0 0 0-.85-.47H65.67a1 1 0 0 0-.85.47l-.75 1.22c0-15.23 0-14.46-.09-14.74s.27.24-4.55-5.41a1 1 0 0 0-.76-.35H37.33a1 1 0 0 0-.76.35c-5 5.86-4.48 5.21-4.57 5.47s-.07-.44-.07 14.68l-.75-1.22a1 1 0 0 0-.85-.47H17.68a1 1 0 0 0-.85.47l-2.52 4.08-5 4.29a1 1 0 0 0-.35.76v21.34a1 1 0 0 0 .35.76l5 4.3 2.52 4.07a1 1 0 0 0 .85.47h12.65a1 1 0 0 0 .85-.47l.75-1.22v13.79l-3.73 2.31a1 1 0 0 0-.47.85v12.65a1 1 0 0 0 .47.85l4.07 2.52 4.3 5a1 1 0 0 0 .76.35h21.34a1 1 0 0 0 .76-.35l4.3-5 4.07-2.52a1 1 0 0 0 .47-.85V74.61a1 1 0 0 0-.47-.85l-3.73-2.31V57.66l.75 1.22a1 1 0 0 0 .85.47h12.65a1 1 0 0 0 .85-.47l2.52-4.07 5-4.3a1 1 0 0 0 .35-.76V28.41a1 1 0 0 0-.31-.76zM61.07 71a1 1 0 0 0 0 2h1v15.86H33.93V73h1a1 1 0 0 0 0-2h-1V55.15h1a1 1 0 0 0 0-2h-1v-1a1 1 0 0 0-2 0v1H16.08V25h15.85v1a1 1 0 0 0 2 0v-1h1a1 1 0 0 0 0-2h-1V7.16h28.14V23h-1a1 1 0 0 0 0 2h1v1a1 1 0 1 0 2 0v-1h15.85v28.15H64.07v-1a1 1 0 1 0-2 0v1h-1a1 1 0 0 0 0 2h1V71zm5.16-50.2h11.53l1.37 2.2H64.87zM37.79 2h20.42l2.69 3.16H35.1zM18.24 20.81h11.53L31.13 23H16.87zM14.08 52l-3.16-2.69V28.87l3.16-2.69zm15.69 5.37H18.24l-1.37-2.2h14.27zm0 17.82 2.2-1.37v14.25l-2.2-1.37zM58.21 94H37.79l-2.69-3.14h25.8zm8.06-18.85V86.7l-2.2 1.37V73.8zm11.49-17.8H66.23l-1.37-2.2h14.27zm7.32-8.06L81.92 52V26.18l3.16 2.69z" fill="#172554"></path>
                <path d="M63.07 49.42a1 1 0 0 0 1-1v-3.74a1 1 0 1 0-2 0v3.74a1 1 0 0 0 1 1zM63.07 34.48a1 1 0 0 0 1-1v-3.73a1 1 0 1 0-2 0v3.73a1 1 0 0 0 1 1zM63.07 42a1 1 0 0 0 1-1v-3.79a1 1 0 1 0-2 0V41a1 1 0 0 0 1 1zM32.93 36.21a1 1 0 0 0-1 1V41a1 1 0 0 0 2 0v-3.79a1 1 0 0 0-1-1zM32.93 28.75a1 1 0 0 0-1 1v3.73a1 1 0 0 0 2 0v-3.73a1 1 0 0 0-1-1zM32.93 43.68a1 1 0 0 0-1 1v3.74a1 1 0 0 0 2 0v-3.74a1 1 0 0 0-1-1zM49.87 53.15h-3.74a1 1 0 0 0 0 2h3.74a1 1 0 0 0 0-2zM57.33 53.15H53.6a1 1 0 0 0 0 2h3.73a1 1 0 0 0 0-2zM42.4 53.15h-3.73a1 1 0 0 0 0 2h3.73a1 1 0 0 0 0-2zM57.33 71H53.6a1 1 0 0 0 0 2h3.73a1 1 0 0 0 0-2zM42.4 71h-3.73a1 1 0 0 0 0 2h3.73a1 1 0 0 0 0-2zM49.87 71h-3.74a1 1 0 0 0 0 2h3.74a1 1 0 0 0 0-2zM57.33 23H53.6a1 1 0 0 0 0 2h3.73a1 1 0 0 0 0-2zM49.87 23h-3.74a1 1 0 0 0 0 2h3.74a1 1 0 0 0 0-2zM42.4 23h-3.73a1 1 0 0 0 0 2h3.73a1 1 0 0 0 0-2z" fill="#172554"></path>
              </g>
            </svg>
          </div>

          <div>
            <h3 class="text-xl font-semibold text-gray-800">
              Удобная упаковка
            </h3>
            <p class="text-gray-600 mt-1 leading-relaxed">
              Наши коробки поставляются в сложенном виде. Это упрощает хранение и транспортировку.
            </p>
          </div>
        </div>
      </article>

      <!-- Конструкция на магнитах и лентах -->
      <article class="bg-gray-50 rounded-xl p-6 shadow-sm hover:shadow transition h-full">
        <div class="flex items-start gap-4">
          <div class="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden">
            <svg xmlns="http://www.w3.org/2000/svg"
                 viewBox="0 0 512 512"
                 aria-hidden="true"
                 class="h-12 w-12 block">
              <g>
                <path
                  d="M465.589 429.5c-7.679 0-15.357 2.929-21.216 8.787l-27.431 27.425c-11.718 11.716-30.715 11.716-42.434 0l-27.429-27.424c-11.718-11.716-30.715-11.716-42.434 0l-27.429 27.424c-11.718 11.716-30.715 11.716-42.434 0l-27.429-27.424c-11.718-11.716-30.715-11.716-42.434 0l-27.429 27.424c-11.718 11.716-30.715 11.716-42.434 0l-27.431-27.425c-5.859-5.858-13.537-8.787-21.216-8.787M473.089 52.5v-45H38.911v242"
                  fill="none" stroke="#162456" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"
                  stroke-miterlimit="10"></path>
                <path
                  d="M38.911 279.5v225h434.178v-422M473.089 429.5H38.911M473.089 399.5H38.911"
                  fill="none" stroke="#162456" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"
                  stroke-miterlimit="10"></path>
                <path
                  d="M465.589 354.5c-7.679 0-15.357 2.929-21.216 8.787l-27.431 27.425c-11.718 11.716-30.715 11.716-42.434 0l-27.429-27.424c-11.718-11.716-30.715-11.716-42.434 0l-27.429 27.424c-11.718 11.716-30.715 11.716-42.434 0l-27.429-27.424c-11.718-11.716-30.715-11.716-42.434 0l-27.429 27.424c-11.718 11.716-30.715 11.716-42.434 0l-27.431-27.425c-5.859-5.858-13.537-8.787-21.216-8.787M473.089 354.5H38.911M473.089 324.5H38.911M473.089 474.5H38.911"
                  fill="none" stroke="#162456" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"
                  stroke-miterlimit="10"></path>
              </g>
            </svg>
            <div class="absolute inset-0 flex items-baseline justify-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg"
                   viewBox="0 0 512 512"
                   aria-hidden="true"
                   class="h-8 w-8 block">
                <g>
                  <path d="M435.999 120.003H336c-5.522 0-10 4.477-10 10v191.999c0 38.598-31.402 70-70 70-38.525 0-70-31.168-70-70V130.003c0-5.523-4.478-10-10-10H76.001c-5.522 0-10 4.477-10 10v191.999C66.001 426.767 151.234 512 256 512s189.999-85.233 189.999-189.999V130.003c0-5.523-4.478-10-10-10zm-349.998 20h80v72h-80v-72zm339.998 181.999c0 93.737-76.262 169.999-169.999 169.999S86.001 415.739 86.001 322.002v-89.999h80v89.999c0 49.533 40.074 90 89.999 90 49.626 0 89.999-40.374 89.999-90v-89.999h80v89.999zm0-110h-80v-72h80v72z" fill="#172554"></path>
                </g>
              </svg>
            </div>
          </div>

          <div>
            <h3 class="text-xl font-semibold text-gray-800">
              Конструкция на магнитах и лентах
            </h3>
            <p class="text-gray-600 mt-1 leading-relaxed">
              Встроенные магниты и клейкие уголки помогут быстро собрать подарочную коробку.
            </p>
          </div>
        </div>
      </article>

      <!-- Для корпоративных подарков -->
      <article class="bg-gray-50 rounded-xl p-6 shadow-sm hover:shadow transition h-full">
        <div class="flex items-start gap-4">
          <div class="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200">
            <span class="text-sm font-extrabold leading-none tracking-tight text-blue-900">B2B</span>
            <span class="my-1 h-px w-8 bg-slate-200"></span>
            <span class="text-sm font-extrabold leading-none tracking-tight text-blue-900">B2C</span>
          </div>

          <div>
            <h3 class="text-xl font-semibold text-gray-800">
              Для корпоративных подарков, мероприятий и продаж в розницу
            </h3>
            <p class="text-gray-600 mt-1 leading-relaxed">
              Упаковка подходит для корпоративных подарков, мероприятий и промо-наборов, создаёт эффектный внешний вид.
            </p>
          </div>
        </div>
      </article>

      <!-- Оптовые заказы -->
      <article class="bg-gray-50 rounded-xl p-6 shadow-sm hover:shadow transition h-full md:col-span-2 lg:col-span-1">
        <div class="flex items-start gap-4">
          <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden">
            <svg xmlns="http://www.w3.org/2000/svg"
                 viewBox="0 0 400 400"
                 aria-hidden="true"
                 class="h-12 w-12 block">
              <g>
                <g fill-rule="evenodd" clip-rule="evenodd">
                  <path fill="#3d7d33" d="M250.48 152.81h24.62v24.62h-24.62z"></path>
                  <path fill="#34668e" d="M117.62 44.7v4.54H90.01V35.97h27.61z"></path>
                  <path fill="#34668e" d="M133.29 55.5v13.13H74.35V50.62c0-1.03.84-1.88 1.88-1.88h5.69v4.54c0 2.24 1.82 4.05 4.05 4.05h35.71c2.24 0 4.05-1.81 4.05-4.05v-4.54h5.69c1.03 0 1.88.84 1.88 1.88z"></path>
                  <path fill="#34668e" d="M167.44 148.76v72.39H40.2V59.56h26.05v13.13c0 2.24 1.81 4.05 4.05 4.05h67.04c2.24 0 4.05-1.81 4.05-4.05V59.56h26.05zm-17.89-46.43c0-2.24-1.81-4.05-4.05-4.05H94.85c-2.24 0-4.05 1.81-4.05 4.05s1.81 4.05 4.05 4.05h50.65c2.24 0 4.05-1.82 4.05-4.05zm0 32.71c0-2.24-1.81-4.05-4.05-4.05H94.85c-2.24 0-4.05 1.81-4.05 4.05s1.81 4.05 4.05 4.05h50.65c2.24 0 4.05-1.82 4.05-4.05zm0 32.7c0-2.24-1.81-4.05-4.05-4.05H94.85c-2.24 0-4.05 1.81-4.05 4.05s1.81 4.05 4.05 4.05h50.65c2.24 0 4.05-1.81 4.05-4.05zm0 32.71c0-2.24-1.81-4.05-4.05-4.05H94.85c-2.24 0-4.05 1.81-4.05 4.05s1.81 4.05 4.05 4.05h50.65c2.24 0 4.05-1.81 4.05-4.05zM79 97.86c1.58-1.58 1.58-4.15 0-5.73s-4.15-1.58-5.73 0l-6.91 6.91L65 97.68c-1.58-1.58-4.15-1.58-5.73 0s-1.58 4.15 0 5.73l4.22 4.22a4.046 4.046 0 0 0 5.73 0zm0 32.7c1.58-1.58 1.58-4.15 0-5.73s-4.15-1.58-5.73 0l-6.91 6.91-1.36-1.35c-1.58-1.58-4.15-1.58-5.73 0s-1.58 4.15 0 5.73l4.22 4.22a4.046 4.046 0 0 0 5.73 0zm0 32.71c1.58-1.58 1.58-4.15 0-5.73s-4.15-1.58-5.73 0l-6.91 6.91L65 163.1c-1.58-1.58-4.15-1.58-5.73 0s-1.58 4.15 0 5.73l4.22 4.22a4.046 4.046 0 0 0 5.73 0zm0 32.71c1.58-1.58 1.58-4.15 0-5.73s-4.15-1.58-5.73 0l-6.91 6.91-1.36-1.35c-1.58-1.58-4.15-1.58-5.73 0s-1.58 4.15 0 5.73l4.22 4.22a4.046 4.046 0 0 0 5.73 0z"></path>
                  <path fill="#3d7d33" d="M195.95 152.81v101.56H78.47v-25.12h93.02c2.24 0 4.05-1.81 4.05-4.05v-72.39zM321.53 152.81v101.56H204.05V152.81h38.33v28.67c0 2.24 1.81 4.05 4.05 4.05h32.72c2.24 0 4.05-1.81 4.05-4.05v-28.67zM337.89 262.47v24.62h-24.62v-24.62h12.31zM212.31 262.47v24.62h-24.62v-24.62H200zM86.73 262.47v24.62H62.11v-24.62h12.31z"></path>
                  <path fill="#3d7d33" d="M133.16 262.47v101.56H15.68V262.47h38.33v28.67c0 2.24 1.81 4.05 4.05 4.05h32.72c2.24 0 4.05-1.81 4.05-4.05v-28.67zM258.74 262.47v101.56H141.26V262.47h38.33v28.67c0 2.24 1.81 4.05 4.05 4.05h32.72c2.24 0 4.05-1.81 4.05-4.05v-28.67zM384.32 262.47v101.56H266.84V262.47h38.33v28.67c0 2.24 1.81 4.05 4.05 4.05h32.72c2.24 0 4.05-1.81 4.05-4.05v-28.67z"></path>
                </g>
              </g>
            </svg>
          </div>

          <div>
            <h3 class="text-xl font-semibold text-gray-800">
              Оптовые заказы
            </h3>
            <p class="text-gray-600 mt-1 leading-relaxed">
              Мы принимаем заказы от 10 000 ₽. Вы можете приобрести пробную коробку на Wildberries по ссылке в карточке товара.
            </p>
          </div>
        </div>
      </article>

    </div>
  </div>
</section>

<!-- Блок с преимуществами -->
<section class="bg-gray-50 py-16 px-4">
  <div class="max-w-6xl mx-auto">
    <h2 class="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
      Наши преимущества
    </h2>

    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      <!-- Преимущество 1 -->
      <div class="bg-white rounded-xl shadow p-6 flex items-start gap-4 h-full">
        <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden">
          <svg xmlns="http://www.w3.org/2000/svg"
               viewBox="0 0 512 512"
               aria-hidden="true"
               class="h-12 w-12 block">
            <g>
              <g data-name="Delivery">
                <path fill="#3a85de" d="M464 264H48a32 32 0 0 0-32 32v16a32 32 0 0 0 32 32h416a32 32 0 0 0 32-32v-16a32 32 0 0 0-32-32zM56 320a16 16 0 1 1 16-16 16 16 0 0 1-16 16zm104 0a16 16 0 1 1 16-16 16 16 0 0 1-16 16zm96 0a16 16 0 1 1 16-16 16 16 0 0 1-16 16zm96 0a16 16 0 1 1 16-16 16 16 0 0 1-16 16zm104 0a16 16 0 1 1 16-16 16 16 0 0 1-16 16zM256 152v56l-24-16-24 16v-56z"></path>
                <path fill="#3a85de" d="M256 152v56l-24-16-24 16v-56zM400 152v56l-24-16-24 16v-56z"></path>
                <path fill="#3a85de" d="M400 152v56l-24-16-24 16v-56z"></path>
                <g fill="#153152">
                  <path d="M464 256h-24V152a8 8 0 0 0-8-8H320a8 8 0 0 0-8 8v104h-16V152a8 8 0 0 0-8-8H176a8 8 0 0 0-8 8v104H48a40.045 40.045 0 0 0-40 40v16a40.045 40.045 0 0 0 40 40h416a40.045 40.045 0 0 0 40-40v-16a40.045 40.045 0 0 0-40-40zm-72-96v33.052l-11.562-7.708a8 8 0 0 0-8.876 0L360 193.052V160zm-64 0h16v48a8 8 0 0 0 12.438 6.656L376 201.615l19.562 13.041A8 8 0 0 0 408 208v-48h16v96h-96zm-80 0v33.052l-11.562-7.708a8 8 0 0 0-8.876 0L216 193.052V160zm-64 0h16v48a8 8 0 0 0 12.438 6.656L232 201.615l19.562 13.041A8 8 0 0 0 264 208v-48h16v96h-96zm304 152a24.027 24.027 0 0 1-24 24H48a24.027 24.027 0 0 1-24-24v-16a24.027 24.027 0 0 1 24-24h416a24.027 24.027 0 0 1 24 24z"></path>
                  <path d="M256 280a24 24 0 1 0 24 24 24.027 24.027 0 0 0-24-24zm0 32a8 8 0 1 1 8-8 8.009 8.009 0 0 1-8 8zM160 280a24 24 0 1 0 24 24 24.027 24.027 0 0 0-24-24zm0 32a8 8 0 1 1 8-8 8.009 8.009 0 0 1-8 8zM352 280a24 24 0 1 0 24 24 24.027 24.027 0 0 0-24-24zm0 32a8 8 0 1 1 8-8 8.009 8.009 0 0 1-8 8zM456 280a24 24 0 1 0 24 24 24.027 24.027 0 0 0-24-24zm0 32a8 8 0 1 1 8-8 8.009 8.009 0 0 1-8 8zM56 280a24 24 0 1 0 24 24 24.027 24.027 0 0 0-24-24zm0 32a8 8 0 1 1 8-8 8.009 8.009 0 0 1-8 8zM152 192H72a8 8 0 0 0 0 16h80a8 8 0 0 0 0-16zM48 184h104a8 8 0 0 0 0-16H48a8 8 0 0 0 0 16zM152 216h-24a8 8 0 0 0 0 16h24a8 8 0 0 0 0-16zM96 216a8 8 0 0 0 0 16h8a8 8 0 0 0 0-16z"></path>
                </g>
              </g>
            </g>
          </svg>
        </div>
        <div>
          <h3 class="text-xl font-semibold text-gray-800">Удобна при работе с партиями</h3>
          <p class="text-gray-600 leading-relaxed">
            Мы делаем практичную и презентабельную упаковку, которая удобна в хранении, сборке и использовании.
          </p>
        </div>
      </div>

      <!-- Преимущество 2 -->
      <div class="bg-white rounded-xl shadow p-6 flex items-start gap-4 h-full">
        <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden">
          <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="512" height="512" x="0" y="0" viewBox="0 0 512 512" xml:space="preserve" class="h-12 w-12 block"><g><path d="M69 239v-7.4c0-7.2-5.9-13.1-13.1-13.1h-6.3c-7.2 0-13.1 5.9-13.1 13.1v7.4c-2.8.9-4.8 3.4-4.8 6.5v11.1H21.1C13.3 256.6 7 263 7 270.7v37.7c0 3.8 3 6.8 6.8 6.8s6.8-3 6.8-6.8v-37.7c0-.2.2-.5.5-.5h10.5V435c0 2.1.9 3.9 2.4 5.2l12 27.2c1.1 2.4 3.5 4 6.2 4.1h.1c2.6 0 5-1.5 6.2-3.9l12.8-27.3c1.5-1.2 2.5-3.1 2.5-5.3V245.6c0-3.1-2.1-5.7-4.8-6.6zm-23.7 13.4h14.9v26H45.3zm0 175.8V292h14.9v136.3H45.3zm10-196v6.6H50v-6.6zm-5.7 209.7h5.8l-3 6.4zM271 328.8c.1 0 .1 0 0 0 .3.2.5.3.8.4.2.1.5.2.7.3h.2c.2.1.4.1.6.1h.2c.3 0 .5.1.8.1.3 0 .5 0 .8-.1h.2c.2 0 .4-.1.6-.1.1 0 .1 0 .2-.1.2-.1.5-.1.7-.2h.1c.3-.1.5-.2.8-.4l35.3-20.4 35.4-20.4c2.1-1.2 3.4-3.5 3.4-5.9v-81.8c0-.3 0-.6-.1-.8v-.1c0-.2-.1-.5-.1-.7 0-.1 0-.1-.1-.2-.1-.2-.1-.4-.2-.6 0-.1-.1-.1-.1-.2-.1-.2-.2-.5-.3-.7-.1-.2-.3-.4-.4-.6 0-.1-.1-.1-.1-.2-.1-.2-.3-.3-.4-.5 0-.1-.1-.1-.2-.2-.2-.2-.4-.3-.6-.5-.2-.2-.5-.3-.7-.5h-.1L313 174.1l-35.3-20.4c-2.1-1.2-4.7-1.2-6.8 0l-35.4 20.4-35.4 20.4c-2.1 1.2-3.4 3.5-3.4 5.9v81.7c0 2.4 1.3 4.7 3.4 5.9l35.4 20.4zm35.4-32.2-25.2 14.5-.2-65.8 57.4-33.1v66zm-32-129.2 31.9 18.5 25.1 14.5-57.4 33.1-57.3-32.8zm-63.9 45.3 56.9 32.6.2 65.8-57.1-32.9zm-21.7-79.3c0 3.8-3 6.8-6.8 6.8h-31.1v31.1c0 3.8-3 6.8-6.8 6.8s-6.8-3-6.8-6.8v-37.9c0-3.8 3-6.8 6.8-6.8H182c3.8 0 6.8 3 6.8 6.8zm171.3 0c0-3.8 3-6.8 6.8-6.8h37.9c3.8 0 6.8 3 6.8 6.8v37.9c0 3.8-3 6.8-6.8 6.8s-6.8-3-6.8-6.8v-31.1h-31c-3.9 0-6.9-3-6.9-6.8zM188.8 349.1c0 3.8-3 6.8-6.8 6.8h-37.9c-3.8 0-6.8-3-6.8-6.8v-37.9c0-3.8 3-6.8 6.8-6.8s6.8 3 6.8 6.8v31.1H182c3.8 0 6.8 3 6.8 6.8zm171.3 0c0-3.8 3-6.8 6.8-6.8h31v-31.1c0-3.8 3-6.8 6.8-6.8s6.8 3 6.8 6.8v37.9c0 3.8-3 6.8-6.8 6.8h-37.9c-3.7 0-6.7-3.1-6.7-6.8zm138.1-143.7h-34.8V93c0-1.8-.7-3.5-2-4.8L386.1 13c-1.3-1.3-3-2-4.8-2H121.6c-19.9 0-36.1 16.2-36.1 36.2v388.2c0 19.9 16.2 36.2 36.1 36.2h87.7v22.7c0 3.8 3 6.8 6.8 6.8h282.1c3.8 0 6.8-3 6.8-6.8V212.2c0-3.8-3.1-6.8-6.8-6.8zM388.1 34.2l52 52h-29.5c-12.4 0-22.6-10.1-22.6-22.6V34.2zM121.6 457.9c-12.4 0-22.5-10.1-22.5-22.6V47.1c0-12.4 10.1-22.6 22.5-22.6h252.9v39.1c0 19.9 16.2 36.2 36.2 36.2h39.1v105.5h-10.1c-3.8 0-6.8 3-6.8 6.8v216.8H216.1c-3.8 0-6.8 3-6.8 6.8v22.1h-87.7zm354.1 29.5v-14.3c0-3.8-3-6.8-6.8-6.8s-6.8 3-6.8 6.8v14.3h-14.3v-14.3c0-3.8-3-6.8-6.8-6.8s-6.8 3-6.8 6.8v14.3h-14.3v-14.3c0-3.8-3-6.8-6.8-6.8s-6.8 3-6.8 6.8v14.3H392v-14.3c0-3.8-3-6.8-6.8-6.8s-6.8 3-6.8 6.8v14.3H364v-14.3c0-3.8-3-6.8-6.8-6.8s-6.8 3-6.8 6.8v14.3H336v-14.3c0-3.8-3-6.8-6.8-6.8s-6.8 3-6.8 6.8v14.3h-14.3v-14.3c0-3.8-3-6.8-6.8-6.8s-6.8 3-6.8 6.8v14.3h-14.3v-14.3c0-3.8-3-6.8-6.8-6.8s-6.8 3-6.8 6.8v14.3h-14.3v-14.3c0-3.8-3-6.8-6.8-6.8s-6.8 3-6.8 6.8v14.3H223v-44.9h216.8c3.8 0 6.8-3 6.8-6.8V219h44.9v16.3h-14.3c-3.8 0-6.8 3-6.8 6.8s3 6.8 6.8 6.8h14.3v14.3h-14.3c-3.8 0-6.8 3-6.8 6.8s3 6.8 6.8 6.8h14.3v14.3h-14.3c-3.8 0-6.8 3-6.8 6.8s3 6.8 6.8 6.8h14.3V319h-14.3c-3.8 0-6.8 3-6.8 6.8s3 6.8 6.8 6.8h14.3V347h-14.3c-3.8 0-6.8 3-6.8 6.8s3 6.8 6.8 6.8h14.3v14.3h-14.3c-3.8 0-6.8 3-6.8 6.8s3 6.8 6.8 6.8h14.3v14.3h-14.3c-3.8 0-6.8 3-6.8 6.8s3 6.8 6.8 6.8h14.3v14.3h-14.3c-3.8 0-6.8 3-6.8 6.8s3 6.8 6.8 6.8h14.3v43.1z" fill="#1c398e" opacity="1"></path></g></svg>
        </div>
        <div>
          <h3 class="text-xl font-semibold text-gray-800">Кастомизация</h3>
          <p class="text-gray-600 leading-relaxed">
            Кастомизация — для корпоративных заказов, ваших товаров и оптовых продаж.
          </p>
        </div>
      </div>

      <!-- Преимущество 3 -->
      <div class="bg-white rounded-xl shadow p-6 flex items-start gap-4 h-full">
        <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden">
          <svg xmlns="http://www.w3.org/2000/svg"
               viewBox="0 0 512 512"
               aria-hidden="true"
               class="h-12 w-12 block">
            <g fill-rule="evenodd" clip-rule="evenodd">
              <path fill="#64aefe" d="m370.691 290.403-86.69 71.89 46.491 107.944c1.494 3.467 6.26 3.821 8.251.614l30.011-48.362 55.758 11.42c3.704.757 6.717-2.945 5.222-6.418z"/>
              <path fill="#474cfd" d="m370.691 290.403-11.462 9.506 54.95 127.583a4.601 4.601 0 0 1-.276 4.245l10.61 2.173c3.704.757 6.718-2.945 5.222-6.418zM327.656 463.65l27.297-43.988 13.802 2.827-30.011 48.362c-1.991 3.207-6.758 2.853-8.251-.614z"/>
              <path fill="#64aefe" d="m242.797 356.717-62.33 133.88c-1.593 3.423-6.369 3.639-8.266.375l-28.597-49.211-56.068 9.797c-3.724.65-6.63-3.14-5.034-6.568l61.648-132.414z"/>
              <path fill="#474cfd" d="m242.798 356.717-62.33 133.879c-1.593 3.423-6.369 3.639-8.266.375l-28.597-49.211-56.068 9.797c-3.725.65-6.63-3.14-5.034-6.568l3.79-8.141 49.438-8.638 28.596 49.211c1.897 3.264 6.673 3.048 8.266-.375l58.467-125.581z"/>
              <path fill="#efd166" d="M279.78 26.741c37.271 27.898 28.818 24.822 75.302 27.407 17.854.993 32.355 13.16 36.434 30.571 3.852 16.444 5.737 37.178 18.291 48.961l21.776 20.438c13.039 12.237 16.325 30.879 8.259 46.837-21.002 41.549-19.44 32.691-13.915 78.917 2.122 17.755-7.343 34.149-23.78 41.189-42.796 18.328-35.905 12.546-61.387 51.509-9.787 14.965-27.575 21.439-44.692 16.266-44.564-13.468-35.57-13.468-80.134 0-17.117 5.173-34.905-1.301-44.692-16.266-25.482-38.963-18.591-33.181-61.387-51.509-16.438-7.04-25.902-23.433-23.78-41.189 5.525-46.226 7.087-37.368-13.915-78.917-8.067-15.958-4.78-34.6 8.258-46.837 33.946-31.861 29.449-24.07 40.067-69.399 4.078-17.411 18.579-29.578 36.434-30.571 46.483-2.586 38.031.491 75.302-27.407 14.314-10.716 33.244-10.716 47.559 0z"/>
              <path fill="#ffe177" d="M279.78 26.741c37.271 27.898 28.819 24.822 75.302 27.407 17.854.993 32.355 13.16 36.434 30.571 3.852 16.444 5.737 37.178 18.292 48.961l21.776 20.438c13.038 12.237 16.325 30.879 8.258 46.838-21.002 41.548-19.44 32.69-13.915 78.917 2.122 17.756-7.342 34.149-23.78 41.189-42.796 18.328-35.905 12.546-61.387 51.509-9.499 14.524-26.534 21.05-43.178 16.692 9.118-2.449 17.244-8.204 22.796-16.692 25.482-38.963 18.59-33.181 61.387-51.509 16.438-7.04 25.903-23.433 23.78-41.189-5.525-46.226-7.087-37.368 13.915-78.917 8.067-15.959 4.78-34.601-8.258-46.838l-21.775-20.438c-12.556-11.783-14.44-32.517-18.292-48.961-4.079-17.411-18.58-29.578-36.434-30.571-46.483-2.586-38.031.49-75.302-27.407-4.209-3.151-8.817-5.374-13.588-6.672 11.456-3.117 23.863-.893 33.969 6.672z"/>
              <ellipse cx="256" cy="204.651" fill="#eceff1" rx="112.839" ry="112.84" transform="rotate(-9.73 255.735 204.462)"/>
              <path fill="#d1d1d6" d="M256 91.81c3.036 0 6.041.123 9.017.359-58.103 4.594-103.823 53.198-103.823 112.482s45.72 107.887 103.823 112.482c-2.975.235-5.981.358-9.017.358-62.32 0-112.84-50.52-112.84-112.84S193.681 91.81 256 91.81z"/>
            </g>
            <g transform="translate(166.4 115.4) scale(1.4)">
              <g>
                <path d="M124 51h-6.173l-.67-7.362A3.981 3.981 0 0 0 113.173 40H100V29.709A7.013 7.013 0 0 0 105 23v-5a4.004 4.004 0 0 0-4-4H27a4.004 4.004 0 0 0-4 4v5a7.013 7.013 0 0 0 5 6.709V40H14.827a3.981 3.981 0 0 0-3.984 3.639L10.173 51H4a4.004 4.004 0 0 0-4 4v18a4.004 4.004 0 0 0 4 4h6.173l.67 7.362A3.981 3.981 0 0 0 14.827 88H28v10.291A7.013 7.013 0 0 0 23 105v5a4.004 4.004 0 0 0 4 4h74a4.004 4.004 0 0 0 4-4v-5a7.013 7.013 0 0 0-5-6.709V88h13.173a3.981 3.981 0 0 0 3.984-3.639l.67-7.361H124a4.004 4.004 0 0 0 4-4V55a4.004 4.004 0 0 0-4-4Z"
                      fill="#0b3372"/>
                <path d="M96 58.861V69.14a5.983 5.983 0 0 1 2.616 1.256A6.003 6.003 0 0 1 100 69.55v-11.1a6.003 6.003 0 0 1-1.384-.845A5.983 5.983 0 0 1 96 58.861ZM32 58.861a5.983 5.983 0 0 1-2.615-1.256A6.006 6.006 0 0 1 28 58.45v11.1a6.006 6.006 0 0 1 1.385.845A5.983 5.983 0 0 1 32 69.139Z"
                      fill="#0b3372"/>
              </g>
            </g>
          </svg>
        </div>
        <div>
          <h3 class="text-xl font-semibold text-gray-800">Надежная конструкция и впечатляющий внешний вид</h3>
          <p class="text-gray-600 leading-relaxed">
            Плотный картон и жёсткая геометрия держат форму и производят впечатление на клиентов и партнёров.
          </p>
        </div>
      </div>

      <!-- Преимущество 4 -->
      <div class="bg-white rounded-xl shadow p-6 flex items-start gap-4 h-full">
        <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden">
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 406.783 406.783" class="h-12 w-12 block"><g><path d="M127.12 256.572c-19.742 0-35.741 15.993-35.741 35.737 0 19.745 15.999 35.738 35.741 35.738 19.749 0 35.744-15.993 35.744-35.738 0-19.744-15.995-35.737-35.744-35.737zm0 51.274c-8.582 0-15.536-6.955-15.536-15.537 0-8.586 6.954-15.537 15.536-15.537 8.583 0 15.542 6.951 15.542 15.537 0 8.582-6.959 15.537-15.542 15.537zM315.588 256.572c-19.742 0-35.74 15.993-35.74 35.737 0 19.745 15.998 35.738 35.74 35.738 19.75 0 35.744-15.993 35.744-35.738 0-19.744-15.994-35.737-35.744-35.737zm0 51.274c-8.582 0-15.535-6.955-15.535-15.537 0-8.586 6.953-15.537 15.535-15.537 8.584 0 15.543 6.951 15.543 15.537 0 8.582-6.959 15.537-15.543 15.537zM167.329 146.759c0 5.008-4.098 9.105-9.105 9.105H32.579c-5.008 0-9.104-4.097-9.104-9.105v-5.463c0-5.007 4.097-9.104 9.104-9.104h125.645c5.008 0 9.105 4.097 9.105 9.104v5.463z" fill="#172554" opacity="1"></path><path d="M385.623 200.066c-13.105-3.407-20.604-5.549-25.75-15.487l-17.207-34.839c-5.148-9.938-18.518-18.07-29.707-18.07h-23.535s-3.166.066-3.166-3.12V99.331c0-11.327-6.41-20.595-20.045-20.595H74.405c-19.521 0-28.789 9.269-28.789 20.595v18.311s0 5.446 5.271 5.446h107.337c10.041 0 18.21 8.168 18.21 18.209v5.463c0 10.041-8.169 18.209-18.21 18.209H50.887s-5.271-.438-5.271 5.252v6.297c0 5.008 6.864 5.005 6.864 5.005h72.254c10.041 0 18.21 8.169 18.21 18.209v5.463c0 10.041-8.169 18.209-18.21 18.209H53.62s-8.004-.148-8.004 6.225v44.246c0 11.326 9.268 20.595 20.595 20.595h11.376c2.58 0 2.96-1.437 2.96-2.159 0-25.679 20.894-46.568 46.574-46.568 25.682 0 46.575 20.891 46.575 46.568 0 .725-.206 2.159 1.767 2.159h91.806c1.82 0 1.746-1.534 1.746-2.159 0-25.679 20.893-46.568 46.574-46.568s46.574 20.891 46.574 46.568c0 .725-.018 2.159 1.121 2.159h23.146c11.195 0 20.352-9.157 20.352-20.351v-38.664c.001-32.561-10.28-32.561-21.159-35.389zm-38.727-1.811h-57.928c-2.393 0-2.711-2.33-2.711-2.33V147.67s-.135-1.853 2.938-1.853h16.529c9.959 0 21.855 7.236 26.434 16.079l15.312 31a24.257 24.257 0 0 0 2.072 3.349c.544.728-.368 2.01-2.646 2.01z" fill="#172554" opacity="1"></path><path d="M133.838 205.195c0 5.008-4.097 9.105-9.104 9.105H9.104C4.096 214.3 0 210.203 0 205.195v-5.463c0-5.007 4.097-9.104 9.104-9.104h115.63c5.008 0 9.104 4.097 9.104 9.104v5.463z" fill="#172554" opacity="1"></path></g></svg>
        </div>
        <div>
          <h3 class="text-xl font-semibold text-gray-800">Забота о доставке</h3>
          <p class="text-gray-600 leading-relaxed">
            Тщательная упаковка каждого заказа. Мы заботимся, чтобы коробка дошла до вас в идеальном состоянии.
          </p>
        </div>
      </div>

    </div>
  </div>
</section>

      <section id="catalog" class="bg-white py-16 px-4">
        <div class="max-w-6xl mx-auto">
          <h2 class="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
            Коллекция подарочных упаковок
          </h2>
          <div id="products-catalog-container" style="min-height:60vh">
            <div class="text-center py-8">
              <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p class="mt-2 text-gray-500">Загрузка каталога товаров...</p>
            </div>
          </div>
        </div>
      </section>
      ${cartHTML}
      
      <footer class="bg-blue-950 text-white py-8 mt-12">
        <div class="container mx-auto px-6">
          <div class="flex flex-col md:flex-row justify-between">
            <div class="mb-6 md:mb-0">
              <h3 class="text-xl font-bold mb-4">SMT Premium Box</h3>
              <p class="text-gray-400">Красивые подарочные коробки оптом</p>
            </div>
            <div>
              <h4 class="text-lg font-semibold mb-3">Контакты</h4>
              <p class="text-white-400">Телефон: +79153474616</p>
              <p class="text-white-400">Email: smtpremiumbox@serbiyan.ru</p>
            </div>
          </div>
          <div class="border-t border-gray-700 mt-8 pt-6 text-center">
            <div class="mb-4 space-x-4">
              <a href="#privacy-policy" class="text-gray-400 hover:text-white">Политика конфиденциальности</a>
              <a href="#terms-of-use" class="text-gray-400 hover:text-white">Условия пользования</a>
            </div>
            <p class="text-gray-400">&copy; 2025 SMT Premium Box. Все права защищены.</p>
          </div>
        </div>
      </footer>
    `;

    // Добавляем обработчики для мобильного меню
    const mobileMenuToggle = container.querySelector("#mobile-menu-toggle");
    const mobileMenu = container.querySelector("#mobile-menu");
    const mobileMenuClose = container.querySelector("#mobile-menu-close");
    const mobileHome = container.querySelector("#mobile-home");
    const mobileContacts = container.querySelector("#mobile-contacts");

    const openMobileMenu = () => {
      // Проверяем что это действительно мобильное устройство
      if (window.innerWidth < 768) {
        mobileMenu.classList.remove("hidden");
        document.body.style.overflow = "hidden";
      }
    };

    const closeMobileMenu = () => {
      mobileMenu.classList.add("hidden");
      document.body.style.overflow = "";
    };

    if (mobileMenuToggle) {
      HomeComponent.addEventListenerWithCleanup(mobileMenuToggle, "click", openMobileMenu);
    }

    if (mobileMenuClose) {
      HomeComponent.addEventListenerWithCleanup(mobileMenuClose, "click", closeMobileMenu);
    }

    if (mobileHome) {
      HomeComponent.addEventListenerWithCleanup(mobileHome, "click", () => {
        closeMobileMenu();
        window.location.href = "#";
      });
    }

    if (mobileContacts) {
      HomeComponent.addEventListenerWithCleanup(mobileContacts, "click", () => {
        closeMobileMenu();
        window.location.href = "#contacts";
      });
    }

    // Плавный скролл к каталогу по кнопке в герое
    const catalogBtn = container.querySelector('a[href="#catalog"]');
    const catalogSection = container.querySelector("#catalog");
    if (catalogBtn && catalogSection) {
      HomeComponent.addEventListenerWithCleanup(catalogBtn, "click", (e) => {
        e.preventDefault();
        catalogSection.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    // Инициализируем все слайдеры
    const timeoutId = setTimeout(() => {
      SwiperService.initSwipers();

      // Добавляем обработчики для кнопок цветов
      container.querySelectorAll(".color-button").forEach((button) => {
        let clickCount = 0;
        let clickTimer = null;

        const clickHandler = function (e) {
          e.preventDefault();
          e.stopPropagation();

          clickCount++;

          if (clickCount === 1) {
            clickTimer = setTimeout(() => {
              // Первый клик - меняем изображения
              const productId = this.dataset.productId;
              const baseName = this.dataset.baseName;
              const baseSize = this.dataset.baseSize;
              const chosenColor = this.dataset.color;

              console.log("First click on color:", chosenColor, "for product:", productId);

              // Находим соответствующий продукт с выбранным цветом
              const categoryId = this.dataset.categoryId;
              const matchingProduct = HomeComponent.productsWithPrices.find(
                (p) => categoryId ? (p.category_id === categoryId && p.color === chosenColor) : (p.name === baseName && p.sizeType === baseSize && p.color === chosenColor),
              );

              if (matchingProduct) {
                // Обновляем изображения в слайдере
                SwiperService.updateSliderPhotos(productId, matchingProduct.photo);

                // Обновляем активную кнопку цвета
                ColorService.updateButtonColor(productId, chosenColor);
              }

              clickCount = 0;
            }, 300);
          } else if (clickCount === 2) {
            // Второй клик - переходим к товару
            clearTimeout(clickTimer);

            const productId = this.dataset.productId;
            const baseName = this.dataset.baseName;
            const baseSize = this.dataset.baseSize;
            const chosenColor = this.dataset.color;

            console.log("Second click on color:", chosenColor, "navigating to product");

            // Находим соответствующий продукт с выбранным цветом
            const categoryId = this.dataset.categoryId;
            const matchingProduct = HomeComponent.productsWithPrices.find(
              (p) => categoryId ? (p.category_id === categoryId && p.color === chosenColor) : (p.name === baseName && p.sizeType === baseSize && p.color === chosenColor),
            );

            if (matchingProduct) {
              window.location.href = `#product/${matchingProduct.id}`;
            }

            clickCount = 0;
          }
        };

        HomeComponent.addEventListenerWithCleanup(button, "click", clickHandler);
      });

      // Добавляем обработчики для кнопок "Подробно"
      container.querySelectorAll(".view-all-btn").forEach((button) => {
        const clickHandler = function () {
          const productId = this.dataset.productId;

          // Находим активную кнопку цвета
          const activeColorButton = container.querySelector(
            `.color-button[data-product-id="${productId}"][data-active="true"]`,
          );

          if (activeColorButton) {
            // Получаем данные о выбранном цвете
            const baseName = activeColorButton.dataset.baseName;
            const baseSize = activeColorButton.dataset.baseSize;
            const chosenColor = activeColorButton.dataset.color;

            // Находим соответствующий продукт с выбранным цветом
            const categoryId = activeColorButton.dataset.categoryId;
            const matchingProduct = HomeComponent.productsWithPrices.find(
              (p) => categoryId ? (p.category_id === categoryId && p.color === chosenColor) : (p.name === baseName && p.sizeType === baseSize && p.color === chosenColor),
            );

            if (matchingProduct) {
              window.location.href = `#product/${matchingProduct.id}`;
              return;
            }
          }

          // Если активной кнопки нет, просто переходим к текущему продукту
          window.location.href = `#product/${productId}`;
        };

        HomeComponent.addEventListenerWithCleanup(button, "click", clickHandler);
      });
    }, 100);

    this.timeouts.push(timeoutId);

    // Асинхронно загружаем кнопки цветов для каждого продукта
    setTimeout(() => {
      this.loadColorButtons();
    }, 200);

    // Загружаем каталог товаров
    setTimeout(() => {
      this.loadProductsCatalog(container);
    }, 300);

    // Показываем cookie-баннер с небольшой задержкой
    setTimeout(() => {
      CookieConsentService.show();
    }, 500);
  },
};

// Добавляем метод для асинхронной загрузки кнопок цветов
HomeComponent.loadColorButtons = async function () {
  const categories = this.getCategories();

  for (const category of categories) {
    const [name, sizeTypeRaw] = category.split(" (");
    const sizeType = (sizeTypeRaw || "").slice(0, -1);

    // Находим продукт по умолчанию
    const product = this.productsWithPrices.find((p) => p.name === name && p.sizeType === sizeType);
    if (!product) continue;

    // Загружаем кнопки цветов
    try {
      const colorButtons = await ColorService.renderColorButtons(product);
      const container = document.getElementById(`color-buttons-${product.id}`);
      if (container) {
        container.innerHTML = colorButtons;
      }
    } catch (error) {
      console.error("Ошибка загрузки кнопок цветов для продукта:", product.id, error);
    }
  }
};

export default HomeComponent;
