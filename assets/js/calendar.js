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
const DRAFT_KEY = "ceb_calendar_draft_v1";
const ORDER_KEY = "ceb_saved_orders_v1";
const USERS_KEY = "ceb_users_v1";
const CURRENT_USER_KEY = "ceb_current_user_v1";

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
  const addonsGrid = document.getElementById("addons-grid");
  const locationMap = new Map();
  const selectedAddons = new Map();
  let addonCatalog = [];
  const currentUserEmail = window.localStorage.getItem(CURRENT_USER_KEY) || "";
  const knownUsers = (() => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(USERS_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();
  const currentUser = knownUsers.find(user => user.email === currentUserEmail);

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
  if (nameInput && !customerNameParam && currentUser?.name) nameInput.value = currentUser.name;

  const today = new Date();
  if (startInput) startInput.value = startDateParam || formatIso(today);
  let currentSelection = null;

  function getDraft() {
    try {
      return JSON.parse(window.localStorage.getItem(DRAFT_KEY) || "null");
    } catch {
      return null;
    }
  }

  function saveDraft() {
    const payload = {
      name: nameInput?.value.trim() || "",
      phone: phoneInput?.value.trim() || "",
      notes: notesInput?.value.trim() || "",
      mapLink: mapLinkInput?.value.trim() || "",
      locationId: locationSelect?.value || "",
      startDate: startInput?.value || "",
      plan: planSelect?.value || "",
      meal: mealSelect?.value || "",
      period: periodSelect?.value || "",
      addons: Array.from(selectedAddons.entries()).map(([id, qty]) => ({ id, qty })),
      userEmail: currentUserEmail
    };
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage failures
    }
  }

  function applyDraft() {
    const draft = getDraft();
    if (!draft) return;
    if (!customerNameParam && nameInput && draft.name) nameInput.value = draft.name;
    if (!customerPhoneParam && phoneInput && draft.phone) phoneInput.value = draft.phone;
    if (!customerNotesParam && notesInput && draft.notes) notesInput.value = draft.notes;
    if (!mapLinkParam && !pickedLat && !pickedLon && mapLinkInput && draft.mapLink) mapLinkInput.value = draft.mapLink;
    if (!startDateParam && startInput && draft.startDate) startInput.value = draft.startDate;
    if (!params.get("plan") && planSelect && draft.plan) planSelect.value = draft.plan;
    if (!params.get("meal") && mealSelect && draft.meal) mealSelect.value = draft.meal;
    if (!params.get("period") && periodSelect && draft.period) periodSelect.value = draft.period;
    if (!deliveryLocationParam && locationSelect && draft.locationId) locationSelect.value = draft.locationId;
    if (Array.isArray(draft.addons)) {
      draft.addons.forEach(item => {
        if (item?.id && Number(item.qty) > 0) selectedAddons.set(String(item.id), Number(item.qty));
      });
    }
  }

  function saveOrder(details) {
    try {
      const existing = JSON.parse(window.localStorage.getItem(ORDER_KEY) || "[]");
      const next = Array.isArray(existing) ? existing : [];
      next.unshift(details);
      window.localStorage.setItem(ORDER_KEY, JSON.stringify(next.slice(0, 100)));
    } catch {
      // ignore storage failures
    }
  }

  function buildOrderPayload() {
    return {
      savedAt: new Date().toISOString(),
      name: nameInput?.value.trim() || "",
      phone: phoneInput?.value.trim() || "",
      locationId: locationSelect?.value || "",
      mapLink: mapLinkInput?.value.trim() || "",
      notes: notesInput?.value.trim() || "",
      userEmail: currentUserEmail,
      plan: currentSelection?.plan || "",
      meal: currentSelection?.meal || "",
      period: currentSelection?.period || "",
      start: currentSelection?.start || "",
      end: currentSelection?.end || "",
      addons: addonCatalog
        .map(item => ({ ...item, qty: selectedAddons.get(item.id) || 0 }))
        .filter(item => item.qty > 0)
        .map(item => ({ id: item.id, name: item.name, qty: item.qty, price: item.price }))
    };
  }

  async function submitOrderToBackend(orderPayload) {
    const backend = window.cebBackend;
    if (!backend || typeof backend.submitOrder !== "function") {
      return { ok: false, skipped: true, reason: "backend_not_configured" };
    }
    return backend.submitOrder(orderPayload);
  }

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

  async function loadAddons() {
    const rows = await fetchCSV("addons.csv").catch(() => []);
    addonCatalog = rows
      .map(row => ({
        id: row.Addon_ID || row.addon_id || row.id || "",
        name: row.Addon_Name || row.addon_name || row.Name || row.name || "",
        category: row.Category || row.category || "Add-on",
        price: row.Price || row.price || ""
      }))
      .filter(item => item.id && item.name);
  }

  function renderAddons() {
    if (!addonsGrid) return;
    if (!addonCatalog.length) {
      addonsGrid.innerHTML = `<p class="legend">Add-ons will appear here when addons.csv is available.</p>`;
      return;
    }
    addonsGrid.innerHTML = addonCatalog.map(item => {
      const qty = selectedAddons.get(item.id) || 0;
      return `
        <article class="addon-item">
          <div class="addon-title">${escapeHtml(item.name)}</div>
          <div class="addon-meta">${escapeHtml(item.category)}${item.price ? ` • ${escapeHtml(item.price)}` : ""}</div>
          <div class="addon-actions">
            <button class="addon-plus" type="button" data-addon-id="${escapeHtml(item.id)}" aria-label="Add ${escapeHtml(item.name)}">+</button>
            <span class="addon-qty">Qty: ${qty}</span>
          </div>
        </article>
      `;
    }).join("");
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

  function setFeedback(type, message) {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.classList.remove("error", "success");
    if (type) feedback.classList.add(type);
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
      setFeedback("error", "Add name, valid mobile number, delivery location, and map link.");
      return;
    }

    if (!coords) {
      confirmBtn.href = "#";
      setFeedback("error", "Map link should include coordinates (latitude, longitude).");
      return;
    }

    if (!withinRange) {
      confirmBtn.href = "#";
      setFeedback("error", `Delivery unavailable: selected location is ${distanceKm.toFixed(2)} km away (limit: ${DELIVERY_LIMIT_KM} km).`);
      return;
    }

    const scheduleLines = (currentSelection.schedule || [])
      .map(entry => `${entry.date}: ${entry.dish}`)
      .join("\n");
    const addonLines = addonCatalog
      .map(item => ({ ...item, qty: selectedAddons.get(item.id) || 0 }))
      .filter(item => item.qty > 0)
      .map(item => `${item.name} x${item.qty}${item.price ? ` (${item.price})` : ""}`)
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
      addonLines ? "Add-ons:" : "",
      addonLines || "",
      "Day-wise Menu:",
      scheduleLines,
      notes ? `Notes: ${notes}` : ""
    ].filter(Boolean).join("\n");

    confirmBtn.href = buildWhatsappLink(WHATSAPP_NUMBER, message);
    setFeedback("success", "Ready. Tap confirm to continue on WhatsApp.");
    saveDraft();
  }


  if (confirmBtn) {
    confirmBtn.addEventListener("click", async event => {
      if (!confirmBtn.href || confirmBtn.getAttribute("href") === "#") {
        event.preventDefault();
        saveDraft();
      } else {
        event.preventDefault();
        const orderPayload = buildOrderPayload();
        const backendResult = await submitOrderToBackend(orderPayload);
        if (backendResult.ok) {
          setFeedback("success", "Order saved to server and opening WhatsApp.");
        } else if (!backendResult.skipped) {
          setFeedback("error", "Could not save order to server. Saved locally and opening WhatsApp.");
        }

        saveOrder(orderPayload);
        saveDraft();
        window.open(confirmBtn.href, "_blank", "noopener");
      }
    });
  }

  [startInput, periodSelect, mealSelect, planSelect].forEach(el => {
    if (el) el.addEventListener("change", async () => {
      await refresh();
      updateConfirmLink();
      updatePickerLink();
      saveDraft();
    });
  });

  if (locationSelect && mapLinkInput) {
    locationSelect.addEventListener("change", () => {
      const selected = locationMap.get(locationSelect.value || "");
      if (selected?.mapLink) mapLinkInput.value = selected.mapLink;
      updateConfirmLink();
      updatePickerLink();
      saveDraft();
    });
  }

  [nameInput, phoneInput, notesInput, locationSelect, mapLinkInput].forEach(el => {
    if (el) el.addEventListener("input", () => {
      updateConfirmLink();
      updatePickerLink();
      saveDraft();
    });
    if (el) el.addEventListener("change", () => {
      updateConfirmLink();
      updatePickerLink();
      saveDraft();
    });
  });

  if (addonsGrid) {
    addonsGrid.addEventListener("click", event => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const addonId = target.getAttribute("data-addon-id");
      if (!addonId) return;
      const currentQty = selectedAddons.get(addonId) || 0;
      selectedAddons.set(addonId, currentQty + 1);
      renderAddons();
      updateConfirmLink();
      saveDraft();
    });
  }

  await loadLocations();
  applyDraft();
  await loadAddons();
  renderAddons();
  await refresh();
  updateConfirmLink();
  saveDraft();
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
