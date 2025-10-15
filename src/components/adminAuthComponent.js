export class AdminAuthComponent {
  static isAuthenticated() {
    return localStorage.getItem('admin_logged_in') === 'true';
  }

  async mount(container) {
    container.innerHTML = `
      <div class="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div class="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 class="text-3xl font-bold mb-6">Вход в админ-панель</h1>
          <p class="text-gray-600">Загрузка...</p>
        </div>
      </div>
    `;
  }
}
