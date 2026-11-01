# Project architecture

- Preserve the existing multi-entry Vanilla JS Vite architecture; do not replace the app with a framework scaffold.
- Checkout protocol 2 signs a cart and line-price fingerprint, rechecks authoritative products at creation, and reserves a deterministic order ID in server-only checkout_requests; this prevents silent repricing and duplicate orders on retries.
- During manual TimeWeb rollout, legacy checkout may create only when every submitted line price and totals match the server; changed prices fail closed so old tabs cannot silently accept new prices.
- Price management writes only products.price_rub under existing has_role RLS and compares the actual giftboxopt.ru snapshot; downloading an update is never reported as publishing it.
- Price-only admin exports preserve published media and refuse changed catalog membership; use the complete catalog exporter for additions or removals.
- Keep all Tailwind directives and pricing semantic tokens in src/styles/tailwind.css, preserving the existing import cascade.
- TimeWeb deployment stays manual until the owner provides an authorized publishing connection; Lovable publishing is not TimeWeb publishing.