// js/services/imageSizeService.js
// Returns responsive <img> attributes (src, srcset, sizes, loading, ...)
// for a given resolved URL and rendering scenario. It does NOT decide
// whether to use local or Supabase — that's mediaResolver's job.

export const SCENARIOS = {
  PRODUCT_CARD:              { defaultWidth: 320, widths: [320, 480, 786], sizes: '(max-width: 768px) 50vw, 216px',  loading: 'lazy',  fetchpriority: 'low'  },
  PRODUCT_CARD_FIRST_SCREEN: { defaultWidth: 480, widths: [320, 480, 786], sizes: '(max-width: 768px) 50vw, 216px',  loading: 'eager', fetchpriority: 'high' },
  CATEGORY_SLIDER:           { defaultWidth: 480, widths: [320, 480, 786], sizes: '(max-width: 768px) 90vw, 378px',  loading: 'lazy',  fetchpriority: 'low'  },
  PRODUCT_PAGE_MAIN:         { defaultWidth: 480, widths: [480, 786],     sizes: '(max-width: 768px) 100vw, 600px', loading: 'eager', fetchpriority: 'high' },
  PRODUCT_GALLERY:           { defaultWidth: 786, widths: [480, 786],     sizes: '(max-width: 768px) 100vw, 786px', loading: 'lazy',  fetchpriority: 'low'  },
  CART_THUMBNAIL:            { defaultWidth: 160, widths: [160, 320],     sizes: '80px',                            loading: 'lazy',  fetchpriority: 'low'  },
  HERO:                      { defaultWidth: null, widths: [],            sizes: '100vw',                           loading: 'eager', fetchpriority: 'high' },
};

// Local URL pattern: /images/<collection>/<color>/slideN.webp
// We have generated -320 and -480 variants for slideN.webp only.
const LOCAL_SLIDE_RE = /^(\/images\/[^?#]+\/slide\d+)\.webp$/;

function variantUrl(localUrl, width) {
  const m = localUrl.match(LOCAL_SLIDE_RE);
  if (!m) return null;
  if (width === 320) return `${m[1]}-320.webp`;
  if (width === 480) return `${m[1]}-480.webp`;
  return localUrl; // 786 / original
}

function isLocal(url) {
  return typeof url === 'string' && (url.startsWith('/images/') || url.startsWith('/videos/'));
}

export function getImageAttrs(url, scenarioName) {
  const cfg = SCENARIOS[scenarioName] || SCENARIOS.PRODUCT_CARD;
  if (!url) return { src: '', loading: cfg.loading, decoding: 'async', fetchpriority: cfg.fetchpriority, sizes: cfg.sizes };

  const baseAttrs = {
    loading: cfg.loading,
    decoding: 'async',
    fetchpriority: cfg.fetchpriority,
    sizes: cfg.sizes,
  };

  if (!isLocal(url) || !LOCAL_SLIDE_RE.test(url)) {
    // Supabase fallback or non-slide local image — no srcset
    return { ...baseAttrs, src: url };
  }

  // Build srcset from generated variants
  const srcsetParts = [];
  for (const w of cfg.widths) {
    const v = variantUrl(url, w);
    if (v) srcsetParts.push(`${v} ${w}w`);
  }
  const src = variantUrl(url, cfg.defaultWidth) || url;

  return {
    ...baseAttrs,
    src,
    srcset: srcsetParts.length > 1 ? srcsetParts.join(', ') : undefined,
  };
}

// Helper to produce HTML attribute string suitable for template literals.
export function getImageAttrsHtml(url, scenarioName, extra = {}) {
  const a = getImageAttrs(url, scenarioName);
  const parts = [`src="${a.src}"`];
  if (a.srcset) parts.push(`srcset="${a.srcset}"`);
  if (a.sizes) parts.push(`sizes="${a.sizes}"`);
  if (a.loading) parts.push(`loading="${a.loading}"`);
  if (a.decoding) parts.push(`decoding="${a.decoding}"`);
  if (a.fetchpriority) parts.push(`fetchpriority="${a.fetchpriority}"`);
  for (const [k, v] of Object.entries(extra)) {
    if (v != null) parts.push(`${k}="${String(v).replace(/"/g, '&quot;')}"`);
  }
  return parts.join(' ');
}
