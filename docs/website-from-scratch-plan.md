# Website From Scratch Plan (Theme-Aligned Starter)

Date: April 18, 2026

## 1) Goal

Build a fresh, maintainable version of the Cherish Every Bite website using the **current visual theme** (clean, premium, healthy), while making subscription plans easier to understand and compare.

Key outcomes:
- Faster content/data updates by non-developers.
- Consistent plan data model across menu + plans + add-ons.
- Clear customer journey from discovery → comparison → enquiry/order.

---

## 2) Product Principles (keep this as a design checklist)

1. **Clarity over completeness**: show only essential plan info first.
2. **Progressive disclosure**: details appear only when customers ask for more.
3. **Decision support**: provide recommendation tags (“Most Popular”, “Best for Weight Loss”).
4. **Mobile-first conversion**: plan browsing and WhatsApp enquiry should feel effortless on small screens.
5. **Trust signals**: nutrition credibility, freshness process, and customer proof should be visible without scrolling too far.

---

## 3) IA / Page Structure (initial)

## Core pages

1. **Home (`index.html`)**
   - Hero with CTA: “Explore Plans” + “Order À La Carte”.
   - Plan highlights (3–5 cards max).
   - Why Cherish section (nutrition + convenience).
   - Limited menu preview (top categories only).
   - Testimonials + trust badges.
   - Sticky CTA (WhatsApp / Order).

2. **Plans listing (`plans.html`)**
   - Compact comparison cards.
   - Filters: Goal, Veg/Non-Veg, Budget, Meals/day.
   - Toggle: monthly vs weekly price (if applicable).

3. **Plan detail (`plan.html?plan=<key>`)**
   - Full plan explanation.
   - “Who this is for” bullets.
   - Weekly preview carousel or day cards.
   - Included add-ons and optional add-ons.
   - FAQ and WhatsApp CTA.

4. **Menu (`menu.html`)**
   - À la carte catalogue separated from subscriptions.

5. **FAQ + Policy pages**
   - Delivery areas, pause/swap rules, refund terms, support timeline.

---

## 4) Data Architecture From Scratch

Use one canonical dataset pattern and avoid mixed naming conventions.

## Recommended canonical files

1. `plans.csv`
   - `plan_key, plan_name, goal, short_pitch, description, duration_days, meals_per_day_min, meals_per_day_max, price_weekly, price_monthly, is_popular, is_live, sort_order`

2. `plan_variants.csv`
   - `plan_key, variant_key, variant_name, diet_type, calories_band, protein_band, is_live`

3. `plan_meals.csv`
   - `plan_key, variant_key, week_no, day_no, meal_type, item_name, tags, calories, protein_g`

4. `addons.csv`
   - `addon_key, addon_name, addon_type, unit_price, billing_mode, short_desc, is_live`

5. `plan_addons.csv`
   - `plan_key, addon_key, is_allowed, default_qty, min_qty, max_qty`

6. `menu_items.csv`
   - `item_key, item_name, category, meal_type, diet_type, price, status, tags`

7. `faq.csv`
   - `faq_key, section, question, answer, sort_order, is_live`

## Optional JSON build output

Generate:
- `dist/data/plans.json`
- `dist/data/menu.json`

This improves runtime performance and removes browser-side CSV parsing complexity.

---

## 5) Content Model for Presentable Plan Cards (without overwhelming users)

Each plan card should initially show only:
1. Plan name
2. One-line outcome statement (e.g., “Fat-loss focused, high-protein meals”)
3. Price anchor (“Starts at ₹X/day”)
4. Meals/day range
5. Diet variants (Veg / Non-Veg)
6. One trust point (“Dietitian-curated”)
7. Primary CTA (“View Plan”)

Hide lower-priority details behind:
- “See full weekly preview”
- “Nutrition details”
- “Included add-ons”

This avoids info overload while still allowing depth.

---

## 6) Plan Presentation Framework (customer-facing)

## A) Comparison-first layout

Use a **3-card row** on desktop (1 card per row on mobile):
- Basic (entry)
- Weight Loss (goal specific)
- Elite (premium)

If more than 3 plans exist, show top 3 + “View all plans”.

## B) Visual hierarchy for each card

Top-to-bottom order:
1. Badge (`Most Popular`, `Best Value`, `Premium`)
2. Plan name
3. Goal subtitle
4. Price emphasis (largest text)
5. 3 concise features (icons + short text)
6. CTA row (`View details` + `Enquire`)

## C) Prevent comparison fatigue

- Limit default visible features to **3–5 per plan**.
- Offer “Compare plans” drawer/table only on demand.
- Use consistent terminology (don’t mix “duration”, “cycle”, “tenure”).

## D) Recommendation assist

Add a simple 3-question “Find my plan” wizard:
1. Primary goal?
2. Dietary preference?
3. Budget range?

Then auto-highlight recommended plan and scroll user to that card.

---

## 7) UX Copy Examples (theme-aligned)

- “Choose your rhythm: light, focused, or premium nutrition support.”
- “Start simple. Upgrade anytime.”
- “Dietitian-informed meals, delivered with consistency.”

For CTA buttons:
- Primary: `View Plan`
- Secondary: `Chat on WhatsApp`

---

## 8) Aesthetic Continuity Plan

Preserve existing visual identity while improving consistency:

1. Keep current red/green palette and rounded card language.
2. Standardize spacing scale and button styles globally.
3. Use shared CSS tokens in one file (`tokens.css`).
4. Reduce heavy shadows/blur for cleaner mobile rendering.
5. Add subtle iconography for features (calories, protein, delivery).

---

## 9) Performance Plan (from day one)

1. Prebuild JSON from CSV during deploy.
2. Use hashed assets and long-cache headers.
3. Lazy-load non-critical sections/images.
4. Keep hero assets optimized (`webp/avif`, responsive sizes).
5. Render skeleton/loading states for data-driven sections.
6. Avoid blocking scripts; use `defer` for JS where possible.

---

## 10) Implementation Roadmap

## Phase 1: Foundation (Week 1)
- Finalize data contracts and naming conventions.
- Set up folder structure and tokenized design system.
- Create static wireframes for home + plans listing + plan detail.

## Phase 2: MVP Build (Week 2)
- Build dynamic plan listing and detail pages from data.
- Add filters and basic compare mode.
- Integrate WhatsApp enquiry with prefilled context.

## Phase 3: Content + Conversion (Week 3)
- Add trust blocks, testimonials, and FAQ.
- Add recommendation wizard.
- Polish copy and empty/error states.

## Phase 4: QA + Launch (Week 4)
- Cross-device/browser testing.
- Data QA checks and broken-link checks.
- Performance/accessibility pass (LCP/CLS/contrast).

---

## 11) Suggested Folder Structure

```text
/assets
  /css
    tokens.css
    base.css
    components.css
    pages/
      home.css
      plans.css
      plan-detail.css
  /js
    lib/
      data-loader.js
      formatters.js
    pages/
      home.js
      plans.js
      plan-detail.js
/data
  plans.csv
  plan_variants.csv
  plan_meals.csv
  addons.csv
  plan_addons.csv
  menu_items.csv
  faq.csv
/docs
  data-contracts.md
  content-guidelines.md
```

---

## 12) Success Metrics

1. Plan page conversion rate (view → enquiry).
2. Time to first meaningful plan interaction.
3. % users using filters/compare tool.
4. Bounce rate on plans listing.
5. WhatsApp enquiry quality (complete context in message).

---

## 13) Immediate Next Steps (Practical)

1. Lock canonical CSV headers and deprecate mixed case naming.
2. Draft `plans.html` with compact cards and badge hierarchy.
3. Implement “top 3 plans + view all” pattern.
4. Add “Find my plan” mini-wizard.
5. Run a quick user test with 5 customers to validate clarity.

