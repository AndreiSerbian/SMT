
import Router from './router.js';
import { initApp } from './main.js';

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Set up the router
  const router = new Router();
  
  // Initialize the application
  initApp();
});
