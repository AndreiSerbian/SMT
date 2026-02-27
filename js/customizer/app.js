/**
 * Customizer App: Entry point for the box customizer page.
 * Loads product by product_id, initializes canvas, scene manager, and UI panels.
 */

import '../../src/styles/tailwind.css';
import { supabase } from '../utils/supabase.js';
import { getSideDimensions, parseProductDimensions } from './geometry.js';
import { DimensionsOverlay } from './dimensionsOverlay.js';
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
let dimensionsOverlay = null;
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
    
    // Parse dimensions (DB stores in cm, convert to mm)
    const productDims = parseProductDimensions(product.dimensions);
    // Fallback for missing dimensions
    if (!productDims.length) productDims.length = 200;
    if (!productDims.width) productDims.width = 150;
    if (!productDims.height) productDims.height = 100;

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

    // Init Dimensions Overlay
    dimensionsOverlay = new DimensionsOverlay(canvasController);

    // Setup side tab switching
    setupSideTabs();
    setupDimensionsToggle();

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
      dimensionsOverlay?.rebuild();
    });
  });
}

function setupDimensionsToggle() {
  const btn = document.getElementById('btn-dimensions');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const on = dimensionsOverlay?.toggle();
    btn.classList.toggle('bg-purple-100', on);
    btn.classList.toggle('text-purple-700', on);
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
    const { designId, previewUrls, pdfUrl, customizedSides } = await exportPipeline.execute(product, {
      qty,
      print_type,
    });

    // Add to cart using the same 'cart' key as cartService
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Check if product already in cart (without design) and update, or add new entry
    const existingIndex = cart.findIndex(item => item.id === product.artikul && !item.design_id);
    
    if (existingIndex >= 0) {
      // Update existing item with design info
      cart[existingIndex].quantity += qty;
      cart[existingIndex].design_id = designId;
      cart[existingIndex].preview_urls = previewUrls;
      cart[existingIndex].production_pdf_url = pdfUrl;
      cart[existingIndex].customized_sides = customizedSides;
      cart[existingIndex].options = { print_type };
    } else {
      // Add new custom design item
      cart.push({
        id: product.artikul,
        quantity: qty,
        design_id: designId,
        preview_urls: previewUrls,
        production_pdf_url: pdfUrl,
        customized_sides: customizedSides,
        options: { print_type },
      });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Emit event so cart UI updates
    try {
      const { eventBus } = await import('../utils/eventBus.js');
      eventBus.emit('cart-updated', cart);
    } catch (_) {}

    // Clear draft
    sceneManager.clearDraft();

    // Redirect back to product
    alert('Дизайн добавлен в корзину!');
    window.location.href = '/#product/' + product.artikul;

  } catch (err) {
    console.error('Add to cart error:', err);
    alert('Ошибка: ' + (err?.message || 'Неизвестная ошибка'));
    confirmPanel?.setLoading(false);
  }
}

// Handle window resize
window.addEventListener('resize', () => {
  if (canvasController && sceneManager && sideDimensions) {
    const side = sceneManager.getCurrentSide();
    canvasController.resizeForSide(sideDimensions[side]);
    dimensionsOverlay?.rebuild();
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
