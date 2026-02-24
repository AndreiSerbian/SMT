/**
 * ConfirmPanel: Bottom panel for confirming design + adding to cart
 */

export class ConfirmPanel {
  constructor(options = {}) {
    this.product = options.product || {};
    this.onAddToCart = options.onAddToCart || (() => {});
    
    this.panel = document.getElementById('confirm-panel');
    this.qtyInput = document.getElementById('qty-input');
    this.printType = document.getElementById('print-type');
    this.addToCartBtn = document.getElementById('btn-add-to-cart');
    this.cartText = document.getElementById('btn-cart-text');
    this.cartLoading = document.getElementById('btn-cart-loading');

    this._init();
    this._bind();
  }

  _init() {
    document.getElementById('confirm-product').textContent = this.product.name || '';
    document.getElementById('confirm-sku').textContent = this.product.artikul || '';
  }

  _bind() {
    document.getElementById('qty-minus')?.addEventListener('click', () => {
      const v = Math.max(1, parseInt(this.qtyInput.value) - 1);
      this.qtyInput.value = v;
    });
    document.getElementById('qty-plus')?.addEventListener('click', () => {
      this.qtyInput.value = parseInt(this.qtyInput.value) + 1;
    });

    this.addToCartBtn?.addEventListener('click', () => {
      this.onAddToCart({
        qty: parseInt(this.qtyInput.value),
        print_type: this.printType.value,
      });
    });
  }

  show() {
    this.panel?.classList.remove('hidden');
    this.addToCartBtn.disabled = false;
  }

  hide() {
    this.panel?.classList.add('hidden');
  }

  setLoading(loading) {
    this.addToCartBtn.disabled = loading;
    this.cartText?.classList.toggle('hidden', loading);
    this.cartLoading?.classList.toggle('hidden', !loading);
  }
}
