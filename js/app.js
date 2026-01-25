// 1) Swiper CSS (bundle включает всё)
import 'swiper/css/bundle';

// 2) Tailwind CSS
import '@/styles/tailwind.css';

// 3) Кастомные стили (ПОСЛЕДНИМИ — побеждают по каскаду)
import '@/styles/grouped-products.css';
import '@/styles/product-modal.css';

// 4) Admin CSS — грузить/выгружать при смене hash
const loadAdminCss = () => {
  const hash = location.hash;
  const enabled = hash === '#admin' || hash.startsWith('#admin/');
  const links = document.querySelectorAll('link[data-admin-css="1"]');

  // Выгружаем при выходе из админки
  if (!enabled) {
    links.forEach(l => l.remove());
    return;
  }

  const adminStyles = [
    '/css/admin-storage.css',
    '/css/admin-drag-drop.css',
    '/css/admin-media.css',
    '/css/admin-media-modal.css',
    '/css/media-manager.css'
  ];

  adminStyles.forEach(href => {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.adminCss = '1';
    document.head.appendChild(link);
  });
};

loadAdminCss();
window.addEventListener('hashchange', loadAdminCss);

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
