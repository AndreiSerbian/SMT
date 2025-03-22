
import Router from './router.js';
import { initApp } from './main.js';
import { Toaster } from '@/components/ui/toaster';

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
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
    import { Toaster } from "@/components/ui/toaster";
    import { createRoot } from "react-dom/client";
    import React from "react";
    
    const root = createRoot(document.getElementById('toaster-root'));
    root.render(React.createElement(Toaster, {}));
  `;
  script.type = 'module';
  document.body.appendChild(script);
});
