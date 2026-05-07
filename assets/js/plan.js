const WHATSAPP_NUMBER = "916282023762";

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

function uniqueVariants(rows) {
  const out = [];
  const seen = new Set();
  for (const row of rows) {
    const key = `${row.Variant_Key}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ key: row.Variant_Key, label: row.Variant_Name });
    }
  }
  return out;
}

function sortWeekValue(week) {
  const match = String(week || "").match(/(\d+)/);
  return match ? Number(match[1]) : 999;
}

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase();
}

function derivePlanMealsFromNutrition(rows) {
  const out = [];
  rows.forEach(row => {
    const label = normalizeKey(row.Plan || row.plan || "");
    const planKey = ["elite", "basic", "weightloss", "diabetic", "smoothie", "customised", "salad"]
      .find(token => label.includes(token)) || "";
    const variantKey = label.includes("non-veg") || label.includes("nonveg")
      ? "nonveg"
      : (label.includes("veg") ? "veg" : "standard");
    const mealType = label.includes("dinner") ? "Dinner" : "Lunch";
    const weekMatch = String(row["Data.Column1"] || row.Week || "").match(/(\d+)/);
    const week = weekMatch ? `W${weekMatch[1]}` : "";
    const dayShort = String(row["Data.Column2"] || row.Day || "").trim().slice(0, 3).toLowerCase();
    const dayMap = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
    const day = dayMap[dayShort] || "";
    const cols = ["Data.Column3", "Data.Column4", "Data.Column5", "Data.Column6", "Data.Column7"]
      .map(key => row[key] || row[key.toLowerCase()] || "")
      .map(v => String(v || "").trim())
      .filter(Boolean);
    cols.forEach((item, idx) => {
      out.push({
        Plan_Key: planKey,
        Variant_Key: variantKey,
        Week: week,
        Day: day,
        Day_Order: String(["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].indexOf(day) + 1),
        Meal_Type: mealType,
        Item_Name: item,
        Component: idx === 0 ? "Main" : `Item${idx + 1}`
      });
    });
  });
  return out;
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
  document.getElementById("plan-title").textContent = first.Plan_Name;
  document.getElementById("plan-desc").textContent = first.Description || "";
  document.getElementById("plan-meta").textContent = `Duration: ${first.Duration_Days} days • Meals/day: ${first.Meals_Per_Day} • Starting at ${planPriceLabel(first)}`;
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
    `Hi Cherish Every Bite, I am interested in the ${planName}.`,
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

  const [plans, nutritionRows, catalogRows] = await Promise.all([
    fetchCSV("plans.csv"),
    fetchCSV("allplans_nutrition.csv"),
    fetchCSV("catalog.csv").catch(() => [])
  ]);
  const meals = derivePlanMealsFromNutrition(nutritionRows);

  const planRows = plans.filter(row => row.Plan_Key === planKey && String(row.Status || "").toLowerCase() === "live");
  renderPlanMeta(planRows);
  renderVariantOptions(planRows);

  const variantSelect = document.getElementById("variant-select");
  function refresh() {
    const variantKey = variantSelect?.value || (planRows[0] ? planRows[0].Variant_Key : "");
    const selectedPlan = planRows.find(row => row.Variant_Key === variantKey) || planRows[0];
    document.getElementById("selected-variant").textContent = selectedPlan ? `${selectedPlan.Variant_Name} (${planPriceLabel(selectedPlan)})` : "";
    updateWhatsapp(selectedPlan?.Plan_Name || getPlanLabel(planKey), selectedPlan?.Variant_Name || "");
    updateCalendarLinks(planKey, variantKey);

    if (planKey === "customised") {
      const options = catalogRows
        .filter(row => String(row.record_type || row.Record_Type || "").toLowerCase() === "custom_option")
        .map(row => ({ Category: row.category || row.Category || "Options", Option_Name: row.name || row.Name || "" }));
      renderCustomOptions(options);
      return;
    }

    const filteredMeals = meals.filter(row => row.Plan_Key === planKey && row.Variant_Key === variantKey);
    renderPlanDays(filteredMeals);
  }

  if (variantSelect) variantSelect.addEventListener("change", refresh);
  refresh();
})();
