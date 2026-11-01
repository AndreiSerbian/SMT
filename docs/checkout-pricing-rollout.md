# Checkout pricing rollout — 2026-11-01

## Implemented
- products.price_rub remains the only authoritative server price; product_prices is untouched.
- 9 small bow SKUs are 310 RUB; 13 medium bow SKUs are 380 RUB, selected via category_id.
- New frontend requests a signed 30-minute quote, displays each line and totals, and creates only after explicit confirmation.
- Create verifies signature and cart fingerprint, repeats database calculation, and refuses changed line prices even when totals happen to match.
- Server-only checkout_requests reserves a deterministic order ID before B2B writes. Same request retries read that ID; pending reservations fail closed rather than generate another order. Ambiguous failures may require operator investigation.
- Legacy clients can submit only unchanged line prices/totals during manual rollout; they have no new idempotency guarantee. Changed prices return an update-page error without creating an order.
- Admin Prices uses existing Auth/has_role RLS and bundled Supabase client. Changes invalidate prepared downloads. Export is price-only, preserving media; changed catalog membership requires full export.

## Verified
- Five Node tests and six Deno quote tests pass.
- Production quote: 0593 × 332 → subtotal 102920, discount 5146, total 97774 RUB.
- Production rejects modified cart (409 CART_CHANGED), zero quantity (400 INVALID_QUANTITY), outdated legacy totals (409 CHECKOUT_UPDATE_REQUIRED).
- Browser: cancel preserves cart; a mocked create after real quote clears cart and shows success. No real production create was sent.
- Price panel rendered with real public reads; save was intercepted/mocked. Real authenticated admin save remains unverified (external unmanaged Supabase).
- Desktop and 375px-wide dialog/toolbar checks found no horizontal overflow.
- Database after checks: zero checkout reservations and zero new orders during this session.

## Pending deployment
Backend order-processing has been deployed. TimeWeb frontend has NOT been uploaded: no authorized hosting connection is available. Publish in Lovable does not update giftboxopt.ru.
Upload the new frontend release using the owner's manual TimeWeb process, including public/data/products-public.json and catalog-version.json. For later price-only updates, upload products-public.json first, then catalog-version.json. Verify prices via Admin Prices; downloads alone are not proof of publication. Old tabs may need a refresh.
Direct production snapshot fetch returned an HTML cookie challenge, not JSON, so published prices are not verified from this environment. The admin reports unavailable rather than falsely synchronized; export may use the local snapshot and labels that fallback explicitly.

## Operational limits
TimeWeb-hosted catalog remains usable without Supabase, but checkout and admin require working Supabase access. No guarantee of accessibility from every Russian provider is made. Automatic TimeWeb publication still requires an authorized hosting integration.
Existing security warnings (not introduced here): broadly executable security-definer functions, disabled leaked-password protection, and Postgres patch availability. Address separately.

## Rollback
Prefer frontend rollback while retaining safe server checks: outdated totals remain blocked, not silently repriced. Backend rollback requires restoring prior order-processing source and deploying it deliberately; doing so removes quote support, so frontend/backend versions must be coordinated. Do not revert agreed product prices without owner authorization. Keep checkout_requests for investigation; do not delete real orders or reservations as part of UI rollback.