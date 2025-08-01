class MaintenanceComponent {
  static render(container) {
    container.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-4">
        <div class="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
          <div class="animate-pulse text-6xl mb-6">🛠️</div>
          <h1 class="text-3xl font-bold text-gray-800 mb-4">Технические работы</h1>
          <p class="text-gray-600 mb-6 leading-relaxed">
            Сайт временно недоступен в связи с проведением технических работ.
          </p>
          <p class="text-sm text-gray-500 mb-8">
            Просьба зайти на сайт через 15 минут.
          </p>
          
          <div class="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <p class="text-orange-700 text-sm">
              ⏰ Ориентировочное время работ: 10-15 минут
            </p>
          </div>
          
          <button 
            onclick="location.reload()" 
            class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            🔄 Обновить страницу
          </button>
        </div>
      </div>
    `;
  }
}

export default MaintenanceComponent;