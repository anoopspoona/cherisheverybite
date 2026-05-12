const MENU_PATH = "menu.csv";
const PRICE_PATH = "prices.csv";
const CATALOG_PATH = "catalog.csv";
const SUBSCRIPTION_CYCLE_ANCHOR_KEY = "ceb_subscription_cycle_anchor_v1";
const DEFAULT_SUBSCRIPTION_CYCLE_ANCHOR = "2026-05-01";
const DELIVERY_LIMIT_KEY = "ceb_delivery_limit_km_v1";
const DEFAULT_DELIVERY_LIMIT_KM = 7;
const runtime = window.cebRuntime || {};
let preservedCatalogNonDishRows = [];
let hasCatalogSchema = false;

function setFeedback(message) {
  const el = document.getElementById("admin-feedback");
  if (el) el.textContent = message;
}

function normalizeMenuRow(row = {}) {
  return {
    Dish_ID: row.Dish_ID || row.dish_id || "",
    Dish_Name: row.Dish_Name || row.Name || row.name || "",
    Category: row.Category || row.category || "Menu",
    Meal_Type: row.Meal_Type || row.meal_type || "",
    Image_URL: row.Image_URL || row.image_url || "",
    Price: row.Price || row.price || "",
    Status: row.Status || row.status || "live"
  };
}

function renderMenuTable(rows) {
  const wrap = document.getElementById("menu-table-wrap");
  if (!wrap) return;
  const head = ["Dish_ID", "Dish_Name", "Category", "Meal_Type", "Image_URL", "Price", "Status", "Actions"];
  const body = rows.map((row, index) => `
    <tr data-index="${index}">
      <td><input data-field="Dish_ID" value="${escapeHtml(row.Dish_ID)}"></td>
      <td><input data-field="Dish_Name" value="${escapeHtml(row.Dish_Name)}"></td>
      <td><input data-field="Category" value="${escapeHtml(row.Category)}"></td>
      <td><input data-field="Meal_Type" value="${escapeHtml(row.Meal_Type)}"></td>
      <td><input data-field="Image_URL" value="${escapeHtml(row.Image_URL)}"></td>
      <td><input data-field="Price" value="${escapeHtml(row.Price)}"></td>
      <td>
        <select data-field="Status">
          <option value="live" ${row.Status === "live" ? "selected" : ""}>live</option>
          <option value="hidden" ${row.Status === "hidden" ? "selected" : ""}>hidden</option>
        </select>
      </td>
      <td><button class="btn delete-row" type="button" data-action="delete-row" data-index="${index}">Delete</button></td>
    </tr>
  `).join("");
  wrap.innerHTML = `
    <table>
      <thead><tr>${head.map(label => `<th>${label}</th>`).join("")}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

function readRowsFromTable() {
  const rows = Array.from(document.querySelectorAll("#menu-table-wrap tbody tr"));
  return rows.map(tr => {
    const get = name => {
      const el = tr.querySelector(`[data-field="${name}"]`);
      return el && "value" in el ? String(el.value).trim() : "";
    };
    return normalizeMenuRow({
      Dish_ID: get("Dish_ID"),
      Dish_Name: get("Dish_Name"),
      Category: get("Category"),
      Meal_Type: get("Meal_Type"),
      Image_URL: get("Image_URL"),
      Price: get("Price"),
      Status: get("Status")
    });
  }).filter(row => row.Dish_ID && row.Dish_Name);
}

async function saveMenuOverrides(rows) {
  const menuRows = rows.map(({ Dish_ID, Dish_Name, Category, Meal_Type, Image_URL }) => ({
    Dish_ID, Dish_Name, Category, Meal_Type, Image_URL
  }));
  const priceRows = rows.map(({ Dish_ID, Price, Status }) => ({
    Dish_ID, Price, Status
  }));
  const catalogDishRows = rows.map(({ Dish_ID, Dish_Name, Category, Meal_Type, Image_URL, Price, Status }) => ({
    ...(hasCatalogSchema ? {} : {
      id: Dish_ID,
      name: Dish_Name,
      category: Category,
      meal_type: Meal_Type,
      image_url: Image_URL,
      price: Price,
      status: Status || "live",
      record_type: "dish"
    }),
    ID: Dish_ID,
    Name: Dish_Name,
    Category,
    Meal_Type,
    Image_URL,
    Price,
    Status: Status || "live",
    Record_Type: "dish"
  }));
  const catalogRows = [...catalogDishRows, ...preservedCatalogNonDishRows];
  if (runtime.requireBackendSync && !window.cebBackend?.apiBase) {
    return { ok: false, message: "Backend sync is required. Configure CEB_BACKEND_CONFIG first." };
  }
  window.cebCsvTools.writeOverride(CATALOG_PATH, window.cebCsvTools.serializeCSV(catalogRows));
  window.cebCsvTools.writeOverride(MENU_PATH, window.cebCsvTools.serializeCSV(menuRows));
  window.cebCsvTools.writeOverride(PRICE_PATH, window.cebCsvTools.serializeCSV(priceRows));
  if (window.cebBackend?.saveAdminMenu) {
    const result = await window.cebBackend.saveAdminMenu({
      menuRows,
      priceRows
    });
    if (!result.ok) return { ok: false, message: "Failed to sync menu to backend." };
  }
  return { ok: true };
}

async function loadCalendarEditor() {
  const plan = document.getElementById("cal-plan")?.value || "elite";
  const meal = document.getElementById("cal-meal")?.value || "lunch";
  const path = `calendar_${plan}_${meal}.csv`;
  const rows = await fetchCSV(path).catch(() => []);
  const textArea = document.getElementById("calendar-dishes");
  if (!textArea) return;
  textArea.value = rows.map(row => row.Dish || row.dish || "").filter(Boolean).join("\n");
  textArea.dataset.path = path;
  setFeedback(`Loaded ${path}.`);
}

async function saveCalendarOverride() {
  const textArea = document.getElementById("calendar-dishes");
  if (!textArea) return;
  const path = textArea.dataset.path || "calendar_elite_lunch.csv";
  const dishes = String(textArea.value || "")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  const rows = dishes.map(dish => ({ Dish: dish }));
  if (runtime.requireBackendSync && !window.cebBackend?.apiBase) {
    setFeedback("Backend sync is required. Configure CEB_BACKEND_CONFIG first.");
    return;
  }
  window.cebCsvTools.writeOverride(path, window.cebCsvTools.serializeCSV(rows));
  if (window.cebBackend?.saveAdminCalendar) {
    const result = await window.cebBackend.saveAdminCalendar({
      path,
      rows
    });
    if (!result.ok) {
      setFeedback(`Failed backend sync for ${path}.`);
      return;
    }
  }
  setFeedback(`Saved override for ${path}.`);
}

function setControlsEnabled(enabled) {
  const controls = document.querySelectorAll("#admin-console button, #admin-console textarea, #admin-console input, #admin-console select");
  controls.forEach(el => {
    if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
      el.disabled = !enabled;
    }
  });
}

function setAdminConsoleVisible(visible) {
  const consoleWrap = document.getElementById("admin-console");
  if (consoleWrap) consoleWrap.style.display = visible ? "grid" : "none";
}

function loadCycleAnchorSetting() {
  const input = document.getElementById("cycle-anchor-date");
  if (!input) return;
  const stored = String(window.localStorage.getItem(SUBSCRIPTION_CYCLE_ANCHOR_KEY) || "").trim();
  input.value = /^\d{4}-\d{2}-\d{2}$/.test(stored) ? stored : DEFAULT_SUBSCRIPTION_CYCLE_ANCHOR;
}

function loadDeliveryLimitSetting() {
  const input = document.getElementById("delivery-limit-km");
  if (!input) return;
  const raw = String(window.localStorage.getItem(DELIVERY_LIMIT_KEY) || "").trim();
  const parsed = Number(raw);
  input.value = Number.isFinite(parsed) && parsed > 0 ? String(parsed) : String(DEFAULT_DELIVERY_LIMIT_KM);
}

async function getCurrentAdminIdentifier() {
  if (window.cebAuth?.enabled) {
    const user = await window.cebAuth.getCurrentUser();
    return String(user?.email || "").trim().toLowerCase();
  }
  return String(localStorage.getItem("ceb_current_user_v1") || "").trim().toLowerCase();
}

async function enforceAdminAccess() {
  const allowedEmails = Array.isArray(runtime.adminEmails) ? runtime.adminEmails.map(v => String(v || "").trim().toLowerCase()) : [];
  const current = await getCurrentAdminIdentifier();
  const loginBtn = document.getElementById("admin-google-login");
  const logoutBtn = document.getElementById("admin-logout");
  const authStatus = document.getElementById("admin-auth-status");

  if (!allowedEmails.length) {
    setAdminConsoleVisible(true);
    setControlsEnabled(true);
    if (authStatus) authStatus.textContent = "No admin email restrictions are configured.";
    return true;
  }

  const isAllowed = Boolean(current && allowedEmails.includes(current));
  setAdminConsoleVisible(isAllowed);
  setControlsEnabled(isAllowed);

  if (loginBtn) loginBtn.style.display = isAllowed ? "none" : "inline-flex";
  if (logoutBtn) logoutBtn.style.display = current ? "inline-flex" : "none";

  if (isAllowed) {
    if (authStatus) authStatus.textContent = `Signed in as ${current}. Admin access granted.`;
    setFeedback("Admin access granted.");
    return true;
  }

  if (!current) {
    if (authStatus) authStatus.textContent = "Admin login required. Continue with Google to access this console.";
    setFeedback("Admin login required. Continue with Google.");
  } else {
    if (authStatus) authStatus.textContent = `Signed in as ${current}. This account is not authorized for admin changes.`;
    setFeedback("Admin access denied. Only anoop.anoops@gmail.com can modify admin content.");
  }
  return false;
}

(async function initAdmin() {
  const [catalogRows, menuRows, priceRows] = await Promise.all([
    fetchCSV(CATALOG_PATH).catch(() => []),
    fetchCSV(MENU_PATH).catch(() => []),
    fetchCSV(PRICE_PATH).catch(() => [])
  ]);
  const normalizedCatalogRows = catalogRows.map(row => {
    const normalized = {};
    Object.keys(row || {}).forEach(key => {
      normalized[key] = row[key];
    });
    return normalized;
  });
  hasCatalogSchema = normalizedCatalogRows.some(row => "Record_Type" in row || "record_type" in row);
  preservedCatalogNonDishRows = normalizedCatalogRows.filter(row => String(row.Record_Type || row.record_type || "").toLowerCase() !== "dish");
  const catalogDishRows = normalizedCatalogRows
    .filter(row => String(row.Record_Type || row.record_type || "").toLowerCase() === "dish")
    .map(row => ({
      Dish_ID: row.ID || row.id || row.Dish_ID || row.dish_id || "",
      Dish_Name: row.Name || row.name || row.Dish_Name || row.dish_name || "",
      Category: row.Category || row.category || "",
      Meal_Type: row.Meal_Type || row.meal_type || "",
      Image_URL: row.Image_URL || row.image_url || "",
      Price: row.Price || row.price || "",
      Status: row.Status || row.status || "live"
    }))
    .filter(row => row.Dish_ID && row.Dish_Name);
  const priceMap = new Map(priceRows.map(row => [row.Dish_ID || row.dish_id || "", row]));
  let stateRows = (catalogDishRows.length ? catalogDishRows : menuRows).map(row => {
    const id = row.Dish_ID || row.dish_id || "";
    const price = priceMap.get(id) || {};
    return normalizeMenuRow({
      ...row,
      Price: row.Price || row.price || price.Price || price.price || "",
      Status: row.Status || row.status || price.Status || price.status || "live"
    });
  });
  renderMenuTable(stateRows);
  await loadCalendarEditor();
  loadCycleAnchorSetting();
  loadDeliveryLimitSetting();
  await enforceAdminAccess();

  document.getElementById("admin-google-login")?.addEventListener("click", async () => {
    if (!window.cebAuth?.enabled) {
      setFeedback("Google auth is not configured. Check CEB_SUPABASE_CONFIG.");
      return;
    }
    const redirectTo = new URL("admin.html", window.location.href).toString();
    const result = await window.cebAuth.signInWithGoogle(redirectTo);
    if (!result?.ok) {
      setFeedback(result?.message || "Could not start Google sign-in.");
    }
  });

  document.getElementById("admin-logout")?.addEventListener("click", async () => {
    if (window.cebAuth?.enabled) {
      await window.cebAuth.signOut();
    } else {
      localStorage.removeItem("ceb_current_user_v1");
    }
    await enforceAdminAccess();
  });

  document.getElementById("menu-add")?.addEventListener("click", () => {
    stateRows.push(normalizeMenuRow({ Dish_ID: `dish_${Date.now()}` }));
    renderMenuTable(stateRows);
  });

  document.getElementById("menu-table-wrap")?.addEventListener("click", event => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target || target.dataset.action !== "delete-row") return;
    const index = Number(target.dataset.index || -1);
    if (index < 0) return;
    stateRows.splice(index, 1);
    renderMenuTable(stateRows);
  });

  document.getElementById("menu-save")?.addEventListener("click", async () => {
    stateRows = readRowsFromTable();
    const result = await saveMenuOverrides(stateRows);
    if (!result?.ok) {
      setFeedback(result?.message || "Could not save menu.");
      return;
    }
    renderMenuTable(stateRows);
    setFeedback("Menu overrides saved. Refresh public pages to see updates.");
  });

  document.getElementById("menu-reset")?.addEventListener("click", () => {
    window.cebCsvTools.clearOverride(CATALOG_PATH);
    window.cebCsvTools.clearOverride(MENU_PATH);
    window.cebCsvTools.clearOverride(PRICE_PATH);
    setFeedback("Menu overrides cleared for catalog/menu/price.");
  });

  document.getElementById("cal-load")?.addEventListener("click", loadCalendarEditor);
  document.getElementById("cal-save")?.addEventListener("click", () => {
    saveCalendarOverride();
  });
  document.getElementById("cal-reset")?.addEventListener("click", () => {
    const textArea = document.getElementById("calendar-dishes");
    const path = textArea?.dataset.path || "";
    if (!path) return;
    window.cebCsvTools.clearOverride(path);
    setFeedback(`Cleared calendar override for ${path}.`);
  });

  document.getElementById("cycle-save")?.addEventListener("click", () => {
    const input = document.getElementById("cycle-anchor-date");
    const value = String(input?.value || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      setFeedback("Enter a valid cycle start date.");
      return;
    }
    window.localStorage.setItem(SUBSCRIPTION_CYCLE_ANCHOR_KEY, value);
    setFeedback(`Saved cycle start date: ${value}.`);
  });

  document.getElementById("cycle-reset")?.addEventListener("click", () => {
    window.localStorage.removeItem(SUBSCRIPTION_CYCLE_ANCHOR_KEY);
    loadCycleAnchorSetting();
    setFeedback(`Cycle start date reset to default (${DEFAULT_SUBSCRIPTION_CYCLE_ANCHOR}).`);
  });

  document.getElementById("delivery-limit-save")?.addEventListener("click", () => {
    const input = document.getElementById("delivery-limit-km");
    const parsed = Number(input?.value || "");
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 50) {
      setFeedback("Enter a valid delivery distance limit between 1 and 50 km.");
      return;
    }
    window.localStorage.setItem(DELIVERY_LIMIT_KEY, String(parsed));
    setFeedback(`Saved delivery distance limit: ${parsed} km.`);
  });

  document.getElementById("delivery-limit-reset")?.addEventListener("click", () => {
    window.localStorage.removeItem(DELIVERY_LIMIT_KEY);
    loadDeliveryLimitSetting();
    setFeedback(`Delivery distance limit reset to default (${DEFAULT_DELIVERY_LIMIT_KM} km).`);
  });
})();
