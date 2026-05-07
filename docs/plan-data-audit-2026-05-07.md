# Plan Data Audit — May 7, 2026

## Scope
Audit for incomplete/partially updated plan datasets across:
- `plans.csv`
- `allplans_nutrition.csv`

## What was tested
1. Nutrition coverage heuristic (every live pair should have matching records in `allplans_nutrition.csv`).

## Results
### Warnings (incomplete / partially updated data)
- Live pairs that appear **unmatched in allplans_nutrition.csv**:
  - `smoothie:standard`

## Interpretation
- **Partially updated plan content exists**.
- Smoothie plan is live but appears to lack nutrition coverage in the unified nutrition sheet.

## Recommendation
1. Add smoothie nutrition entries to `allplans_nutrition.csv` (or establish an explicit exception rule if sourced elsewhere).
