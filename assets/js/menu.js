const WHATSAPP_NUMBER = "916282023762";
const GOOGLE_SHEET_CSV_URL = "";
const MENU_CACHE_PREFIX = "ceb_menu_cache_v1";

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
  const noIndex = headers.indexOf("no");
  const categoryIndex = headers.indexOf("category");
  const nameIndex = headers.indexOf("name");
  const priceIndex = headers.indexOf("price");
  const statusIndex = headers.indexOf("status");
  const activeIndex = headers.indexOf("active");

  if (noIndex === -1 || categoryIndex === -1 || nameIndex === -1 || priceIndex === -1) {
    return [];
  }

  const grouped = new Map();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const no = Number(cols[noIndex] || "");
    const category = (cols[categoryIndex] || "").trim();
    const name = (cols[nameIndex] || "").trim();
    const price = (cols[priceIndex] || "").trim();
    const rawStatus = statusIndex !== -1 ? (cols[statusIndex] || "").trim().toLowerCase() : "";
    const rawActive = activeIndex !== -1 ? (cols[activeIndex] || "").trim().toLowerCase() : "";

    let status = rawStatus || "live";
    if (!rawStatus && activeIndex !== -1) {
      status = ["yes", "true", "1", "live"].includes(rawActive) ? "live" : "hidden";
    }

    if (!category || !name || Number.isNaN(no) || status !== "live") continue;

    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category).push({ no, name, price });
  }

  return Array.from(grouped.entries()).map(([category, items]) => ({
    category,
    items: items.sort((a, b) => a.no - b.no)
  }));
}

function renderMenu(menuData) {
  const menuGrid = document.getElementById("menu-grid");
  if (!menuGrid) return;

  if (!menuData.length) {
    menuGrid.innerHTML = `
      <article class="menu-section">
        <div class="menu-title-row"><h3 class="menu-title">Menu updating soon</h3></div>
        <p>Please upload a valid prices.csv with category, name, price and status columns.</p>
      </article>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const group of menuData) {
    const section = document.createElement("article");
    section.className = "menu-section";

    const rows = group.items.map(item => `
      <li>
        <span class="count">${item.no}</span>
        <span>${escapeHtml(item.name)}</span>
        <span class="price">${escapeHtml(item.price || "TBD")}</span>
      </li>
    `).join("");

    section.innerHTML = `
      <div class="menu-title-row">
        <h3 class="menu-title">${escapeHtml(group.category)}</h3>
        <span class="count">${group.items.length} items</span>
      </div>
      <ul class="item-list">${rows}</ul>
    `;
    fragment.appendChild(section);
  }

  menuGrid.replaceChildren(fragment);
}

function setMenuSourceLabel(text) {
  const sourceEl = document.getElementById("menu-source");
  if (sourceEl) sourceEl.textContent = text;
}

async function fetchCSVText(sourceUrl) {
  const cacheKey = `${MENU_CACHE_PREFIX}:${sourceUrl}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed?.text) return parsed.text;
    } catch (error) {
      sessionStorage.removeItem(cacheKey);
    }
  }

  const response = await fetch(sourceUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`${sourceUrl} not found`);
  const text = await response.text();
  sessionStorage.setItem(cacheKey, JSON.stringify({ text, at: Date.now() }));
  return text;
}

async function loadMenuData() {
  const sources = [];
  if (GOOGLE_SHEET_CSV_URL.trim()) {
    sources.push({ url: GOOGLE_SHEET_CSV_URL.trim(), label: "Menu source: Google Sheets" });
  }
  sources.push({ url: "prices.csv", label: "Menu source: Local prices.csv (fallback)" });

  for (const source of sources) {
    try {
      const text = await fetchCSVText(source.url);
      const parsed = parseCSV(text);
      if (parsed.length) {
        setMenuSourceLabel(source.label);
        return parsed;
      }
    } catch (error) {
      // continue to next source
    }
  }

  setMenuSourceLabel("Menu source: unavailable");
  return [];
}

function attachDietChartForm() {
  const form = document.getElementById("diet-form");
  const feedback = document.getElementById("diet-form-feedback");
  if (!form) return;

  form.addEventListener("submit", event => {
    event.preventDefault();
    const name = document.getElementById("diet-name")?.value.trim() || "";
    const phone = document.getElementById("diet-phone")?.value.trim() || "";
    const email = document.getElementById("diet-email")?.value.trim() || "";

    const phoneOk = /^\+?[0-9\-\s]{8,15}$/.test(phone);
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!name || !phoneOk || !emailOk) {
      if (feedback) feedback.textContent = "Please enter a valid name, WhatsApp number, and email.";
      return;
    }

    const message = [
      "Hi Cherish Every Bite, I would like my free personalized diet chart.",
      `Name: ${name}`,
      `WhatsApp: ${phone}`,
      `Email: ${email}`
    ].join("\n");

    if (feedback) feedback.textContent = "Opening WhatsApp...";
    window.open(buildWhatsappLink(WHATSAPP_NUMBER, message), "_blank", "noopener");
  });
}

(async function init() {
  renderMenu(await loadMenuData());
  attachDietChartForm();
})();
