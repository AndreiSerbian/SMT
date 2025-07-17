import { supabase } from '../utils/env.js';
import { products } from '../data/products.js';
import { NotificationService } from '../services/notificationService.js';

export class AdminComponent {
  constructor() {
    this.isAuthenticated = false;
    this.productPrices = {};
    this.maintenanceMode = false;
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
              <h1 class="text-3xl font-bold text-gray-800">⚙️ Админ-панель SMT Premium Box</h1>
              <button 
                id="admin-logout" 
                class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                Выйти
              </button>
            </div>

            <!-- Режим технических работ -->
            <div class="mb-8 p-4 border rounded-lg ${this.maintenanceMode ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}">
              <div class="flex justify-between items-center">
                <div>
                  <h3 class="text-lg font-semibold">🛠 Технические работы</h3>
                  <p class="text-sm text-gray-600">
                    Статус: ${this.maintenanceMode ? 'Активен' : 'Отключен'}
                  </p>
                </div>
                <button 
                  id="toggle-maintenance" 
                  class="px-4 py-2 rounded-md text-white transition-colors ${this.maintenanceMode ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}"
                >
                  ${this.maintenanceMode ? 'Отключить' : 'Включить'}
                </button>
              </div>
            </div>

            <!-- Управление товарами -->
            <div class="mb-8">
              <h2 class="text-2xl font-semibold mb-4">📦 Управление товарами</h2>
              <div class="overflow-x-auto">
                <table class="w-full bg-white border border-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-4 py-3 text-left text-sm font-medium text-gray-900">Название</th>
                      <th class="px-4 py-3 text-left text-sm font-medium text-gray-900">Текущая цена</th>
                      <th class="px-4 py-3 text-left text-sm font-medium text-gray-900">Новая цена</th>
                      <th class="px-4 py-3 text-left text-sm font-medium text-gray-900">Действие</th>
                    </tr>
                  </thead>
                  <tbody id="admin-products-table">
                    ${this.renderProductsTable()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderProductsTable() {
    return products.map(product => {
      const currentPrice = this.productPrices[product.id] || product.price;
      return `
        <tr class="border-t border-gray-200">
          <td class="px-4 py-3 text-sm text-gray-900">${product.name}</td>
          <td class="px-4 py-3 text-sm text-gray-900">${currentPrice} ₽</td>
          <td class="px-4 py-3">
            <input 
              type="number" 
              id="price-${product.id}" 
              value="${currentPrice}"
              class="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
          </td>
          <td class="px-4 py-3">
            <button 
              onclick="window.adminComponent.updatePrice('${product.id}')"
              class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
            >
              Сохранить
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  async mount(container) {
    // Сброс стилей прокрутки при загрузке админки
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.documentElement.style.overflow = '';
    
    await this.loadSettings();
    
    container.innerHTML = await this.render();
    this.attachEventListeners(container);
    
    // Проверяем режим технических работ
    this.checkMaintenanceMode();
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
      const maintenanceBtn = container.querySelector('#toggle-maintenance');
      
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => this.logout());
      }
      
      if (maintenanceBtn) {
        maintenanceBtn.addEventListener('click', () => this.toggleMaintenance());
      }
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
      
      // Отправляем уведомление в Telegram
      await this.sendTelegramNotification(login);
      
      // Перерендериваем компонент
      const container = document.querySelector('main');
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
    window.location.hash = '#home';
  }

  async loadSettings() {
    try {
      // Загружаем настройки из Supabase
      const { data, error } = await supabase
        .from('site_settings')
        .select('*');
      
      if (!error && data) {
        data.forEach(setting => {
          if (setting.key === 'maintenance_mode') {
            this.maintenanceMode = setting.value === 'true';
          } else if (setting.key === 'product_prices') {
            this.productPrices = setting.value || {};
          }
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async updatePrice(productId) {
    const priceInput = document.getElementById(`price-${productId}`);
    const newPrice = parseFloat(priceInput.value);
    
    if (isNaN(newPrice) || newPrice < 0) {
      alert('Введите корректную цену');
      return;
    }
    
    try {
      // Обновляем цену в объекте
      this.productPrices[productId] = newPrice;
      
      // Сохраняем в Supabase
      await supabase
        .from('site_settings')
        .upsert({
          key: 'product_prices',
          value: this.productPrices
        });
      
      // Обновляем отображение в таблице
      const currentPriceCell = priceInput.closest('tr').children[1];
      currentPriceCell.textContent = `${newPrice} ₽`;
      
      alert('Цена успешно обновлена');
      
    } catch (error) {
      console.error('Failed to update price:', error);
      alert('Ошибка при обновлении цены');
    }
  }

  async toggleMaintenance() {
    try {
      this.maintenanceMode = !this.maintenanceMode;
      
      // Сохраняем в Supabase
      await supabase
        .from('site_settings')
        .upsert({
          key: 'maintenance_mode',
          value: this.maintenanceMode.toString()
        });
      
      // Перерендериваем компонент
      const container = document.querySelector('main');
      if (container) {
        await this.mount(container);
      }
      
      // Обновляем режим технических работ на всех страницах
      this.checkMaintenanceMode();
      
    } catch (error) {
      console.error('Failed to toggle maintenance mode:', error);
      alert('Ошибка при переключении режима технических работ');
    }
  }

  checkMaintenanceMode() {
    // Проверяем и применяем режим технических работ для других страниц
    const currentHash = window.location.hash;
    
    if (this.maintenanceMode && currentHash !== '#admin') {
      this.showMaintenanceOverlay();
    } else {
      this.hideMaintenanceOverlay();
    }
  }

  showMaintenanceOverlay() {
    let overlay = document.getElementById('maintenance-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'maintenance-overlay';
      overlay.className = 'fixed inset-0 bg-black/60 z-50 flex items-center justify-center';
      overlay.innerHTML = `
        <div class="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
          <div class="text-6xl mb-4">🛠</div>
          <h2 class="text-2xl font-bold text-gray-800 mb-4">Ведутся технические работы</h2>
          <p class="text-gray-600">Пожалуйста, зайдите позже.</p>
        </div>
      `;
      document.body.appendChild(overlay);
    }
  }

  hideMaintenanceOverlay() {
    const overlay = document.getElementById('maintenance-overlay');
    if (overlay) {
      overlay.remove();
    }
  }

  // Метод для получения актуальной цены товара
  static getProductPrice(productId) {
    if (window.adminComponent && window.adminComponent.productPrices[productId]) {
      return window.adminComponent.productPrices[productId];
    }
    
    const product = products.find(p => p.id === productId);
    return product ? product.price : 0;
  }
}

// Глобальный экземпляр для доступа к ценам из других компонентов
window.adminComponent = new AdminComponent();