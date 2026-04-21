# cherisheverybite
Cloud kitchen static website for curated healthy meals.

## Quickstart

```bash
python -m http.server 8000
```

Open:
- `http://localhost:8000/index.html`
- `http://localhost:8000/plan.html?plan=elite`

Validate runtime CSV contracts:

```bash
python3 scripts/validate_data.py
```

## Project structure

- `index.html` — landing page and dynamic menu render.
- `plans.html` — subscription plans hub with links to individual plan pages.
- `plan.html` — plan detail page with 7-day meal preview.
- `elite-plan.html`, `salad-plan.html`, `weightloss-plan.html`, `basic-plan.html`, `customised-plan.html` — individual plan pages.
- `assets/css/main.css` — landing page styles.
- `assets/css/plan.css` — plan page styles.
- `assets/js/common.js` — shared helpers.
- `assets/js/menu.js` — menu loading/rendering and lead form behavior.
- `assets/js/plan.js` — plan meal preview and package behavior.

## Data files (root)

- `meals.csv`
- `plans.csv`
- `addons.csv`
- `plan_addons.csv`
- `plan_rules.csv`
- `orders.csv`
- `renewals.csv`
- `prices.csv`
- `hero_slides.csv`

## Data source behavior

Homepage menu attempts Google Sheets CSV first (if configured), then falls back to local `prices.csv`.
Homepage featured dish slideshow reads from `hero_slides.csv` (if present and `status=live` rows exist).

To configure Google Sheets source, see `google_sheet_setup.md`.

## Docs

- `docs/data-schema.md`
- `docs/data-contracts.md`
- `docs/content-ops.md`
- `docs/codebase-audit.md`
- `docs/website-from-scratch-plan.md`
- `docs/hero-slideshow-input.md`
