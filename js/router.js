
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
    
    window.addEventListener('hashchange', () => this.handleRouteChange());
    window.addEventListener('load', () => this.handleRouteChange());
  }
  
  getMainContainer() {
    return document.getElementById('app');
  }
  
  clearContainer() {
    const container = this.getMainContainer();
    if (container) {
      container.innerHTML = '';
    }
  }
  
  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
  
  handleRouteChange() {
    // Очищаем предыдущий контент
    this.clearContainer();
    
    const hash = window.location.hash || '#';
    
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
    window.location.hash = hash;
  }
}

export default Router;
