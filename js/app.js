
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
  
  // Render the Toaster component
  const toasterRoot = document.createElement('div');
  toasterRoot.id = 'toaster-root';
  document.body.appendChild(toasterRoot);
  
  // Create a script element to render the Toaster component
  const script = document.createElement('script');
  script.textContent = `
    import { Toaster } from "./components/ui/toaster.js";
    import { createRoot } from "react-dom/client";
    import React from "react";
    
    const root = createRoot(document.getElementById('toaster-root'));
    root.render(React.createElement(Toaster, {}));
  `;
  script.type = 'module';
  document.body.appendChild(script);
  
  // Обеспечиваем инициализацию меню после загрузки header.html
  const headerContainer = document.getElementById('header-container');
  if (headerContainer) {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Запускаем повторную инициализацию скриптов в header
          const scripts = headerContainer.querySelectorAll('script');
          scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            Array.from(oldScript.attributes).forEach(attr => {
              newScript.setAttribute(attr.name, attr.value);
            });
            newScript.textContent = oldScript.textContent;
            oldScript.parentNode.replaceChild(newScript, oldScript);
          });
          observer.disconnect();
        }
      }
    });
    observer.observe(headerContainer, { childList: true });
  }
});
