import { supabase } from '../utils/supabase.js';
import { NotificationService } from '../services/notificationService.js';
import { productsService } from '../services/productsService.js';

export class AdminComponent {
  constructor() {
    // Проверяем сохраненное состояние авторизации
    this.isAuthenticated = sessionStorage.getItem('admin_authenticated') === 'true';
    this.currentAdminLogin = sessionStorage.getItem('admin_login');
    this.currentAdminPassword = sessionStorage.getItem('admin_password');
    this.productsWithPrices = [];
    this.maintenanceMode = false;
  }

  // Метод для проверки режима технических работ (заглушка)
  checkMaintenanceMode() {
    // Технические работы больше не блокируют сайт
    return false;
  }

  // Метод для загрузки настроек (заглушка)
  async loadSettings() {
    // Загрузка настроек не требуется
    return true;
  }

  async render() {
    // Проверяем авторизацию при загрузке
    if (!this.isAuthenticated) {
      return this.renderLoginModal();
    }

    return this.renderAdminPanel();
  }

  renderLoginModal() {
    return `
      <div id="admin-login-modal" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
        <div class="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <h2 class="text-2xl font-bold text-center mb-6">🔐 Админ-панель</h2>
          <form id="admin-login-form">
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">Логин</label>
              <input 
                type="text" 
                id="admin-login" 
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
            </div>
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">Пароль</label>
              <input 
                type="password" 
                id="admin-password" 
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
            </div>
            <button 
              type="submit" 
              class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Войти
            </button>
          </form>
          <div id="admin-login-error" class="mt-4 text-red-600 text-sm hidden"></div>
          <button 
            id="close-admin-modal" 
            class="mt-4 w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    `;
  }

  renderAdminPanel() {
    return `
      <div class="min-h-screen bg-gray-100 p-6">
        <div class="max-w-6xl mx-auto">
          <div class="bg-white rounded-lg shadow-lg p-6">
            <div class="flex justify-between items-center mb-6">
              <h1 class="text-2xl font-bold text-gray-800">⚙️ Админ-панель</h1>
              <div class="flex gap-3">
                <button 
                  id="admin-logout" 
                  class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                >
                  Выйти
                </button>
              </div>
            </div>

            <!-- Вкладки админки -->
            <div class="admin-tabs">
              <button class="tab-btn active" data-tab="products">Товары</button>
              <button class="tab-btn" data-tab="media">Медиа</button>
              <button class="tab-btn" data-tab="legacy-prices">Цены (устар.)</button>
              <button class="tab-btn" data-tab="orders">Заказы</button>
              <button class="tab-btn" data-tab="settings">Настройки</button>
            </div>

            <div class="tab-content">
              <div class="tab-pane active" id="products-tab">
                <div id="admin-products-container">
                  <!-- Здесь будет компонент управления товарами -->
                </div>
              </div>

              <div class="tab-pane" id="media-tab">
                <div id="media-manager-container">
                  <!-- Здесь будет компонент управления медиа -->
                </div>
              </div>
              
              <div class="tab-pane" id="legacy-prices-tab">
                <div class="legacy-prices">
                  <h3>Управление ценами (устаревшая система)</h3>
                  <p class="warning">⚠️ Эта система устарела. Используйте управление товарами.</p>
                  ${this.renderProductsCards()}
                </div>
              </div>

              <div class="tab-pane" id="orders-tab">
                <div class="orders-management">
                  <h3>Управление заказами</h3>
                  <p class="text-gray-600">Здесь будет управление заказами...</p>
                </div>
              </div>

              <div class="tab-pane" id="settings-tab">
                <div class="settings-management">
                  <h3>Настройки сайта</h3>
                  <p class="text-gray-600">Здесь будут настройки сайта...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderProductsCards() {
    console.log('Rendering products cards. Products count:', this.productsWithPrices ? this.productsWithPrices.length : 0);
    
    if (!this.productsWithPrices || this.productsWithPrices.length === 0) {
      return `<div class="text-center text-gray-500 py-8">Товары не найдены</div>`;
    }

    return `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${this.productsWithPrices.map(product => {
          const currentPrice = product.price || '';
          return `
            <div class="bg-gray-50 rounded-lg p-4 border">
              <div class="mb-3">
                <div class="text-xs text-gray-500 font-mono">ID: ${product.id}</div>
                <div class="font-medium text-gray-900">${product.name}</div>
                <div class="text-sm text-gray-600">${product.color}</div>
                <div class="text-xs ${product.price ? 'text-green-600' : 'text-red-600'}">
                  ${product.price ? '✓ Цена установлена' : '⚠ Цена не установлена'}
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-sm text-gray-600">Цена:</span>
                <input 
                  type="number" 
                  id="price-${product.id}" 
                  value="${currentPrice}"
                  placeholder="Не установлена"
                  class="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="100"
                >
                <span class="text-sm text-gray-600">₽</span>
                <button 
                  onclick="window.adminComponent.updatePrice('${product.id}')"
                  class="ml-2 bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                >
                  ✓
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  async mount(container) {
    // Сброс стилей прокрутки при загрузке админки
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.documentElement.style.overflow = '';
    
    await this.loadProductsWithPrices();
    
    container.innerHTML = await this.render();
    this.attachEventListeners(container);
    
    // Загружаем компоненты
    if (this.isAuthenticated) {
      await this.loadProductsComponent();
      await this.loadMediaManagerComponent();
    }
  }

  async loadProductsComponent() {
    try {
      const { AdminProductsComponent } = await import('./adminProductsComponent.js');
      const container = document.getElementById('admin-products-container');
      if (container) {
        await AdminProductsComponent.mount(container);
      }
    } catch (error) {
      console.error('Error loading products component:', error);
    }
  }

  async loadMediaManagerComponent() {
    try {
      const { mediaManagerComponent } = await import('./mediaManagerComponent.js');
      const container = document.getElementById('media-manager-container');
      if (container) {
        container.innerHTML = mediaManagerComponent.render();
        mediaManagerComponent.attachEventListeners();
        // Делаем компонент доступным глобально для вызовов из HTML
        window.mediaManager = mediaManagerComponent;
      }
    } catch (error) {
      console.error('Error loading media manager component:', error);
    }
  }

  attachEventListeners(container) {
    if (!this.isAuthenticated) {
      // Обработчики для формы входа
      const loginForm = container.querySelector('#admin-login-form');
      const closeModal = container.querySelector('#close-admin-modal');
      
      if (loginForm) {
        loginForm.addEventListener('submit', (e) => this.handleLogin(e));
      }
      
      if (closeModal) {
        closeModal.addEventListener('click', () => {
          window.history.back();
        });
      }
    } else {
      // Обработчики для админ-панели
      const logoutBtn = container.querySelector('#admin-logout');
      
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => this.logout());
      }

      // Обработчики для вкладок
      const tabBtns = container.querySelectorAll('.tab-btn');
      const tabPanes = container.querySelectorAll('.tab-pane');
      
      tabBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
          const targetTab = btn.dataset.tab;
          
          // Убираем активные классы
          tabBtns.forEach(b => b.classList.remove('active'));
          tabPanes.forEach(pane => pane.classList.remove('active'));
          
          // Добавляем активные классы
          btn.classList.add('active');
          const targetPane = container.querySelector(`#${targetTab}-tab`);
          if (targetPane) {
            targetPane.classList.add('active');
            
            // Перезагружаем компоненты при переключении
            if (targetTab === 'products') {
              await this.loadProductsComponent();
            } else if (targetTab === 'media') {
              await this.loadMediaManagerComponent();
            }
          }
        });
      });
    }
  }

  async handleLogin(event) {
    event.preventDefault();
    
    const login = document.getElementById('admin-login').value;
    const password = document.getElementById('admin-password').value;
    const errorDiv = document.getElementById('admin-login-error');
    
    try {
      // Проверяем логин и пароль в Supabase
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('login', login)
        .eq('password', password)
        .single();
      
      if (error || !data) {
        throw new Error('Неверный логин или пароль');
      }
      
      // Успешная авторизация
      this.isAuthenticated = true;
      this.currentAdminLogin = login;
      this.currentAdminPassword = password;
      sessionStorage.setItem('admin_authenticated', 'true');
      sessionStorage.setItem('admin_login', login);
      sessionStorage.setItem('admin_password', password);
      
      // Отправляем уведомление в Telegram
      await this.sendTelegramNotification(login);
      
      // Перерендериваем компонент
      const container = document.getElementById('app');
      if (container) {
        await this.mount(container);
      }
      
    } catch (error) {
      console.error('Login error:', error);
      errorDiv.textContent = error.message;
      errorDiv.classList.remove('hidden');
    }
  }

  async sendTelegramNotification(login) {
    try {
      const now = new Date();
      const dateTime = now.toLocaleString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const message = `🔐 Вход в админ-панель\n👤 Логин: ${login}\n🕒 Время: ${dateTime}`;
      
      await NotificationService.sendTelegramMessage(message, true);
    } catch (error) {
      console.error('Failed to send Telegram notification:', error);
    }
  }

  logout() {
    this.isAuthenticated = false;
    sessionStorage.removeItem('admin_authenticated');
    sessionStorage.removeItem('admin_login');
    sessionStorage.removeItem('admin_password');
    window.location.hash = '#';
  }

  async loadProductsWithPrices() {
    try {
      this.productsWithPrices = await productsService.getActiveProducts();
    } catch (error) {
      console.error('Failed to load products with prices:', error);
      this.productsWithPrices = [];
    }
  }

  async updatePrice(productId) {
    const priceInput = document.getElementById(`price-${productId}`);
    const button = priceInput.parentElement.querySelector('button');
    const newPrice = parseFloat(priceInput.value);
    
    if (isNaN(newPrice) || newPrice < 0) {
      this.showNotification('Введите корректную цену', 'error');
      return;
    }
    
    // Получаем актуальные данные из sessionStorage
    const currentLogin = sessionStorage.getItem('admin_login');
    const currentPassword = sessionStorage.getItem('admin_password');
    
    console.log('Проверка авторизации:', {
      currentLogin: currentLogin,
      currentPassword: currentPassword ? '[HIDDEN]' : null,
      sessionAuth: sessionStorage.getItem('admin_authenticated')
    });
    
    // Проверяем наличие учетных данных
    if (!currentLogin || !currentPassword) {
      this.showNotification('Ошибка: недостаточно данных для авторизации. Перелогиньтесь.', 'error');
      return;
    }
    
    // Показываем loading состояние
    const originalButtonText = button.innerHTML;
    button.innerHTML = '⏳';
    button.disabled = true;
    priceInput.disabled = true;
    
    try {
      // Используем edge function для обновления цены
      const response = await fetch('https://bsndismiessofvhglzrv.supabase.co/functions/v1/update-price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: productId,
          price: newPrice,
          admin_login: currentLogin,
          admin_password: currentPassword
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update price');
      }
      
      // Обновляем локальные данные
      const product = this.productsWithPrices.find(p => p.id === productId);
      if (product) {
        product.price = newPrice;
      }
      
      // Показываем уведомление об успехе
      this.showNotification(`Цена товара обновлена: ${newPrice}₽`, 'success');
      
    } catch (error) {
      console.error('Failed to update price:', error);
      this.showNotification(`Ошибка: ${error.message}`, 'error');
      
      // Возвращаем старое значение в случае ошибки
      const product = this.productsWithPrices.find(p => p.id === productId);
      if (product && product.price !== undefined) {
        priceInput.value = product.price;
      } else {
        priceInput.value = '';
      }
    } finally {
      // Восстанавливаем кнопку
      button.innerHTML = originalButtonText;
      button.disabled = false;
      priceInput.disabled = false;
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : 
                   type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    
    notification.className = `fixed top-4 right-4 ${bgColor} text-white p-4 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Анимация появления
    setTimeout(() => {
      notification.classList.remove('translate-x-full');
    }, 100);
    
    // Удаление через 4 секунды
    setTimeout(() => {
      notification.classList.add('translate-x-full');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }, 4000);
  }


  // Метод для получения актуальной цены товара
  static async getProductPrice(productId) {
    if (window.adminComponent && window.adminComponent.productPrices[productId]) {
      return window.adminComponent.productPrices[productId];
    }
    
    try {
      const products = await productsService.getActiveProducts();
      const product = products.find(p => p.id === productId);
      return product ? product.price_rub || 0 : 0;
    } catch (error) {
      console.error('Error getting product price:', error);
      return 0;
    }
  }
}

// Глобальный экземпляр для доступа к ценам из других компонентов
window.adminComponent = new AdminComponent();