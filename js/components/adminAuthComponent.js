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
                  Email
                </label>
                <input 
                  type="email" 
                  name="login" 
                  required 
                  autocomplete="username"
                  class="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="Введите email"
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
    const email = formData.get('login').trim();
    const password = formData.get('password');

    // Валидация
    if (!email || !password) {
      this.showError('Заполните все поля');
      return;
    }

    this.setLoading(true);
    this.hideError();

    try {
      // Вход через Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw authError;

      // Проверяем, что пользователь имеет роль admin
      const { data: hasAdminRole, error: roleError } = await supabase.rpc('has_role', {
        _user_id: authData.user.id,
        _role: 'admin'
      });

      if (roleError) throw roleError;

      if (!hasAdminRole) {
        // Если у пользователя нет роли админа, выходим
        await supabase.auth.signOut();
        throw new Error('У вас нет прав администратора');
      }

      // Успешная авторизация - редирект на главную страницу админки
      window.location.hash = '#admin/products';
    } catch (error) {
      console.error('Login error:', error);
      if (error.message === 'Invalid login credentials') {
        this.showError('Неверный email или пароль');
      } else if (error.message.includes('прав администратора')) {
        this.showError(error.message);
      } else {
        this.showError('Ошибка авторизации. Попробуйте позже.');
      }
    } finally {
      this.setLoading(false);
    }
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
  static async isAuthenticated() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      // Проверяем роль admin
      const { data: hasAdminRole, error } = await supabase.rpc('has_role', {
        _user_id: session.user.id,
        _role: 'admin'
      });

      if (error) {
        console.error('Role check error:', error);
        return false;
      }

      return hasAdminRole === true;
    } catch (error) {
      console.error('Auth check error:', error);
      return false;
    }
  }

  static async getAdminEmail() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user?.email || null;
    } catch {
      return null;
    }
  }

  static async logout() {
    await supabase.auth.signOut();
    window.location.hash = '#admin';
  }
}
