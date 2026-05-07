# Plan Data Audit — May 7, 2026 (Post-consolidation)

## Scope
Audit of live plan coverage after consolidating runtime dependencies to:
- `catalog.csv`
- `plans.csv`
- `allplans_nutrition.csv`

## Tests Run
1. `python scripts/validate_data.py`
2. Manual coverage scan of live `(Plan_Key, Variant_Key)` pairs in `plans.csv` against plan labels in `allplans_nutrition.csv`.
3. Nutrition row density count per live pair.

## Findings
### Validation status
- Validator passes with warning(s), not fatal errors.
- Current warning:
  - `smoothie:standard` appears unmatched in `allplans_nutrition.csv`.

### Coverage summary for live plan variants
- `basic:veg` → 192 rows
- `basic:nonveg` → 96 rows
- `elite:veg` → 192 rows
- `elite:nonveg` → 96 rows
- `weightloss:veg` → 192 rows
- `weightloss:nonveg` → 96 rows
- `diabetic:veg` → 192 rows
- `diabetic:nonveg` → 96 rows
- `smoothie:standard` → **0 rows** (incomplete)

## Conclusion
Yes — there is still partially updated plan data.
- The only currently incomplete live plan variant is `smoothie:standard` due to missing nutrition-sheet coverage.
- Other live plan variants appear populated and consistent under the current matching heuristic.

## Recommended Next Action
- Add `Smoothie Plan` rows into `allplans_nutrition.csv` (with matching plan + variant tokens), or mark smoothie as hidden in `plans.csv` until nutrition rows are published.
