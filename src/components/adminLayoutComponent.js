export class AdminLayoutComponent {
  async mount(container) {
    container.innerHTML = `
      <div class="min-h-screen bg-gray-50">
        <div class="bg-white shadow">
          <div class="max-w-7xl mx-auto px-4 py-4">
            <h1 class="text-2xl font-bold">Админ-панель</h1>
          </div>
        </div>
        <div class="max-w-7xl mx-auto p-8">
          <p class="text-gray-600">Секция: ${this.currentSection || 'products'}</p>
          <p class="text-gray-600">Загрузка...</p>
        </div>
      </div>
    `;
  }
}
