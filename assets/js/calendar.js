const PLAN_LABELS = {
  elite: "Elite",
  basic: "Basic",
  weightloss: "Weight Loss",
  diabetic: "Diabetic",
  smoothie: "Smoothie"
};
const WHATSAPP_NUMBER = "916282023762";
const HUB_COORDS = { lat: 8.575357388981113, lon: 76.91238872393365 };
const DELIVERY_LIMIT_KM = 7;

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
  const pickedLat = params.get("picked_lat");
  const pickedLon = params.get("picked_lon");
  const pickedLabel = params.get("picked_label") || "Pinned Location";
  const customerNameParam = params.get("customer_name") || "";
  const customerPhoneParam = params.get("customer_phone") || "";
  const customerNotesParam = params.get("customer_notes") || "";
  const mapLinkParam = params.get("map_app_link") || "";
  const deliveryLocationParam = params.get("delivery_location") || "";
  const startDateParam = params.get("start_date") || "";

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
  const locationSelect = document.getElementById("delivery-location");
  const mapLinkInput = document.getElementById("map-app-link");
  const pickLocationBtn = document.getElementById("pick-location-btn");
  const notesInput = document.getElementById("customer-notes");
  const locationMap = new Map();

  if (planSelect) planSelect.value = plan;
  if (mealSelect) mealSelect.value = meal;
  if (title) title.textContent = `${PLAN_LABELS[plan] || "Plan"} • ${meal[0].toUpperCase() + meal.slice(1)} Calendar`;
  if (back) back.href = `${plan}-plan.html`;
  function updatePickerLink() {
    if (!pickLocationBtn) return;
    const pickerParams = new URLSearchParams({
      plan: planSelect?.value || plan,
      meal: mealSelect?.value || meal,
      period: periodSelect?.value || "weekly",
      return_to: "calendar.html",
      customer_name: nameInput?.value.trim() || "",
      customer_phone: phoneInput?.value.trim() || "",
      customer_notes: notesInput?.value.trim() || "",
      map_app_link: mapLinkInput?.value.trim() || "",
      delivery_location: locationSelect?.value || "",
      start_date: startInput?.value || ""
    });
    pickLocationBtn.href = `map-picker.html?${pickerParams.toString()}`;
  }
  updatePickerLink();

  if (pickedLat && pickedLon && mapLinkInput) {
    mapLinkInput.value = `https://maps.google.com/?q=${pickedLat},${pickedLon}`;
  }
  if (!pickedLat && !pickedLon && mapLinkParam && mapLinkInput) {
    mapLinkInput.value = mapLinkParam;
  }
  if (nameInput && customerNameParam) nameInput.value = customerNameParam;
  if (phoneInput && customerPhoneParam) phoneInput.value = customerPhoneParam;
  if (notesInput && customerNotesParam) notesInput.value = customerNotesParam;

  const today = new Date();
  if (startInput) startInput.value = startDateParam || formatIso(today);
  let currentSelection = null;

  async function loadLocations() {
    if (!locationSelect) return;
    const rows = await fetchCSV("delivery_locations.csv").catch(() => []);
    const normalized = rows
      .map(row => ({
        id: row.Location_ID || row.location_id || "",
        name: row.Location_Name || row.location_name || "",
        mapLink: row.Map_Link || row.map_link || ""
      }))
      .filter(row => row.id && row.name);

    if (!normalized.length) {
      locationSelect.innerHTML = `<option value="">Location list unavailable</option>`;
      return;
    }

    locationMap.clear();
    normalized.forEach(row => {
      locationMap.set(row.id, row);
    });
    locationSelect.innerHTML = normalized
      .map(row => `<option value="${escapeHtml(row.id)}">${escapeHtml(row.name)}</option>`)
      .join("");

    if (deliveryLocationParam && locationMap.has(deliveryLocationParam)) {
      locationSelect.value = deliveryLocationParam;
    }
  }

  async function refresh() {
    const selectedPlan = planSelect?.value || plan;
    const selectedMeal = mealSelect?.value || meal;
    const selectedPeriod = periodSelect?.value || "weekly";
    const start = startInput?.value ? new Date(startInput.value) : new Date();

    if (title) title.textContent = `${PLAN_LABELS[selectedPlan] || "Plan"} • ${selectedMeal[0].toUpperCase() + selectedMeal.slice(1)} Calendar`;
    if (back) back.href = `${selectedPlan}-plan.html`;
    updatePickerLink();

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
      activeDays: activeCount,
      schedule: dates.map((iso, idx) => ({
        date: iso,
        dish: dishes[idx % dishes.length]
      }))
    };

    renderCalendarMonths(start, activeMap);
  }

  function updateConfirmLink() {
    if (!confirmBtn || !currentSelection) return;
    const name = nameInput?.value.trim() || "";
    const phone = phoneInput?.value.trim() || "";
    const selected = locationMap.get(locationSelect?.value || "") || null;
    const locationNameFromList = selected?.name || "";
    const locationMapLink = selected?.mapLink || "";

    if (!mapLinkInput) return;
    if (!mapLinkInput.value.trim()) {
      if (locationMapLink) {
        mapLinkInput.value = locationMapLink;
      } else if (pickedLat && pickedLon) {
        mapLinkInput.value = `https://maps.google.com/?q=${pickedLat},${pickedLon}`;
      }
    }

    const mapAppLink = mapLinkInput.value.trim();
    const notes = notesInput?.value.trim() || "";
    const phoneOk = /^\+?[0-9\-\s]{8,15}$/.test(phone);
    const coords = extractLatLng(mapAppLink);
    const distanceKm = coords ? haversineKm(HUB_COORDS, coords) : null;
    const withinRange = distanceKm !== null && distanceKm <= DELIVERY_LIMIT_KM;
    const fallbackPinnedName = pickedLat && pickedLon ? (pickedLabel || "Pinned Location") : "";
    const resolvedLocationName = locationNameFromList || fallbackPinnedName;

    if (!name || !phoneOk || !resolvedLocationName || !mapAppLink) {
      confirmBtn.href = "#";
      if (feedback) feedback.textContent = "Add name, valid mobile number, delivery location, and map link.";
      return;
    }

    if (!coords) {
      confirmBtn.href = "#";
      if (feedback) feedback.textContent = "Map link should include coordinates (latitude, longitude).";
      return;
    }

    if (!withinRange) {
      confirmBtn.href = "#";
      if (feedback) feedback.textContent = `Delivery unavailable: selected location is ${distanceKm.toFixed(2)} km away (limit: ${DELIVERY_LIMIT_KM} km).`;
      return;
    }

    const scheduleLines = (currentSelection.schedule || [])
      .map(entry => `${entry.date}: ${entry.dish}`)
      .join("\n");

    const message = [
      "Hi Cherish Every Bite, please confirm my subscription.",
      `Name: ${name}`,
      `Mobile: ${phone}`,
      `Delivery Location: ${resolvedLocationName}`,
      fallbackPinnedName ? `Pinned Label: ${fallbackPinnedName}` : "",
      locationMapLink ? `Saved Location Link: ${locationMapLink}` : "",
      `Pinned Map App Link: ${mapAppLink}`,
      `Distance from Hub: ${distanceKm.toFixed(2)} km (max ${DELIVERY_LIMIT_KM} km)`,
      `Plan: ${PLAN_LABELS[currentSelection.plan] || currentSelection.plan}`,
      `Meal Slot: ${currentSelection.meal}`,
      `Period: ${currentSelection.period}`,
      `Active Days: ${currentSelection.activeDays}`,
      `Start Date: ${currentSelection.start}`,
      `End Date: ${currentSelection.end}`,
      "Day-wise Menu:",
      scheduleLines,
      notes ? `Notes: ${notes}` : ""
    ].filter(Boolean).join("\n");

    confirmBtn.href = buildWhatsappLink(WHATSAPP_NUMBER, message);
    if (feedback) feedback.textContent = "Ready. Tap confirm to continue on WhatsApp.";
  }


  if (confirmBtn) {
    confirmBtn.addEventListener("click", event => {
      if (!confirmBtn.href || confirmBtn.getAttribute("href") === "#") {
        event.preventDefault();
      }
    });
  }

  [startInput, periodSelect, mealSelect, planSelect].forEach(el => {
    if (el) el.addEventListener("change", async () => {
      await refresh();
      updateConfirmLink();
      updatePickerLink();
    });
  });

  if (locationSelect && mapLinkInput) {
    locationSelect.addEventListener("change", () => {
      const selected = locationMap.get(locationSelect.value || "");
      if (selected?.mapLink) mapLinkInput.value = selected.mapLink;
      updateConfirmLink();
      updatePickerLink();
    });
  }

  [nameInput, phoneInput, notesInput, locationSelect, mapLinkInput].forEach(el => {
    if (el) el.addEventListener("input", () => {
      updateConfirmLink();
      updatePickerLink();
    });
    if (el) el.addEventListener("change", () => {
      updateConfirmLink();
      updatePickerLink();
    });
  });

  await loadLocations();
  await refresh();
  updateConfirmLink();
})();

function extractLatLng(link) {
  const text = String(link || "");
  const patterns = [
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return { lat: Number(m[1]), lon: Number(m[2]) };
  }
  return null;
}

function haversineKm(a, b) {
  const toRad = deg => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
}
