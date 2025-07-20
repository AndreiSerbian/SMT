const TermsOfUseComponent = {
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
        <h1 class="text-3xl font-bold mb-6">Условия пользования</h1>
        
        <div class="prose max-w-none">
          <p class="text-lg mb-4"><strong>Интернет-магазин SMT Premium Box</strong></p>
          <p class="mb-4">Дата вступления в силу: 20.07.2025</p>
          
          <h2 class="text-2xl font-semibold mt-8 mb-4">1. Общие положения</h2>
          <p class="mb-4">1.1. Настоящие Условия пользования (далее — «Условия») регулируют порядок взаимодействия между пользователями и интернет-магазином SMT Premium Box, расположенным по адресу https://giftboxopt.ru (далее — «Сайт»).</p>
          <p class="mb-4">1.2. Используя Сайт, оформляя заказ или просматривая товары, пользователь подтверждает своё согласие с настоящими Условиями и Политикой конфиденциальности.</p>
          
          <h2 class="text-2xl font-semibold mt-8 mb-4">2. Ассортимент и навигация по сайту</h2>
          <p class="mb-4">2.1. Главная страница содержит четыре категории подарочных упаковок, каждая из которых представлена через слайдер с изображениями товаров.</p>
          <p class="mb-4">2.2. Внутри категории пользователь может использовать переключатель цвета (button color) для просмотра товара определённого цвета.</p>
          <p class="mb-4">2.3. Некоторые товары визуально выделяются синим кружком — это навигационный элемент, указывающий на особые позиции и позволяющий быстро перейти к карточке товара соответствующего цвета.</p>
          <p class="mb-4">2.4. Также доступен переход к карточке товара через кнопку "Подробно", которая отображается под каждой позицией в категории.</p>
          <p class="mb-4">2.5. Для перехода между категориями пользователь должен вернуться на главную страницу и выбрать нужную категорию заново.</p>
          
          <h2 class="text-2xl font-semibold mt-8 mb-4">3. Корзина и оформление предзаказа</h2>
          <p class="mb-4">3.1. Пользователь может выбрать количество товара разной категории, размера и цвета и добавить их в корзину. Содержимое корзины сохраняется при навигации по Сайту.</p>
          <p class="mb-4">3.2. После того как сумма заказа достигает 10 000 рублей (минимальный предзаказ), становится доступной кнопка "Оформить заказ".</p>
          <p class="mb-4">3.3. При оформлении предзаказа пользователь указывает:</p>
          <ul class="list-disc pl-6 mb-4">
            <li>ФИО и контактный email;</li>
            <li>способ доставки (доставка, самовывоз, ПВЗ);</li>
            <li>способ оплаты</li>
          </ul>
          
          <h2 class="text-2xl font-semibold mt-8 mb-4">4. Подтверждение и оплата</h2>
          <p class="mb-4">4.1. После оформления пользователь получает письмо на email с кнопкой подтверждения.</p>
          <p class="mb-4">4.2. Нажав на кнопку, пользователь подтверждает заказ, который передаётся в обработку.</p>
          <p class="mb-4">4.3. После обработки менеджер связывается с пользователем для обсуждения финального объёма, и суммы и прочих условий.</p>
          
          <h2 class="text-2xl font-semibold mt-8 mb-4">5. Статусы заказов</h2>
          <ul class="list-disc pl-6 mb-4">
            <li><strong>Создан</strong> — заказ оформлен, но не подтверждён;</li>
            <li><strong>Подтверждён</strong> — пользователь подтвердил заказ по email.</li>
          </ul>
          
          <h2 class="text-2xl font-semibold mt-8 mb-4">6. Поддержка и обратная связь</h2>
          <p class="mb-4">6.1. В случае технических сложностей или вопросов по заказу вы можете связаться с нами:</p>
          <p class="mb-4">Email: <a href="mailto:smtpremiumbox@serbiyan.ru" class="text-blue-600">smtpremiumbox@serbiyan.ru</a></p>
          <p class="mb-4">Дополнительные контакты указаны на странице Контакты.</p>
          
          <h2 class="text-2xl font-semibold mt-8 mb-4">7. Изменения условий</h2>
          <p class="mb-4">7.1. Магазин SMT Premium Box оставляет за собой право вносить изменения в настоящие Условия. Обновлённая редакция публикуется на Сайте и вступает в силу с момента размещения.</p>
          <p class="mb-4">7.2. Продолжение использования Сайта после изменений означает согласие пользователя с обновлёнными условиями.</p>
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

export default TermsOfUseComponent;