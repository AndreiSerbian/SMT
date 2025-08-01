
import HomeComponent from './components/homeComponent.js';
import ProductComponent from './components/productComponent.js';
import OrderComponent from './components/orderComponent.js';
import ContactsComponent from './components/contactsComponent.js';
import PrivacyPolicyComponent from './components/privacyPolicyComponent.js';
import TermsOfUseComponent from './components/termsOfUseComponent.js';
import { AdminComponent } from './components/adminComponent.js';

class Router {
  constructor() {
    this.currentComponent = null;
    this.adminComponent = new AdminComponent();
    this.routes = {
      '#': () => HomeComponent.render(this.getMainContainer()),
      '#product': (id) => ProductComponent.render(id, this.getMainContainer()),
      '#order': () => OrderComponent.render(this.getMainContainer()),
      '#contacts': () => ContactsComponent.render(this.getMainContainer()),
      '#privacy-policy': () => PrivacyPolicyComponent.render(this.getMainContainer()),
      '#terms-of-use': () => TermsOfUseComponent.render(this.getMainContainer()),
      '#admin': () => this.adminComponent.mount(this.getMainContainer())
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
      // Вызываем destroy у текущего компонента перед очисткой
      if (this.currentComponent && this.currentComponent.destroy) {
        this.currentComponent.destroy(container);
      }
      // Полностью очищаем контейнер
      container.replaceChildren();
    }
  }
  
  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
  
  handleRouteChange() {
    // Очищаем предыдущий контент ПЕРЕД рендером нового
    this.clearContainer();
    
    const hash = window.location.hash || '#';
    
    if (hash === '#') {
      this.currentComponent = HomeComponent;
      this.routes['#']();
    } else if (hash.startsWith('#product/')) {
      const productId = hash.slice(9);
      this.currentComponent = ProductComponent;
      this.routes['#product'](productId);
    } else if (hash === '#order') {
      this.currentComponent = OrderComponent;
      this.routes['#order']();
    } else if (hash === '#contacts') {
      this.currentComponent = ContactsComponent;
      this.routes['#contacts']();
    } else if (hash === '#privacy-policy') {
      this.currentComponent = PrivacyPolicyComponent;
      this.routes['#privacy-policy']();
    } else if (hash === '#terms-of-use') {
      this.currentComponent = TermsOfUseComponent;
      this.routes['#terms-of-use']();
    } else if (hash === '#admin') {
      this.currentComponent = this.adminComponent;
      this.routes['#admin']();
    }
    
    // Скролл к верху страницы
    this.scrollToTop();
  }
  
  navigate(hash) {
    window.location.hash = hash;
  }
}

export default Router;
