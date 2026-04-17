# cherisheverybite
Cloud kitchen

## Google Sheets menu connection

Use `google_sheet_setup.md` for the starter sheet template and connection steps.

## Root CSV data files

The repository now includes tab-equivalent CSV files in the root:

- `meals.csv`
- `plans.csv`
- `addons.csv`
- `plan_addons.csv`
- `plan_rules.csv`
- `orders.csv`
- `renewals.csv`
- `prices.csv`

## Plan detail page

- `plan.html` renders a 7-day preview menu for each plan (`elite`, `diabetic`, `budget`, `basic`, `additional`).
- Subscription cards in `index.html` now link to `plan.html?plan=<plan_key>`.
