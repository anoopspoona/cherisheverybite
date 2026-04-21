const PLAN_LABELS = {
  elite: "Elite",
  basic: "Basic",
  weightloss: "Weight Loss",
  diabetic: "Diabetic",
  smoothie: "Smoothie"
};
const WHATSAPP_NUMBER = "916282023762";

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
  const confirmBtn = document.getElementById("confirm-subscription");
  const feedback = document.getElementById("confirm-feedback");
  const nameInput = document.getElementById("customer-name");
  const phoneInput = document.getElementById("customer-phone");
  const locationMode = document.getElementById("location-mode");
  const locationInput = document.getElementById("customer-location");
  const savedLocationInput = document.getElementById("saved-location");
  const pinnedLocationInput = document.getElementById("pinned-location");
  const resolvedLocationInput = document.getElementById("resolved-location");
  const notesInput = document.getElementById("customer-notes");
  const useCurrentLocationBtn = document.getElementById("use-current-location");
  const mapPickerLink = document.getElementById("open-map-picker");
  let currentGeoLocation = "";

  if (planSelect) planSelect.value = plan;
  if (mealSelect) mealSelect.value = meal;
  if (title) title.textContent = `${PLAN_LABELS[plan] || "Plan"} • ${meal[0].toUpperCase() + meal.slice(1)} Calendar`;
  if (back) back.href = `${plan}-plan.html`;

  const today = new Date();
  if (startInput) startInput.value = formatIso(today);
  let currentSelection = null;

  function resolveLocationValue() {
    const mode = locationMode?.value || "current";
    if (mode === "current") return currentGeoLocation;
    if (mode === "saved") return savedLocationInput?.value.trim() || "";
    if (mode === "pinned") return pinnedLocationInput?.value.trim() || "";
    return locationInput?.value.trim() || "";
  }

  function refreshResolvedLocation() {
    const value = resolveLocationValue();
    if (resolvedLocationInput) resolvedLocationInput.value = value;
    if (mapPickerLink && value.startsWith("http")) mapPickerLink.href = value;
  }

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

    currentSelection = {
      plan: selectedPlan,
      meal: selectedMeal,
      period: selectedPeriod,
      start: formatIso(start),
      end: dates[dates.length - 1] || formatIso(start),
      activeDays: activeCount
    };

    renderCalendarMonths(start, activeMap);
  }

  function updateConfirmLink() {
    if (!confirmBtn || !currentSelection) return;
    const name = nameInput?.value.trim() || "";
    const phone = phoneInput?.value.trim() || "";
    refreshResolvedLocation();
    const location = resolveLocationValue();
    const notes = notesInput?.value.trim() || "";
    const phoneOk = /^\+?[0-9\-\s]{8,15}$/.test(phone);

    if (!name || !phoneOk || !location) {
      confirmBtn.href = "#";
      if (feedback) feedback.textContent = "Enter name, valid mobile number and map location to confirm subscription.";
      return;
    }

    const message = [
      "Hi Cherish Every Bite, please confirm my subscription.",
      `Name: ${name}`,
      `Mobile: ${phone}`,
      `Map Location: ${location}`,
      `Location Source: ${locationMode?.value || "current"}`,
      `Plan: ${PLAN_LABELS[currentSelection.plan] || currentSelection.plan}`,
      `Meal Slot: ${currentSelection.meal}`,
      `Period: ${currentSelection.period}`,
      `Active Days: ${currentSelection.activeDays}`,
      `Start Date: ${currentSelection.start}`,
      `End Date: ${currentSelection.end}`,
      notes ? `Notes: ${notes}` : ""
    ].filter(Boolean).join("\n");

    confirmBtn.href = buildWhatsappLink(WHATSAPP_NUMBER, message);
    if (feedback) feedback.textContent = "Tap confirm to open WhatsApp with your subscription details.";
  }

  if (confirmBtn) {
    confirmBtn.addEventListener("click", event => {
      if (!confirmBtn.href || confirmBtn.getAttribute("href") === "#") {
        event.preventDefault();
      }
    });
  }

  if (useCurrentLocationBtn) {
    useCurrentLocationBtn.addEventListener("click", () => {
      if (!navigator.geolocation) {
        if (feedback) feedback.textContent = "Geolocation is not supported on this browser/device.";
        return;
      }
      navigator.geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;
          currentGeoLocation = `https://maps.google.com/?q=${latitude},${longitude}`;
          refreshResolvedLocation();
          updateConfirmLink();
          if (feedback) feedback.textContent = "Current location captured successfully.";
        },
        () => {
          if (feedback) feedback.textContent = "Unable to fetch current location. You can use Saved, Pinned, or Manual mode.";
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  [startInput, periodSelect, mealSelect, planSelect].forEach(el => {
    if (el) el.addEventListener("change", async () => {
      await refresh();
      updateConfirmLink();
    });
  });

  [nameInput, phoneInput, locationInput, savedLocationInput, pinnedLocationInput, notesInput, locationMode].forEach(el => {
    if (el) el.addEventListener("input", updateConfirmLink);
    if (el) el.addEventListener("change", updateConfirmLink);
  });

  await refresh();
  refreshResolvedLocation();
  updateConfirmLink();
})();
