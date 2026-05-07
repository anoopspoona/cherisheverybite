# Runtime Usage Audit (May 7, 2026)

## Canonical runtime files
The website runtime now uses only:
- `catalog.csv`
- `plans.csv`
- `allplans_nutrition.csv`

## Cleanup completed
Deleted redundant CSV files that were outside the canonical model:
- `addons.csv`
- `customization_options.csv`
- `delivery_locations.csv`
- `dishes.csv`
- `hero_slides.csv`
- `meals.csv`
- `menu.csv`
- `orders.csv`
- `plan_addons.csv`
- `plan_meals.csv`
- `plan_rules.csv`
- `prices.csv`
- `renewals.csv`

## Validation
- `python scripts/validate_data.py` passes against the canonical 3-file model.
