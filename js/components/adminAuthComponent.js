import { supabase } from '../utils/supabase.js';

/**
 * Компонент авторизации админа
 */
export class AdminAuthComponent {
  constructor() {
    this.isLoading = false;
  }

  async mount(container) {
    container.innerHTML = this.getHTML();
    this.attachEvents();
  }

  getHTML() {
    return `
      <div class="min-h-screen bg-white flex items-center justify-center px-4">
        <div class="w-full max-w-md">
          <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-slate-900 mb-2">Админ-панель</h1>
            <p class="text-slate-600">Войдите для доступа к управлению</p>
          </div>

          <div class="bg-slate-50 rounded-2xl p-8 shadow-lg border border-slate-200">
            <form id="adminLoginForm" class="space-y-6">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">
                  Логин
                </label>
                <input 
                  type="text" 
                  name="login" 
                  required 
                  autocomplete="username"
                  class="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="Введите логин"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">
                  Пароль
                </label>
                <input 
                  type="password" 
                  name="password" 
                  required 
                  autocomplete="current-password"
                  class="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="Введите пароль"
                />
              </div>

              <div id="errorMessage" class="hidden">
                <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  <span id="errorText"></span>
                </div>
              </div>

              <button 
                type="submit" 
                id="loginButton"
                class="w-full bg-slate-900 text-white py-3 rounded-xl font-medium hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span id="loginButtonText">Войти</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  attachEvents() {
    const form = document.getElementById('adminLoginForm');
    form.addEventListener('submit', (e) => this.handleLogin(e));
  }

  async handleLogin(e) {
    e.preventDefault();
    
    if (this.isLoading) return;

    const formData = new FormData(e.target);
    const login = formData.get('login').trim();
    const password = formData.get('password');

    // Валидация
    if (!login || !password) {
      this.showError('Заполните все поля');
      return;
    }

    this.setLoading(true);
    this.hideError();

    try {
      // Проверка через RPC функцию is_admin_user
      const { data, error } = await supabase.rpc('is_admin_user', {
        login_input: login,
        password_input: password
      });

      if (error) throw error;

      if (data === true) {
        // Успешная авторизация
        this.saveSession(login);
        
        // Редирект на главную страницу админки
        window.location.hash = '#admin/products';
      } else {
        this.showError('Неверный логин или пароль');
      }
    } catch (error) {
      console.error('Login error:', error);
      this.showError('Ошибка авторизации. Попробуйте позже.');
    } finally {
      this.setLoading(false);
    }
  }

  saveSession(login) {
    // Сохраняем только логин и время входа (НЕ пароль!)
    const sessionData = {
      admin_login: login,
      login_time: new Date().toISOString()
    };
    sessionStorage.setItem('admin_session', JSON.stringify(sessionData));
  }

  setLoading(loading) {
    this.isLoading = loading;
    const button = document.getElementById('loginButton');
    const buttonText = document.getElementById('loginButtonText');
    
    if (button && buttonText) {
      button.disabled = loading;
      buttonText.textContent = loading ? 'Вход...' : 'Войти';
    }
  }

  showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    
    if (errorDiv && errorText) {
      errorText.textContent = message;
      errorDiv.classList.remove('hidden');
    }
  }

  hideError() {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
      errorDiv.classList.add('hidden');
    }
  }

  // Статические методы для проверки сессии
  static isAuthenticated() {
    const sessionData = sessionStorage.getItem('admin_session');
    if (!sessionData) return false;

    try {
      const session = JSON.parse(sessionData);
      // Проверяем, что сессия не старше 24 часов
      const loginTime = new Date(session.login_time);
      const now = new Date();
      const hoursSinceLogin = (now - loginTime) / (1000 * 60 * 60);
      
      return hoursSinceLogin < 24;
    } catch {
      return false;
    }
  }

  static getAdminLogin() {
    const sessionData = sessionStorage.getItem('admin_session');
    if (!sessionData) return null;

    try {
      const session = JSON.parse(sessionData);
      return session.admin_login;
    } catch {
      return null;
    }
  }

  static logout() {
    sessionStorage.removeItem('admin_session');
    window.location.hash = '#admin';
  }
}
