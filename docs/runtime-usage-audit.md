# Runtime Usage Audit (May 6, 2026)

## Scope
Audit of CSV files for **runtime references** from `.html` and `.js` assets.

## Method
- Scanned literal CSV filename references in runtime files.
- Verified candidate removals against docs/README to avoid deleting workflow-owned artifacts.

## Findings
### Runtime-referenced CSVs
- addons.csv
- allplans_nutrition.csv
- catalog.csv
- customization_options.csv
- delivery_locations.csv
- hero_slides.csv
- meals.csv
- menu.csv
- plans.csv
- prices.csv

### Not runtime-referenced CSVs
- dishes.csv
- orders.csv
- plan_addons.csv
- plan_rules.csv
- renewals.csv

## Deletion decision
Only deleted files with zero runtime references and no documented operational dependency.

Deleted:
- `scripts/New folder/catalog.csv` (orphan duplicate, no runtime references, no documentation dependency)

Retained despite no runtime references:
- `dishes.csv`, `orders.csv`, `plan_addons.csv`, `plan_rules.csv`, `renewals.csv` (documented in README/setup/schema docs as part of operational data workflows)
