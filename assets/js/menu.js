const WHATSAPP_NUMBER = "916282023762";
function normalizeKey(value) {
  return String(value || "").trim().toLowerCase();
}

function calendarUrlForPlan(row = {}) {
  const planKey = normalizeKey(row.Plan_Key || row.plan_key || "");
  const planName = normalizeKey(row.Plan_Name || row.plan_name || "");
  const meal = planName.includes("dinner") ? "dinner" : "lunch";
  const variant = normalizeKey(row.Variant_Key || row.variant_key || "veg") || "veg";
  const period = "weekly";
  return `calendar.html?plan=${encodeURIComponent(planKey)}&meal=${encodeURIComponent(meal)}&period=${encodeURIComponent(period)}&variant=${encodeURIComponent(variant)}`;
}

function publicPlanLabel(row = {}) {
  return String(row.Plan_Key || row.plan_key || row.Plan_Name || "Plan").trim();
}

function normalizePrice(price) {
  const value = String(price || "").trim();
  if (!value) return "TBD";
  return /^[₹$]/.test(value) ? value : `₹${value}`;
}

function resolveImageUrl(value) {
  const raw = String(value || "")
    .replace(/[\r\n\t]+/g, "")
    .replace(/\s*\/\s*/g, "/")
    .trim();
  if (!raw) return "cherish-logo.jpg";
  if (/^(https?:)?\/\//i.test(raw)) return raw;
  if (raw.startsWith("assets/")) return raw;
  if (/\.(png|jpe?g|webp|gif|avif|svg)$/i.test(raw) && !raw.includes("/")) {
    if (/shop photo/i.test(raw)) return `assets/hero/${raw}`;
    return `assets/dishes/${raw}`;
  }
  return raw.replace(/^\.\//, "");
}

function moneyLabel(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return /^[₹$]/.test(text) ? text : `₹${text}`;
}

function getPlanPriceLines(row = {}) {
  const weekly = moneyLabel(row["Price for weekly subscription"] || row.Weekly_Price || row.weekly_price);
  const monthly = moneyLabel(row["Price for monthly subscription"] || row.Monthly_Price || row.monthly_price || row.Price || row.price);
  return { weekly, monthly };
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
      calories: row.Calories || row.calories || "",
      protein: row.Protein || row.protein || "",
      carbohydrates: row.Carbohydrates || row.carbohydrates || row.Carbs || row.carbs || "",
      fats: row.Fats || row.fats || "",
      fiber: row.Fiber || row.fiber || "",
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
    menuGrid.innerHTML = `<article class="menu-section"><h3 class="menu-title">Menu updating soon</h3><p class="muted">Upload catalog.csv with live dish rows to show the latest menu.</p></article>`;
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
          <div class="nutrition-row">${[
            item.calories ? `<span class="nutrition-pill">🔥 ${escapeHtml(item.calories)} kcal</span>` : `<span class="nutrition-pill">🔥 N/A</span>`,
            item.protein ? `<span class="nutrition-pill">P ${escapeHtml(item.protein)}g</span>` : `<span class="nutrition-pill">P N/A</span>`,
            item.carbohydrates ? `<span class="nutrition-pill">C ${escapeHtml(item.carbohydrates)}g</span>` : `<span class="nutrition-pill">C N/A</span>`,
            item.fats ? `<span class="nutrition-pill">F ${escapeHtml(item.fats)}g</span>` : `<span class="nutrition-pill">F N/A</span>`,
            item.fiber ? `<span class="nutrition-pill">Fi ${escapeHtml(item.fiber)}g</span>` : `<span class="nutrition-pill">Fi N/A</span>`
          ].join("")}</div>
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

  wrap.innerHTML = deduped.map(row => {
    const { weekly, monthly } = getPlanPriceLines(row);
    const planLabel = publicPlanLabel(row);
    const calendarUrl = calendarUrlForPlan(row);
    return `
    <article class="plan-card">
      <h3>${escapeHtml(planLabel)}</h3>
      <p class="muted">${escapeHtml(row.Description || "")}</p>
      <p class="muted">Duration: ${escapeHtml(row.Duration_Days)} days • Meals/day: ${escapeHtml(row.Meals_Per_Day)}</p>
      <p class="legend" style="font-weight:700;color:#14532d;margin-bottom:6px;">Weekly: ${escapeHtml(weekly || "--")}</p>
      <p class="legend" style="font-weight:700;color:#14532d;margin-top:0;">Monthly: ${escapeHtml(monthly || "--")}</p>
      <a class="btn btn-soft" href="${escapeHtml(calendarUrl)}">View Plan</a>
    </article>
  `;
  }).join("");
}

function normalizeSlides(rows) {
  const cleanImagePath = value => {
    const raw = String(value || "")
      .replace(/[\r\n\t]+/g, "")
      .replace(/\s*\/\s*/g, "/")
      .trim();
    if (!raw) return "";
    if (/^(https?:)?\/\//i.test(raw)) return raw;
    if (raw.startsWith("assets/")) return raw;
    if (/\.(png|jpe?g|webp|gif|avif|svg)$/i.test(raw)) return `assets/hero/${raw.replace(/^\/+/, "")}`;
    return raw;
  };
  return rows
    .filter(row => String(row.status || row.Status || "live").trim().toLowerCase() === "live")
    .map(row => ({
      id: row.slide_id || row.Slide_ID || "",
      title: row.title || row.Title || "Featured Dish",
      subtitle: row.subtitle || row.Subtitle || "",
      imageUrl: cleanImagePath(row.image_url || row.Image_URL || ""),
      ctaLabel: row.cta_label || row.CTA_Label || "",
      ctaHref: row.cta_href || row.CTA_Href || "",
      altText: row.alt_text || row.Alt_Text || row.title || "Featured dish",
      sortOrder: Number(row.sort_order || row.Sort_Order || 999)
    }))
    .filter(slide => slide.imageUrl)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function renderHeroSlideshow(rows, catalogRows = []) {
  const wrap = document.getElementById("hero-slideshow");
  if (!wrap) return;

  const catalogSlides = catalogRows
    .filter(row => String(row.record_type || row.Record_Type || "dish").toLowerCase() === "dish")
    .filter(row => String(row.status || row.Status || "live").trim().toLowerCase() === "live")
    .map((row, idx) => ({
      id: row.id || row.ID || `dish-${idx + 1}`,
      title: row.name || row.Name || "Featured Dish",
      subtitle: row.category || row.Category || "Chef Special",
      imageUrl: resolveImageUrl(row.image_url || row.Image_URL || row.thumbnail_url || row.Thumbnail_URL || row.thumbnail || row.Thumbnail || row.image || row.Image || row.url || row.URL || ""),
      altText: row.name || row.Name || "Featured dish"
    }))
    .filter(slide => slide.imageUrl);
  const slides = catalogSlides.length ? catalogSlides : normalizeSlides(rows);
  const imageSlides = slides.length ? slides : [{ imageUrl: "cherish-logo.jpg", altText: "Cherish Every Bite featured dish", title: "Featured Dish", subtitle: "" }];
  wrap.innerHTML = "";
  const shell = document.createElement("div");
  shell.className = "hero-experiment";
  const viewport = document.createElement("div");
  viewport.className = "hero-experiment-viewport";
  const track = document.createElement("div");
  track.className = "hero-experiment-track";
  const prev = document.createElement("button");
  prev.className = "hero-exp-nav prev";
  prev.type = "button";
  prev.textContent = "‹";
  const next = document.createElement("button");
  next.className = "hero-exp-nav next";
  next.type = "button";
  next.textContent = "›";

  imageSlides.forEach((slide, index) => {
    const item = document.createElement("article");
    item.className = `hero-exp-card${index === 0 ? " is-active" : ""}`;
    item.innerHTML = `
      <img src="${escapeHtml(slide.imageUrl)}" alt="${escapeHtml(slide.altText || "Featured dish")}" loading="${index < 2 ? "eager" : "lazy"}" />
      <div class="hero-exp-overlay">
        <h3>${escapeHtml(slide.title || "Featured Dish")}</h3>
        ${slide.subtitle ? `<p>${escapeHtml(slide.subtitle)}</p>` : ""}
      </div>
    `;
    track.appendChild(item);
  });

  viewport.appendChild(track);
  shell.appendChild(prev);
  shell.appendChild(viewport);
  shell.appendChild(next);
  wrap.appendChild(shell);

  const slideEls = Array.from(track.querySelectorAll(".hero-exp-card"));
  let active = 0;
  let timer = null;
  function activate(next) {
    active = (next + slideEls.length) % slideEls.length;
    slideEls.forEach((el, i) => {
      const offset = i - active;
      el.style.setProperty("--offset", String(offset));
      const distance = Math.min(Math.abs(offset), 2);
      const scale = 1 - distance * 0.14;
      const opacity = 1 - distance * 0.35;
      el.style.opacity = String(Math.max(0.15, opacity));
      el.style.transform = `translate(-50%,-50%) translateX(${offset * 52}%) scale(${scale}) rotateY(${offset * -14}deg)`;
      el.classList.toggle("is-active", i === active);
    });
  }
  function start() {
    if (slideEls.length < 2) return;
    timer = window.setInterval(() => activate(active + 1), 4200);
  }
  function stop() {
    if (timer) window.clearInterval(timer);
    timer = null;
  }
  prev.addEventListener("click", () => activate(active - 1));
  next.addEventListener("click", () => activate(active + 1));
  shell.addEventListener("mouseenter", stop);
  shell.addEventListener("mouseleave", start);
  activate(0);
  start();
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
    const [catalogRows, planRows, heroRows] = await Promise.all([
      fetchCSV("catalog.csv").catch(() => []),
      fetchCSV("plans.csv").catch(() => []),
Promise.resolve([])
    ]);

    let catalogDishes = catalogRows
      .filter(row => {
        const type = String(row.record_type || row.Record_Type || "").toLowerCase();
        if (!type) return true;
        return type === "dish";
      })
      .map((row, idx) => ({
        Dish_ID: row.id || row.ID || row.dish_id || row.Dish_ID || `CAT-${idx + 1}`,
        Dish_Name: row.name || row.Name || row.dish_name || row.Dish_Name || "",
        Category: row.category || row.Category || "",
        Meal_Type: row.meal_type || row.Meal_Type || "",
        Image_URL: row.image_url || row.Image_URL || row.thumbnail_url || row.Thumbnail_URL || row.thumbnail || row.Thumbnail || row.image || row.Image || row.url || row.URL || row.source || row.Source || "",
        Price: row.price || row.Price || row.unit_price || row.Unit_Price || "",
        Status: row.status || row.Status || "live",
        Calories: row.Calories || row.calories || row.kcal || "",
        Protein: row.Protein || row.protein || row.protein_g || "",
        Carbohydrates: row.Carbohydrates || row.carbohydrates || row.Carbs || row.carbs || "",
        Fats: row.Fats || row.fats || "",
        Fiber: row.Fiber || row.fiber || ""
      }))
      .filter(row => row.Dish_Name);
    if (!catalogDishes.length) {
      const nutritionRows = await fetchCSV("allplans_nutrition.csv").catch(() => []);
      const fallbackItems = nutritionRows.flatMap(row => ["Data.Column3","Data.Column4","Data.Column5","Data.Column6","Data.Column7"].map(k => String(row[k] || "").trim()).filter(Boolean));
      catalogDishes = Array.from(new Set(fallbackItems)).map((name, idx) => ({
        Dish_ID: `NUT-${idx + 1}`, Dish_Name: name, Category: "Plan Menu", Meal_Type: "", Image_URL: "cherish-logo.jpg", Price: "TBD", Status: "live"
      }));
    }
    renderMenu(groupMenu(catalogDishes));
    renderPlans(planRows);
    renderHeroSlideshow(heroRows, catalogRows);
  } catch (error) {
    renderMenu([]);
  }

  attachDietChartForm();
})();
