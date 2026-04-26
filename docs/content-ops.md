# Content Operations Guide

## Update menu items
1. Edit `catalog.csv` and update rows with `record_type=dish` (or `Record_Type=dish`).
2. Update these dish fields in one place: `id/ID`, `name/Name`, `category/Category`, `meal_type/Meal_Type`, `image_url/Image_URL`, `price/Price`, `status/Status`.
3. Mark unavailable dishes as `hidden`.
4. Thumbnails should be saved under `assets/dishes/` (or any folder under `assets/`) and referenced in `image_url` as a relative path (example: `assets/dishes/grilled-paneer.jpg`).

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
