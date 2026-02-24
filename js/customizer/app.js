/**
 * Customizer App: Entry point for the box customizer page.
 * Loads product by product_id, initializes canvas, scene manager, and UI panels.
 */

import '../styles/tailwind.css';
import { supabase } from '../utils/supabase.js';
import { getSideDimensions } from './geometry.js';
import { SceneManager, SIDES, SIDE_LABELS } from './sceneManager.js';
import { CanvasController } from './canvasController.js';
import { Inspector } from './inspector.js';
import { Toolbar } from './toolbar.js';
import { TopBar } from './topbar.js';
import { ConfirmPanel } from './confirmPanel.js';
import { ExportPipeline } from './exportPipeline.js';

let product = null;
let sideDimensions = null;
let sceneManager = null;
let canvasController = null;
let inspector = null;
let toolbar = null;
let topbar = null;
let confirmPanel = null;
let exportPipeline = null;
let autoSaveInterval = null;

async function init() {
  const productId = new URLSearchParams(location.search).get('product_id');
  if (!productId) {
    window.location.href = '/';
    return;
  }

  try {
    // Fetch product from Supabase
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('artikul', productId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.error('Product not found:', error);
      window.location.href = '/';
      return;
    }

    product = data;
    
    // Parse dimensions
    const dims = product.dimensions;
    const productDims = {
      length: parseFloat(dims?.length) || 200,
      width: parseFloat(dims?.width) || 150,
      height: parseFloat(dims?.height) || 100,
    };

    sideDimensions = getSideDimensions(productDims);

    // Set product name in topbar
    document.getElementById('product-name').textContent = product.name;

    // Init Scene Manager
    sceneManager = new SceneManager();

    // Try restore draft
    const restored = sceneManager.restoreDraft(productId);

    // Init Canvas Controller
    const initialSide = sceneManager.getCurrentSide();
    canvasController = new CanvasController('fabric-canvas', {
      onSelectionChange: (obj) => {
        if (obj) inspector?.show(obj);
        else inspector?.hide();
      },
      onHistoryChange: (canUndo, canRedo) => {
        topbar?.updateHistoryButtons(canUndo, canRedo);
      },
    });

    const canvas = canvasController.init(sideDimensions[initialSide]);
    sceneManager.setCanvas(canvas);

    // If restored, load the current side's data
    if (restored) {
      sceneManager._restoreSide(initialSide);
    }

    // Init Inspector
    inspector = new Inspector(canvasController, sideDimensions[initialSide]);
    inspector.bindCanvasEvents();

    // Init Toolbar
    toolbar = new Toolbar(canvasController);

    // Init TopBar
    topbar = new TopBar(canvasController, {
      productId,
      onSave: handleSave,
      onConfirm: handleConfirm,
    });

    // Init Confirm Panel
    confirmPanel = new ConfirmPanel({
      product,
      onAddToCart: handleAddToCart,
    });

    // Init Export Pipeline
    exportPipeline = new ExportPipeline(canvasController, sceneManager, sideDimensions);

    // Setup side tab switching
    setupSideTabs();

    // Update dimensions display
    updateSideDimensionsDisplay(initialSide);

    // Auto-save draft every 30s
    autoSaveInterval = setInterval(() => {
      sceneManager.saveDraft(productId);
    }, 30000);

    // Hide loading
    document.getElementById('canvas-loading').classList.add('hidden');

  } catch (err) {
    console.error('Customizer init error:', err);
    alert('Ошибка загрузки товара');
    window.location.href = '/';
  }
}

function setupSideTabs() {
  document.querySelectorAll('.side-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const side = tab.dataset.side;
      
      // Update active tab
      document.querySelectorAll('.side-tab').forEach(t => {
        t.classList.remove('active', 'bg-purple-100', 'text-purple-700');
        t.classList.add('text-gray-500');
      });
      tab.classList.add('active', 'bg-purple-100', 'text-purple-700');
      tab.classList.remove('text-gray-500');

      // Switch side
      sceneManager.switchSide(side);
      canvasController.resizeForSide(sideDimensions[side]);
      inspector?.updateSideMM(sideDimensions[side]);
      inspector?.hide();
      updateSideDimensionsDisplay(side);
    });
  });
}

function updateSideDimensionsDisplay(side) {
  const dims = sideDimensions[side];
  const el = document.getElementById('side-dimensions');
  if (el) {
    el.textContent = `${dims.width.toFixed(0)} × ${dims.height.toFixed(0)} мм`;
  }
}

async function handleSave() {
  if (!product) return;
  sceneManager.saveDraft(product.artikul);
  
  // Visual feedback
  const btn = document.getElementById('btn-save');
  const originalText = btn.textContent;
  btn.textContent = 'Сохранено ✓';
  btn.classList.add('bg-green-100', 'text-green-700');
  setTimeout(() => {
    btn.textContent = originalText;
    btn.classList.remove('bg-green-100', 'text-green-700');
  }, 2000);
}

function handleConfirm() {
  confirmPanel?.show();
}

async function handleAddToCart({ qty, print_type }) {
  if (!product || !exportPipeline) return;

  confirmPanel?.setLoading(true);

  try {
    const { designId, previewUrls, pdfUrl } = await exportPipeline.execute(product, {
      qty,
      print_type,
    });

    // Add to cart using cartService pattern (via localStorage)
    const cartKey = 'shopping_cart';
    const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
    
    // Add custom design item
    cart.push({
      id: product.artikul,
      quantity: qty,
      design_id: designId,
      preview_urls: previewUrls,
      production_pdf_url: pdfUrl,
      options: { print_type },
    });
    
    localStorage.setItem(cartKey, JSON.stringify(cart));

    // Clear draft
    sceneManager.clearDraft();

    // Redirect back to product
    alert('Дизайн добавлен в корзину!');
    window.location.href = '/#product/' + product.artikul;

  } catch (err) {
    console.error('Add to cart error:', err);
    alert('Ошибка: ' + err.message);
    confirmPanel?.setLoading(false);
  }
}

// Handle window resize
window.addEventListener('resize', () => {
  if (canvasController && sceneManager && sideDimensions) {
    const side = sceneManager.getCurrentSide();
    canvasController.resizeForSide(sideDimensions[side]);
  }
});

// Cleanup
window.addEventListener('beforeunload', () => {
  if (autoSaveInterval) clearInterval(autoSaveInterval);
  if (sceneManager && product) {
    sceneManager.saveDraft(product.artikul);
  }
});

// Start
init();
