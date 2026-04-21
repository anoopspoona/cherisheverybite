# Runtime Data Contracts

This document defines the minimum CSV contracts currently required by the live website runtime.

## Validation script

Run from repo root:

```bash
python3 scripts/validate_data.py
```

The script checks:
- required runtime CSV files exist,
- required columns are present,
- `menu.csv.Dish_ID` values exist in `prices.csv`,
- `plan_meals.csv (Plan_Key, Variant_Key)` pairs map to live pairs in `plans.csv`.

The homepage hero slideshow also supports `hero_slides.csv` (optional), with graceful fallback when missing.

## Required runtime files and columns

### `menu.csv`
Required columns:
- `Dish_ID`
- `Dish_Name`
- `Category`

### `prices.csv`
Required columns:
- `Dish_ID`
- `Price`

### `plans.csv`
Required columns:
- `Plan_Key`
- `Variant_Key`
- `Plan_Name`
- `Status`

### `plan_meals.csv`
Required columns:
- `Plan_Key`
- `Variant_Key`
- `Week`
- `Day`
- `Meal_Type`
- `Item_Name`

### `customization_options.csv`
Required columns:
- `Category`
- `Option_Name`

## Notes

- The runtime currently relies on **TitleCase** headers for plan/menu datasets.
- Keep `Status` values normalized (`live` / `hidden`) for predictable behavior.
- This contract intentionally reflects current code behavior and can evolve if runtime code changes.
