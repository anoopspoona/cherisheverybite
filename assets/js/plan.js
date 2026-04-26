const WHATSAPP_NUMBER = "916282023762";

function pick(row, keys, fallback = "") {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return fallback;
}

function getPlanLabel(planKey) {
  const labels = {
    elite: "Elite Plan",
    salad: "Salad Plan",
    weightloss: "Weight Loss Plan",
    basic: "Basic Plan",
    customised: "Customised Plan",
    smoothie: "Smoothie Plan",
    diabetic: "Diabetic Plan"
  };
  return labels[planKey] || "Plan";
}

function cleanPlanTitle(name = "") {
  const text = String(name || "").trim();
  if (!text) return "";
  return text
    .replace(/\s*[-–]\s*lunch\s*$/i, "")
    .replace(/\s+lunch\s*$/i, "")
    .trim();
}

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

function uniqueVariants(rows) {
  const out = [];
  const seen = new Set();
  for (const row of rows) {
    const key = String(pick(row, ["Variant_Key", "variant_key", "Variant Key", "variant key"], "")).trim();
    const label = String(pick(row, ["Variant_Name", "variant_name", "Variant Name", "variant name"], key || "Standard")).trim();
    if (!key) continue;
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ key, label });
    }
  }
  return out;
}

function sortWeekValue(week) {
  const match = String(week || "").match(/(\d+)/);
  return match ? Number(match[1]) : 999;
}

function renderVariantOptions(rows) {
  const select = document.getElementById("variant-select");
  if (!select) return;
  const variants = uniqueVariants(rows);
  select.innerHTML = variants.map(v => `<option value="${escapeHtml(v.key)}">${escapeHtml(v.label)}</option>`).join("");
  document.getElementById("variant-wrap").style.display = variants.length > 1 ? "grid" : "none";
}

function renderPlanMeta(planRows) {
  if (!planRows.length) return;
  const first = planRows[0];
  const prices = planPeriodPrices(first);
  const priceParts = [];
  if (prices.monthly) priceParts.push(`Monthly: ${prices.monthly}`);
  if (prices.weekly) priceParts.push(`Weekly: ${prices.weekly}`);
  if (!priceParts.length) priceParts.push(`Starting at ${planPriceLabel(first)}`);
  const planName = pick(first, ["Plan_Name", "plan_name", "Plan Name", "plan name"], "Plan");
  const description = pick(first, ["Description", "description"], "");
  const durationDays = pick(first, ["Duration_Days", "duration_days", "Duration Days", "duration days"], "-");
  const mealsPerDay = pick(first, ["Meals_Per_Day", "meals_per_day", "Meals Per Day", "meals per day"], "-");
  document.getElementById("plan-title").textContent = cleanPlanTitle(planName) || planName;
  document.getElementById("plan-desc").textContent = description;
  document.getElementById("plan-meta").textContent = `Duration: ${durationDays} days • Meals/day: ${mealsPerDay} • ${priceParts.join(" • ")}`;
}

function renderCustomOptions(options) {
  const grid = document.getElementById("days-grid");
  if (!grid) return;
  const grouped = new Map();
  for (const row of options) {
    const key = row.Category || "Options";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row.Option_Name);
  }

  grid.innerHTML = Array.from(grouped.entries()).map(([category, items]) => `
    <article class="day-card">
      <h3>${escapeHtml(category)}</h3>
      <div class="slot"><span>${items.map(item => escapeHtml(item)).join("<br>")}</span></div>
    </article>
  `).join("");
}

function renderPlanDays(rows) {
  const grid = document.getElementById("days-grid");
  if (!grid) return;

  const grouped = new Map();
  for (const row of rows) {
    const key = `${row.Week}__${row.Day}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }

  const cards = Array.from(grouped.entries())
    .sort((a, b) => {
      const [weekA, dayA] = a[0].split("__");
      const [weekB, dayB] = b[0].split("__");
      const wDiff = sortWeekValue(weekA) - sortWeekValue(weekB);
      if (wDiff) return wDiff;
      const dayOrderA = Number((a[1][0] || {}).Day_Order || 99);
      const dayOrderB = Number((b[1][0] || {}).Day_Order || 99);
      return dayOrderA - dayOrderB;
    })
    .map(([key, items]) => {
      const [week, day] = key.split("__");
      const byMeal = new Map();
      for (const item of items) {
        const meal = item.Meal_Type || "Meal";
        if (!byMeal.has(meal)) byMeal.set(meal, []);
        byMeal.get(meal).push(item);
      }
      const mealHtml = Array.from(byMeal.entries()).map(([meal, entries]) => `
        <div class="slot">
          <strong>${escapeHtml(meal)}</strong>
          <span>${entries.map(entry => escapeHtml(entry.Item_Name)).join(" • ")}</span>
        </div>
      `).join("");

      return `
        <article class="day-card">
          <h3>${escapeHtml(week)} • ${escapeHtml(day)}</h3>
          ${mealHtml}
        </article>
      `;
    });

  grid.innerHTML = cards.join("");
}

function updateWhatsapp(planName, variantName) {
  const link = document.getElementById("enquire-btn");
  if (!link) return;
  const text = [
    `Hi Cherish Every Bite, I am interested in the ${cleanPlanTitle(planName) || planName}.`,
    variantName ? `Preferred variant: ${variantName}.` : "",
    "Please share pricing, add-ons and subscription details."
  ].filter(Boolean).join(" ");
  link.href = buildWhatsappLink(WHATSAPP_NUMBER, text);
}

function updateCalendarLinks(planKey, variantKey) {
  const lunchBtn = document.getElementById("lunch-btn");
  const dinnerBtn = document.getElementById("dinner-btn");
  const base = `calendar.html?plan=${encodeURIComponent(planKey)}&variant=${encodeURIComponent(variantKey || "standard")}`;
  if (lunchBtn) lunchBtn.href = `${base}&meal=lunch`;
  if (dinnerBtn) dinnerBtn.href = `${base}&meal=dinner`;
}

(async function init() {
  const params = new URLSearchParams(window.location.search);
  const pagePlanKey = document.body?.dataset?.planKey || "";
  const planKey = pagePlanKey || params.get("plan") || "elite";

  const [plans, meals, options] = await Promise.all([
    fetchCSV("plans.csv"),
    fetchCSV("plan_meals.csv"),
    fetchCSV("customization_options.csv").catch(() => [])
  ]);

  const planRows = plans.filter(row => {
    const rowPlanKey = String(pick(row, ["Plan_Key", "plan_key", "Plan Key", "plan key"], "")).trim().toLowerCase();
    const status = String(pick(row, ["Status", "status"], "live")).trim().toLowerCase();
    return rowPlanKey === String(planKey || "").trim().toLowerCase() && status === "live";
  });
  renderPlanMeta(planRows);
  renderVariantOptions(planRows);

  const variantSelect = document.getElementById("variant-select");
  function refresh() {
    const defaultVariantKey = String(pick(planRows[0] || {}, ["Variant_Key", "variant_key", "Variant Key", "variant key"], "")).trim();
    const variantKey = variantSelect?.value || defaultVariantKey;
    const selectedPlan = planRows.find(row => String(pick(row, ["Variant_Key", "variant_key", "Variant Key", "variant key"], "")).trim() === variantKey) || planRows[0];
    const variantName = String(pick(selectedPlan || {}, ["Variant_Name", "variant_name", "Variant Name", "variant name"], variantKey || "Standard")).trim();
    const selectedPlanName = String(pick(selectedPlan || {}, ["Plan_Name", "plan_name", "Plan Name", "plan name"], getPlanLabel(planKey))).trim();
    const prices = planPeriodPrices(selectedPlan || {});
    const priceText = [prices.monthly ? `Monthly ${prices.monthly}` : "", prices.weekly ? `Weekly ${prices.weekly}` : ""]
      .filter(Boolean)
      .join(" • ");
    document.getElementById("selected-variant").textContent = selectedPlan
      ? `${variantName}${priceText ? ` (${priceText})` : ` (${planPriceLabel(selectedPlan)})`}`
      : "";
    updateWhatsapp(selectedPlanName, variantName || "");
    updateCalendarLinks(planKey, variantKey);

    if (planKey === "customised") {
      renderCustomOptions(options);
      return;
    }

    const filteredMeals = meals.filter(row => {
      const rowPlanKey = String(pick(row, ["Plan_Key", "plan_key", "Plan Key", "plan key"], "")).trim().toLowerCase();
      const rowVariantKey = String(pick(row, ["Variant_Key", "variant_key", "Variant Key", "variant key"], "")).trim().toLowerCase();
      return rowPlanKey === String(planKey || "").trim().toLowerCase() && rowVariantKey === String(variantKey || "").trim().toLowerCase();
    });
    const fallbackMeals = meals.filter(row => {
      const rowPlanKey = String(pick(row, ["Plan_Key", "plan_key", "Plan Key", "plan key"], "")).trim().toLowerCase();
      return rowPlanKey === String(planKey || "").trim().toLowerCase();
    });
    renderPlanDays(filteredMeals.length ? filteredMeals : fallbackMeals);
  }

  if (variantSelect) variantSelect.addEventListener("change", refresh);
  refresh();
})();
