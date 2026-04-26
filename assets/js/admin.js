const MENU_PATH = "menu.csv";
const PRICE_PATH = "prices.csv";
const DISHES_PATH = "dishes.csv";
const CATALOG_PATH = "catalog.csv";
const ADMIN_EMAILS_KEY = "ceb_admin_emails_v1";
const runtime = window.cebRuntime || {};

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

function readCustomAdminEmails() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ADMIN_EMAILS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map(email => String(email || "").toLowerCase()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeCustomAdminEmails(emails) {
  const rows = Array.from(new Set((emails || []).map(email => String(email || "").toLowerCase()).filter(Boolean))).sort();
  localStorage.setItem(ADMIN_EMAILS_KEY, JSON.stringify(rows));
}

function getAllowedAdminEmails() {
  const base = Array.isArray(runtime.adminEmails) ? runtime.adminEmails : [];
  const custom = readCustomAdminEmails();
  return Array.from(new Set([...base, ...custom])).sort();
}

function renderAdminUsers(isAllowed) {
  const wrap = document.getElementById("admin-users-list");
  if (!wrap) return;
  const allowed = getAllowedAdminEmails();
  if (!allowed.length) {
    wrap.innerHTML = `<p class="muted">No admin emails configured.</p>`;
    return;
  }

  wrap.innerHTML = `
    <table>
      <thead><tr><th>Email</th><th>Source</th><th>Actions</th></tr></thead>
      <tbody>
        ${allowed.map(email => {
          const fromRuntime = (runtime.adminEmails || []).includes(email);
          return `
            <tr>
              <td>${escapeHtml(email)}</td>
              <td>${fromRuntime ? "Runtime config" : "Local admin list"}</td>
              <td>
                <button class="btn delete-row remove-admin" type="button" data-email="${escapeHtml(email)}" ${(!isAllowed || fromRuntime) ? "disabled" : ""}>Remove</button>
              </td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
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
  const priceRows = rows.map(({ Dish_ID, Dish_Name, Category, Price, Status }) => ({
    Dish_ID, Dish_Name, Category, Price, Status
  }));
  const combinedRows = rows.map(({ Dish_ID, Dish_Name, Category, Meal_Type, Image_URL, Price, Status }) => ({
    Dish_ID, Dish_Name, Category, Meal_Type, Image_URL, Price, Status
  }));
  const existingCatalog = await fetchCSV(CATALOG_PATH).catch(() => []);
  let addonCatalog = existingCatalog.filter(row => String(row.record_type || row.Record_Type || "").toLowerCase() === "addon");
  if (!addonCatalog.length) {
    const legacyAddons = await fetchCSV("addons.csv").catch(() => []);
    addonCatalog = legacyAddons.map(row => ({
      record_type: "addon",
      id: row.Addon_ID || row.addon_id || "",
      name: row.Addon_Name || row.addon_name || "",
      category: row.Category || row.category || row.Addon_Type || row.addon_type || "",
      meal_type: "",
      image_url: "",
      price: row.Price || row.price || row.Unit_Price || row.unit_price || "",
      status: row.Status || row.status || "live",
      billing_mode: row.Billing_Mode || row.billing_mode || "",
      source: "addons.csv"
    })).filter(row => row.id && row.name);
  }
  const dishCatalog = combinedRows.map(row => ({
    record_type: "dish",
    id: row.Dish_ID,
    name: row.Dish_Name,
    category: row.Category,
    meal_type: row.Meal_Type,
    image_url: row.Image_URL,
    price: row.Price,
    status: row.Status,
    billing_mode: "",
    source: "menu_manager"
  }));

  if (runtime.requireBackendSync && !window.cebBackend?.apiBase) {
    return { ok: false, message: "Backend sync is required. Configure CEB_BACKEND_CONFIG first." };
  }

  window.cebCsvTools.writeOverride(CATALOG_PATH, window.cebCsvTools.serializeCSV([...dishCatalog, ...addonCatalog]));
  window.cebCsvTools.writeOverride(DISHES_PATH, window.cebCsvTools.serializeCSV(combinedRows));
  window.cebCsvTools.writeOverride(MENU_PATH, window.cebCsvTools.serializeCSV(menuRows));
  window.cebCsvTools.writeOverride(PRICE_PATH, window.cebCsvTools.serializeCSV(priceRows));

  if (window.cebBackend?.saveAdminMenu) {
    const result = await window.cebBackend.saveAdminMenu({
      menuRows: combinedRows,
      priceRows: []
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

async function enforceAdminAccess() {
  const requireProvider = String(runtime.adminAuthProvider || "google").toLowerCase();
  const allowedEmails = getAllowedAdminEmails();

  if (!window.cebAuth?.enabled) {
    setFeedback("Admin access requires Supabase auth + Google login.");
    return { allowed: false };
  }

  const user = await window.cebAuth.getCurrentUser();
  const currentEmail = String(user?.email || "").toLowerCase();
  const providers = user?.app_metadata?.providers || [];
  const identities = Array.isArray(user?.identities) ? user.identities.map(item => item?.provider).filter(Boolean) : [];
  const providerSet = new Set([...(Array.isArray(providers) ? providers : []), ...identities].map(p => String(p).toLowerCase()));

  const isAllowedEmail = Boolean(currentEmail && allowedEmails.includes(currentEmail));
  const isAllowedProvider = providerSet.has(requireProvider);

  if (isAllowedEmail && isAllowedProvider) {
    return { allowed: true, email: currentEmail };
  }

  const controls = document.querySelectorAll("button, textarea, input, select");
  controls.forEach(el => {
    if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
      el.disabled = true;
    }
  });
  setFeedback(`Admin access denied. Use Google login and an approved email (${allowedEmails.join(", ")}).`);
  return { allowed: false };
}

async function loadMenuRows() {
  const catalog = await fetchCSV(CATALOG_PATH).catch(() => []);
  const catalogDishes = catalog
    .filter(row => String(row.record_type || row.Record_Type || "").toLowerCase() === "dish")
    .map(row => normalizeMenuRow({
      Dish_ID: row.id || row.ID || "",
      Dish_Name: row.name || row.Name || "",
      Category: row.category || row.Category || "",
      Meal_Type: row.meal_type || row.Meal_Type || "",
      Image_URL: row.image_url || row.Image_URL || "",
      Price: row.price || row.Price || "",
      Status: row.status || row.Status || "live"
    }));
  if (catalogDishes.length) return catalogDishes;

  const combined = await fetchCSV(DISHES_PATH).catch(() => []);
  if (combined.length) return combined.map(normalizeMenuRow);

  const [menuRows, priceRows] = await Promise.all([
    fetchCSV(MENU_PATH).catch(() => []),
    fetchCSV(PRICE_PATH).catch(() => [])
  ]);
  const priceMap = new Map(priceRows.map(row => [row.Dish_ID || row.dish_id || "", row]));
  return menuRows.map(row => {
    const id = row.Dish_ID || row.dish_id || "";
    const price = priceMap.get(id) || {};
    return normalizeMenuRow({
      ...row,
      Price: price.Price || price.price || "",
      Status: price.Status || price.status || "live"
    });
  });
}

(async function initAdmin() {
  const access = await enforceAdminAccess();
  renderAdminUsers(access.allowed);

  let stateRows = await loadMenuRows();
  renderMenuTable(stateRows);
  await loadCalendarEditor();
  if (!access.allowed) return;

  document.getElementById("admin-user-form")?.addEventListener("submit", event => {
    event.preventDefault();
    const input = document.getElementById("admin-user-email");
    const email = String(input?.value || "").trim().toLowerCase();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setFeedback("Enter a valid admin email.");
      return;
    }
    const existing = readCustomAdminEmails();
    if (!existing.includes(email)) {
      existing.push(email);
      writeCustomAdminEmails(existing);
      renderAdminUsers(true);
      setFeedback(`Added ${email} to local admin users.`);
    }
    if (input) input.value = "";
  });

  document.getElementById("admin-users-list")?.addEventListener("click", event => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target || !target.classList.contains("remove-admin")) return;
    const email = String(target.dataset.email || "").toLowerCase();
    if (!email) return;
    const next = readCustomAdminEmails().filter(item => item !== email);
    writeCustomAdminEmails(next);
    renderAdminUsers(true);
    setFeedback(`Removed ${email} from local admin users.`);
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
    setFeedback("Menu overrides saved in consolidated dishes.csv format.");
  });

  document.getElementById("menu-reset")?.addEventListener("click", () => {
    window.cebCsvTools.clearOverride(CATALOG_PATH);
    window.cebCsvTools.clearOverride(DISHES_PATH);
    window.cebCsvTools.clearOverride(MENU_PATH);
    window.cebCsvTools.clearOverride(PRICE_PATH);
    setFeedback("Menu overrides cleared.");
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
})();
