# Data Schema

## prices.csv
Required columns: `no, category, name, price`.
Optional status columns: `status` or legacy `active`.

- `status`: `live` or `hidden`
- rows with `live` are rendered on the website.

## meals.csv
Required columns: `meal_id, name, category, price, status`.
Optional: `diabetic_friendly, calories, protein_g, tags`.

- `diabetic_friendly`: `true` or `false`
- `status`: `live` or `hidden`

## plans.csv
`plan_id, plan_name, duration_days, base_price, meals_per_day, status`

## addons.csv
`addon_id, addon_name, addon_type, unit_price, billing_mode, status`

## plan_addons.csv
`plan_id, addon_id, allowed, min_qty, max_qty, default_qty`

## plan_rules.csv
`rule_id, plan_id, rule_type, rule_key, rule_value, message`

## orders.csv
Operational request log for orders and payment/KOT lifecycle.

## renewals.csv
Renewal reminders and status mapped by `order_req_id`.
