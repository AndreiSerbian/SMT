
import Router from './router.js';
import { initApp } from './main.js';
import { env } from './utils/env.js';

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Log environment information in development mode
  if (env.isDev()) {
    console.log('Running in development mode');
    console.log('App name:', env.appName);
  }
  
  // Set up the router
  const router = new Router();
  
  // Initialize the application
  initApp();
});
