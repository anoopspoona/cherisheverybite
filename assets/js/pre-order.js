const PREORDER_WHATSAPP = "916282023762";

function normalizePrice(value) {
  const text = String(value || "").trim();
  return text ? (/^[₹$]/.test(text) ? text : `₹${text}`) : "TBD";
}

function normalizeMenuRows(rows) {
  return rows
    .filter(row => String(row.Status || row.status || "live").toLowerCase() === "live")
    .map(row => ({
      id: row.id || row.ID || row.Dish_ID || row.dish_id || "",
      name: row.name || row.Name || row.Dish_Name || row.dish_name || "",
      category: row.category || row.Category || "Menu",
      mealType: row.meal_type || row.Meal_Type || "",
      price: normalizePrice(row.price || row.Price || row.unit_price || row.Unit_Price || ""),
      calories: row.Calories || row.calories || "",
      protein: row.Protein || row.protein || "",
      carbohydrates: row.Carbohydrates || row.carbohydrates || row.Carbs || row.carbs || "",
      fats: row.Fats || row.fats || "",
      fiber: row.Fiber || row.fiber || ""
    }))
    .filter(item => item.id && item.name);
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
  const pickLocationBtn = document.getElementById("preorder-pick-location");
  const feedback = document.getElementById("preorder-feedback");
  const menuWrap = document.getElementById("preorder-menu");
  const categoryBar = document.getElementById("preorder-category-bar");
  const confirm = document.getElementById("preorder-confirm");
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
  const items = normalizeMenuRows(catalogRows.filter(row => String(row.record_type || row.Record_Type || "dish").toLowerCase() === "dish"));
  const qtyById = new Map();
  let openCategory = "";

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
    locationSelect.innerHTML = `<option value="">Select saved location</option>${normalized
      .map(row => `<option value="${escapeHtml(row.id)}">${escapeHtml(row.name)}</option>`)
      .join("")}`;
  }

  function render() {
    if (!menuWrap) return;
    const grouped = groupByCategory(items);
    if (!openCategory && grouped.length) openCategory = grouped[0].category;
    if (categoryBar) {
      categoryBar.innerHTML = grouped.map(group => `<button class="btn btn-soft preorder-cat-chip ${group.category === openCategory ? "is-active" : ""}" data-action="toggle-category" data-category="${escapeHtml(group.category)}" type="button">${escapeHtml(group.category)}</button>`).join("");
    }
    menuWrap.innerHTML = grouped.map(group => {
      const isOpen = group.category === openCategory;
      const inner = group.rows.map(item => {
        const qty = Number(qtyById.get(item.id) || 0);
        return `<li class="menu-card preorder-item">
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
    const chosen = items.filter(item => Number(qtyById.get(item.id) || 0) > 0).map(item => `${item.name} x${qtyById.get(item.id)}`);
    const date = dateInput?.value || "";
    const name = nameInput?.value.trim() || "";
    const phone = phoneInput?.value.trim() || "";
    const selected = locationMap.get(locationSelect?.value || "") || null;
    const locationName = selected?.name || (pickedLat && pickedLon ? pickedLabel : "");
    if (mapLinkInput && !mapLinkInput.value.trim() && selected?.mapLink) mapLinkInput.value = selected.mapLink;
    if (mapLinkInput && !mapLinkInput.value.trim() && pickedLat && pickedLon) mapLinkInput.value = `https://maps.google.com/?q=${pickedLat},${pickedLon}`;
    const mapLink = mapLinkInput?.value.trim() || "";
    const phoneOk = /^\+?[0-9\-\s]{8,15}$/.test(phone);
    const missing = [];
    if (!date) missing.push("delivery date");
    if (!name) missing.push("name");
    if (!phone) missing.push("mobile number");
    else if (!phoneOk) missing.push("valid mobile number");
    if (!chosen.length) missing.push("at least one dish");
    if (!locationName) missing.push("delivery location");
    if (!mapLink) missing.push("map link");
    if (missing.length) {
      if (confirm) confirm.href = "#";
      if (feedback) feedback.textContent = `Please add: ${missing.join(", ")}.`;
      return;
    }
    const message = [
      "Hi Cherish Every Bite, I would like to place a pre-order.",
      `Name: ${name}`,
      `Mobile: ${phone}`,
      `Delivery Location: ${locationName}`,
      `Pinned Map App Link: ${mapLink}`,
      `Delivery Date: ${date}`,
      "Items:",
      ...chosen
    ].join("\n");
    if (confirm) confirm.href = buildWhatsappLink(PREORDER_WHATSAPP, message);
    if (feedback) feedback.textContent = "Ready. Tap confirm to place pre-order on WhatsApp.";
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
    render();
    updateConfirm();
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

  [dateInput, nameInput, phoneInput, locationSelect, mapLinkInput].forEach(el => el?.addEventListener("input", () => { updateConfirm(); updatePickerLink(); }));
  [dateInput, nameInput, phoneInput, locationSelect, mapLinkInput].forEach(el => el?.addEventListener("change", () => { updateConfirm(); updatePickerLink(); }));

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

  await loadLocations();
  render();
  updateConfirm();
})();
