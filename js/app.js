
import Router from './router.js';
import { initApp } from './main.js';
import SwiperService from './services/swiperService.js';

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Set up the router
  const router = new Router();
  
  // Initialize the application
  initApp();
  
  // Initialize any sliders present on the page
  SwiperService.initSwipers();
  
  // Listen for hash changes to reinitialize sliders when navigating
  window.addEventListener('hashchange', () => {
    // Use setTimeout to ensure the DOM is updated before initializing sliders
    setTimeout(() => {
      SwiperService.initSwipers();
    }, 100);
  });
});
