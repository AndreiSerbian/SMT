
import HomeComponent from './components/homeComponent.js';
import ProductComponent from './components/productComponent.js';
import OrderComponent from './components/orderComponent.js';
import ContactsComponent from './components/contactsComponent.js';
import PrivacyPolicyComponent from './components/privacyPolicyComponent.js';
import TermsOfUseComponent from './components/termsOfUseComponent.js';
import { AdminAuthComponent } from './components/adminAuthComponent.js';
import { AdminLayoutComponent } from './components/adminLayoutComponent.js';

class Router {
  constructor() {
    this.currentComponent = null;
    
    window.addEventListener('hashchange', () => this.handleRouteChange());
    window.addEventListener('load', () => this.handleRouteChange());
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
  
  async handleRouteChange() {
    // Очищаем предыдущий контент ПЕРЕД рендером нового
    this.clearContainer();
    
    const hash = window.location.hash || '#';
    const container = this.getMainContainer();
    
    if (hash === '#') {
      this.currentComponent = HomeComponent;
      HomeComponent.render(container);
    } else if (hash.startsWith('#product/')) {
      const productId = hash.slice(9);
      this.currentComponent = ProductComponent;
      ProductComponent.render(productId, container);
    } else if (hash === '#order') {
      this.currentComponent = OrderComponent;
      OrderComponent.render(container);
    } else if (hash === '#contacts') {
      this.currentComponent = ContactsComponent;
      ContactsComponent.render(container);
    } else if (hash === '#privacy-policy') {
      this.currentComponent = PrivacyPolicyComponent;
      PrivacyPolicyComponent.render(container);
    } else if (hash === '#terms-of-use') {
      this.currentComponent = TermsOfUseComponent;
      TermsOfUseComponent.render(container);
    } else if (hash === '#admin') {
      // Форма входа в админку
      await this.renderAdminAuth();
    } else if (hash.startsWith('#admin/')) {
      // Разделы админки
      const section = hash.replace('#admin/', '');
      await this.renderAdminSection(section);
    }
    
    // Скролл к верху страницы
    this.scrollToTop();
  }
  
  /**
   * Рендер формы входа в админку
   */
  async renderAdminAuth() {
    // Если уже авторизован, редирект на админку
    if (AdminAuthComponent.isAuthenticated()) {
      window.location.hash = '#admin/products';
      return;
    }

    const container = this.getMainContainer();
    this.currentComponent = new AdminAuthComponent();
    await this.currentComponent.mount(container);
  }

  /**
   * Рендер раздела админки (products/categories/colors/orders)
   */
  async renderAdminSection(section) {
    // Проверка авторизации
    if (!AdminAuthComponent.isAuthenticated()) {
      window.location.hash = '#admin';
      return;
    }

    const container = this.getMainContainer();
    
    this.currentComponent = new AdminLayoutComponent();
    this.currentComponent.currentSection = section;
    await this.currentComponent.mount(container);
  }
  
  getMainContainer() {
    return document.getElementById('app');
  }
  
  navigate(hash) {
    window.location.hash = hash;
  }
}

export default Router;
