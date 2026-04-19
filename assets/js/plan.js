const WHATSAPP_NUMBER = "916282023762";

function getPlanLabel(planKey) {
  const labels = {
    elite: "Elite Plan",
    salad: "Salad Plan",
    weightloss: "Weight Loss Plan",
    basic: "Basic Plan",
    customised: "Customised Plan"
  };
  return labels[planKey] || "Plan";
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
  document.getElementById("plan-meta").textContent = `Duration: ${first.Duration_Days} days • Meals/day: ${first.Meals_Per_Day}`;
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

(async function init() {
  const params = new URLSearchParams(window.location.search);
  const pagePlanKey = document.body?.dataset?.planKey || "";
  const planKey = pagePlanKey || params.get("plan") || "elite";

  const [plans, meals, options] = await Promise.all([
    fetchCSV("plans.csv"),
    fetchCSV("plan_meals.csv"),
    fetchCSV("customization_options.csv").catch(() => [])
  ]);

  const planRows = plans.filter(row => row.Plan_Key === planKey && String(row.Status || "").toLowerCase() === "live");
  renderPlanMeta(planRows);
  renderVariantOptions(planRows);

  const variantSelect = document.getElementById("variant-select");
  function refresh() {
    const variantKey = variantSelect?.value || (planRows[0] ? planRows[0].Variant_Key : "");
    const selectedPlan = planRows.find(row => row.Variant_Key === variantKey) || planRows[0];
    document.getElementById("selected-variant").textContent = selectedPlan ? selectedPlan.Variant_Name : "";
    updateWhatsapp(selectedPlan?.Plan_Name || getPlanLabel(planKey), selectedPlan?.Variant_Name || "");

    if (planKey === "customised") {
      renderCustomOptions(options);
      return;
    }

    const filteredMeals = meals.filter(row => row.Plan_Key === planKey && row.Variant_Key === variantKey);
    renderPlanDays(filteredMeals);
  }

  if (variantSelect) variantSelect.addEventListener("change", refresh);
  refresh();
})();
