
import Router from './router.js';
import { initApp } from './main.js';

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    // Set up the router
    const router = new Router();
    
    // Initialize the application
    initApp();
    
    // Обработка изменения хэша (для навигации)
    window.addEventListener('hashchange', () => {
      router.handleRouteChange();
    });
    
    // Начальная маршрутизация
    router.handleRouteChange();
  } catch (error) {
    console.error('Ошибка инициализации приложения:', error);
  }
});
