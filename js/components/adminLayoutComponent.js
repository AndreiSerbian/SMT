import { AdminAuthComponent } from './adminAuthComponent.js';

/**
 * Layout для админ-панели с навигацией
 */
export class AdminLayoutComponent {
  constructor() {
    this.currentSection = 'products';
    this.sectionComponent = null;
  }

  async mount(container) {
    // Проверка авторизации
    if (!AdminAuthComponent.isAuthenticated()) {
      window.location.hash = '#admin';
      return;
    }

    container.innerHTML = this.getHTML();
    this.attachEvents();
    
    // Загружаем текущую секцию
    await this.loadSection(this.currentSection);
    
    // Слушаем изменения хеша для переключения между разделами
    this.hashChangeHandler = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#admin/')) {
        const section = hash.replace('#admin/', '');
        if (['products', 'categories', 'colors', 'orders'].includes(section)) {
          this.handleSectionChange(section);
        }
      }
    };
    
    window.addEventListener('hashchange', this.hashChangeHandler);
  }

  getHTML() {
    const adminLogin = AdminAuthComponent.getAdminLogin();
    
    return `
      <div class="h-full bg-slate-50 text-slate-900">
        <!-- HEADER -->
        <header class="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
          <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-xl">⚙️</span>
              <h1 class="text-lg font-semibold">Админ-панель</h1>
              ${adminLogin ? `<span class="text-sm text-slate-600 ml-2">(${adminLogin})</span>` : ''}
            </div>
            <div class="flex items-center gap-2">
              <nav class="hidden sm:flex gap-1">
                <a href="#admin/products" data-section="products" class="nav-link px-3 py-1.5 rounded-full">Товары</a>
                <a href="#admin/categories" data-section="categories" class="nav-link px-3 py-1.5 rounded-full">Категории</a>
                <a href="#admin/colors" data-section="colors" class="nav-link px-3 py-1.5 rounded-full">Цвета</a>
                <a href="#admin/orders" data-section="orders" class="nav-link px-3 py-1.5 rounded-full">Заказы</a>
              </nav>
              <button id="btnLogout" class="px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition">
                Выйти
              </button>
            </div>
          </div>
          <!-- Mobile tabs -->
          <div class="sm:hidden px-4 pb-3 flex gap-2 overflow-x-auto">
            <a href="#admin/products" data-section="products" class="nav-link px-3 py-1.5 rounded-full whitespace-nowrap">Товары</a>
            <a href="#admin/categories" data-section="categories" class="nav-link px-3 py-1.5 rounded-full whitespace-nowrap">Категории</a>
            <a href="#admin/colors" data-section="colors" class="nav-link px-3 py-1.5 rounded-full whitespace-nowrap">Цвета</a>
            <a href="#admin/orders" data-section="orders" class="nav-link px-3 py-1.5 rounded-full whitespace-nowrap">Заказы</a>
          </div>
        </header>

        <!-- CONTENT -->
        <main id="adminContent" class="max-w-7xl mx-auto px-4 py-4">
          <div class="flex items-center justify-center py-12">
            <div class="text-center">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
              <p class="text-slate-600">Загрузка...</p>
            </div>
          </div>
        </main>
      </div>
    `;
  }

  attachEvents() {
    // Logout
    const logoutBtn = document.getElementById('btnLogout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (confirm('Вы уверены, что хотите выйти?')) {
          AdminAuthComponent.logout();
        }
      });
    }

    // Обновление активной ссылки при изменении хеша
    this.updateActiveLink();
  }

  updateActiveLink() {
    const hash = window.location.hash;
    const section = hash.replace('#admin/', '') || 'products';
    
    document.querySelectorAll('.nav-link').forEach(link => {
      const linkSection = link.getAttribute('data-section');
      if (linkSection === section) {
        link.classList.add('bg-slate-900', 'text-white');
        link.classList.remove('hover:bg-slate-100');
      } else {
        link.classList.remove('bg-slate-900', 'text-white');
        link.classList.add('hover:bg-slate-100');
      }
    });
  }

  async loadSection(section) {
    this.currentSection = section;
    this.updateActiveLink();

    const contentContainer = document.getElementById('adminContent');
    if (!contentContainer) return;

    try {
      // Динамическая загрузка компонента
      let Component;
      
      switch (section) {
        case 'products':
          const productsModule = await import('./modernAdminComponent.js');
          Component = productsModule.ModernAdminComponent;
          break;
        case 'categories':
          const categoriesModule = await import('./adminCategoriesComponent.js');
          Component = categoriesModule.AdminCategoriesComponent;
          break;
        case 'colors':
          const colorsModule = await import('./adminColorsComponent.js');
          Component = colorsModule.AdminColorsComponent;
          break;
        case 'orders':
          const ordersModule = await import('./adminOrdersComponent.js');
          Component = ordersModule.AdminOrdersComponent;
          break;
        default:
          throw new Error('Unknown section');
      }

      // Уничтожаем предыдущий компонент если есть
      if (this.sectionComponent && typeof this.sectionComponent.destroy === 'function') {
        this.sectionComponent.destroy();
      }

      // Создаем и монтируем новый компонент
      this.sectionComponent = new Component();
      
      // Очищаем контейнер
      contentContainer.innerHTML = '';
      
      // Монтируем компонент
      if (typeof this.sectionComponent.mount === 'function') {
        await this.sectionComponent.mount(contentContainer);
      } else if (typeof this.sectionComponent.render === 'function') {
        contentContainer.innerHTML = await this.sectionComponent.render();
        if (typeof this.sectionComponent.attachEvents === 'function') {
          this.sectionComponent.attachEvents();
        }
      }
    } catch (error) {
      console.error('Error loading section:', error);
      contentContainer.innerHTML = `
        <div class="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p class="text-red-700 font-medium mb-2">Ошибка загрузки раздела</p>
          <p class="text-red-600 text-sm">${error.message}</p>
          <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            Перезагрузить
          </button>
        </div>
      `;
    }
  }

  async handleSectionChange(section) {
    await this.loadSection(section);
  }

  destroy() {
    if (this.sectionComponent && typeof this.sectionComponent.destroy === 'function') {
      this.sectionComponent.destroy();
    }
    
    // Удаляем обработчик хеша
    if (this.hashChangeHandler) {
      window.removeEventListener('hashchange', this.hashChangeHandler);
    }
  }
}
