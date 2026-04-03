

# Quick Fix: Magnetic Small Category Slug Mismatch

## Problem

Two hardcoded slug references say `full-cover-small-box` but the DB slug is `full-cover-small`.

## Changes — `js/components/modernAdminComponent.js`

### 1. Line 870 — Fix `CATEGORY_SLUG_MAP`

Change `'magnetic-small': 'full-cover-small-box'` → `'magnetic-small': 'full-cover-small'`

### 2. Line 760 — Fix `SLUG_TO_BOX_TYPE`

Change `'full-cover-small-box': 'magnetic'` → `'full-cover-small': 'magnetic'`

No other changes. Two-line fix.

