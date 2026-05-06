const WHATSAPP_NUMBER = "916282023762";
const HUB_COORDS = { lat: 8.575357388981113, lon: 76.91238872393365 };
const DELIVERY_LIMIT_KM = 7;
const DRAFT_KEY = "ceb_calendar_draft_v1";
const ORDER_KEY = "ceb_saved_orders_v1";
const USERS_KEY = "ceb_users_v1";
const CURRENT_USER_KEY = "ceb_current_user_v1";
const ADDRESS_KEY = "ceb_saved_addresses_v1";
const PROFILE_KEY = "ceb_customer_profiles_v1";
const SUBSCRIPTION_CYCLE_ANCHOR_KEY = "ceb_subscription_cycle_anchor_v1";
const DEFAULT_SUBSCRIPTION_CYCLE_ANCHOR = "2026-05-01";

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase();
}

function formatLabel(value) {
  const text = String(value || "").trim();
  return text || "-";
}

function formatCurrency(value) {
  const numeric = Number(String(value || "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return `₹${numeric.toLocaleString("en-IN")}`;
}

function formatMacroValue(value, unit = "g") {
  const text = String(value || "").trim();
  if (!text) return "";
  return /\d$/.test(text) ? `${text}${unit}` : text;
}

function parseNumeric(value) {
  const numeric = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

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

let planMealsCache = null;
let allPlansNutritionCache = null;

async function loadPlanMeals() {
  if (planMealsCache) return planMealsCache;
  planMealsCache = await fetchCSV("plan_meals.csv").catch(() => []);
  return planMealsCache;
}

async function loadAllPlansNutrition() {
  if (allPlansNutritionCache) return allPlansNutritionCache;
  allPlansNutritionCache = await fetchCSV("allplans_nutrition.csv").catch(() => []);
  return allPlansNutritionCache;
}

function weekToken(value) {
  const text = normalizeKey(value);
  const match = text.match(/(\d+)/);
  if (!match) return "";
  return `w${match[1]}`;
}

function dayToken(value) {
  return normalizeKey(value).slice(0, 3);
}

function buildUnifiedEntry(rows, selectedPlan, selectedVariant, selectedMeal, date) {
  const week = cycleWeekLabelForDate(date, getSubscriptionCycleAnchorDate());
  const day = dayToken(dayNameForDate(date));
  const planNeedle = normalizeKey(selectedPlan);
  const mealNeedle = normalizeKey(selectedMeal);
  const variantNeedle = normalizeKey(selectedVariant);

  const matched = rows.find(row => {
    const planLabel = normalizeKey(row.Plan || row.plan || "");
    const rowWeek = weekToken(row.Week || row["Data.Column1"] || row.data_column1);
    const rowDay = dayToken(row.Day || row["Data.Column2"] || row.data_column2);
    const planHasVariantToken = /(?:^|[^a-z])(veg|nonveg|non-veg)(?:[^a-z]|$)/.test(planLabel);
    const variantHit = !variantNeedle || !planHasVariantToken || planLabel.includes(variantNeedle.replace("-", ""));
    const mealHit = planNeedle === "smoothie" ? true : planLabel.includes(mealNeedle);
    return planLabel.includes(planNeedle) && mealHit && variantHit && rowWeek === week && rowDay === day;
  });
  if (!matched) return null;

  const cols = ["Data.Column3", "Data.Column4", "Data.Column5", "Data.Column6", "Data.Column7"]
    .map(key => matched[key] || matched[key.toLowerCase()] || "")
    .map(v => String(v || "").trim())
    .filter(Boolean);
  const nutrition = {
    calories: matched.Calories || matched.calories || "",
    protein: matched["Protein Carbohydrates"] ? String(matched["Protein Carbohydrates"]).split(/\s+/)[0] : (matched.Protein || matched.protein || ""),
    carbohydrates: matched.Carbohydrates || matched.carbohydrates || "",
    fats: matched.Fats || matched.fats || "",
    fiber: matched.Fiber || matched.fiber || ""
  };
  return { dish: cols[0] || "Menu item", details: cols, nutrition };
}

async function loadDishes(plan, meal, variantKey = "") {
  const planMealsRows = await loadPlanMeals();
  const normalizedVariant = String(variantKey || "").trim().toLowerCase();
  const byPlanMeal = planMealsRows
    .filter(row => String(row.Plan_Key || row.plan_key || "").trim().toLowerCase() === String(plan || "").trim().toLowerCase())
    .filter(row => String(row.Meal_Type || row.meal_type || "").trim().toLowerCase() === String(meal || "").trim().toLowerCase());

  if (byPlanMeal.length) {
    const hasVariantColumn = byPlanMeal.some(row => String(row.Variant_Key || row.variant_key || "").trim());
    const variantFiltered = hasVariantColumn && normalizedVariant && normalizedVariant !== "standard"
      ? byPlanMeal.filter(row => String(row.Variant_Key || row.variant_key || "").trim().toLowerCase() === normalizedVariant)
      : byPlanMeal;
    const hasComponentColumn = variantFiltered.some(row => String(row.Component || row.component || "").trim());
    const mainRows = hasComponentColumn
      ? variantFiltered.filter(row => String(row.Component || row.component || "").trim().toLowerCase() === "main")
      : variantFiltered;
    const items = mainRows
      .map(row => row.Item_Name || row.item_name || row.Dish || row.dish || "")
      .filter(Boolean);
    if (items.length) return Array.from(new Set(items));
  }

  const rows = await fetchCSV(csvFor(plan, meal));
  return rows.map(row => row.Dish || row.dish || "").filter(Boolean);
}

function getSubscriptionCycleAnchorDate() {
  const stored = String(window.localStorage.getItem(SUBSCRIPTION_CYCLE_ANCHOR_KEY) || "").trim();
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(stored) ? stored : DEFAULT_SUBSCRIPTION_CYCLE_ANCHOR;
  const parsed = new Date(anchor);
  return Number.isNaN(parsed.getTime()) ? new Date(DEFAULT_SUBSCRIPTION_CYCLE_ANCHOR) : parsed;
}

function daysDiff(a, b) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utcA - utcB) / msPerDay);
}

function cycleWeekLabelForDate(targetDate, anchorDate) {
  const diff = daysDiff(targetDate, anchorDate);
  const normalized = ((Math.floor(diff / 7) % 4) + 4) % 4;
  return `w${normalized + 1}`;
}

function dayNameForDate(date) {
  return date.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
}

function mealForDate(planMealRows, date, mealType) {
  const dayLabel = dayNameForDate(date);
  const weekLabel = cycleWeekLabelForDate(date, getSubscriptionCycleAnchorDate());
  const forDay = planMealRows.filter(row => {
    const rowWeek = normalizeKey(row.Week || row.week);
    const rowDay = normalizeKey(row.Day || row.day);
    const rowMeal = normalizeKey(row.Meal_Type || row.meal_type);
    if (rowMeal !== normalizeKey(mealType)) return false;
    return rowWeek === weekLabel && rowDay === dayLabel;
  });
  if (!forDay.length) return "";

  const mainRows = forDay.filter(row => normalizeKey(row.Component || row.component) === "main");
  const source = mainRows.length ? mainRows : forDay;
  const items = source
    .map(row => row.Item_Name || row.item_name || row.Dish || row.dish || "")
    .map(value => String(value || "").trim())
    .filter(Boolean);
  return Array.from(new Set(items)).join(" • ");
}


async function loadPlansCatalog() {
  const rows = await fetchCSV("plans.csv").catch(() => []);
  return rows
    .filter(row => normalizeKey(row.Status || row.status) === "live")
    .map(row => ({
      planKey: normalizeKey(row.Plan_Key || row.plan_key),
      planKeyRaw: String(row.Plan_Key || row.plan_key || "").trim(),
      planName: String(row.Plan_Name || row.plan_name || "").trim(),
      variant: normalizeKey(row.Variant_Key || row.variant_key || row.Variant_Name || row.variant_name),
      variantLabel: String(row.Variant_Name || row.variant_name || row.Variant_Key || row.variant_key || "").trim(),
      monthlyPrice: row["Price for monthly subscription"] || row.Monthly_Price || row.monthly_price || "",
      weeklyPrice: row["Price for weekly subscription"] || row.Weekly_Price || row.weekly_price || "",
      description: row.Description || row.description || "",
      mealsPerDay: row.Meals_Per_Day || row.meals_per_day || ""
    }))
    .filter(row => row.planKey);
}

function findPlanPrice(planCatalog, plan, meal, variant, period) {
  const planNeedle = normalizeKey(plan);
  const mealNeedle = normalizeKey(meal);
  const variantNeedle = normalizeKey(variant);
  const matched = planCatalog.find(row => row.planKey === planNeedle
    && normalizeKey(row.planName).includes(mealNeedle)
    && (row.variant === variantNeedle || row.variant === "standard" || variantNeedle === "standard"));
  if (!matched) return { amount: 0, label: "Price on request" };
  const raw = period === "weekly" ? matched.weeklyPrice : matched.monthlyPrice;
  const amount = parseNumeric(raw);
  return { amount, label: formatCurrency(raw) || "Price on request" };
}

function formatVariantLabel(value) {
  const needle = normalizeKey(value);
  if (needle === "nonveg") return "Non-Veg";
  if (needle === "veg") return "Veg";
  if (needle === "standard") return "Standard";
  return formatLabel(value);
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

(function init() {
  void (async () => {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get("plan") || "elite";
    const meal = params.get("meal") || "lunch";
    const variant = params.get("variant") || "veg";
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
    const variantSelect = document.getElementById("variant-select");
    const title = document.getElementById("title");
    const confirmBtn = document.getElementById("confirm-subscription");
    const feedback = document.getElementById("confirm-feedback");
    const nameInput = document.getElementById("customer-name");
    const phoneInput = document.getElementById("customer-phone");
    const locationSelect = document.getElementById("delivery-location");
    const mapLinkInput = document.getElementById("map-app-link");
    const pickLocationBtn = document.getElementById("pick-location-btn");
    const notesInput = document.getElementById("customer-notes");
    const dayAddonPanel = document.getElementById("day-addon-panel");
    const dayAddonBackdrop = document.getElementById("day-addon-backdrop");
    const dayAddonCloseBtn = document.getElementById("day-addon-close");
    const dayAddonTitle = document.getElementById("day-addon-title");
    const dayAddonGrid = document.getElementById("day-addon-grid");
    const subscriptionPriceEl = document.getElementById("subscription-price");
    const addonsPriceEl = document.getElementById("addons-price");
    const billTotalEl = document.getElementById("bill-total");

    const locationMap = new Map();
    const dayAddonItems = new Map();
    let selectedAddonDate = "";
    let addonCatalog = [];
    let currentSelection = null;
    let planCatalog = [];

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

    function setDayAddonPanelOpen(open) {
      if (!dayAddonPanel || !dayAddonBackdrop) return;
      dayAddonPanel.hidden = !open;
      dayAddonBackdrop.hidden = !open;
      dayAddonPanel.classList.toggle("is-open", open);
    }

    function setFeedback(type, message) {
      if (!feedback) return;
      feedback.textContent = message;
      feedback.classList.remove("error", "success");
      if (type) feedback.classList.add(type);
    }

    function getDateAddonTotal(date) {
      const items = dayAddonItems.get(date);
      if (!items) return 0;
      return Array.from(items.values()).reduce((sum, qty) => sum + Number(qty || 0), 0);
    }

    function getAddonAmountTotal() {
      let total = 0;
      dayAddonItems.forEach(byDate => {
        byDate.forEach((qty, addonId) => {
          const addon = addonCatalog.find(item => item.id === addonId);
          total += parseNumeric(addon?.price) * Number(qty || 0);
        });
      });
      return total;
    }

    function updateBillSummary() {
      const selectedPlan = planSelect?.value || plan;
      const selectedMeal = mealSelect?.value || meal;
      const selectedPeriod = periodSelect?.value || "weekly";
      syncVariantOptions();
      const selectedVariant = variantSelect?.value || variant;
      const planPrice = findPlanPrice(planCatalog, selectedPlan, selectedMeal, selectedVariant, selectedPeriod);
      const addonTotal = getAddonAmountTotal();
      const total = Number(planPrice.amount || 0) + addonTotal;

      if (subscriptionPriceEl) {
        subscriptionPriceEl.textContent = `Plan price: ${planPrice.label} (${formatLabel(selectedPeriod)})`;
      }
      if (addonsPriceEl) addonsPriceEl.textContent = `Add-on total: ₹${addonTotal.toLocaleString("en-IN")}`;
      if (billTotalEl) {
        billTotalEl.textContent = total > 0
          ? `Total bill: ₹${total.toLocaleString("en-IN")}`
          : "Total bill: Price on request";
      }
    }

    function updatePickerLink() {
      if (!pickLocationBtn) return;
      const pickerParams = new URLSearchParams({
        plan: planSelect?.value || plan,
        variant: variantSelect?.value || variant,
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

    function renderDayAddonPanel() {
      if (!dayAddonPanel || !dayAddonGrid || !dayAddonTitle) return;
      if (!selectedAddonDate || !currentSelection) {
        setDayAddonPanelOpen(false);
        dayAddonGrid.innerHTML = "";
        dayAddonTitle.textContent = "Add-ons";
        return;
      }

      const validDate = currentSelection.schedule.some(entry => entry.date === selectedAddonDate);
      if (!validDate) {
        setDayAddonPanelOpen(false);
        return;
      }

      const dateMap = dayAddonItems.get(selectedAddonDate) || new Map();
      setDayAddonPanelOpen(true);
      dayAddonTitle.textContent = `Add-ons • ${selectedAddonDate}`;
      dayAddonGrid.innerHTML = addonCatalog.map(item => {
        const qty = Number(dateMap.get(item.id) || 0);
        return `
          <article class="addon-item">
            <div class="addon-title">${escapeHtml(item.name)}</div>
            <div class="addon-meta">${escapeHtml(item.category)}${item.price ? ` • ${escapeHtml(item.price)}` : ""}</div>
            <div class="addon-actions">
              <button class="addon-plus" type="button" data-action="day-minus" data-date="${selectedAddonDate}" data-addon-id="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(item.name)} from ${selectedAddonDate}">-</button>
              <span class="addon-qty">Qty: ${qty}</span>
              <button class="addon-plus" type="button" data-action="day-plus" data-date="${selectedAddonDate}" data-addon-id="${escapeHtml(item.id)}" aria-label="Add ${escapeHtml(item.name)} to ${selectedAddonDate}">+</button>
            </div>
          </article>
        `;
      }).join("");
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
            const qty = getDateAddonTotal(key);
            const nutrition = activeMap.get(key)?.nutrition || {};
            const details = (activeMap.get(key)?.details || []).filter(Boolean);
            const dishesForCell = Array.from(new Set((details.length ? details : [activeMap.get(key)?.dish]).filter(Boolean)));
            const nutritionBits = [
              nutrition.calories ? `🔥 ${escapeHtml(String(nutrition.calories).trim())} kcal` : "",
              nutrition.protein ? `💪 ${escapeHtml(formatMacroValue(nutrition.protein))} Protein` : "",
              nutrition.carbohydrates ? `🌾 ${escapeHtml(formatMacroValue(nutrition.carbohydrates))} Carbs` : ""
            ].filter(Boolean);
            box.classList.add("active");
            if (selectedAddonDate === key) box.classList.add("selected");
            box.innerHTML += `
              <div class="dish-list">${dishesForCell.map(dish => `<div class="dish">${escapeHtml(dish)}</div>`).join("")}</div>
              ${nutritionBits.length ? `<div class="day-nutrition">${nutritionBits.join(" • ")}</div>` : ""}
              <div class="day-popup">
                ${nutrition.calories ? `<div>Calories: ${escapeHtml(String(nutrition.calories).trim())} kcal</div>` : ""}
                ${nutrition.protein ? `<div>Protein: ${escapeHtml(formatMacroValue(nutrition.protein))}</div>` : ""}
                ${nutrition.carbohydrates ? `<div>Carbohydrates: ${escapeHtml(formatMacroValue(nutrition.carbohydrates))}</div>` : ""}
                ${nutrition.fats ? `<div>Fats: ${escapeHtml(formatMacroValue(nutrition.fats))}</div>` : ""}
                ${nutrition.fiber ? `<div>Fiber: ${escapeHtml(formatMacroValue(nutrition.fiber))}</div>` : ""}
              </div>
              <button class="day-addon-trigger" type="button" data-action="open-addon-panel" data-date="${key}">Add-ons</button>
              ${qty > 0 ? `<div class="day-addon-count">${qty} add-on${qty > 1 ? "s" : ""}</div>` : ""}
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
        rows.push({ label, mapLink, isDefault: rows.length === 0 });
        byUser[currentUserEmail] = rows;
        window.localStorage.setItem(ADDRESS_KEY, JSON.stringify(byUser));
      } catch {
        // ignore storage failures
      }
    }

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
        variant: variantSelect?.value || "",
        meal: mealSelect?.value || "",
        period: periodSelect?.value || "",
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
      if (!params.get("variant") && variantSelect && draft.variant) variantSelect.value = draft.variant;
      if (!params.get("period") && periodSelect && draft.period) periodSelect.value = draft.period;
      if (!deliveryLocationParam && locationSelect && draft.locationId) locationSelect.value = draft.locationId;
      dayAddonItems.clear();
      selectedAddonDate = "";
    }

    function buildOrderPayload() {
      const dailyAddons = currentSelection?.schedule.map(entry => {
        const byDate = dayAddonItems.get(entry.date) || new Map();
        const items = Array.from(byDate.entries())
          .map(([id, qty]) => {
            const addon = addonCatalog.find(candidate => candidate.id === id);
            return addon ? { id, name: addon.name, qty: Number(qty || 0), price: addon.price } : null;
          })
          .filter(Boolean);
        return {
          date: entry.date,
          items,
          addonQty: items.reduce((sum, item) => sum + Number(item.qty || 0), 0)
        };
      }) || [];

      const planPrice = findPlanPrice(
        planCatalog,
        currentSelection?.plan || "",
        currentSelection?.meal || "",
        currentSelection?.variant || "",
        currentSelection?.period || "weekly"
      );
      const addonTotal = getAddonAmountTotal();

      return {
        savedAt: new Date().toISOString(),
        name: nameInput?.value.trim() || "",
        phone: phoneInput?.value.trim() || "",
        locationId: locationSelect?.value || "",
        mapLink: mapLinkInput?.value.trim() || "",
        notes: notesInput?.value.trim() || "",
        userEmail: currentUserEmail,
        plan: currentSelection?.plan || "",
        variant: currentSelection?.variant || "",
        meal: currentSelection?.meal || "",
        period: currentSelection?.period || "",
        start: currentSelection?.start || "",
        end: currentSelection?.end || "",
        activeDays: currentSelection?.activeDays || 0,
        schedule: currentSelection?.schedule || [],
        addons: [],
        dailyAddons,
        pricing: {
          planPrice: planPrice.amount,
          addonPrice: addonTotal,
          total: Number(planPrice.amount || 0) + addonTotal
        }
      };
    }

  async function submitOrderToBackend(orderPayload) {
      return { ok: false, skipped: true, reason: "temporarily_disabled" };
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
      normalized.forEach(row => locationMap.set(row.id, row));
      locationSelect.innerHTML = normalized
        .map(row => `<option value="${escapeHtml(row.id)}">${escapeHtml(row.name)}</option>`)
        .join("");

      if (deliveryLocationParam && locationMap.has(deliveryLocationParam)) {
        locationSelect.value = deliveryLocationParam;
      }
    }

    function populatePlanOptions(defaultPlan) {
      if (!planSelect) return;
      const keys = Array.from(new Set(planCatalog.map(item => item.planKeyRaw || item.planKey).filter(Boolean)));
      planSelect.innerHTML = keys
        .map(key => `<option value="${escapeHtml(normalizeKey(key))}">${escapeHtml(key)}</option>`)
        .join("");
      const normalizedDefault = normalizeKey(defaultPlan);
      if (normalizedDefault && keys.some(key => normalizeKey(key) === normalizedDefault)) {
        planSelect.value = normalizedDefault;
      }
    }

    function syncVariantOptions() {
      if (!variantSelect || !planSelect || !mealSelect) return;
      const selectedPlan = normalizeKey(planSelect.value || plan);
      const selectedMeal = normalizeKey(mealSelect.value || meal);
      const variants = Array.from(new Set(
        planCatalog
          .filter(row => row.planKey === selectedPlan && normalizeKey(row.planName).includes(selectedMeal))
          .map(row => row.variant || "standard")
      ));
      const finalVariants = variants.length ? variants : ["standard"];
      const current = normalizeKey(variantSelect.value || variant);
      variantSelect.innerHTML = finalVariants
        .map(v => `<option value="${escapeHtml(v)}">${escapeHtml(formatVariantLabel(v))}</option>`)
        .join("");
      variantSelect.value = finalVariants.includes(current) ? current : finalVariants[0];
    }

    async function refresh() {
      const selectedPlan = planSelect?.value || plan;
      const selectedMeal = mealSelect?.value || meal;
      const selectedPeriod = periodSelect?.value || "weekly";
      syncVariantOptions();
      const selectedVariant = variantSelect?.value || variant;
      const start = startInput?.value ? new Date(startInput.value) : new Date();

      if (title) title.textContent = `${formatLabel(selectedPlan)} • ${selectedMeal[0].toUpperCase() + selectedMeal.slice(1)} • ${formatVariantLabel(selectedVariant)}`;
      updatePickerLink();

      const allPlanMeals = await loadPlanMeals();
      const allPlansNutritionRows = await loadAllPlansNutrition();
      const planMealRows = allPlanMeals
        .filter(row => normalizeKey(row.Plan_Key || row.plan_key) === normalizeKey(selectedPlan))
        .filter(row => normalizeKey(row.Meal_Type || row.meal_type) === normalizeKey(selectedMeal));
      const variantRows = planMealRows.filter(row => {
        const rowVariant = normalizeKey(row.Variant_Key || row.variant_key);
        return !rowVariant || rowVariant === normalizeKey(selectedVariant);
      });
      const effectiveRows = variantRows.length ? variantRows : planMealRows;
      const activeCount = selectedPeriod === "monthly" ? 24 : 6;
      const dates = nextActiveDates(start, activeCount);
      const activeMap = new Map();
      dates.forEach((iso, idx) => {
        const dateObj = new Date(iso);
        const unified = buildUnifiedEntry(allPlansNutritionRows, selectedPlan, selectedVariant, selectedMeal, dateObj);
        activeMap.set(iso, unified || { dish: "Menu unavailable in master sheet", details: [], nutrition: {} });
      });

      Array.from(dayAddonItems.keys()).forEach(date => {
        if (!activeMap.has(date)) dayAddonItems.delete(date);
      });
      if (selectedAddonDate && !activeMap.has(selectedAddonDate)) selectedAddonDate = "";

      currentSelection = {
        plan: selectedPlan,
        variant: selectedVariant,
        meal: selectedMeal,
        period: selectedPeriod,
        start: formatIso(start),
        end: dates[dates.length - 1] || formatIso(start),
        activeDays: activeCount,
        schedule: dates.map((iso, idx) => ({
          date: iso,
          dish: activeMap.get(iso)?.dish || activeMap.get(iso) || dishes[idx % dishes.length],
          addonQty: getDateAddonTotal(iso)
        }))
      };

      renderCalendarMonths(start, activeMap);
      renderDayAddonPanel();
      updateBillSummary();
    }

    function updateConfirmLink() {
      if (!confirmBtn || !currentSelection) return;
      const name = nameInput?.value.trim() || "";
      const phone = phoneInput?.value.trim() || "";
      const selected = locationMap.get(locationSelect?.value || "") || null;
      const locationNameFromList = selected?.name || "";
      const locationMapLink = selected?.mapLink || "";

      if (mapLinkInput && !mapLinkInput.value.trim()) {
        if (locationMapLink) {
          mapLinkInput.value = locationMapLink;
        } else if (pickedLat && pickedLon) {
          mapLinkInput.value = `https://maps.google.com/?q=${pickedLat},${pickedLon}`;
        }
      }

      const mapAppLink = mapLinkInput?.value.trim() || "";
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
      const dayAddonLines = (orderPayload.dailyAddons || [])
        .filter(entry => Array.isArray(entry.items) && entry.items.length)
        .map(entry => `${entry.date}: ${entry.items.map(item => `${item.name} x${item.qty}`).join(", ")}`)
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
        `Plan: ${formatLabel(currentSelection.plan)}`,
        `Food Preference: ${formatVariantLabel(currentSelection.variant)}`,
        `Meal Slot: ${currentSelection.meal}`,
        `Period: ${currentSelection.period}`,
        `Active Days: ${currentSelection.activeDays}`,
        `Start Date: ${currentSelection.start}`,
        `End Date: ${currentSelection.end}`,
        `Plan Price: ${formatCurrency(orderPayload.pricing?.planPrice) || "Price on request"}`,
        `Add-on Total: ₹${Number(orderPayload.pricing?.addonPrice || 0).toLocaleString("en-IN")}`,
        `Grand Total: ${orderPayload.pricing?.total ? `₹${Number(orderPayload.pricing.total).toLocaleString("en-IN")}` : "Price on request"}`,
        dayAddonLines ? "Day-wise Add-ons:" : "",
        dayAddonLines || "",
        "Day-wise Menu:",
        scheduleLines,
        notes ? `Notes: ${notes}` : ""
      ].filter(Boolean).join("\n");

      confirmBtn.href = buildWhatsappLink(WHATSAPP_NUMBER, message);
      setFeedback("success", "Ready. Tap confirm to continue on WhatsApp.");
      saveDraft();
    }

    if (mealSelect) mealSelect.value = meal;
    if (variantSelect) variantSelect.value = variant;


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

    const minStartDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (startInput) {
      startInput.min = formatIso(minStartDate);
      const requestedStart = startDateParam ? new Date(startDateParam) : null;
      const safeStart = requestedStart && !Number.isNaN(requestedStart.getTime()) && requestedStart >= minStartDate
        ? requestedStart
        : minStartDate;
      startInput.value = formatIso(safeStart);
    }

    if (confirmBtn) {
      confirmBtn.addEventListener("click", async event => {
        if (!confirmBtn.href || confirmBtn.getAttribute("href") === "#") {
          event.preventDefault();
          saveDraft();
          return;
        }

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
      });
    }

    [startInput, periodSelect, mealSelect, variantSelect, planSelect].forEach(el => {
      if (!el) return;
      el.addEventListener("change", async () => {
        await refresh();
        updateConfirmLink();
        updateBillSummary();
        updatePickerLink();
        saveDraft();
      });
    });

    if (locationSelect && mapLinkInput) {
      locationSelect.addEventListener("change", () => {
        const selected = locationMap.get(locationSelect.value || "");
        if (selected?.mapLink) mapLinkInput.value = selected.mapLink;
        updateConfirmLink();
        updateBillSummary();
        updatePickerLink();
        saveDraft();
      });
    }

    [nameInput, phoneInput, notesInput, locationSelect, mapLinkInput].forEach(el => {
      if (!el) return;
      el.addEventListener("input", () => {
        updateConfirmLink();
        updateBillSummary();
        updatePickerLink();
        saveDraft();
      });
      el.addEventListener("change", () => {
        updateConfirmLink();
        updateBillSummary();
        updatePickerLink();
        saveDraft();
      });
    });

    if (dayAddonGrid) {
      dayAddonGrid.addEventListener("click", async event => {
        const target = event.target instanceof HTMLElement ? event.target : null;
        const actionEl = target?.closest("[data-action]");
        const addonId = actionEl?.getAttribute("data-addon-id");
        const action = actionEl?.getAttribute("data-action");
        const date = actionEl?.getAttribute("data-date") || selectedAddonDate;
        if (!addonId || !action || !date) return;

        const mapForDate = dayAddonItems.get(date) || new Map();
        const qty = Number(mapForDate.get(addonId) || 0);
        if (action === "day-plus") mapForDate.set(addonId, qty + 1);
        if (action === "day-minus") {
          if (qty <= 1) mapForDate.delete(addonId);
          else mapForDate.set(addonId, qty - 1);
        }
        if (mapForDate.size) dayAddonItems.set(date, mapForDate);
        else dayAddonItems.delete(date);

        await refresh();
        updateConfirmLink();
        saveDraft();
      });
    }

    const calendarGrid = document.getElementById("calendar-grid");
    if (calendarGrid) {
      calendarGrid.addEventListener("click", event => {
        const target = event.target instanceof HTMLElement ? event.target : null;
        const actionEl = target?.closest("[data-action]");
        const action = actionEl?.getAttribute("data-action");
        if (action !== "open-addon-panel") return;
        const date = actionEl?.getAttribute("data-date");
        if (!date) return;
        selectedAddonDate = date;
        renderDayAddonPanel();
        saveDraft();
      });
    }

    dayAddonCloseBtn?.addEventListener("click", () => {
      selectedAddonDate = "";
      renderDayAddonPanel();
      saveDraft();
    });

    dayAddonBackdrop?.addEventListener("click", () => {
      selectedAddonDate = "";
      renderDayAddonPanel();
      saveDraft();
    });

    planCatalog = await loadPlansCatalog();
    populatePlanOptions(plan);
    await loadLocations();
    addonCatalog = await loadAddonCatalog();
    applyDraft();
    syncVariantOptions();
    updatePickerLink();
    await refresh();
    updateConfirmLink();
    updateBillSummary();
    saveDraft();
  })();
})();
