const PrivacyPolicyComponent = {
  eventListeners: [],

  destroy(container) {
    // Очищаем eventListeners
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
  },

  addEventListenerWithCleanup(element, event, handler) {
    element.addEventListener(event, handler);
    this.eventListeners.push({ element, event, handler });
  },

  render(container) {
    container.innerHTML = `
      <nav class="bg-blue-950 text-white p-4 sticky top-0 z-50">
        <div class="container mx-auto flex items-center justify-between">
          <a href="#" class="text-2xl font-bold">SMT Premium Box</a>
          
          <!-- Desktop Menu -->
          <div class="hidden md:flex space-x-6">
            <a href="#" class="hover:text-blue-300">Главная</a>
            <a href="#order" class="hover:text-blue-300">Заказ</a>
            <a href="#contacts" class="hover:text-blue-300">Контакты</a>
          </div>
          
          <!-- Mobile Menu Button -->
          <button id="mobile-menu-toggle" class="md:hidden text-white focus:outline-none">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>
        </div>
        
        <!-- Mobile Menu -->
        <div id="mobile-menu" class="hidden md:hidden bg-blue-900 mt-4 rounded-lg">
          <a href="#" class="block px-4 py-2 hover:bg-blue-800">Главная</a>
          <a href="#order" class="block px-4 py-2 hover:bg-blue-800">Заказ</a>
          <a href="#contacts" class="block px-4 py-2 hover:bg-blue-800">Контакты</a>
        </div>
      </nav>
      
      <main class="container mx-auto px-6 py-8 min-h-screen">
        <h1 class="text-3xl font-bold mb-6">Политика конфиденциальности</h1>
        
        <div class="prose max-w-none">
          <p class="text-lg mb-4"><strong>Интернет-магазин SMT Premium Box</strong></p>
          <p class="mb-4">Дата вступления в силу: 20.07.2025</p>
          
          <h2 class="text-2xl font-semibold mt-8 mb-4">1. Общие положения</h2>
          <p class="mb-4">Настоящая Политика конфиденциальности (далее — «Политика») регулирует порядок обработки и защиты персональных данных пользователей, предоставляемых при использовании сайта https://giftboxopt.ru (далее — «Сайт»), принадлежащего магазину SMT Premium Box.</p>
          <p class="mb-4">Мы обязуемся соблюдать конфиденциальность и безопасность ваших данных и использовать их исключительно в соответствии с Федеральным законом РФ от 27.07.2006 №152-ФЗ "О персональных данных".</p>
          
          <h2 class="text-2xl font-semibold mt-8 mb-4">2. Сбор персональных данных</h2>
          <p class="mb-4">Мы собираем только те данные, которые необходимы для обработки заказов, обратной связи и улучшения работы Сайта. Это может включать:</p>
          <ul class="list-disc pl-6 mb-4">
            <li>ФИО;</li>
            <li>номер телефона;</li>
            <li>адрес электронной почты;</li>
            <li>адрес доставки (при необходимости);</li>
            <li>статус клиента (физическое или юридическое лицо);</li>
            <li>иные данные, предоставленные добровольно.</li>
          </ul>
          <p class="mb-4">Также автоматически собираются технические данные:</p>
          <ul class="list-disc pl-6 mb-4">
            <li>IP-адрес;</li>
            <li>тип браузера и устройства;</li>
            <li>информация о действиях на Сайте (куки, поведение на страницах).</li>
          </ul>
          
          <h2 class="text-2xl font-semibold mt-8 mb-4">3. Цели обработки данных</h2>
          <p class="mb-4">Собранные данные используются для:</p>
          <ul class="list-disc pl-6 mb-4">
            <li>оформления и исполнения заказов;</li>
            <li>связи с клиентом по вопросам заказа;</li>
            <li>отправки уведомлений о статусе заказа;</li>
            <li>предоставления технической поддержки;</li>
            <li>внутренней аналитики и улучшения Сайта;</li>
            <li>маркетинговых рассылок (только при согласии пользователя).</li>
          </ul>
          
          <h2 class="text-2xl font-semibold mt-8 mb-4">4. Условия обработки и хранения данных</h2>
          <p class="mb-4">Персональные данные обрабатываются в соответствии с принципами законности, справедливости и прозрачности.</p>
          <p class="mb-4">Доступ к данным имеют только уполномоченные лица SMT Premium Box.</p>
          <p class="mb-4">Данные хранятся на защищённых серверах и удаляются после достижения целей их обработки, но не позднее 5 лет.</p>
          <p class="mb-4">Мы не передаём ваши данные третьим лицам, за исключением случаев, предусмотренных законом РФ или необходимых для выполнения заказа (например, курьерским службам).</p>
          
          <h2 class="text-2xl font-semibold mt-8 mb-4">5. Cookies и техническая информация</h2>
          <p class="mb-4">Сайт использует cookies для обеспечения корректной работы:</p>
          <ul class="list-disc pl-6 mb-4">
            <li>сохранения содержимого корзины;</li>
            <li>персонализации интерфейса;</li>
            <li>статистики и аналитики (например, Яндекс.Метрика).</li>
          </ul>
          <p class="mb-4">Вы можете отключить cookies в настройках браузера, однако это может повлиять на функциональность сайта.</p>
          
          <h2 class="text-2xl font-semibold mt-8 mb-4">6. Права пользователя</h2>
          <p class="mb-4">Вы имеете право:</p>
          <ul class="list-disc pl-6 mb-4">
            <li>узнать, какие данные мы о вас храним;</li>
            <li>потребовать исправления или удаления данных;</li>
            <li>отозвать согласие на обработку;</li>
            <li>отказаться от получения маркетинговых сообщений;</li>
            <li>направить официальный запрос по адресу, указанному ниже.</li>
          </ul>
          <p class="mb-4">Обращения принимаются по email: <a href="mailto:smtpremiumbox@serbiyan.ru" class="text-blue-600">smtpremiumbox@serbiyan.ru</a></p>
          
          <h2 class="text-2xl font-semibold mt-8 mb-4">7. Безопасность</h2>
          <p class="mb-4">Мы применяем технические и организационные меры для защиты ваших данных от несанкционированного доступа, изменения, раскрытия или уничтожения, включая:</p>
          <ul class="list-disc pl-6 mb-4">
            <li>шифрование соединения (HTTPS);</li>
            <li>ограничение доступа к данным;</li>
            <li>резервное копирование.</li>
          </ul>
          
          <h2 class="text-2xl font-semibold mt-8 mb-4">8. Изменения политики</h2>
          <p class="mb-4">Мы оставляем за собой право изменять настоящую Политику. Актуальная версия всегда размещается на Сайте.</p>
          <p class="mb-4">Использование Сайта после публикации изменений считается согласием пользователя с новой редакцией Политики.</p>
        </div>
      </main>
      
      <footer class="bg-blue-950 text-white py-8 mt-12">
        <div class="container mx-auto px-6">
          <div class="flex flex-col md:flex-row justify-between">
            <div class="mb-6 md:mb-0">
              <h3 class="text-xl font-bold mb-4">SMT Premium Box</h3>
              <p class="text-gray-400">Красивые подарочные коробки оптом</p>
            </div>
            <div class="flex flex-col space-y-2">
              <a href="mailto:smtpremiumbox@serbiyan.ru" class="text-gray-400 hover:text-white">smtpremiumbox@serbiyan.ru</a>
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
    const mobileMenuToggle = container.querySelector('#mobile-menu-toggle');
    const mobileMenu = container.querySelector('#mobile-menu');

    if (mobileMenuToggle && mobileMenu) {
      const toggleHandler = () => {
        mobileMenu.classList.toggle('hidden');
      };
      this.addEventListenerWithCleanup(mobileMenuToggle, 'click', toggleHandler);
    }
  }
};

export default PrivacyPolicyComponent;