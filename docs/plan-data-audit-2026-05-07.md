# Data Audit — May 7, 2026

## Scope
Audit performed on canonical runtime files:
- `catalog.csv`
- `plans.csv`
- `allplans_nutrition.csv`

## Tests executed
1. `python scripts/validate_data.py`
2. Catalog completeness scan for live rows (`id`, `name`, and type-specific required fields).
3. Live plan-variant coverage scan against `allplans_nutrition.csv` labels.

## Results
### Validator
- `scripts/validate_data.py` passes.

### Plan/nutrition coverage
- Live plan pairs in `plans.csv`: 9
- Missing coverage in `allplans_nutrition.csv`: 0
- Smoothie special naming (`Smoothie + Gut Booster Plan`) is matched successfully.

### Catalog incomplete / partially updated items
The following **live** rows have missing required details:
- `DISH008` (`addon`) — missing `category`
- `DISH010` (`dish`) — missing `category`
- `DISH020` (`dish`) — missing `category`
- `DISH024` (`dish`) — missing `category`
- `DISH057` (`dish`) — missing `category`
- `DISH047` (`dish`) — missing `price`

## Conclusion
- Plan/nutrition data coverage is complete under current matching rules.
- Catalog still has partially updated live items (6 rows) that should be completed for consistency.
