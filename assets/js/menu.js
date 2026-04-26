const WHATSAPP_NUMBER = "916282023762";
const PLAN_PAGE_BY_KEY = {
  elite: "elite-plan.html",
  salad: "salad-plan.html",
  weightloss: "weightloss-plan.html",
  basic: "basic-plan.html",
  customised: "customised-plan.html",
  smoothie: "smoothie-plan.html",
  diabetic: "diabetic-plan.html"
};

function planUrl(planKey) {
  const key = String(planKey || "").trim().toLowerCase();
  return PLAN_PAGE_BY_KEY[key] || `plan.html?plan=${encodeURIComponent(planKey || "")}`;
}

function normalizePrice(price) {
  const value = String(price || "").trim();
  return value || "TBD";
}

function resolveImageUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "cherish-logo.jpg";
  if (/^(https?:)?\/\//i.test(raw)) return raw;
  if (raw.startsWith("assets/")) return raw;
  if (/\.(png|jpe?g|webp|gif|avif|svg)$/i.test(raw) && !raw.includes("/")) {
    return `assets/dishes/${raw}`;
  }
  return raw.replace(/^\.\//, "");
}

function planPriceLabel(row = {}) {
  const candidates = [
    row.Price,
    row.price,
    row.Plan_Price,
    row.plan_price,
    row.Base_Price,
    row.base_price,
    row.Monthly_Price,
    row.monthly_price,
    row.Variant_Price,
    row.variant_price
  ];
  const first = candidates.find(value => String(value || "").trim());
  if (!first) return "Price on request";
  const text = String(first).trim();
  return /^[₹$]/.test(text) ? text : `₹${text}`;
}

function cleanPlanTitle(name = "") {
  const text = String(name || "").trim();
  if (!text) return "";
  return text
    .replace(/\s*[-–]\s*lunch\s*$/i, "")
    .replace(/\s+lunch\s*$/i, "")
    .trim();
}

function groupMenu(rows) {
  const liveRows = rows.filter(row => {
    const status = String(row.Status || row.status || "live").toLowerCase();
    return status === "live";
  });

  const grouped = new Map();
  for (const row of liveRows) {
    const category = (row.Category || row.category || "Menu").trim();
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category).push({
      id: row.Dish_ID || row.dish_id || "",
      name: row.Dish_Name || row.Name || row.name || "",
      mealType: row.Meal_Type || row.meal_type || "",
      price: normalizePrice(row.Price || row.price || ""),
      tag: row.Tag || row.tag || "",
      imageUrl: resolveImageUrl(row.Image_URL || row.image_url || row.Image || row.image || row.url || row.URL || row.thumbnail || row.Thumbnail)
    });
  }

  return Array.from(grouped.entries()).map(([category, items]) => ({
    category,
    items: items.sort((a, b) => a.name.localeCompare(b.name))
  }));
}

function renderMenu(groups) {
  const menuGrid = document.getElementById("menu-grid");
  if (!menuGrid) return;

  if (!groups.length) {
    menuGrid.innerHTML = `<article class="menu-section"><h3 class="menu-title">Menu updating soon</h3><p class="muted">Upload catalog.csv (or dishes.csv / menu.csv + prices.csv) to show the latest dishes.</p></article>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const group of groups) {
    const section = document.createElement("article");
    section.className = "menu-section";
    const rows = group.items.map((item, index) => `
      <li>
        <span>${index + 1}</span>
        <img class="dish-thumb" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" loading="lazy" onerror="this.src='cherish-logo.jpg'" />
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          ${item.mealType ? `<div class="muted">${escapeHtml(item.mealType)}</div>` : ""}
        </div>
        <span class="price">${escapeHtml(item.price)}</span>
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

function renderPlans(rows) {
  const wrap = document.getElementById("plan-grid");
  if (!wrap) return;
  const deduped = [];
  const seen = new Set();
  for (const row of rows) {
    if (String(row.Status || "").toLowerCase() !== "live") continue;
    if (seen.has(row.Plan_Key)) continue;
    seen.add(row.Plan_Key);
    deduped.push(row);
  }

  wrap.innerHTML = deduped.map(row => `
    <article class="plan-card">
      <h3>${escapeHtml(cleanPlanTitle(row.Plan_Name) || row.Plan_Name)}</h3>
      <p class="muted">${escapeHtml(row.Description || "")}</p>
      <p class="muted">Duration: ${escapeHtml(row.Duration_Days)} days • Meals/day: ${escapeHtml(row.Meals_Per_Day)}</p>
      <p class="legend" style="font-weight:700;color:#14532d">Starting at ${escapeHtml(planPriceLabel(row))}</p>
      <a class="btn btn-soft" href="${escapeHtml(planUrl(row.Plan_Key))}">View ${escapeHtml(cleanPlanTitle(row.Plan_Name) || row.Plan_Name)}</a>
    </article>
  `).join("");
}

function normalizeSlides(rows) {
  return rows
    .filter(row => String(row.status || row.Status || "live").toLowerCase() === "live")
    .map(row => ({
      id: row.slide_id || row.Slide_ID || "",
      title: row.title || row.Title || "Featured Dish",
      subtitle: row.subtitle || row.Subtitle || "",
      imageUrl: row.image_url || row.Image_URL || "",
      ctaLabel: row.cta_label || row.CTA_Label || "",
      ctaHref: row.cta_href || row.CTA_Href || "",
      altText: row.alt_text || row.Alt_Text || row.title || "Featured dish",
      sortOrder: Number(row.sort_order || row.Sort_Order || 999)
    }))
    .filter(slide => slide.imageUrl)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function renderHeroSlideshow(rows) {
  const wrap = document.getElementById("hero-slideshow");
  if (!wrap) return;

  const slides = normalizeSlides(rows);
  const imageSlides = slides.length ? slides : [{
    imageUrl: "cherish-logo.jpg",
    altText: "Cherish Every Bite featured dish"
  }];

  wrap.innerHTML = "";
  const track = document.createElement("div");
  track.className = "hero-strip-track";

  const loopItems = [...imageSlides, ...imageSlides];
  loopItems.forEach((slide, index) => {
    const image = document.createElement("img");
    image.className = "hero-strip-item";
    image.loading = index < 6 ? "eager" : "lazy";
    image.src = slide.imageUrl;
    image.alt = slide.altText || "Featured dish";
    image.setAttribute("data-fallback", "cherish-logo.jpg");
    image.addEventListener("error", () => {
      const fallback = image.getAttribute("data-fallback") || "cherish-logo.jpg";
      if (image.getAttribute("src") !== fallback) {
        image.setAttribute("src", fallback);
      }
    });
    track.appendChild(image);
  });

  wrap.appendChild(track);
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
  try {
    const [catalogRows, combinedMenuRows, menuRows, priceRows, planRows, heroRows] = await Promise.all([
      fetchCSV("catalog.csv").catch(() => []),
      fetchCSV("dishes.csv").catch(() => []),
      fetchCSV("menu.csv").catch(() => []),
      fetchCSV("prices.csv").catch(() => []),
      fetchCSV("plans.csv").catch(() => []),
      fetchCSV("hero_slides.csv").catch(() => [])
    ]);

    const catalogDishes = catalogRows
      .filter(row => {
        const type = String(row.record_type || row.Record_Type || "").toLowerCase();
        if (!type) return true;
        return type === "dish" || type === "addon";
      })
      .map(row => ({
        Dish_ID: row.id || row.ID || row.addon_id || row.Addon_ID || "",
        Dish_Name: row.name || row.Name || row.addon_name || row.Addon_Name || "",
        Category: row.category || row.Category || row.addon_type || row.Addon_Type || "",
        Meal_Type: row.meal_type || row.Meal_Type || row.addon_type || row.Addon_Type || "",
        Image_URL: row.image_url || row.Image_URL || row.addon_image_url || row.Addon_Image_URL || row.url || row.URL || row.thumbnail || row.Thumbnail || row.source || row.Source || "",
        Price: row.price || row.Price || row.unit_price || row.Unit_Price || "",
        Status: row.status || row.Status || "live"
      }))
      .filter(row => row.Dish_ID && row.Dish_Name);
    const priceMap = new Map(priceRows.map(priceRow => [priceRow.Dish_ID || priceRow.dish_id, priceRow]));
    const mergedMenu = catalogDishes.length
      ? catalogDishes
      : combinedMenuRows.length
      ? combinedMenuRows
      : menuRows.map(row => {
        const priceRow = priceMap.get(row.Dish_ID) || {};
        return {
          ...row,
          Price: priceRow.Price || priceRow.price || "TBD",
          Status: priceRow.Status || priceRow.status || "live"
        };
      });

    renderMenu(groupMenu(mergedMenu));
    renderPlans(planRows);
    renderHeroSlideshow(heroRows);
  } catch (error) {
    renderMenu([]);
  }

  attachDietChartForm();
})();
