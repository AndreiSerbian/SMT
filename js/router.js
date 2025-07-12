
import HomeComponent from './components/homeComponent.js';
import ProductComponent from './components/productComponent.js';
import OrderComponent from './components/orderComponent.js';
import ContactsComponent from './components/contactsComponent.js';

class Router {
  constructor() {
    this.routes = {
      '#': () => HomeComponent.render(this.getMainContainer()),
      '#product': (id) => ProductComponent.render(id, this.getMainContainer()),
      '#order': () => OrderComponent.render(this.getMainContainer()),
      '#contacts': () => ContactsComponent.render(this.getMainContainer())
    };
    
    this.currentRoute = null; // Добавляем отслеживание текущего маршрута
    
    window.addEventListener('hashchange', () => this.handleRouteChange());
    window.addEventListener('load', () => this.handleRouteChange());
  }
  
  getMainContainer() {
    return document.getElementById('app');
  }
  
  clearContainer() {
    const container = this.getMainContainer();
    if (container) {
      // Удаляем все обработчики событий
      const elementsWithListeners = container.querySelectorAll('*');
      elementsWithListeners.forEach(element => {
        element.replaceWith(element.cloneNode(true));
      });
      
      // Полностью очищаем контейнер
      container.innerHTML = '';
      
      // Очищаем глобальные переменные
      if (window.quantityInput) {
        window.quantityInput = null;
      }
    }
  }
  
  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
  
  handleRouteChange() {
    const hash = window.location.hash || '#';
    
    // Проверяем, не находимся ли мы уже на этом маршруте
    if (this.currentRoute === hash) {
      return;
    }
    
    console.log('Маршрут изменился с', this.currentRoute, 'на', hash);
    
    // Очищаем предыдущий контент ПЕРЕД рендером нового
    this.clearContainer();
    
    // Обновляем текущий маршрут
    this.currentRoute = hash;
    
    if (hash === '#') {
      this.routes['#']();
    } else if (hash.startsWith('#product/')) {
      const productId = hash.slice(9);
      this.routes['#product'](productId);
    } else if (hash === '#order') {
      this.routes['#order']();
    } else if (hash === '#contacts') {
      this.routes['#contacts']();
    }
    
    // Скролл к верху страницы
    this.scrollToTop();
  }
  
  navigate(hash) {
    // Проверяем, не пытаемся ли мы перейти на тот же маршрут
    if (this.currentRoute === hash) {
      console.log('Попытка перехода на тот же маршрут:', hash);
      return;
    }
    
    window.location.hash = hash;
  }
}

export default Router;
