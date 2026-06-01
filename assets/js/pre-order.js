const PREORDER_WHATSAPP = "916282023762";
const PREORDER_DRAFT_KEY = "ceb_preorder_draft_v1";
const ALLOWED_TIME_SLOTS = new Set([
  "12:00-14:00",
  "14:00-16:00",
  "16:00-18:00",
  "18:00-20:00",
  "20:00-22:00"
]);

function normalizePrice(value) {
  const text = String(value || "").trim();
  return text ? (/^[₹$]/.test(text) ? text : `₹${text}`) : "TBD";
}

function resolveImageUrl(value) {
  const raw = String(value || "")
    .replace(/[\r\n\t]+/g, "")
    .replace(/\s*\/\s*/g, "/")
    .trim();
  if (!raw) return "";
  if (/^(https?:)?\/\//i.test(raw)) return raw;
  if (raw.startsWith("assets/")) return raw;
  if (/\.(png|jpe?g|webp|gif|avif|svg)$/i.test(raw) && !raw.includes("/")) {
    if (/shop photo/i.test(raw)) return `assets/hero/${raw}`;
    return `assets/dishes/${raw}`;
  }
  return raw.replace(/^\.\//, "");
}

function normalizeMenuRows(rows) {
  return rows
    .filter(row => String(row.Status || row.status || "live").toLowerCase() === "live")
    .map((row, idx) => ({
      id: row.id || row.ID || row.Dish_ID || row.dish_id || `CAT-${idx + 1}`,
      name: row.name || row.Name || row.Dish_Name || row.dish_name || "",
      category: row.category || row.Category || "Menu",
      mealType: row.meal_type || row.Meal_Type || "",
      price: normalizePrice(row.price || row.Price || row.unit_price || row.Unit_Price || ""),
      calories: row.Calories || row.calories || row.kcal || "",
      protein: row.Protein || row.protein || row.protein_g || "",
      carbohydrates: row.Carbohydrates || row.carbohydrates || row.Carbs || row.carbs || "",
      fats: row.Fats || row.fats || "",
      fiber: row.Fiber || row.fiber || "",
      imageUrl: resolveImageUrl(row.image_url || row.Image_URL || row.thumbnail_url || row.Thumbnail_URL || row.thumbnail || row.Thumbnail || row.image || row.Image || row.url || row.URL || "")
    }))
    .filter(item => item.name);
}

function groupByCategory(items) {
  const map = new Map();
  items.forEach(item => {
    const category = String(item.category || "Menu").trim();
    if (!map.has(category)) map.set(category, []);
    map.get(category).push(item);
  });
  return Array.from(map.entries()).map(([category, rows]) => ({ category, rows }));
}

(async function initPreOrder() {
  const dateInput = document.getElementById("preorder-date");
  const nameInput = document.getElementById("preorder-name");
  const phoneInput = document.getElementById("preorder-phone");
  const locationSelect = document.getElementById("preorder-location");
  const mapLinkInput = document.getElementById("preorder-map-link");
  const timeSlotSelect = document.getElementById("preorder-time-slot");
  const pickLocationBtn = document.getElementById("preorder-pick-location");
  const feedback = document.getElementById("preorder-feedback");
  const menuWrap = document.getElementById("preorder-menu");
  const categoryBar = document.getElementById("preorder-category-bar");
  const confirm = document.getElementById("preorder-confirm");
  const confirmTop = document.getElementById("preorder-confirm-top");
  const params = new URLSearchParams(window.location.search);
  const pickedLat = params.get("picked_lat");
  const pickedLon = params.get("picked_lon");
  const pickedLabel = params.get("picked_label") || "Pinned Location";
  const locationMap = new Map();

  const today = new Date();
  const minDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const maxDate = new Date(today);
  maxDate.setMonth(maxDate.getMonth() + 3);
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (dateInput) {
    dateInput.min = fmt(minDate);
    dateInput.max = fmt(maxDate);
    dateInput.value = fmt(minDate);
  }

  const catalogRows = await fetchCSV("catalog.csv").catch(() => []);
  if (menuWrap) menuWrap.innerHTML = `<div class="preorder-skeleton"><div class="row"></div><div class="row"></div><div class="row"></div></div>`;
  const items = normalizeMenuRows(catalogRows.filter(row => String(row.record_type || row.Record_Type || "dish").toLowerCase() === "dish"));
  if (!items.length) {
    const nutritionRows = await fetchCSV("allplans_nutrition.csv").catch(() => []);
    window.__NUT_FALLBACK__ = nutritionRows.flatMap(row => ["Data.Column3","Data.Column4","Data.Column5","Data.Column6","Data.Column7"].map(k => String(row[k] || "").trim()).filter(Boolean));
  }
  const qtyById = new Map();
  let openCategory = "";

  function saveDraft() {
    try {
      const payload = {
        date: dateInput?.value || "",
        name: nameInput?.value || "",
        phone: phoneInput?.value || "",
        locationId: locationSelect?.value || "",
        mapLink: mapLinkInput?.value || "",
        timeSlot: timeSlotSelect?.value || "",
        qty: Array.from(qtyById.entries()).filter(([, qty]) => Number(qty) > 0)
      };
      window.localStorage.setItem(PREORDER_DRAFT_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }

  function restoreDraft() {
    try {
      const raw = window.localStorage.getItem(PREORDER_DRAFT_KEY);
      if (!raw) return;
      const payload = JSON.parse(raw);
      if (!payload || typeof payload !== "object") return;
      if (dateInput && payload.date && payload.date >= dateInput.min) dateInput.value = payload.date;
      if (nameInput && payload.name) nameInput.value = payload.name;
      if (phoneInput && payload.phone) phoneInput.value = payload.phone;
      if (mapLinkInput && payload.mapLink) mapLinkInput.value = payload.mapLink;
      if (timeSlotSelect && payload.timeSlot && ALLOWED_TIME_SLOTS.has(payload.timeSlot)) timeSlotSelect.value = payload.timeSlot;
      const qtyRows = Array.isArray(payload.qty) ? payload.qty : [];
      qtyRows.forEach(([id, qty]) => {
        if (id && Number(qty) > 0) qtyById.set(String(id), Number(qty));
      });
      if (locationSelect && payload.locationId) locationSelect.value = payload.locationId;
    } catch {
      // ignore
    }
  }

  async function loadLocations() {
    if (!locationSelect) return;
    const rows = await fetchCSV("catalog.csv").catch(() => []);
    const normalized = rows
      .filter(row => String(row.record_type || row.Record_Type || "").toLowerCase() === "location")
      .map(row => ({
        id: row.id || row.ID || row.location_id || row.Location_ID || "",
        name: row.name || row.Name || row.location_name || row.Location_Name || "",
        mapLink: row.map_link || row.Map_Link || row.url || row.URL || ""
      }))
      .filter(row => row.id && row.name);
    if (!normalized.length) {
      locationSelect.innerHTML = `<option value="pinned-only">Use pinned map link</option>`;
      return;
    }
    locationMap.clear();
    normalized.forEach(row => locationMap.set(row.id, row));
    locationSelect.innerHTML = `<option value="">Select saved location</option>${normalized
      .map(row => `<option value="${escapeHtml(row.id)}">${escapeHtml(row.name)}</option>`)
      .join("")}`;
  }

  function render() {
    if (!menuWrap) return;
    const sourceItems = items.length ? items : normalizeMenuRows((window.__NUT_FALLBACK__ || []).map((name, idx) => ({ id: `NUT-${idx+1}`, name, category: "Plan Menu", price: "TBD", status: "live" })));
    const grouped = groupByCategory(sourceItems);
    if (!openCategory && grouped.length) openCategory = grouped[0].category;
    if (categoryBar) {
      categoryBar.innerHTML = grouped.map(group => `<button class="btn btn-soft preorder-cat-chip ${group.category === openCategory ? "is-active" : ""}" data-action="toggle-category" data-category="${escapeHtml(group.category)}" type="button">${escapeHtml(group.category)}</button>`).join("");
    }
    menuWrap.innerHTML = grouped.map(group => {
      const isOpen = group.category === openCategory;
      const inner = group.rows.map(item => {
        const qty = Number(qtyById.get(item.id) || 0);
        return `<li class="menu-card preorder-item">
          <img class="preorder-thumb" src="${escapeHtml(item.imageUrl || 'cherish-logo.jpg')}" alt="${escapeHtml(item.name)}" loading="lazy" onerror="this.src='cherish-logo.jpg'" />
          <div class="dish-head">
            <div class="dish-title-wrap">
            <strong class="dish-title">${escapeHtml(item.name)}</strong>
            <div class="muted">${item.mealType ? escapeHtml(item.mealType) : ""}</div>
            ${(item.calories || item.protein || item.carbohydrates || item.fats || item.fiber) ? `<div class="nutrition-chips">
              ${item.calories ? `<span class="nutrition-pill is-red"><span class="nutrition-icon">🔥</span><span>${escapeHtml(item.calories)}</span></span>` : ""}
              ${item.protein ? `<span class="nutrition-pill is-red"><span class="nutrition-icon">💪</span><span>${escapeHtml(item.protein)}g</span></span>` : ""}
              ${item.carbohydrates ? `<span class="nutrition-pill is-green"><span class="nutrition-icon">🌾</span><span>${escapeHtml(item.carbohydrates)}g</span></span>` : ""}
              ${item.fats ? `<span class="nutrition-pill is-red"><span class="nutrition-icon">💧</span><span>${escapeHtml(item.fats)}g</span></span>` : ""}
              ${item.fiber ? `<span class="nutrition-pill is-green"><span class="nutrition-icon">🌿</span><span>${escapeHtml(item.fiber)}g</span></span>` : ""}
            </div>` : ""}
            </div>
            <p class="price">${escapeHtml(item.price)}</p>
          </div>
          <div class="action-row" style="margin-top:8px;">
            <button class="btn btn-soft" data-id="${escapeHtml(item.id)}" data-action="minus" type="button">-</button>
            <span>Qty: ${qty}</span>
            <button class="btn btn-soft" data-id="${escapeHtml(item.id)}" data-action="plus" type="button">+</button>
          </div>
        </li>`;
      }).join("");
      return `<article class="menu-section" data-category-section="${escapeHtml(group.category)}">
        <button class="btn btn-soft preorder-cat-toggle" data-action="toggle-category" data-category="${escapeHtml(group.category)}" type="button">
          ${escapeHtml(group.category)} (${group.rows.length})
        </button>
        <div class="preorder-cat-body" style="display:${isOpen ? "block" : "none"};">
          <ul class="item-list">${inner}</ul>
        </div>
      </article>`;
    }).join("");
  }

  function updateConfirm() {
    const selectedItems = items.filter(item => Number(qtyById.get(item.id) || 0) > 0);
    const chosen = selectedItems.map(item => `${item.name} x${qtyById.get(item.id)}`);
    const date = dateInput?.value || "";
    const name = nameInput?.value.trim() || "";
    const phone = phoneInput?.value.trim() || "";
    const selected = locationMap.get(locationSelect?.value || "") || null;
    const locationName = selected?.name || (pickedLat && pickedLon ? pickedLabel : "");
    if (mapLinkInput && !mapLinkInput.value.trim() && selected?.mapLink) mapLinkInput.value = selected.mapLink;
    if (mapLinkInput && !mapLinkInput.value.trim() && pickedLat && pickedLon) mapLinkInput.value = `https://maps.google.com/?q=${pickedLat},${pickedLon}`;
    const mapLink = mapLinkInput?.value.trim() || "";
    const timeSlot = timeSlotSelect?.value || "";
    const timeSlotValid = ALLOWED_TIME_SLOTS.has(timeSlot);
    const phoneOk = /^\+?[0-9\-\s]{8,15}$/.test(phone);
    const missing = [];
    if (!date) missing.push("delivery date");
    if (!name) missing.push("name");
    if (!phone) missing.push("mobile number");
    else if (!phoneOk) missing.push("valid mobile number");
    if (!chosen.length) missing.push("at least one dish");
    if (!locationName) missing.push("delivery location");
    if (!mapLink) missing.push("map link");
    if (!timeSlotValid) missing.push("preferred delivery time (12:00 PM to 10:00 PM)");
    const totalCount = selectedItems.reduce((sum,item)=>sum+Number(qtyById.get(item.id)||0),0);
    if (confirm) confirm.innerHTML = `Confirm Pre Order <span class="badge">${totalCount} item${totalCount===1?"":"s"}</span>`;
    if (confirmTop) confirmTop.textContent = `Confirm Pre Order (${totalCount})`;
    if (missing.length) {
      if (confirm) confirm.href = "#";
      if (confirmTop) confirmTop.href = "#";
      if (feedback) feedback.textContent = `Please add: ${missing.join(", ")}.`;
      saveDraft();
      return;
    }
    const message = [
      "Hi Cherish Every Bite, I would like to place a pre-order.",
      `Name: ${name}`,
      `Mobile: ${phone}`,
      `Delivery Location: ${locationName}`,
      `Pinned Map App Link: ${mapLink}`,
      `Delivery Date: ${date}`,
      `Preferred Delivery Time: ${timeSlot}`,
      "Items:",
      ...chosen
    ].join("\n");
    const link = buildWhatsappLink(PREORDER_WHATSAPP, message);
    if (confirm) confirm.href = link;
    if (confirmTop) confirmTop.href = link;
    if (feedback) feedback.textContent = "Ready. Tap confirm to place pre-order on WhatsApp.";
    saveDraft();
  }

  menuWrap?.addEventListener("click", event => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const btn = target?.closest("button[data-action]");
    if (!btn) return;
    if (btn.getAttribute("data-action") === "toggle-category") {
      openCategory = btn.getAttribute("data-category") || "";
      render();
      return;
    }
    const id = btn.getAttribute("data-id") || "";
    const action = btn.getAttribute("data-action") || "";
    const qty = Number(qtyById.get(id) || 0);
    if (action === "plus") qtyById.set(id, qty + 1);
    if (action === "minus") qtyById.set(id, Math.max(0, qty - 1));
    btn.classList.remove("tap-bump");
    void btn.offsetWidth;
    btn.classList.add("tap-bump");
    render();
    updateConfirm();
    saveDraft();
  });
  categoryBar?.addEventListener("click", event => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const btn = target?.closest("button[data-action='toggle-category']");
    if (!btn) return;
    openCategory = btn.getAttribute("data-category") || "";
    render();
    const section = menuWrap.querySelector(`[data-category-section="${CSS.escape(openCategory)}"]`);
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  if (pickedLat && pickedLon && mapLinkInput) mapLinkInput.value = `https://maps.google.com/?q=${pickedLat},${pickedLon}`;
  function updatePickerLink() {
    if (!pickLocationBtn) return;
    const q = new URLSearchParams();
    q.set("return_to", "pre-order.html");
    if (dateInput?.value) q.set("start_date", dateInput.value);
    if (nameInput?.value) q.set("customer_name", nameInput.value);
    if (phoneInput?.value) q.set("customer_phone", phoneInput.value);
    if (mapLinkInput?.value) q.set("map_app_link", mapLinkInput.value);
    pickLocationBtn.href = `map-picker.html?${q.toString()}`;
  }
  updatePickerLink();

  [dateInput, nameInput, phoneInput, locationSelect, mapLinkInput, timeSlotSelect].forEach(el => el?.addEventListener("input", () => { updateConfirm(); updatePickerLink(); saveDraft(); }));
  [dateInput, nameInput, phoneInput, locationSelect, mapLinkInput, timeSlotSelect].forEach(el => el?.addEventListener("change", () => { updateConfirm(); updatePickerLink(); saveDraft(); }));

  if (confirm) {
    confirm.addEventListener("click", event => {
      if (!confirm.href || confirm.getAttribute("href") === "#") {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      window.open(confirm.href, "_blank", "noopener");
    });
  }
  if (confirmTop) {
    confirmTop.addEventListener("click", event => {
      if (!confirmTop.href || confirmTop.getAttribute("href") === "#") {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      window.open(confirmTop.href, "_blank", "noopener");
    });
  }

  await loadLocations();
  restoreDraft();
  render();
  updateConfirm();
})();
