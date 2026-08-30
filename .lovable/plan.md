# Mockup POC — Fix the Two Remaining Verification Items

Scope: only the mobile overflow CSS fix and the focus-trap runtime test. No changes to mockup architecture, SVG geometry, data model, palette logic, pricing logic, product mapping, or desktop behavior.

## 1. Mobile overflow fix (minimum CSS)

File: `src/styles/mockupPreviewModal.css`

Root cause: grid/flex items default to `min-width: auto`; the nowrap palette's min-content (902 px) inflates the `.mpm-body` track, pushing the dialog's `scrollWidth` to 920 px and the SVG to 868 px at 390 px viewport.

Fix: add `min-width: 0` to the affected chain, nothing else:

```css
.mpm-body,
.mpm-body > *,
.mpm-preview-wrap,
.mpm-preview,
.mpm-controls-col,
.mpm-control-group,
.mpm-palette {
  min-width: 0;
}
```

No fixed widths, no other CSS touched. `overflow-x: auto` on `.mpm-palette` (mobile media query) already exists and now works once the track is allowed to shrink.

Verification (Playwright, real viewports 390 / 375 / 360 px):
- `dialog.scrollWidth <= dialog.clientWidth`
- no horizontal scroll inside the modal
- visual check via screenshots

## 2. Focus-trap runtime test (no code change unless a defect is found)

Playwright keyboard-only script:
- open modal → `dialog.focus()` lands inside
- Tab through all focusable controls; assert `document.activeElement` stays inside `.mpm-overlay` on every step
- Shift+Tab on first focusable wraps to last
- Tab on last focusable wraps to first
- Escape closes the dialog
- focus returns to `#mockup-preview-btn` trigger

## 3. Desktop regression

Re-run the desktop smoke checks on a `full-cover-small` product (0708):
- SVG renders (1 fetch total; recolors add 0)
- `--zone-outer-top` / `--zone-outer-front` = product color; `--zone-side` = selected second color only
- 19 palette swatches; base-color swatch disabled; same-color click does not recolor
- price `₽286` = `Math.round(260 × 1.10)`
- button hidden for `handle-box-small`

## Deliverables

Report sections: CHANGED FILES / MOBILE TEST RESULTS / FOCUS TRAP TEST RESULTS / REGRESSION RESULTS / REMAINING ISSUES / IMPLEMENTATION STATUS / READY FOR FULL VISUAL ACCEPTANCE.
