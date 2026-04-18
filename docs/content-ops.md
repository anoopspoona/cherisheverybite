# Content Operations Guide

## Update menu items
1. Edit `prices.csv` and keep header columns unchanged.
2. Mark unavailable rows as `hidden` in `status`.
3. Keep `no` values numeric and unique per row.

## Update subscription meal source
1. Edit `meals.csv` for plan preview data.
2. Mark diabetic-safe items with `diabetic_friendly=true`.
3. Keep `status=live` only for selectable items.

## Optional Google Sheets source
1. Publish a `prices` tab as CSV.
2. Set `GOOGLE_SHEET_CSV_URL` in `assets/js/menu.js`.
3. Verify menu source text on homepage.

## Local verification
Run:

```bash
python -m http.server 8000
```

Open:
- `http://localhost:8000/index.html`
- `http://localhost:8000/plan.html?plan=elite`
