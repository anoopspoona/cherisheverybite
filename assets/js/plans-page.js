function normalizeKey(value) {
  return String(value || "").trim().toLowerCase();
}

function titleFromPlanKey(planKey) {
  const text = String(planKey || "").trim();
  if (!text) return "Subscription Plan";
  return text;
}

function formatMoney(value) {
  const numeric = Number(String(value || "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(numeric) || numeric <= 0) return "Price on request";
  return `₹${numeric.toLocaleString("en-IN")}`;
}

function pickPrice(row, period) {
  if (!row) return "Price on request";
  const raw = period === "weekly"
    ? (row["Price for weekly subscription"] || row.price_weekly || row.Weekly_Price || row.weekly_price)
    : (row["Price for monthly subscription"] || row.price_monthly || row.Monthly_Price || row.monthly_price);
  return formatMoney(raw);
}

function rowsForSelection(rows, selection) {
  const mealNeedle = normalizeKey(selection.meal);
  const variantNeedle = normalizeKey(selection.variant);
  const liveRows = rows.filter(row => normalizeKey(row.Status || row.status) === "live");

  const withMeal = liveRows.filter(row => {
    const planName = normalizeKey(row.Plan_Name || row.plan_name);
    const planKey = normalizeKey(row.Plan_Key || row.plan_key);
    if (!mealNeedle) return true;
    if (planKey === "smoothie") return true;
    return planName.includes(`-${mealNeedle}`) || planName.endsWith(mealNeedle) || mealNeedle === "all";
  });

  return withMeal.filter(row => {
    const variant = normalizeKey(row.Variant_Key || row.variant_key || row.Variant_Name || row.variant_name);
    if (!variantNeedle || variantNeedle === "all") return true;
    if (variantNeedle === "standard") return variant === "standard";
    return variant === variantNeedle || variant === "standard";
  });
}

function renderPlans(rows, selection) {
  const grid = document.getElementById("plans-grid");
  if (!grid) return;

  const filtered = rowsForSelection(rows, selection);
  const grouped = new Map();
  filtered.forEach(row => {
    const planKey = String(row.Plan_Key || row.plan_key || "").trim();
    if (!planKey) return;
    const key = normalizeKey(planKey);
    if (!grouped.has(key)) grouped.set(key, { planKey, rows: [] });
    grouped.get(key).rows.push(row);
  });

  if (!grouped.size) {
    grid.innerHTML = `<article class="day-card" style="padding:18px;"><p class="muted">No plans available for selected filters.</p></article>`;
    return;
  }

  const cards = Array.from(grouped.values()).map(group => {
    const first = group.rows[0];
    const planSlug = normalizeKey(group.planKey);
    const price = pickPrice(first, selection.period);
    const description = first.Description || first.description || "Curated subscription plan.";
    const duration = selection.period === "weekly" ? "6 active days" : "24 active days";

    return `
      <article class="day-card" style="padding:18px; background:linear-gradient(180deg,#ffffff,#f7fbf8); border-color:rgba(31,109,71,.14)">
        <h3>${escapeHtml(titleFromPlanKey(group.planKey))}</h3>
        <p class="muted">${escapeHtml(description)}</p>
        <p class="legend" style="font-weight:700;color:#14532d;margin:8px 0 4px;">${escapeHtml(selection.period[0].toUpperCase() + selection.period.slice(1))} price: ${escapeHtml(price)}</p>
        <p class="muted" style="margin:0 0 10px;">${escapeHtml(duration)}</p>
        <p style="margin:12px 0 0;"><a class="btn btn-soft" href="calendar.html?plan=${encodeURIComponent(planSlug)}&meal=${encodeURIComponent(selection.meal)}&period=${encodeURIComponent(selection.period)}&variant=${encodeURIComponent(selection.variant)}">Choose Plan</a></p>
      </article>
    `;
  });

  grid.innerHTML = cards.join("");
}

(async function initPlansPage() {
  const rows = await fetchCSV("plans.csv").catch(() => []);
  const periodSelect = document.getElementById("plan-period-select");
  const mealSelect = document.getElementById("plan-meal-select");
  const variantSelect = document.getElementById("plan-variant-select");

  const selection = {
    period: periodSelect?.value || "weekly",
    meal: mealSelect?.value || "lunch",
    variant: variantSelect?.value || "veg"
  };

  function refresh() {
    selection.period = periodSelect?.value || "weekly";
    selection.meal = mealSelect?.value || "lunch";
    selection.variant = variantSelect?.value || "veg";
    renderPlans(rows, selection);
  }

  [periodSelect, mealSelect, variantSelect].forEach(el => {
    if (!el) return;
    el.addEventListener("change", refresh);
  });

  refresh();
})();
