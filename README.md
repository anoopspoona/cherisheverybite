# cherisheverybite
Cloud kitchen static website for curated healthy meals.

## Quickstart

```bash
python -m http.server 8000
```

Open:
- `http://localhost:8000/index.html`
- `http://localhost:8000/plan.html?plan=elite`

Validate runtime CSV contracts:

```bash
python3 scripts/validate_data.py
```

## Project structure

- `index.html` — landing page and dynamic menu render.
- `menu.html` — dedicated à la carte menu page.
- `plans.html` — subscription plans hub with links to individual plan pages.
- `plan.html` — plan detail page with 7-day meal preview.
- `elite-plan.html`, `salad-plan.html`, `weightloss-plan.html`, `basic-plan.html`, `customised-plan.html`, `smoothie-plan.html`, `diabetic-plan.html` — individual plan pages.
- `calendar.html` — plan calendar planner for lunch/dinner weekly or monthly slots.
- `map-picker.html` — interactive map pin selector for delivery location capture.
- `account.html` — customer profile, saved addresses, subscription controls, and saved orders.
- `admin.html` — local admin console to manage menu and subscription calendar CSV overrides.
- `assets/css/main.css` — landing page styles.
- `assets/css/plan.css` — plan page styles.
- `assets/js/common.js` — shared helpers.
- `assets/js/menu.js` — menu loading/rendering and lead form behavior.
- `assets/js/plan.js` — plan meal preview and package behavior.

## Data files (root)

- `meals.csv`
- `plans.csv`
- `addons.csv`
- `plan_addons.csv`
- `plan_rules.csv`
- `orders.csv`
- `renewals.csv`
- `prices.csv`
- `hero_slides.csv`
- `calendar_<plan>_<meal>.csv` (example: `calendar_elite_lunch.csv`)
- `delivery_locations.csv`

## Data source behavior

Homepage menu attempts Google Sheets CSV first (if configured), then falls back to local `prices.csv`.
Homepage featured dish slideshow reads from `hero_slides.csv` (if present and `status=live` rows exist).

To configure Google Sheets source, see `google_sheet_setup.md`.


## Phase 1 backend order capture

The calendar now supports optional server-side order capture before opening WhatsApp.

Configure in `calendar.html` before scripts load:

```html
<script>
  window.CEB_BACKEND_CONFIG = {
    apiBase: "https://your-api.example.com",
    apiToken: "<optional-bearer-token>",
    timeoutMs: 8000
  };
</script>
```

Expected endpoint:
- `POST /orders` with JSON payload from the calendar order object.

If backend is unavailable, the app falls back to local order storage and still opens WhatsApp.


## Phase 2 authentication (Supabase)

The account page supports optional Supabase Auth integration.

Configure in `account.html` before scripts load:

```html
<script>
  window.CEB_RUNTIME_CONFIG = {
    enforceSecureAuth: true,
    requireBackendSync: true,
    adminEmails: ["owner@example.com"]
  };
  window.CEB_SUPABASE_CONFIG = {
    url: "https://YOUR_PROJECT.supabase.co",
    anonKey: "YOUR_SUPABASE_ANON_KEY"
  };
</script>
```

Behavior:
- when configured, signup/login use Supabase Auth and session state is mirrored to `ceb_current_user_v1`.
- when not configured, app uses local demo auth as fallback.
- when `enforceSecureAuth: true`, local demo auth is blocked.

Optional backend endpoint for account order history:
- `GET /orders?userEmail=<email>`

### How to enable phone number login (OTP)

1. In Supabase, go to **Authentication → Providers → Phone** and enable the provider.
2. Configure an SMS provider under **Authentication → Settings** (for example Twilio / MessageBird based on your Supabase project setup).
3. Add your site URL and redirect URL under **Authentication → URL Configuration**.
4. Keep `window.CEB_SUPABASE_CONFIG` configured in `account.html`.
5. Open `account.html`, use **Phone Login (OTP)**, request OTP with an E.164 number (example: `+15551234567`), then verify.

Notes:
- Phone OTP requires Supabase mode; local demo auth does not support SMS OTP.
- The signed-in identifier mirrored to `ceb_current_user_v1` will be email (email auth) or phone number (phone auth).

### Phase 2 completion checklist

Phase 2 implementation in this repo is complete when these checks pass:

1. `account.html` loads Supabase SDK + `assets/js/auth.js` and optionally a populated `window.CEB_SUPABASE_CONFIG`.
2. `window.cebAuth.enabled` is `true` in browser console (Supabase mode active).
3. Email sign-up/login works on `account.html`.
4. Optional phone OTP works after enabling Supabase Phone provider + SMS provider credentials.
5. Account page can fetch order history from backend (`GET /orders?userEmail=<email>`) or fallback local storage.

If any check above is missing, finish that item before starting Phase 3.

## Phase 3 user controls (implemented baseline)

The account experience now includes initial self-service controls:

- **Subscription controls** on `account.html` (Pause / Resume / Skip Next Day / Save Meal Slot) derived from saved orders.
- **Upcoming Service** list that surfaces active upcoming subscription windows.
- **Saved addresses** in account with add, set default, and delete actions.
- One-click **Use for next order** link from saved addresses to prefill the calendar map link.
- Calendar confirmations auto-save confirmed delivery map links into account addresses for the current signed-in user.

Storage behavior:
- In configured backend mode, auth/session and order retrieval continue to use Supabase + backend endpoint.
- Subscription control state and saved addresses are persisted in browser local storage keys:
  - `ceb_subscriptions_v1`
  - `ceb_saved_addresses_v1`

This is a Phase 3 baseline. Production-grade Phase 3 should additionally persist these controls server-side and enforce per-user authorization at API/database level.

## Admin operations (local overrides)

`admin.html` provides browser-based operations for non-developer content management:

- Add/edit/delete dishes in Menu Manager and save as CSV overrides (`menu.csv`, `prices.csv`).
- Load and edit subscription dish rotations per plan/meal (`calendar_<plan>_<meal>.csv`).
- Reset individual overrides to fall back to repository CSV files.

Overrides are stored in `localStorage` key `ceb_csv_overrides_v1` and are respected by `fetchCSV()` in `assets/js/common.js`.

## Phase 4 operations backend (implemented with graceful fallback)

Phase 4 introduces optional backend synchronization for customer and admin operations while preserving local behavior if backend is unavailable.

### Customer operations endpoints

- `GET /profiles?userEmail=<email>`
- `POST /profiles` with `{ userEmail, name, phone }`
- `GET /addresses?userEmail=<email>`
- `PUT /addresses` with `{ userEmail, addresses: [...] }`
- `GET /subscriptions?userEmail=<email>`
- `PUT /subscriptions` with `{ userEmail, subscriptions: [...] }`

### Admin operations endpoints

- `PUT /admin/menu` with `{ menuRows: [...], priceRows: [...] }`
- `PUT /admin/calendar` with `{ path, rows: [...] }`

Behavior:
- If endpoints are configured and available, account/admin pages sync updates to backend.
- If endpoints are missing or fail, local storage remains the fallback source of truth.

## Deployment hardening checklist

- Set `CEB_RUNTIME_CONFIG.enforceSecureAuth=true` for production.
- Set `CEB_RUNTIME_CONFIG.requireBackendSync=true` for production admin flows.
- Set `CEB_RUNTIME_CONFIG.adminEmails=[...]` to restrict admin access.
- Configure Supabase auth providers and redirect URLs.
- Configure backend endpoints listed above with server-side authorization and validation.
- Verify account + calendar + admin flows end-to-end in staging before go-live.

## UX updates

- Navigation on pages is simplified to only three primary buttons: **Our Menu**, **Subscription Plans**, and **Order Now**.
- A floating minimizable sidebar (`assets/js/sidebar.js`, `assets/css/sidebar.css`) provides quick access to **User Account** and **Admin Console**.
- Account page always shows phone OTP login inputs; if Supabase phone auth is not configured, submit feedback explains why.

## Docs

- `docs/data-schema.md`
- `docs/data-contracts.md`
- `docs/content-ops.md`
- `docs/codebase-audit.md`
- `docs/website-from-scratch-plan.md`
- `docs/hero-slideshow-input.md`
