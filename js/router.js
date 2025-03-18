
import HomeComponent from './components/homeComponent.js';
import ProductComponent from './components/productComponent.js';
import OrderComponent from './components/orderComponent.js';

class Router {
  constructor() {
    this.routes = {
      '#': HomeComponent.render,
      '#product': (id) => ProductComponent.render(id),
      '#order': OrderComponent.render
    };
    
    window.addEventListener('hashchange', () => this.handleRouteChange());
    window.addEventListener('load', () => this.handleRouteChange());
  }
  
  handleRouteChange() {
    const hash = window.location.hash || '#';
    
    if (hash === '#') {
      this.routes['#']();
    } else if (hash.startsWith('#product/')) {
      const productId = hash.slice(9);
      this.routes['#product'](productId);
    } else if (hash === '#order') {
      this.routes['#order']();
    }
  }
  
  navigate(hash) {
    window.location.hash = hash;
    this.handleRouteChange();
  }
}

export default Router;
