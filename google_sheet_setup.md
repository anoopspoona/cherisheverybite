# Google Sheets starter template + website connection

This project can read menu items from a published Google Sheet (CSV) with fallback to local `prices.csv`.

## 1) Create the sheet

Create a Google Sheet named `cherisheverybite-menu` and add a tab named `prices`.

Use this exact header and sample rows:

```csv
no,category,name,price,status
1,Soups,Ragi collagen chicken soup,TBD,live
2,Soups,Vegetable broth,TBD,hidden
3,Salads,Corn and yuzu salad,TBD,live
4,Salads,Mesclun quinoa salad,TBD,live
5,Protein Add On,Herbs marinated chicken breast,TBD,live
6,Bites,Greek yogurt granola,TBD,live
7,Drinks,ABC Smoothie,TBD,live
8,Desserts,Protein Peanut Butter Brownie,TBD,live
```

You can copy all rows from `prices.csv` into this tab.

## 2) Publish CSV from Google Sheets

1. Open **File → Share → Publish to web**.
2. Select the `prices` tab and choose **Comma-separated values (.csv)**.
3. Click **Publish**.
4. Copy the generated CSV URL.

Example URL shape:

```text
https://docs.google.com/spreadsheets/d/<SHEET_ID>/gviz/tq?tqx=out:csv&sheet=prices
```

## 3) Connect in code

Open `assets/js/menu.js` and set:

```js
const GOOGLE_SHEET_CSV_URL = "<PASTE_PUBLISHED_CSV_URL_HERE>";
```

If this value is blank, the site automatically falls back to local `prices.csv`.

## 4) Verify

Run local server:

```bash
python -m http.server 8000
```

Open `http://localhost:8000/index.html` and check the menu source text under "Our Menu":
- `Menu source: Google Sheets` (connected), or
- `Menu source: Local prices.csv (fallback)`.

## 5) Root CSV files available (tab-equivalent)

If you prefer managing everything as files in this repo instead of Google Sheets tabs,
use the root CSV files:

- `meals.csv`
- `plans.csv`
- `addons.csv`
- `plan_addons.csv`
- `plan_rules.csv`
- `orders.csv`
- `renewals.csv`
- `prices.csv`
