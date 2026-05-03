# Website Summary and Professionalization Plan (April 26, 2026)

## Current Website Summary

Cherish Every Bite is a static, CSV-driven cloud-kitchen website with a customer-facing ordering funnel and lightweight account/admin tooling.

### What exists today

- **Public journey:** homepage (`index.html`), menu (`menu.html`), plans hub (`plans.html`), and multiple plan landing pages (`*-plan.html`, `plan.html`).
- **Conversion path:** lead capture + WhatsApp handoff for ordering and plan inquiries.
- **Data model:** content and pricing mostly controlled via CSVs (`menu.csv`, `prices.csv`, `plans.csv`, `plan_meals.csv`, `hero_slides.csv`).
- **User tools:** account page with auth fallback patterns and local-first profile/address/subscription management.
- **Admin tools:** browser admin surface for menu/calendar override operations.

### Main strengths

- Fast-to-edit content model for non-developers via CSV.
- Broad plan coverage (basic, elite, diabetic, smoothie, etc.).
- Graceful fallback architecture in several flows (local storage fallback when backend missing).

### Main pain points

- Inconsistent naming/schema conventions across data files.
- Redundant or dormant files increase maintenance burden.
- Styling and UI hierarchy are inconsistent across pages.
- Some runtime paths can fail without polished user-facing error states.
- Performance opportunities are open (asset caching, image optimization, data pre-processing).

---

## Professionalization Goals

1. **Professional:** consistent brand voice, stronger information hierarchy, and production-like reliability signals.
2. **Fully functional:** every key flow should succeed with clear fallback behavior and user-visible status.
3. **Aesthetic:** unified visual language across homepage, plans, menu, account, and calendar.
4. **Remove redundancy:** archive or delete non-runtime files/docs and duplicate data sources.
5. **Clean interface:** reduce clutter, simplify navigation, and improve scannability.
6. **Improve efficiency:** reduce page weight, parsing overhead, and unnecessary client work.

---

## Action Plan (Phased)

## Phase 1 — Content & Information Architecture Cleanup (Week 1)

### 1.1 Define canonical page purpose for each screen
- Homepage = trust + top dishes + plan CTA.
- Plans hub = comparison + plan selection.
- Individual plan page = detail + pricing + order CTA.
- Menu page = à la carte browsing.
- Calendar/account/admin = utility workflows only.

### 1.2 Remove/reduce redundant UI elements
- Keep one primary CTA per section.
- Remove repetitive “Order now” buttons where one sticky CTA is enough.
- Consolidate duplicate plan descriptions across pages into shared content snippets.

### 1.3 Tighten copywriting
- Convert generic text to concise value propositions:
  - outcome-driven headlines,
  - delivery reliability message,
  - transparent inclusions/exclusions.

**Deliverables:** page-content map, CTA map, redundant element removal list.

---

## Phase 2 — Visual System Refactor (Week 2)

### 2.1 Build a design token layer
- Introduce shared tokens for color, spacing, radius, shadows, typography.
- Use consistent heading scale and vertical rhythm.

### 2.2 Standardize components
- Rebuild reusable components:
  - navbar/sidebar,
  - plan cards,
  - buttons,
  - badges,
  - form fields,
  - section headers.

### 2.3 Elevate aesthetic quality
- Improve hero readability with gradient overlays.
- Add subtle motion (hover/focus transitions) with reduced-motion fallback.
- Improve mobile spacing and card density.

**Deliverables:** `assets/css` refactor plan and component style guide.

---

## Phase 3 — Functional Hardening (Week 3)

### 3.1 Error-handling coverage
- Add robust fetch error states for plan/menu/calendar/account surfaces.
- Show user-facing messages instead of silent console-only failures.

### 3.2 Validation and data contract enforcement
- Expand `scripts/validate_data.py` to check:
  - required headers,
  - enum value validity,
  - broken image references,
  - duplicate keys.

### 3.3 Authentication and role boundaries
- Make secure-auth mode default in production config.
- Enforce admin restrictions by allowed emails and backend checks.

**Deliverables:** resilient runtime matrix and validation checklist.

---

## Phase 4 — Redundancy Removal & Repository Hygiene (Week 4)

### 4.1 Identify active vs dormant files
- Keep active runtime CSV/files in root.
- Move dormant operational/archive data to versioned archive directory.

### 4.2 Remove legacy duplication
- Choose canonical data sources where duplicates exist.
- Deprecate stale docs and legacy README variants.

### 4.3 Documentation reconciliation
- Align README and docs with actual runtime behavior and field names.
- Document exact owner/update process for each CSV.

**Deliverables:** archived inventory, cleaned root directory, reconciled docs.

---

## Phase 5 — Performance & Efficiency Upgrades (Week 5)

### 5.1 Caching and delivery strategy
- Replace blanket no-store behavior with versioned static assets.
- Add immutable cache headers for static media.

### 5.2 Data pipeline optimization
- Precompile CSV to JSON at build/deploy time.
- Serve compact runtime payloads to reduce client parsing cost.

### 5.3 Media optimization
- Compress/resize hero and dish images.
- Add responsive image variants and lazy loading.

### 5.4 Front-end execution efficiency
- Defer non-critical scripts.
- Load below-the-fold sections on demand.

**Deliverables:** performance baseline vs improved benchmark (LCP/CLS/INP).

---

## Phase 6 — Quality Gates & Operational Readiness (Week 6)

### 6.1 Add release gates
- Data validation script required before merge/deploy.
- Basic smoke tests for top user flows (menu, plan, order CTA, account login).

### 6.2 Observability
- Add lightweight analytics/event tracking:
  - CTA clicks,
  - form start/submit,
  - plan-page dropoff,
  - ordering handoff completion.

### 6.3 Conversion optimization loop
- Run weekly review for:
  - top plan views,
  - CTA conversion rates,
  - device-specific bounce points.

**Deliverables:** go-live checklist and KPI dashboard spec.

---

## Prioritized Backlog (High Impact First)

1. Normalize data schema + docs.
2. Refactor CSS into maintainable tokens/components.
3. Add robust error/loading/empty states.
4. Remove dormant files from root and archive them.
5. Add caching + image optimization.
6. Instrument analytics and conversion tracking.

---

## Definition of “Done” for Professionalization

- UI is visually consistent across all pages.
- No critical user flow fails silently.
- Redundant files and duplicate data paths are removed or archived.
- Performance metrics improve measurably on mobile.
- Documentation matches actual runtime behavior.
- Admin/content updates can be done safely without code edits.
