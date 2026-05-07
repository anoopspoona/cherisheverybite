# Plan Data Audit — May 7, 2026 (Post-consolidation)

## Scope
Audit of live plan coverage after consolidating runtime dependencies to:
- `catalog.csv`
- `plans.csv`
- `allplans_nutrition.csv`

## Tests Run
1. `python scripts/validate_data.py`
2. Manual spot-check for smoothie naming variant in nutrition labels (`Smoothie + Gut Booster Plan`).

## Findings
### Validation status
- Validator passes with no errors or warnings.
- Special-case matching for smoothie now accepts nutrition labels like `Smoothie + Gut Booster Plan` for `smoothie:standard`.

### Coverage summary
- All current live plan variants in `plans.csv` have nutrition-sheet coverage under current matching logic.

## Conclusion
No currently detected incomplete live plan variants based on the active validator rules.

## Recommendation
- Keep smoothie naming consistent in `allplans_nutrition.csv` (prefix with `Smoothie`) so coverage remains resilient.
