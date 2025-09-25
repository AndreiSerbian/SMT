
import HomeComponent from './components/homeComponent.js';
import ProductComponent from './components/productComponent.js';
import OrderComponent from './components/orderComponent.js';
import ContactsComponent from './components/contactsComponent.js';
import PrivacyPolicyComponent from './components/privacyPolicyComponent.js';
import TermsOfUseComponent from './components/termsOfUseComponent.js';
import { ModernAdminComponent } from './components/modernAdminComponent.js';

class Router {
  constructor() {
    this.currentComponent = null;
    this.adminComponent = new ModernAdminComponent();
    this.routes = {
      '#': () => HomeComponent.render(this.getMainContainer()),
      '#product': (id) => ProductComponent.render(id, this.getMainContainer()),
      '#category': (categorySlug) => this.renderCategory(categorySlug),
      '#order': () => OrderComponent.render(this.getMainContainer()),
      '#contacts': () => ContactsComponent.render(this.getMainContainer()),
      '#privacy-policy': () => PrivacyPolicyComponent.render(this.getMainContainer()),
      '#terms-of-use': () => TermsOfUseComponent.render(this.getMainContainer()),
      '#admin': () => this.adminComponent.mount(this.getMainContainer())
    };
    
    window.addEventListener('hashchange', () => this.handleRouteChange());
    window.addEventListener('load', () => this.handleRouteChange());
  }
  
  async renderCategory(categorySlug) {
    const container = this.getMainContainer();
    if (!container) return;
    
    // Импортируем PublicProductsComponent
    const { PublicProductsComponent } = await import('./components/publicProductsComponent.js');
    
    // Рендерим категорию через PublicProductsComponent
    const categoryHTML = await PublicProductsComponent.render(categorySlug);
    
    container.innerHTML = `
      <nav class="bg-white shadow-md relative">
        <div class="container mx-auto px-6 py-3">
          <div class="flex justify-between items-center">
            <a href="#" class="flex items-center text-xl font-bold text-gray-800">
              <img src="https://giftboxopt.ru/assets/logo-B0ADOiza.svg" alt="Logo" class="w-8 h-8 mr-2" />
              <span>SMT Premium Box</span>
            </a>
            
            <div class="hidden md:flex space-x-4">
              <a href="#" class="text-gray-600 hover:text-gray-800">Главная</a>
              <a href="#contacts" class="text-gray-600 hover:text-gray-800">Контакты</a>
            </div>
            
            <button class="md:hidden text-2xl text-gray-800" id="mobile-menu-toggle">
              <span id="burger-icon">☰</span>
            </button>
          </div>
        </div>
        
        <div id="mobile-menu" class="fixed inset-0 bg-white z-50 hidden md:hidden">
          <div class="flex justify-between items-center p-6 border-b">
            <a href="#" class="flex items-center text-xl font-bold text-gray-800">
              <img src="https://giftboxopt.ru/assets/logo-B0ADOiza.svg" alt="Logo" class="w-8 h-8 mr-2" />
              <span>SMT Premium Box</span>
            </a>
            <button class="text-2xl text-gray-800" id="mobile-menu-close">✕</button>
          </div>
          <div class="flex flex-col p-6 space-y-4">
            <a href="#" class="text-xl text-gray-800 py-2 border-b">Главная</a>
            <a href="#contacts" class="text-xl text-gray-800 py-2 border-b">Контакты</a>
          </div>
        </div>
      </nav>

      <div class="container mx-auto px-4 py-8">
        ${categoryHTML}
      </div>
    `;
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
    } else if (hash.startsWith('#category/')) {
      const categorySlug = hash.slice(10);
      this.currentComponent = null; // Для категорий используем специальный рендер
      this.routes['#category'](categorySlug);
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
  
  getMainContainer() {
    return document.getElementById('app');
  }
  
  navigate(hash) {
    window.location.hash = hash;
  }
}

export default Router;
