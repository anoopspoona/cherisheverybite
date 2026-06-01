const MENU_PATH = "menu.csv";
const PRICE_PATH = "prices.csv";
const CATALOG_PATH = "catalog.csv";
const DELIVERY_ZONES_PATH = "delivery_zones.csv";
const SUBSCRIPTION_CYCLE_ANCHOR_KEY = "ceb_subscription_cycle_anchor_v1";
const DEFAULT_SUBSCRIPTION_CYCLE_ANCHOR = "2026-05-01";
const DELIVERY_LIMIT_KEY = "ceb_delivery_limit_km_v1";
const DEFAULT_DELIVERY_LIMIT_KM = 7;
const runtime = window.cebRuntime || {};
let preservedCatalogNonDishRows = [];
let catalogDishSourceById = new Map();
let hasCatalogSchema = false;
let menuStatusFilter = "all";
let zoneMap = null;
let zonePolygon = null;
let zoneRows = [];
let drawingMode = false;
let zoneMapClickListener = null;

function parsePolygonGeoJson(value) {
  try {
    const parsed = JSON.parse(String(value || "").trim());
    const points = parsed?.coordinates?.[0] || [];
    return Array.isArray(points) ? points.map(([lng, lat]) => ({ lat: Number(lat), lng: Number(lng) })).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng)) : [];
  } catch {
    return [];
  }
}

function toPolygonGeoJson(path) {
  const points = (path || []).map(p => [Number(p.lng), Number(p.lat)]);
  if (points.length && (points[0][0] !== points[points.length - 1][0] || points[0][1] !== points[points.length - 1][1])) points.push(points[0]);
  return JSON.stringify({ type: "Polygon", coordinates: [points] });
}

function renderZoneOptions() {
  const select = document.getElementById("zone-select");
  if (!select) return;
  select.innerHTML = zoneRows.map((z, i) => `<option value="${i}">${escapeHtml(z.zone_id || `ZONE_${i + 1}`)} - ${escapeHtml(z.zone_name || "Unnamed")}</option>`).join("");
}

function renderSelectedZone() {
  if (!zoneMap) return;
  const idx = Number(document.getElementById("zone-select")?.value || 0);
  const row = zoneRows[idx];
  if (!row) return;
  const name = document.getElementById("zone-name");
  const status = document.getElementById("zone-status");
  const geo = document.getElementById("zone-geojson");
  if (name) name.value = row.zone_name || "";
  if (status) status.value = row.status || "live";
  if (geo) geo.value = row.polygon_geojson || "";

  if (zonePolygon) zonePolygon.setMap(null);
  const path = parsePolygonGeoJson(row.polygon_geojson);
  zonePolygon = new google.maps.Polygon({
    paths: path,
    editable: true,
    draggable: false,
    strokeColor: "#1f6d47",
    fillColor: "#1f6d47",
    fillOpacity: 0.2,
    map: zoneMap
  });
  const polyPath = zonePolygon.getPath();
  const sync = () => {
    const points = [];
    for (let i = 0; i < polyPath.getLength(); i++) {
      const p = polyPath.getAt(i);
      points.push({ lat: p.lat(), lng: p.lng() });
    }
    const text = toPolygonGeoJson(points);
    if (geo) geo.value = text;
    row.polygon_geojson = text;
  };
  google.maps.event.addListener(polyPath, "set_at", sync);
  google.maps.event.addListener(polyPath, "insert_at", sync);
  google.maps.event.addListener(polyPath, "remove_at", sync);
}

async function initZoneManager() {
  if (!window.google?.maps) return;
  const rows = await fetchCSV(DELIVERY_ZONES_PATH).catch(() => []);
  zoneRows = rows.map((r, idx) => ({
    zone_id: r.zone_id || `ZONE_${idx + 1}`,
    zone_name: r.zone_name || "",
    status: r.status || "live",
    priority: r.priority || String(idx + 1),
    min_order: r.min_order || "0",
    delivery_fee: r.delivery_fee || "0",
    eta_min: r.eta_min || "",
    eta_max: r.eta_max || "",
    polygon_geojson: r.polygon_geojson || "",
    notes: r.notes || ""
  }));
  zoneMap = new google.maps.Map(document.getElementById("zone-map"), {
    center: { lat: 8.575357388981113, lng: 76.91238872393365 },
    zoom: 12,
    mapTypeControl: false
  });
  renderZoneOptions();
  renderSelectedZone();
}

function setFeedback(message) {
  const el = document.getElementById("admin-feedback");
  if (el) el.textContent = message;
}

function normalizeStatus(value) {
  const status = String(value || "live").trim().toLowerCase();
  return status === "hidden" ? "hidden" : "live";
}

function normalizeMenuRow(row = {}) {
  return {
    Dish_ID: row.Dish_ID || row.dish_id || "",
    Dish_Name: row.Dish_Name || row.Name || row.name || "",
    Category: row.Category || row.category || "Menu",
    Meal_Type: row.Meal_Type || row.meal_type || "",
    Image_URL: row.Image_URL || row.image_url || "",
    Price: row.Price || row.price || "",
    Status: normalizeStatus(row.Status || row.status)
  };
}

function renderMenuTable(rows) {
  const wrap = document.getElementById("menu-table-wrap");
  if (!wrap) return;
  const head = ["Dish_ID", "Dish_Name", "Category", "Meal_Type", "Image_URL", "Price", "Status", "Actions"];
  const visibleRows = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => menuStatusFilter === "all" || normalizeStatus(row.Status) === menuStatusFilter);
  const body = visibleRows.map(({ row, index }) => `
    <tr data-index="${index}">
      <td><input data-field="Dish_ID" value="${escapeHtml(row.Dish_ID)}"></td>
      <td><input data-field="Dish_Name" value="${escapeHtml(row.Dish_Name)}"></td>
      <td><input data-field="Category" value="${escapeHtml(row.Category)}"></td>
      <td><input data-field="Meal_Type" value="${escapeHtml(row.Meal_Type)}"></td>
      <td><input data-field="Image_URL" value="${escapeHtml(row.Image_URL)}"></td>
      <td><input data-field="Price" value="${escapeHtml(row.Price)}"></td>
      <td>
        <span class="status-badge status-${escapeHtml(normalizeStatus(row.Status))}">${escapeHtml(normalizeStatus(row.Status))}</span>
        <select data-field="Status">
          <option value="live" ${normalizeStatus(row.Status) === "live" ? "selected" : ""}>live</option>
          <option value="hidden" ${normalizeStatus(row.Status) === "hidden" ? "selected" : ""}>hidden</option>
        </select>
      </td>
      <td>
        <button class="btn btn-soft" type="button" data-action="toggle-status" data-index="${index}">${normalizeStatus(row.Status) === "live" ? "Hide" : "Make Live"}</button>
        <button class="btn delete-row" type="button" data-action="delete-row" data-index="${index}">Delete</button>
      </td>
    </tr>
  `).join("");
  wrap.innerHTML = `
    <table>
      <thead><tr>${head.map(label => `<th>${label}</th>`).join("")}</tr></thead>
      <tbody>${body || `<tr><td colspan="${head.length}">No dishes match this status filter.</td></tr>`}</tbody>
    </table>
  `;
}

function readRowsFromTable(baseRows = []) {
  const nextRows = Array.isArray(baseRows) ? baseRows.map(row => normalizeMenuRow(row)) : [];
  const rows = Array.from(document.querySelectorAll("#menu-table-wrap tbody tr[data-index]"));
  rows.forEach(tr => {
    const index = Number(tr.dataset.index || -1);
    if (index < 0) return;
    const get = name => {
      const el = tr.querySelector(`[data-field="${name}"]`);
      return el && "value" in el ? String(el.value).trim() : "";
    };
    nextRows[index] = normalizeMenuRow({
      Dish_ID: get("Dish_ID"),
      Dish_Name: get("Dish_Name"),
      Category: get("Category"),
      Meal_Type: get("Meal_Type"),
      Image_URL: get("Image_URL"),
      Price: get("Price"),
      Status: get("Status")
    });
  });
  return nextRows.filter(row => row.Dish_ID && row.Dish_Name);
}

function validateMenuRows(rows) {
  const errors = [];
  const warnings = [];
  const seen = new Set();
  rows.forEach((row, index) => {
    const label = row.Dish_ID || row.Dish_Name || `row ${index + 1}`;
    if (!row.Dish_ID) errors.push(`${label}: Dish_ID is required.`);
    if (!row.Dish_Name) errors.push(`${label}: Dish_Name is required.`);
    if (!['live', 'hidden'].includes(normalizeStatus(row.Status))) errors.push(`${label}: Status must be live or hidden.`);
    if (seen.has(row.Dish_ID)) errors.push(`${label}: duplicate Dish_ID.`);
    seen.add(row.Dish_ID);
  });
  const liveRows = rows.filter(row => normalizeStatus(row.Status) === "live");
  if (!liveRows.length && rows.length) warnings.push("All catalog dishes are hidden; public menu and pre-order may appear empty.");
  const categories = new Map();
  rows.forEach(row => {
    const category = row.Category || "Menu";
    const stats = categories.get(category) || { total: 0, live: 0 };
    stats.total += 1;
    if (normalizeStatus(row.Status) === "live") stats.live += 1;
    categories.set(category, stats);
  });
  categories.forEach((stats, category) => {
    if (stats.total && !stats.live) warnings.push(`Category "${category}" has no live dishes.`);
  });
  return { errors, warnings };
}

async function saveMenuOverrides(rows) {
  const menuRows = rows.map(({ Dish_ID, Dish_Name, Category, Meal_Type, Image_URL }) => ({
    Dish_ID, Dish_Name, Category, Meal_Type, Image_URL
  }));
  const priceRows = rows.map(({ Dish_ID, Price, Status }) => ({
    Dish_ID, Price, Status
  }));
  const catalogDishRows = rows.map(({ Dish_ID, Dish_Name, Category, Meal_Type, Image_URL, Price, Status }) => {
    const existing = catalogDishSourceById.get(Dish_ID) || {};
    const normalizedStatus = normalizeStatus(Status);
    return {
      ...existing,
      id: Dish_ID,
      name: Dish_Name,
      category: Category,
      meal_type: Meal_Type,
      image_url: Image_URL,
      price: Price,
      status: normalizedStatus,
      record_type: "dish",
      ID: Dish_ID,
      Name: Dish_Name,
      Category,
      Meal_Type,
      Image_URL,
      Price,
      Status: normalizedStatus,
      Record_Type: "dish"
    };
  });
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
  catalogDishSourceById = new Map(normalizedCatalogRows
    .filter(row => String(row.Record_Type || row.record_type || "").toLowerCase() === "dish")
    .map(row => [row.ID || row.id || row.Dish_ID || row.dish_id || "", row])
    .filter(([id]) => id));
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
  await initZoneManager();
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
    stateRows = readRowsFromTable(stateRows);
    stateRows.push(normalizeMenuRow({ Dish_ID: `dish_${Date.now()}`, Status: "live" }));
    renderMenuTable(stateRows);
  });

  document.querySelectorAll("[data-menu-status-filter]").forEach(button => {
    button.addEventListener("click", () => {
      stateRows = readRowsFromTable(stateRows);
      menuStatusFilter = button.getAttribute("data-menu-status-filter") || "all";
      document.querySelectorAll("[data-menu-status-filter]").forEach(el => el.classList.toggle("is-active", el === button));
      renderMenuTable(stateRows);
    });
  });

  document.getElementById("menu-table-wrap")?.addEventListener("change", event => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const row = target?.closest("tr[data-index]");
    if (!row) return;
    stateRows = readRowsFromTable(stateRows);
    renderMenuTable(stateRows);
  });

  document.getElementById("menu-table-wrap")?.addEventListener("click", event => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const actionEl = target?.closest("[data-action]");
    const action = actionEl?.getAttribute("data-action");
    const index = Number(actionEl?.getAttribute("data-index") || -1);
    if (!action || index < 0) return;
    stateRows = readRowsFromTable(stateRows);
    if (action === "delete-row") {
      stateRows.splice(index, 1);
    }
    if (action === "toggle-status" && stateRows[index]) {
      stateRows[index].Status = normalizeStatus(stateRows[index].Status) === "live" ? "hidden" : "live";
    }
    renderMenuTable(stateRows);
  });

  document.getElementById("menu-save")?.addEventListener("click", async () => {
    stateRows = readRowsFromTable(stateRows);
    const validation = validateMenuRows(stateRows);
    if (validation.errors.length) {
      setFeedback(`Could not save menu: ${validation.errors.join(" ")}`);
      return;
    }
    const result = await saveMenuOverrides(stateRows);
    if (!result?.ok) {
      setFeedback(result?.message || "Could not save menu.");
      return;
    }
    renderMenuTable(stateRows);
    const warningText = validation.warnings.length ? ` Warnings: ${validation.warnings.join(" ")}` : "";
    setFeedback(`Catalog visibility saved. Hidden dishes are removed from public menu and pre-order.${warningText}`);
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

  document.getElementById("zone-select")?.addEventListener("change", renderSelectedZone);
  document.getElementById("zone-name")?.addEventListener("input", event => {
    const idx = Number(document.getElementById("zone-select")?.value || 0);
    if (!zoneRows[idx]) return;
    zoneRows[idx].zone_name = event.target.value;
    renderZoneOptions();
    document.getElementById("zone-select").value = String(idx);
  });
  document.getElementById("zone-status")?.addEventListener("change", event => {
    const idx = Number(document.getElementById("zone-select")?.value || 0);
    if (zoneRows[idx]) zoneRows[idx].status = event.target.value;
  });
  document.getElementById("zone-geojson")?.addEventListener("change", event => {
    const idx = Number(document.getElementById("zone-select")?.value || 0);
    if (!zoneRows[idx]) return;
    zoneRows[idx].polygon_geojson = String(event.target.value || "");
    renderSelectedZone();
  });
  document.getElementById("zone-add")?.addEventListener("click", () => {
    const next = {
      zone_id: `ZONE_${Date.now()}`,
      zone_name: "New Zone",
      status: "live",
      priority: String(zoneRows.length + 1),
      min_order: "0",
      delivery_fee: "0",
      eta_min: "",
      eta_max: "",
      polygon_geojson: "",
      notes: ""
    };
    zoneRows.push(next);
    renderZoneOptions();
    document.getElementById("zone-select").value = String(zoneRows.length - 1);
    renderSelectedZone();
  });
  document.getElementById("zone-clear")?.addEventListener("click", () => {
    const idx = Number(document.getElementById("zone-select")?.value || 0);
    if (!zoneRows[idx]) return;
    zoneRows[idx].polygon_geojson = "";
    renderSelectedZone();
  });
  document.getElementById("zone-draw")?.addEventListener("click", () => {
    if (!zoneMap) return;
    drawingMode = !drawingMode;
    if (zonePolygon) zonePolygon.setMap(null);
    zonePolygon = new google.maps.Polygon({
      paths: [],
      editable: true,
      map: zoneMap,
      strokeColor: "#1f6d47",
      fillColor: "#1f6d47",
      fillOpacity: 0.2
    });
    if (zoneMapClickListener) google.maps.event.removeListener(zoneMapClickListener);
    zoneMapClickListener = zoneMap.addListener("click", event => {
      if (!drawingMode) return;
      zonePolygon.getPath().push(event.latLng);
      const points = [];
      const path = zonePolygon.getPath();
      for (let i = 0; i < path.getLength(); i++) points.push({ lat: path.getAt(i).lat(), lng: path.getAt(i).lng() });
      const idx = Number(document.getElementById("zone-select")?.value || 0);
      if (zoneRows[idx]) zoneRows[idx].polygon_geojson = toPolygonGeoJson(points);
      const geo = document.getElementById("zone-geojson");
      if (geo) geo.value = zoneRows[idx]?.polygon_geojson || "";
    });
    setFeedback(drawingMode ? "Draw mode enabled: click map points to shape polygon." : "Draw mode paused.");
  });
  document.getElementById("zone-save")?.addEventListener("click", () => {
    window.cebCsvTools.writeOverride(DELIVERY_ZONES_PATH, window.cebCsvTools.serializeCSV(zoneRows));
    setFeedback("Saved delivery_zones.csv override.");
  });
})();
