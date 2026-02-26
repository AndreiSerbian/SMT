/**
 * ExportPipeline: generates preview PNGs for all 7 sides + triggers PDF generation
 */

import { supabase } from '../utils/supabase.js';
import { StorageService } from './storageService.js';
import { DesignService } from './designService.js';
import { SIDES, SceneManager } from './sceneManager.js';

export class ExportPipeline {
  constructor(canvasController, sceneManager, sideDimensions) {
    this.cc = canvasController;
    this.sm = sceneManager;
    this.sideDimensions = sideDimensions;
  }

  /**
   * Full export: generate PNGs, upload, generate PDF, save design
   * Returns { designId, previewUrls, pdfUrl, customizedSides }
   */
  async execute(product, options = {}) {
    const designId = crypto.randomUUID();
    const currentSide = this.sm.getCurrentSide();

    // 1. Normalize text objects (fix 'alphabetical' → 'alphabetic')
    this._normalizeTextBaselines();

    // 2. Generate preview PNGs for ALL 7 sides, upload to storage
    const previewDataUrls = {};
    for (const side of SIDES) {
      this.sm.switchSide(side);
      this.cc.resizeForSide(this.sideDimensions[side]);
      await new Promise(r => setTimeout(r, 50));
      previewDataUrls[side] = this.cc.exportToPNG(2);
    }

    // Restore the side we were on
    this.sm.switchSide(currentSide);
    this.cc.resizeForSide(this.sideDimensions[currentSide]);

    // 3. Upload previews to Supabase Storage
    let previewUrls;
    try {
      previewUrls = await StorageService.uploadPreviews(designId, previewDataUrls);
    } catch (err) {
      console.error('Preview upload failed:', err);
      throw new Error('Ошибка загрузки превью: ' + (err?.message || JSON.stringify(err)));
    }

    // 4. Upload scene.json
    const allSidesData = this.sm.getAllSidesData();
    try {
      await StorageService.uploadScene(designId, allSidesData);
    } catch (err) {
      console.error('Scene upload failed:', err);
      throw new Error('Ошибка сохранения сцены: ' + (err?.message || JSON.stringify(err)));
    }

    // 5. Detect customized sides
    const customizedSides = SceneManager.detectCustomizedSides(allSidesData);
    console.log('Customized sides:', customizedSides);

    // 6. Build objects_mm
    const objectsMM = {};
    for (const side of SIDES) {
      this.sm.switchSide(side);
      this.cc.resizeForSide(this.sideDimensions[side]);
      objectsMM[side] = this.cc.getUserObjectsMM();
    }
    this.sm.switchSide(currentSide);
    this.cc.resizeForSide(this.sideDimensions[currentSide]);

    // 7. Create design record
    let design;
    try {
      design = await DesignService.create({
        id: designId,
        product_id: product.artikul || product.id,
        sku: product.artikul || '',
        qty: options.qty || 1,
        comment: options.comment || null,
        options: {
          print_type: options.print_type || 'color',
          stickers: options.stickers || { enabled: false },
        },
        objects_mm: objectsMM,
        preview_urls: previewUrls,
        customized_sides: customizedSides,
        status: 'saved',
      });
    } catch (err) {
      console.error('Design create failed:', err);
      throw new Error('Ошибка сохранения дизайна: ' + (err?.message || JSON.stringify(err)));
    }

    // 8. Call edge function to generate PDF (only if there are customized sides)
    let pdfUrl = null;
    if (customizedSides.length > 0) {
      try {
        const productDimensions = product.dimensions || {};
        const { data: pdfResult, error: pdfError } = await supabase.functions.invoke('generate-design-pdf', {
          body: {
            design_id: designId,
            product_id: product.artikul || product.id,
            preview_urls: previewUrls,
            product_dimensions_mm: productDimensions,
            customized_sides: customizedSides,
            pdf_filename: 'production.pdf',
            options: design?.options || {},
          },
        });

        if (pdfError) {
          console.warn('PDF generation failed (non-blocking):', pdfError);
        } else if (pdfResult?.ok === false) {
          console.log('PDF not generated:', pdfResult.message);
        } else {
          pdfUrl = pdfResult?.production_pdf_url || null;
        }
      } catch (err) {
        console.warn('PDF generation error (non-blocking):', err);
      }
    } else {
      console.log('No customized sides — skipping PDF generation');
    }

    // 9. Update design with PDF URL and status
    try {
      await DesignService.update(designId, {
        production_pdf_url: pdfUrl,
        status: 'attached_to_cart',
      });
    } catch (err) {
      console.warn('Design update failed (non-blocking):', err);
    }

    return {
      designId,
      previewUrls,
      pdfUrl,
      customizedSides,
    };
  }

  /**
   * Fix invalid textBaseline values in all canvas objects.
   */
  _normalizeTextBaselines() {
    const canvas = this.cc.canvas;
    if (!canvas) return;
    canvas.getObjects().forEach(obj => {
      if (obj.textBaseline === 'alphabetical') {
        obj.textBaseline = 'alphabetic';
      }
    });
  }
}
