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
      tag: row.Tag || row.tag || ""
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
    menuGrid.innerHTML = `<article class="menu-section"><h3 class="menu-title">Menu updating soon</h3><p class="muted">Upload menu.csv and prices.csv to show the latest dishes.</p></article>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const group of groups) {
    const section = document.createElement("article");
    section.className = "menu-section";
    const rows = group.items.map((item, index) => `
      <li>
        <span>${index + 1}</span>
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
      <h3>${escapeHtml(row.Plan_Name)}</h3>
      <p class="muted">${escapeHtml(row.Description || "")}</p>
      <p class="muted">Duration: ${escapeHtml(row.Duration_Days)} days • Meals/day: ${escapeHtml(row.Meals_Per_Day)}</p>
      <a class="btn btn-soft" href="${escapeHtml(planUrl(row.Plan_Key))}">View ${escapeHtml(row.Plan_Name)}</a>
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
  const dotsWrap = document.getElementById("hero-dots");
  const prevBtn = document.getElementById("hero-prev");
  const nextBtn = document.getElementById("hero-next");
  if (!wrap || !dotsWrap || !prevBtn || !nextBtn) return;

  const slides = normalizeSlides(rows);
  if (!slides.length) return;

  wrap.querySelectorAll(".hero-slide").forEach(node => node.remove());
  dotsWrap.innerHTML = "";

  const slideEls = slides.map((slide, index) => {
    const card = document.createElement("article");
    card.className = `hero-slide${index === 0 ? " is-active" : ""}`;
    card.innerHTML = `
      <img src="${escapeHtml(slide.imageUrl)}" alt="${escapeHtml(slide.altText)}" loading="${index === 0 ? "eager" : "lazy"}" data-fallback="cherish-logo.jpg" />
      <div class="hero-slide-copy">
        <h3>${escapeHtml(slide.title)}</h3>
        ${slide.subtitle ? `<p>${escapeHtml(slide.subtitle)}</p>` : ""}
      </div>
    `;
    wrap.insertBefore(card, wrap.querySelector(".hero-controls"));
    const imageEl = card.querySelector("img");
    if (imageEl) {
      imageEl.addEventListener("error", () => {
        const fallback = imageEl.getAttribute("data-fallback") || "cherish-logo.jpg";
        if (imageEl.getAttribute("src") !== fallback) {
          imageEl.setAttribute("src", fallback);
        }
      });
    }
    return card;
  });

  let active = 0;
  let timer = null;

  function setActive(nextIndex) {
    active = (nextIndex + slideEls.length) % slideEls.length;
    slideEls.forEach((el, idx) => el.classList.toggle("is-active", idx === active));
    dotsWrap.querySelectorAll(".hero-dot").forEach((dot, idx) => {
      dot.classList.toggle("is-active", idx === active);
      dot.setAttribute("aria-current", idx === active ? "true" : "false");
    });
  }

  slides.forEach((slide, idx) => {
    const dot = document.createElement("button");
    dot.className = `hero-dot${idx === 0 ? " is-active" : ""}`;
    dot.type = "button";
    dot.setAttribute("aria-label", `Go to slide ${idx + 1}: ${slide.title}`);
    dot.addEventListener("click", () => setActive(idx));
    dotsWrap.appendChild(dot);
  });

  prevBtn.addEventListener("click", () => setActive(active - 1));
  nextBtn.addEventListener("click", () => setActive(active + 1));

  function start() {
    stop();
    timer = window.setInterval(() => setActive(active + 1), 5000);
  }
  function stop() {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  wrap.addEventListener("mouseenter", stop);
  wrap.addEventListener("mouseleave", start);
  wrap.addEventListener("focusin", stop);
  wrap.addEventListener("focusout", start);
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
    const [menuRows, priceRows, planRows, heroRows] = await Promise.all([
      fetchCSV("menu.csv"),
      fetchCSV("prices.csv").catch(() => []),
      fetchCSV("plans.csv").catch(() => []),
      fetchCSV("hero_slides.csv").catch(() => [])
    ]);

    const priceMap = new Map(priceRows.map(row => [row.Dish_ID || row.dish_id, row]));
    const mergedMenu = menuRows.map(row => {
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
