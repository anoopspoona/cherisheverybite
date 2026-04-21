# Codebase Audit (April 21, 2026)

## 1) Project Summary

Cherish Every Bite is a static, CSV-driven marketing and plan-browsing website.

### Current page architecture

- `index.html` — homepage with:
  - featured dish hero slideshow,
  - dynamic menu sections,
  - dynamic plan cards,
  - lead capture form opening WhatsApp.
- `plans.html` — hub page linking to each subscription plan page.
- Individual plan pages:
  - `elite-plan.html`
  - `salad-plan.html`
  - `weightloss-plan.html`
  - `basic-plan.html`
  - `customised-plan.html`
- `plan.html` — generic query-param fallback plan page (`?plan=<key>`).

### Runtime data flow

- Homepage (`assets/js/menu.js`) fetches:
  - `menu.csv`
  - `prices.csv`
  - `plans.csv`
  - `hero_slides.csv` (optional/fallback supported)
- Plan pages (`assets/js/plan.js`) fetch:
  - `plans.csv`
  - `plan_meals.csv`
  - `customization_options.csv` (optional)

### Key strengths

- Non-developer content updates through CSV files.
- Reusable plan rendering across dedicated and generic plan pages.
- Input sanitization via `escapeHtml`.
- Basic data-contract validation exists in `scripts/validate_data.py`.

---

## 2) Inconsistencies Found

### A) Documentation drift

1. `google_sheet_setup.md` and some README wording still mention Google Sheets-first behavior and menu source states that do not exist in runtime code.
2. `docs/data-schema.md` describes lower-case schema conventions, but runtime code expects many TitleCase fields (`Plan_Key`, `Variant_Key`, `Dish_ID`).
3. `docs/content-ops.md` still points plan preview updates to `meals.csv`, while runtime uses `plan_meals.csv`.

### B) Data model inconsistencies

1. Mixed naming conventions across CSVs (snake_case, lower-case, TitleCase) increase maintenance overhead.
2. Overlapping data sources: `meals.csv` exists but runtime plan preview uses `plan_meals.csv`.
3. `prices.csv` includes `Active` column that runtime ignores.

### C) Runtime robustness gaps

1. `assets/js/plan.js` fetch block lacks top-level `try/catch` for failed file/network states.
2. CSV parser in `assets/js/common.js` is simple and not resilient to multiline quoted CSV values.
3. Hero slideshow currently lacks explicit image existence validation and lazy hydration strategy.

### D) Styling/code organization gaps

1. `assets/css/main.css` remains largely one-line/minified style, making maintenance difficult.
2. Shared style tokens are duplicated between `main.css` and `plan.css` instead of a central token layer.

---

## 3) Likely Unused / Non-runtime Files

### Likely unused in browser runtime

- `addons.csv`
- `plan_addons.csv`
- `plan_rules.csv`
- `orders.csv`
- `renewals.csv`
- `meals.csv`
- `raw_sheet_exports/*`

These appear operational, archival, or future-scope rather than current runtime inputs.

### Potentially redundant docs

- `README.txt` (legacy handoff format)

---

## 4) Plan for Using Important Files

## Tier 1: Active runtime assets (must stay coherent)

- Pages: `index.html`, `plans.html`, individual plan pages, `plan.html`
- JS: `assets/js/common.js`, `assets/js/menu.js`, `assets/js/plan.js`
- CSS: `assets/css/main.css`, `assets/css/plan.css`
- Data: `menu.csv`, `prices.csv`, `plans.csv`, `plan_meals.csv`, `customization_options.csv`, `hero_slides.csv`

**Action plan**
- Keep strict CSV contracts for these files.
- Extend validation script to include optional checks for `hero_slides.csv` columns and missing local image files.
- Add CI check that runs `python3 scripts/validate_data.py` on every PR.

## Tier 2: Dormant/ops datasets

- `addons.csv`, `plan_addons.csv`, `plan_rules.csv`, `orders.csv`, `renewals.csv`, `meals.csv`

**Action plan**
- Either:
  - integrate into roadmap (addons UI, order lifecycle tracking), or
  - move to `data/archive/` with clear docs and ownership.

## Tier 3: Source snapshots/reference

- `raw_sheet_exports/*`, legacy docs

**Action plan**
- Keep only if provenance is required; otherwise archive with date/version marker.

---

## 5) Improvement Plan — Aesthetics

1. Convert `main.css` and `plan.css` into readable, modular styles (tokens/base/components/pages).
2. Unify typography scale and spacing system across homepage, plans hub, and plan pages.
3. Improve hero slideshow polish:
   - subtle gradient overlays per image,
   - caption contrast consistency,
   - touch-friendly controls and visible active state.
4. Improve plan cards with stronger hierarchy:
   - badges (popular/premium),
   - concise outcome statements,
   - clearer price anchoring.
5. Add lightweight visual trust blocks (delivery reliability, nutrition notes, testimonials).

---

## 6) Improvement Plan — Performance

1. Replace `cache: "no-store"` strategy with versioned assets/data (`?v=` hash) to enable browser caching.
2. Pre-build CSV to JSON during deploy to reduce client parse cost.
3. Defer non-critical JS and lazy-load below-the-fold sections.
4. Add responsive image strategy for hero slides (`srcset`, optimized WebP/JPEG fallbacks).
5. Add runtime fallback states:
   - slideshow image load failure placeholder,
   - plan fetch error UI,
   - explicit loading skeletons.
6. Introduce basic Lighthouse budget targets (LCP, CLS, INP) and track on every deploy.

---

## 7) Recommended Next Implementation Order

1. **Docs reconciliation sprint**
   - update `google_sheet_setup.md`, `docs/data-schema.md`, `docs/content-ops.md` to match current runtime.
2. **Validation hardening**
   - extend `scripts/validate_data.py` for hero slideshow and stricter schema checks.
3. **Plan-page resilience**
   - add try/catch + empty/error states in `assets/js/plan.js`.
4. **CSS refactor**
   - split one-line stylesheet into maintainable modules.
5. **Performance pass**
   - introduce data build pipeline and image optimization workflow.
