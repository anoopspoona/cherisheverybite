const PLAN_PAGE_BY_KEY = {
  elite: "elite-plan.html",
  salad: "salad-plan.html",
  weightloss: "weightloss-plan.html",
  basic: "basic-plan.html",
  customised: "customised-plan.html",
  smoothie: "smoothie-plan.html",
  diabetic: "diabetic-plan.html"
};

function planPriceLabel(row = {}) {
  const candidates = [
    row.Price,
    row.price,
    row.Plan_Price,
    row.plan_price,
    row.Base_Price,
    row.base_price,
    row.Monthly_Price,
    row.monthly_price,
    row.Variant_Price,
    row.variant_price
  ];
  const first = candidates.find(value => String(value || "").trim());
  if (!first) return "Price on request";
  const text = String(first).trim();
  return /^[₹$]/.test(text) ? text : `₹${text}`;
}

function planPeriodPrices(row = {}) {
  const monthlyRaw = row["Price for monthly subscription"] || row.price_for_monthly_subscription || row.Monthly_Price || row.monthly_price || "";
  const weeklyRaw = row["Price for weekly subscription"] || row.price_for_weekly_subscription || row.Weekly_Price || row.weekly_price || "";
  const normalize = value => {
    const text = String(value || "").trim();
    if (!text) return "";
    return /^[₹$]/.test(text) ? text : `₹${text}`;
  };
  return {
    monthly: normalize(monthlyRaw),
    weekly: normalize(weeklyRaw)
  };
}

function renderPlans(rows) {
  const grid = document.getElementById("plans-grid");
  if (!grid) return;
  const live = rows.filter(row => String(row.Status || row.status || "").toLowerCase() === "live");

  const grouped = new Map();
  live.forEach(row => {
    const key = String(row.Plan_Key || row.plan_key || "").trim().toLowerCase();
    if (!key) return;
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, { ...row, variants: [row.Variant_Name || row.variant_name || ""] });
      return;
    }
    const variant = row.Variant_Name || row.variant_name || "";
    if (variant && !existing.variants.includes(variant)) existing.variants.push(variant);
  });

  const cards = Array.from(grouped.entries()).map(([planKey, row]) => {
    const variants = row.variants.filter(Boolean);
    const prices = planPeriodPrices(row);
    const priceLine = [prices.monthly ? `Monthly: ${prices.monthly}` : "", prices.weekly ? `Weekly: ${prices.weekly}` : ""]
      .filter(Boolean)
      .join(" • ");
    return `
      <article class="day-card" style="padding:18px; background:linear-gradient(180deg,#ffffff,#f7fbf8); border-color:rgba(31,109,71,.14)">
        <h3>${escapeHtml(row.Plan_Name || row.plan_name || "Subscription Plan")}</h3>
        <p class="muted">${escapeHtml(row.Description || row.description || "Curated meal plan with healthy rotations.")}</p>
        <p class="legend" style="font-weight:700;color:#14532d;margin:8px 0 4px;">${escapeHtml(priceLine || `Starting at ${planPriceLabel(row)}`)}</p>
        <p class="muted" style="margin:0 0 10px;">${escapeHtml(row.Duration_Days || row.duration_days || "-")} days • ${escapeHtml(row.Meals_Per_Day || row.meals_per_day || "-")} meals/day</p>
        ${variants.length ? `<p class="muted" style="font-size:.85rem;">Variants: ${variants.map(v => escapeHtml(v)).join(" • ")}</p>` : ""}
        <p style="margin:12px 0 0;"><a class="btn btn-soft" href="${escapeHtml(PLAN_PAGE_BY_KEY[planKey] || `plan.html?plan=${encodeURIComponent(planKey)}`)}">View Plan</a></p>
      </article>
    `;
  });

  grid.innerHTML = cards.join("");
}

(async function initPlansPage() {
  const rows = await fetchCSV("plans.csv").catch(() => []);
  renderPlans(rows);
})();
