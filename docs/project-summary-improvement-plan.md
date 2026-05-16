# Project Summary and Improvement Plan

## What this project is
Cherish Every Bite is a static-first meal subscription website with:
- Marketing pages (`index.html`, `menu.html`, `plans.html`, plan-specific pages)
- Customer workflows (`calendar.html`, `pre-order.html`, `account.html`, `map-picker.html`)
- A browser-based local admin console (`admin.html`)
- CSV-driven content and plan/menu data loaded at runtime
- Optional Supabase auth and optional backend APIs, with graceful localStorage fallback

## Architecture snapshot
- **Frontend stack**: plain HTML/CSS/vanilla JavaScript (no framework build step).
- **Data layer**: CSV files in repo root (`catalog.csv`, `plans.csv`, `allplans_nutrition.csv`, etc.) read by `fetchCSV()`.
- **Runtime override layer**: admin writes CSV overrides to `localStorage` (`ceb_csv_overrides_v1`), and runtime prefers overrides over files.
- **Config layer**: feature/runtime flags injected via `window.CEB_RUNTIME_CONFIG` and read by `assets/js/runtime.js`.
- **Validation tooling**: `scripts/validate_data.py` enforces required file and column contracts and selected cross-file checks.

## Strengths
- Very fast path to iterate content without a heavy deployment pipeline.
- Operational resilience: graceful fallbacks when backend/auth are unavailable.
- Portable and easy local startup (`python -m http.server`).
- Clear contracts documented in README + validator script.

## Risks / technical debt
- Data consistency can drift due to local-only overrides in each browser session.
- CSV parsing in client is basic and can become fragile with complex content.
- Many pages likely duplicate header/footer/nav markup and script loading.
- No bundling/minification/image optimization pipeline for production by default.
- Limited automated test surface for UI behavior and runtime perf regressions.

## Aesthetics improvement plan

### Phase A — Visual system foundation (high impact, low risk)
1. Define design tokens in CSS custom properties (spacing, radius, elevation, type scale, colors).
2. Normalize typography scale and vertical rhythm across all pages.
3. Standardize component styles for buttons/cards/forms/badges.
4. Add consistent states (hover/focus/disabled/loading) and improve contrast/accessibility.

### Phase B — Navigation and page polish
1. Consolidate nav patterns (desktop + mobile + sidebar) with one canonical component behavior.
2. Improve hero composition on homepage (copy hierarchy, CTA prominence, image crop consistency).
3. Refine menu and plan cards with clearer nutrition/price metadata hierarchy.
4. Add micro-interactions (subtle transforms/transitions, reduced-motion aware).

### Phase C — Trust and conversion UX
1. Add social proof/testimonials section and delivery trust markers.
2. Improve form UX (inline validation, input masking for phone, success states).
3. Make checkout handoff to WhatsApp/order link more explicit and trackable.

## Performance improvement plan

### Phase 1 — Quick wins (1–2 days)
1. Compress and resize hero/dish images; migrate heavy assets to WebP/AVIF with JPG/PNG fallback.
2. Add lazy-loading and explicit dimensions to non-critical images to reduce CLS.
3. Minify CSS/JS and enable strong cache headers for versioned static assets.
4. Defer or conditionally load page-specific scripts to reduce initial parse/execute time.

### Phase 2 — Runtime/data optimization
1. Replace repeated CSV fetch/parsing with a shared memoized loader per page session.
2. Pre-generate JSON from CSV at publish time for faster client parsing and stricter schema checks.
3. Consolidate duplicate assets and remove unused images/scripts.
4. Introduce stale-while-revalidate caching strategy for semi-static catalog and plans data.

### Phase 3 — Measurement and guardrails
1. Add Lighthouse CI budgets (LCP/CLS/INP + transfer size) in CI.
2. Add RUM metrics (web-vitals) on production pages.
3. Track conversion funnel events (hero CTA, plan click, pre-order submit, order handoff).
4. Establish monthly performance and UX review cadence.

## Suggested implementation order
1. **Design tokenization + component normalization**
2. **Image optimization + lazy loading + script deferral**
3. **Shared data loader + JSON publish path**
4. **Lighthouse budgets + RUM tracking**

## Success criteria (90-day)
- Homepage LCP under 2.5s on mid-tier mobile.
- CLS under 0.1 across core pages.
- 20–30% reduction in initial page transfer size.
- Higher CTA click-through and form completion rates.
