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
const ADDRESS_KEY = "ceb_saved_addresses_v1";
const PROFILE_KEY = "ceb_customer_profiles_v1";

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

function getDateAddonTotal(date, dayAddonItems) {
  const rows = dayAddonItems.get(date);
  if (!rows) return 0;
  return Array.from(rows.values()).reduce((sum, qty) => sum + Number(qty || 0), 0);
}

function renderCalendarMonths(startDate, activeMap, dayAddonItems) {
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
        const qty = getDateAddonTotal(key, dayAddonItems);
        box.classList.add("active");
        box.setAttribute("data-action", "open-addon-panel");
        box.setAttribute("data-date", key);
        box.innerHTML += `
          <button class="day-addon-open" type="button" data-action="open-addon-panel" data-date="${key}" aria-label="Open add-ons for ${key}">+</button>
          <div class="dish">${escapeHtml(activeMap.get(key))}</div>
          ${qty > 0 ? `<div class="legend">Add-ons selected: ${qty}</div>` : ""}
        `;
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

async function loadAddonCatalog() {
  const catalogRows = await fetchCSV("catalog.csv").catch(() => []);
  const addonRows = catalogRows
    .filter(row => String(row.record_type || row.Record_Type || "").toLowerCase() === "addon")
    .map(row => ({
      id: row.id || row.ID || row.addon_id || row.Addon_ID || "",
      name: row.name || row.Name || row.addon_name || row.Addon_Name || "",
      category: row.category || row.Category || row.addon_type || row.Addon_Type || "Add-on",
      price: row.price || row.Price || row.unit_price || row.Unit_Price || "",
      status: row.status || row.Status || "live"
    }))
    .filter(row => row.id && row.name && String(row.status).toLowerCase() === "live");

  if (addonRows.length) return addonRows;

  const rows = await fetchCSV("addons.csv").catch(() => []);
  return rows
    .map(row => ({
      id: row.Addon_ID || row.addon_id || row.id || "",
      name: row.Addon_Name || row.addon_name || row.Name || row.name || "",
      category: row.Category || row.category || row.Addon_Type || row.addon_type || "Add-on",
      price: row.Price || row.price || row.Unit_Price || row.unit_price || "",
      status: row.Status || row.status || "live"
    }))
    .filter(row => row.id && row.name && String(row.status).toLowerCase() === "live");
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
  const calendarGrid = document.getElementById("calendar-grid");
  const dayAddonPanel = document.getElementById("day-addon-panel");
  const dayAddonTitle = document.getElementById("day-addon-title");
  const dayAddonGrid = document.getElementById("day-addon-grid");

  const locationMap = new Map();
  const dayAddonItems = new Map();
  let addonCatalog = [];
  let selectedAddonDate = "";

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
  const savedProfiles = (() => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(PROFILE_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  })();
  const currentProfile = savedProfiles[currentUserEmail] || {};

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
  if (nameInput && !nameInput.value && currentProfile.name) nameInput.value = currentProfile.name;
  if (phoneInput && !phoneInput.value && currentProfile.phone) phoneInput.value = currentProfile.phone;

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

  function serializeDayAddonItems() {
    return Array.from(dayAddonItems.entries()).map(([date, itemMap]) => ({
      date,
      items: Array.from(itemMap.entries()).map(([id, qty]) => ({ id, qty }))
    }));
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
      dayAddonItems: serializeDayAddonItems(),
      selectedAddonDate,
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
    selectedAddonDate = String(draft.selectedAddonDate || "");
    if (Array.isArray(draft.dayAddonItems)) {
      draft.dayAddonItems.forEach(entry => {
        if (!entry?.date || !Array.isArray(entry.items)) return;
        const itemMap = new Map();
        entry.items.forEach(item => {
          const qty = Number(item?.qty || 0);
          if (item?.id && qty > 0) itemMap.set(String(item.id), qty);
        });
        if (itemMap.size) dayAddonItems.set(String(entry.date), itemMap);
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

  function saveAddressForCurrentUser(orderPayload) {
    if (!currentUserEmail) return;
    const label = orderPayload.locationId || "Pinned Location";
    const mapLink = orderPayload.mapLink || "";
    if (!mapLink) return;
    try {
      const byUser = JSON.parse(window.localStorage.getItem(ADDRESS_KEY) || "{}");
      const rows = Array.isArray(byUser[currentUserEmail]) ? byUser[currentUserEmail] : [];
      const duplicate = rows.some(item => item.mapLink === mapLink);
      if (duplicate) return;
      rows.push({
        label,
        mapLink,
        isDefault: rows.length === 0
      });
      byUser[currentUserEmail] = rows;
      window.localStorage.setItem(ADDRESS_KEY, JSON.stringify(byUser));
    } catch {
      // ignore storage failures
    }
  }

  function getAddonBreakdownForDate(date) {
    const itemMap = dayAddonItems.get(date);
    if (!itemMap) return [];
    return Array.from(itemMap.entries())
      .map(([id, qty]) => {
        const addon = addonCatalog.find(row => row.id === id);
        return addon ? { id, name: addon.name, qty, price: addon.price } : null;
      })
      .filter(Boolean);
  }

  function buildOrderPayload() {
    const schedule = (currentSelection?.schedule || []).map(entry => {
      const addons = getAddonBreakdownForDate(entry.date);
      return {
        ...entry,
        addons,
        addonQty: addons.reduce((sum, item) => sum + Number(item.qty || 0), 0)
      };
    });

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
      totalAddons: schedule.reduce((sum, entry) => sum + Number(entry.addonQty || 0), 0),
      dailyAddons: schedule
        .filter(entry => Number(entry.addonQty || 0) > 0)
        .map(entry => ({ date: entry.date, items: entry.addons })),
      schedule
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

  function renderDayAddonPanel() {
    if (!dayAddonPanel || !dayAddonTitle || !dayAddonGrid) return;
    if (!selectedAddonDate) {
      dayAddonPanel.hidden = true;
      return;
    }
    dayAddonPanel.hidden = false;
    dayAddonTitle.textContent = `Add-ons for ${selectedAddonDate}`;

    const itemMap = dayAddonItems.get(selectedAddonDate) || new Map();

    if (!addonCatalog.length) {
      dayAddonGrid.innerHTML = `<p class="legend">Add-ons unavailable (check catalog.csv/addons.csv).</p>`;
      return;
    }

    dayAddonGrid.innerHTML = addonCatalog.map(item => {
      const qty = Number(itemMap.get(item.id) || 0);
      return `
        <article class="addon-item">
          <div class="addon-title">${escapeHtml(item.name)}</div>
          <div class="addon-meta">${escapeHtml(item.category)}${item.price ? ` • ${escapeHtml(item.price)}` : ""}</div>
          <div class="addon-actions">
            <button class="addon-btn" type="button" data-action="addon-minus" data-addon-id="${escapeHtml(item.id)}">-</button>
            <span class="addon-qty">Qty: ${qty}</span>
            <button class="addon-btn" type="button" data-action="addon-plus" data-addon-id="${escapeHtml(item.id)}">+</button>
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

    Array.from(dayAddonItems.keys()).forEach(date => {
      if (!activeMap.has(date)) dayAddonItems.delete(date);
    });
    if (selectedAddonDate && !activeMap.has(selectedAddonDate)) selectedAddonDate = "";

    currentSelection = {
      plan: selectedPlan,
      meal: selectedMeal,
      period: selectedPeriod,
      start: formatIso(start),
      end: dates[dates.length - 1] || formatIso(start),
      activeDays: activeCount,
      schedule: dates.map((iso, idx) => ({
        date: iso,
        dish: dishes[idx % dishes.length],
        addonQty: Number(dailyAddons.get(iso) || 0)
      }))
    };

    renderCalendarMonths(start, activeMap, dayAddonItems);
    renderDayAddonPanel();
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

    const orderPayload = buildOrderPayload();
    const scheduleLines = (orderPayload.schedule || [])
      .map(entry => `${entry.date}: ${entry.dish}${entry.addonQty ? ` (Add-ons: ${entry.addonQty})` : ""}`)
      .join("\n");
    const addonLines = (orderPayload.dailyAddons || [])
      .map(entry => `${entry.date}: ${entry.items.map(item => `${item.name} x${item.qty}`).join(", ")}`)
      .join("\n");
    const totalAddons = (currentSelection.schedule || []).reduce((sum, entry) => sum + Number(entry.addonQty || 0), 0);

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
      `Total Add-ons: ${orderPayload.totalAddons || 0}`,
      addonLines ? "Add-ons by day:" : "",
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
        saveAddressForCurrentUser(orderPayload);
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

  if (calendarGrid) {
    calendarGrid.addEventListener("click", async event => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!target) return;
      const actionTarget = target.closest("[data-action='open-addon-panel']");
      if (!(actionTarget instanceof HTMLElement)) return;
      const date = actionTarget.getAttribute("data-date") || "";
      if (!date) return;
      selectedAddonDate = date;
      renderDayAddonPanel();
      updateConfirmLink();
      saveDraft();
    });
  }

  if (dayAddonGrid) {
    dayAddonGrid.addEventListener("click", event => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!target || !selectedAddonDate) return;
      const action = target.getAttribute("data-action");
      const addonId = target.getAttribute("data-addon-id") || "";
      if (!action || !addonId) return;

      const itemMap = dayAddonItems.get(selectedAddonDate) || new Map();
      const qty = Number(itemMap.get(addonId) || 0);
      if (action === "addon-plus") {
        itemMap.set(addonId, qty + 1);
      }
      if (action === "addon-minus") {
        const nextQty = Math.max(0, qty - 1);
        if (nextQty > 0) itemMap.set(addonId, nextQty);
        else itemMap.delete(addonId);
      }

      if (itemMap.size) dayAddonItems.set(selectedAddonDate, itemMap);
      else dayAddonItems.delete(selectedAddonDate);

      renderDayAddonPanel();
      if (currentSelection) {
        const start = new Date(currentSelection.start);
        const activeMap = new Map(currentSelection.schedule.map(item => [item.date, item.dish]));
        renderCalendarMonths(start, activeMap, dayAddonItems);
      }
      updateConfirmLink();
      saveDraft();
    });
  }

  await loadLocations();
  addonCatalog = await loadAddonCatalog();
  applyDraft();
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
