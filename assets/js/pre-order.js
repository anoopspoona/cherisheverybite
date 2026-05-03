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
  const feedback = document.getElementById("preorder-feedback");
  const menuWrap = document.getElementById("preorder-menu");
  const categoryBar = document.getElementById("preorder-category-bar");
  const confirm = document.getElementById("preorder-confirm");

  const today = new Date();
  const maxDate = new Date(today);
  maxDate.setMonth(maxDate.getMonth() + 3);
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (dateInput) {
    dateInput.min = fmt(today);
    dateInput.max = fmt(maxDate);
    dateInput.value = fmt(today);
  }

  const catalogRows = await fetchCSV("catalog.csv").catch(() => []);
  const items = normalizeMenuRows(catalogRows.filter(row => String(row.record_type || row.Record_Type || "dish").toLowerCase() === "dish"));
  const qtyById = new Map();
  let openCategory = "";

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
          <p class="price" style="display:inline-flex">${escapeHtml(item.price)}</p>
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
    const phoneOk = /^\+?[0-9\-\s]{8,15}$/.test(phone);
    if (!date || !name || !phoneOk || !chosen.length) {
      if (confirm) confirm.href = "#";
      if (feedback) feedback.textContent = "Select date (within 3 months), enter name/mobile, and add at least one item.";
      return;
    }
    const message = [
      "Hi Cherish Every Bite, I would like to place a pre-order.",
      `Name: ${name}`,
      `Mobile: ${phone}`,
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

  [dateInput, nameInput, phoneInput].forEach(el => el?.addEventListener("input", updateConfirm));
  [dateInput, nameInput, phoneInput].forEach(el => el?.addEventListener("change", updateConfirm));

  render();
  updateConfirm();
})();
