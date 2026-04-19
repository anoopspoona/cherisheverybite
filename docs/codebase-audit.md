# Codebase Audit (April 18, 2026)

## 1) Project Summary

Cherish Every Bite is a static, CSV-driven website with two user-facing pages:

- `index.html`: landing page with dynamic rendering of à la carte menu sections and subscription plan cards.
- `plan.html`: plan detail page that renders a selected plan's weekly meal preview (or customization options for the customised plan).

Data is loaded client-side from root CSV files via `fetch` and a small in-browser CSV parser in `assets/js/common.js`.

### Runtime flow

1. `index.html` loads `assets/js/common.js` + `assets/js/menu.js`.
2. `menu.js` fetches `menu.csv`, `prices.csv`, and `plans.csv`.
3. Menu rows are merged with pricing/status and rendered by category.
4. Plan cards are rendered from `plans.csv`.
5. A lead form opens WhatsApp with prefilled text.

For plan detail:

1. `plan.html` loads `assets/js/common.js` + `assets/js/plan.js`.
2. `plan.js` reads `?plan=<plan_key>` from URL.
3. It fetches `plans.csv`, `plan_meals.csv`, and optionally `customization_options.csv`.
4. For non-customised plans, meals are grouped by week/day and meal type.
5. For `customised`, option categories are rendered instead of day-wise meals.

## 2) Inconsistencies Found

### A. Documentation vs implementation mismatches

1. **Google Sheets integration docs are stale**
   - `google_sheet_setup.md` says to set `GOOGLE_SHEET_CSV_URL` in `assets/js/menu.js`, and that UI shows menu source text.
   - Current `menu.js` has no `GOOGLE_SHEET_CSV_URL` constant and no menu-source indicator.

2. **Schema docs describe different CSV models than active UI code**
   - `docs/data-schema.md` describes lower-case headers (`plan_id`, `meal_id`, etc.).
   - Current UI logic reads mixed/TitleCase keys like `Plan_Key`, `Variant_Key`, `Dish_ID`.

3. **Content ops doc points plan preview updates to `meals.csv`**
   - Actual plan preview uses `plan_meals.csv` in `assets/js/plan.js`.

4. **`README.txt` appears legacy/packaging-oriented**
   - It reads like a one-time replace package and partially duplicates `README.md` with slightly different emphasis.

### B. Data model inconsistencies

1. **Two overlapping menu datasets**
   - UI uses `menu.csv + prices.csv` merge for homepage menu.
   - `meals.csv` exists with similar meal content but is not read by homepage or plan page.

2. **Mixed naming conventions in CSVs and code**
   - Some files use snake_case (`addon_id`), others TitleCase (`Plan_Key`, `Dish_ID`).
   - JS handles this partially, but not consistently across all files.

3. **Status semantics differ by file**
   - `menu.js` expects `live` statuses.
   - `prices.csv` includes an `Active` column that is ignored by runtime logic.

### C. Code quality / robustness issues

1. **No error boundary on plan page init fetches**
   - `plan.js` does not wrap its `Promise.all` in try/catch, so missing/invalid CSV can fail hard.

2. **CSV parser is simple and may break on multiline quoted fields**
   - `parseCSV` splits by newline before tokenization; multiline quoted values would parse incorrectly.

3. **No explicit loading/empty/error states for plan page**
   - Users may see blank content when data is absent or filters return zero rows.

## 3) Likely Unused or Not Runtime-Used Files

### Unused in browser runtime (currently)

- `addons.csv`
- `plan_addons.csv`
- `plan_rules.csv`
- `orders.csv`
- `renewals.csv`
- `meals.csv`
- `raw_sheet_exports/*` (source snapshots)

These appear to support future operations/backoffice flows or data provenance, but are not fetched by current JS.

### Probably redundant / archival docs

- `README.txt` (legacy package handoff style)

### Definitely used at runtime

- HTML/CSS/JS under `assets/` + `index.html` + `plan.html`
- `menu.csv`, `prices.csv`, `plans.csv`, `plan_meals.csv`, `customization_options.csv`

## 4) Plan for Using Important Files (Recommended Operating Model)

### Tier 1: Core runtime files (must stay coherent)

- **Pages/UI**: `index.html`, `plan.html`, `assets/css/main.css`, `assets/css/plan.css`
- **Logic**: `assets/js/common.js`, `assets/js/menu.js`, `assets/js/plan.js`
- **Primary data**: `menu.csv`, `prices.csv`, `plans.csv`, `plan_meals.csv`, `customization_options.csv`

**Plan**
- Treat these as deployment-critical; validate in CI or pre-commit for schema and required headers.
- Add a small integrity script to verify key relationships:
  - every `menu.csv.Dish_ID` exists in `prices.csv`
  - every `plan_meals.csv.Plan_Key + Variant_Key` exists in `plans.csv`

### Tier 2: Operational/backoffice files (currently dormant)

- `addons.csv`, `plan_addons.csv`, `plan_rules.csv`, `orders.csv`, `renewals.csv`, `meals.csv`

**Plan**
- Either:
  1) integrate them into UI/API roadmap (addons selector, rules enforcement, order pipeline), or
  2) move to `data/archive/` and clearly mark as non-runtime.

### Tier 3: Reference/source files

- `raw_sheet_exports/*`, `README.txt`

**Plan**
- Keep only if needed for traceability.
- Otherwise archive with date-stamped folder and add provenance note.

## 5) Improvement Plan: Aesthetics

1. **Typography and hierarchy**
   - Add explicit font loading strategy (or system stack consistency) and normalize heading scale across pages.

2. **Design tokens unification**
   - Move shared color/spacing/button tokens to a single CSS token block reused by both `main.css` and `plan.css`.

3. **Component consistency**
   - Align card paddings, radii, shadows, and button styles between landing and plan pages.

4. **Menu scannability**
   - Add quick filters (category, veg/non-veg tags if available) and sticky category jump links.

5. **Content polish**
   - Remove migration wording like “uploaded Excel-derived CSV files” from user-facing copy.

## 6) Improvement Plan: Performance

1. **Reduce initial payload**
   - Split `menu.csv` by category or lazy-load sections as they enter viewport.

2. **Add caching/versioning strategy**
   - Replace `cache: "no-store"` with cache-friendly strategy + query/version hash for controlled busting.

3. **Precompute normalized JSON**
   - Convert CSVs to minified JSON in a build step for faster parse time and less client CPU.

4. **Image optimization**
   - Serve local hero image variants and use responsive `srcset` for logo/hero assets.

5. **Defensive rendering paths**
   - Introduce explicit loading and fallback UI states to avoid layout shifts/blank areas.

6. **Accessibility-performance wins**
   - Ensure color contrast and reduce heavy effects on low-end devices (blur/shadow tuning).

## 7) Suggested Next Execution Order

1. **Documentation reconciliation pass**
   - Update `README.md`, `docs/data-schema.md`, `docs/content-ops.md`, `google_sheet_setup.md` to current runtime truth.
2. **Data contract tooling**
   - Add a validation script for required columns + cross-file key integrity.
3. **Runtime hardening**
   - Add fetch error handling + empty states in `plan.js` and stronger CSV parsing behavior.
4. **UI cleanup**
   - Unify tokens/components and polish copy.
5. **Performance pass**
   - Add cache strategy and optional build step for JSON conversion.

