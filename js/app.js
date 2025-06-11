
import Router from './router.js';
import { initApp as initMainApp } from './main.js';
import { env } from './utils/env.js';

// Main application initialization function
export function initApp() {
  console.log('Initializing main application...');
  
  // Log environment information in development mode
  if (env.isDev()) {
    console.log('Running in development mode');
    console.log('App name:', env.appName);
  }
  
  // Set up the router
  const router = new Router();
  
  // Initialize the main application logic
  initMainApp();
  
  // Initialize header scripts after header is loaded
  initializeHeaderScripts();
}

function initializeHeaderScripts() {
  // Wait a bit for the header DOM to be fully rendered
  setTimeout(() => {
    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
      // Execute any scripts in the header component
      const scripts = headerContainer.querySelectorAll('script');
      scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach(attr => {
          newScript.setAttribute(attr.name, attr.value);
        });
        newScript.textContent = oldScript.textContent;
        oldScript.parentNode.replaceChild(newScript, oldScript);
      });
      console.log('Header scripts initialized');
    }
  }, 100);
}
