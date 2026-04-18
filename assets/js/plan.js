const WHATSAPP_NUMBER = "916282023762";

const planConfigs = {
  elite: {
    label: "Elite Plan",
    description: "Premium variety available in lunch, dinner, or two-meal package.",
    diabeticOnly: false
  },
  diabetic: {
    label: "Diabetic Plan",
    description: "Diabetic-friendly selection with lunch, dinner, or two-meal package.",
    diabeticOnly: true
  },
  budget: {
    label: "Budget Plan",
    description: "Value-focused package with lunch, dinner, or two meals per day.",
    diabeticOnly: false
  },
  basic: {
    label: "Basic Plan",
    description: "Starter plan with lunch, dinner, or two-meal options.",
    diabeticOnly: false
  },
  additional: {
    label: "Additional (Custom)",
    description: "Customizable plan preview; final menu is rule-based by request.",
    diabeticOnly: false
  }
};

function parseMealsCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
  const idx = {
    name: headers.indexOf("name"),
    category: headers.indexOf("category"),
    status: headers.indexOf("status"),
    diabetic: headers.indexOf("diabetic_friendly")
  };

  if (idx.name === -1 || idx.category === -1 || idx.status === -1) return [];

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if ((cols[idx.status] || "").toLowerCase() !== "live") continue;
    rows.push({
      name: cols[idx.name] || "",
      category: cols[idx.category] || "",
      diabeticFriendly: idx.diabetic !== -1 ? (cols[idx.diabetic] || "").toLowerCase() === "true" : false
    });
  }
  return rows;
}

async function loadMeals() {
  try {
    const response = await fetch("meals.csv", { cache: "no-store" });
    if (response.ok) return parseMealsCSV(await response.text());
  } catch (error) {
    // fallback below
  }

  const fallback = await fetch("prices.csv", { cache: "no-store" });
  const text = await fallback.text();
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
  const idxName = headers.indexOf("name");
  const idxCategory = headers.indexOf("category");
  const idxStatus = headers.indexOf("status");

  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if ((cols[idxStatus] || "").toLowerCase() !== "live") continue;
    out.push({ name: cols[idxName] || "", category: cols[idxCategory] || "", diabeticFriendly: false });
  }
  return out;
}

function pickMealsForDay(pool, count, dayIndex) {
  if (!pool.length) return [];
  return Array.from({ length: count }, (_, i) => pool[(dayIndex * count + i) % pool.length]);
}

function packageConfig(packageValue) {
  if (packageValue === "lunch") return { slots: ["Lunch"], count: 1, label: "Lunch" };
  if (packageValue === "dinner") return { slots: ["Dinner"], count: 1, label: "Dinner" };
  return { slots: ["Lunch", "Dinner"], count: 2, label: "Two meal (Lunch & Dinner)" };
}

function renderPlanPreview(plan, packageValue, meals) {
  const pool = plan.diabeticOnly ? meals.filter(m => m.diabeticFriendly) : meals;
  const usablePool = pool.length ? pool : meals;
  const cfg = packageConfig(packageValue);

  const grid = document.getElementById("days-grid");
  const dayCards = [];

  for (let day = 1; day <= 7; day++) {
    const picks = pickMealsForDay(usablePool, cfg.count, day - 1);
    const rows = picks.map((meal, idx) => `
      <div class="slot">
        <strong>${cfg.slots[idx]}</strong>
        <span>${escapeHtml(meal.name)}</span>
        <span class="muted">${escapeHtml(meal.category)}</span>
      </div>
    `).join("");

    dayCards.push(`
      <article class="day-card">
        <h3>Day ${day}</h3>
        ${rows}
      </article>
    `);
  }

  grid.innerHTML = dayCards.join("");
}

function buildPlanWhatsappLink(planLabel, packageLabel) {
  const text = [
    `Hi Cherish Every Bite, I am interested in the ${planLabel} subscription plan.`,
    `Preferred package: ${packageLabel}.`,
    "Please share detailed per-day menu, add-on options, pricing and Order now payment process."
  ].join(" ");

  return buildWhatsappLink(WHATSAPP_NUMBER, text);
}

async function init() {
  const planKey = new URLSearchParams(window.location.search).get("plan") || "elite";
  const plan = planConfigs[planKey] || planConfigs.elite;
  const packageSelect = document.getElementById("meal-package");
  const meals = await loadMeals();

  document.getElementById("plan-title").textContent = `${plan.label} – 7 Day Menu Preview`;
  document.getElementById("plan-desc").textContent = plan.description;

  function refreshByPackage() {
    const selected = packageSelect.value || "two_meal";
    const cfg = packageConfig(selected);
    document.getElementById("plan-meta").textContent = `Package: ${cfg.label} • Source: meals.csv (fallback: prices.csv)`;
    document.getElementById("enquire-btn").href = buildPlanWhatsappLink(plan.label, cfg.label);
    renderPlanPreview(plan, selected, meals);
  }

  packageSelect.addEventListener("change", refreshByPackage);
  refreshByPackage();
}

init();
