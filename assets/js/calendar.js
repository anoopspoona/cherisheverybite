const PLAN_LABELS = {
  elite: "Elite",
  basic: "Basic",
  weightloss: "Weight Loss",
  diabetic: "Diabetic",
  smoothie: "Smoothie"
};

function csvFor(plan, meal) {
  return `calendar_${plan}_${meal}.csv`;
}

function formatIso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function nextActiveDates(startDate, activeCount) {
  const out = [];
  const d = new Date(startDate);
  while (out.length < activeCount) {
    if (d.getDay() !== 0) out.push(formatIso(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function monthStart(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function renderCalendarMonths(startDate, activeMap) {
  const wrap = document.getElementById("calendar-grid");
  if (!wrap) return;
  wrap.innerHTML = "";

  const startMonth = monthStart(startDate);
  for (let mOffset = 0; mOffset < 3; mOffset++) {
    const mDate = new Date(startMonth.getFullYear(), startMonth.getMonth() + mOffset, 1);
    const monthName = mDate.toLocaleString("en-US", { month: "long", year: "numeric" });
    const firstDow = mDate.getDay();
    const daysInMonth = new Date(mDate.getFullYear(), mDate.getMonth() + 1, 0).getDate();

    const card = document.createElement("article");
    card.className = "month-card";
    const days = document.createElement("div");
    days.className = "days";

    for (let i = 0; i < firstDow; i++) {
      const empty = document.createElement("div");
      empty.className = "day empty";
      days.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const current = new Date(mDate.getFullYear(), mDate.getMonth(), day);
      const key = formatIso(current);
      const box = document.createElement("div");
      box.className = "day";
      box.innerHTML = `<div class="num">${day}</div>`;

      if (activeMap.has(key)) {
        box.classList.add("active");
        box.innerHTML += `<div class="dish">${escapeHtml(activeMap.get(key))}</div>`;
      } else if (current.getDay() === 0) {
        box.innerHTML += `<div class="dish">Sunday</div>`;
      }
      days.appendChild(box);
    }

    card.innerHTML = `<h3>${monthName}</h3>`;
    card.appendChild(days);
    wrap.appendChild(card);
  }
}

async function loadDishes(plan, meal) {
  const rows = await fetchCSV(csvFor(plan, meal));
  return rows.map(row => row.Dish || row.dish || "").filter(Boolean);
}

(async function init() {
  const params = new URLSearchParams(window.location.search);
  const plan = params.get("plan") || "elite";
  const meal = params.get("meal") || "lunch";

  const startInput = document.getElementById("start-date");
  const periodSelect = document.getElementById("period-select");
  const mealSelect = document.getElementById("meal-select");
  const planSelect = document.getElementById("plan-select");
  const title = document.getElementById("title");
  const back = document.getElementById("back-plan");

  if (planSelect) planSelect.value = plan;
  if (mealSelect) mealSelect.value = meal;
  if (title) title.textContent = `${PLAN_LABELS[plan] || "Plan"} • ${meal[0].toUpperCase() + meal.slice(1)} Calendar`;
  if (back) back.href = `${plan}-plan.html`;

  const today = new Date();
  if (startInput) startInput.value = formatIso(today);

  async function refresh() {
    const selectedPlan = planSelect?.value || plan;
    const selectedMeal = mealSelect?.value || meal;
    const selectedPeriod = periodSelect?.value || "weekly";
    const start = startInput?.value ? new Date(startInput.value) : new Date();

    if (title) title.textContent = `${PLAN_LABELS[selectedPlan] || "Plan"} • ${selectedMeal[0].toUpperCase() + selectedMeal.slice(1)} Calendar`;
    if (back) back.href = `${selectedPlan}-plan.html`;

    const dishRows = await loadDishes(selectedPlan, selectedMeal).catch(() => []);
    const dishes = dishRows.length ? dishRows : ["Menu to be updated"];
    const activeCount = selectedPeriod === "monthly" ? 24 : 6;
    const dates = nextActiveDates(start, activeCount);

    const activeMap = new Map();
    dates.forEach((iso, idx) => {
      activeMap.set(iso, dishes[idx % dishes.length]);
    });

    renderCalendarMonths(start, activeMap);
  }

  [startInput, periodSelect, mealSelect, planSelect].forEach(el => {
    if (el) el.addEventListener("change", refresh);
  });

  refresh();
})();
