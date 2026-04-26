const USERS_KEY = "ceb_users_v1";
const CURRENT_USER_KEY = "ceb_current_user_v1";
const ORDER_KEY = "ceb_saved_orders_v1";
const SUBSCRIPTION_KEY = "ceb_subscriptions_v1";
const ADDRESS_KEY = "ceb_saved_addresses_v1";
const PROFILE_KEY = "ceb_customer_profiles_v1";
const runtime = window.cebRuntime || {};

function readUsers() {
  try {
    const parsed = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

async function hashPassword(password) {
  const text = String(password || "");
  if (!text) return "";
  if (window.crypto?.subtle && window.TextEncoder) {
    const buffer = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buffer)).map(x => x.toString(16).padStart(2, "0")).join("");
  }
  return text;
}

function localCurrentUserEmail() {
  return localStorage.getItem(CURRENT_USER_KEY) || "";
}

function readJsonStorage(key, fallbackValue) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || JSON.stringify(fallbackValue));
    return parsed ?? fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function readScopedList(key, userId) {
  if (!userId) return [];
  const byUser = readJsonStorage(key, {});
  const rows = byUser[userId];
  return Array.isArray(rows) ? rows : [];
}

function writeScopedList(key, userId, list) {
  if (!userId) return;
  const byUser = readJsonStorage(key, {});
  byUser[userId] = Array.isArray(list) ? list : [];
  localStorage.setItem(key, JSON.stringify(byUser));
}

function getBackend() {
  return window.cebBackend && window.cebBackend.apiBase ? window.cebBackend : null;
}

async function syncUserStateFromBackend(userEmail) {
  const backend = getBackend();
  if (!backend || !userEmail) return;

  const [profileRes, addressesRes, subscriptionsRes] = await Promise.all([
    backend.fetchProfileByEmail?.(userEmail),
    backend.fetchAddressesByEmail?.(userEmail),
    backend.fetchSubscriptionsByEmail?.(userEmail)
  ]);

  if (profileRes?.ok && profileRes.data && typeof profileRes.data === "object") {
    const profiles = readJsonStorage(PROFILE_KEY, {});
    profiles[userEmail] = {
      name: profileRes.data.name || "",
      phone: profileRes.data.phone || ""
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
  }

  if (addressesRes?.ok) {
    writeScopedList(ADDRESS_KEY, userEmail, addressesRes.data || []);
  }

  if (subscriptionsRes?.ok) {
    writeScopedList(SUBSCRIPTION_KEY, userEmail, subscriptionsRes.data || []);
  }
}

async function getCurrentUserProfile() {
  const auth = window.cebAuth;
  if (auth?.enabled) {
    try {
      const user = await auth.getCurrentUser();
      const identifier = user?.email || user?.phone || "";
      if (!identifier) return null;
      return { email: identifier, name: user.user_metadata?.name || identifier };
    } catch {
      // fall through to local mode lookup
    }
  }

  const email = localCurrentUserEmail();
  if (!email) return null;
  const user = readUsers().find(entry => entry.email === email);
  return user ? { email: user.email, name: user.name || user.email } : null;
}

async function fetchOrdersForUser(email) {
  if (!email) return [];
  const backend = window.cebBackend;
  if (backend && typeof backend.fetchOrdersByEmail === "function") {
    const result = await backend.fetchOrdersByEmail(email);
    if (result.ok) return result.data || [];
  }

  try {
    const parsed = JSON.parse(localStorage.getItem(ORDER_KEY) || "[]");
    const orders = Array.isArray(parsed) ? parsed : [];
    return orders.filter(order => (order.userEmail || "") === email);
  } catch {
    return [];
  }
}

function renderOrders(orders) {
  const list = document.getElementById("orders-list");
  if (!list) return;
  if (!orders.length) {
    list.innerHTML = `<p class="muted">No saved orders yet.</p>`;
    return;
  }

  list.innerHTML = orders.map(order => {
    const addons = (order.addons || []).map(item => `${item.name} x${item.qty}`).join(", ");
    return `
      <article class="order-item">
        <strong>${escapeHtml(order.plan || "Plan")} • ${escapeHtml(order.meal || "Meal")}</strong>
        <div class="muted">${escapeHtml(order.start || "")} to ${escapeHtml(order.end || "")}</div>
        <div class="muted">Location: ${escapeHtml(order.locationId || "N/A")}</div>
        ${addons ? `<div class="muted">Add-ons: ${escapeHtml(addons)}</div>` : ""}
      </article>
    `;
  }).join("");
}

function inferSubscriptions(orders) {
  const active = new Map();
  orders.forEach(order => {
    const plan = String(order.plan || "").trim();
    const meal = String(order.meal || "").trim();
    const start = String(order.start || "").trim();
    const end = String(order.end || "").trim();
    if (!plan || !meal) return;
    const id = `${plan}::${meal}::${start}::${end}`;
    if (!active.has(id)) {
      active.set(id, {
        id,
        plan,
        meal,
        period: order.period || "",
        start,
        end
      });
    }
  });
  return Array.from(active.values());
}

function renderSubscriptions(profile, orders) {
  const list = document.getElementById("subscriptions-list");
  if (!list) return [];
  const inferred = inferSubscriptions(orders);
  const stored = readScopedList(SUBSCRIPTION_KEY, profile.email);
  const stateMap = new Map(stored.map(item => [item.id, item]));
  const merged = inferred.map(item => ({
    ...item,
    status: stateMap.get(item.id)?.status || "active",
    skippedCount: Number(stateMap.get(item.id)?.skippedCount || 0),
    meal: stateMap.get(item.id)?.meal || item.meal
  }));
  writeScopedList(SUBSCRIPTION_KEY, profile.email, merged);

  if (!merged.length) {
    list.innerHTML = `<p class="muted">No active subscriptions yet. Confirm one from calendar to manage it here.</p>`;
    return [];
  }

  list.innerHTML = merged.map(item => `
    <article class="order-item">
      <strong>${escapeHtml(item.plan)} • ${escapeHtml(item.meal)}</strong>
      <div class="muted">${escapeHtml(item.start || "—")} to ${escapeHtml(item.end || "—")}</div>
      <div class="muted">Status: ${escapeHtml(item.status)}${item.skippedCount ? ` • Skips: ${item.skippedCount}` : ""}</div>
      <label class="muted">Meal Slot
        <select class="meal-slot-select" data-subscription-id="${escapeHtml(item.id)}">
          <option value="lunch" ${item.meal === "lunch" ? "selected" : ""}>Lunch</option>
          <option value="dinner" ${item.meal === "dinner" ? "selected" : ""}>Dinner</option>
        </select>
      </label>
      <div class="action-row">
        <button class="btn btn-soft sub-action" type="button" data-subscription-id="${escapeHtml(item.id)}" data-action="pause">Pause</button>
        <button class="btn btn-soft sub-action" type="button" data-subscription-id="${escapeHtml(item.id)}" data-action="resume">Resume</button>
        <button class="btn btn-soft sub-action" type="button" data-subscription-id="${escapeHtml(item.id)}" data-action="skip">Skip Next Day</button>
        <button class="btn btn-soft sub-action" type="button" data-subscription-id="${escapeHtml(item.id)}" data-action="save_meal">Save Meal Slot</button>
      </div>
    </article>
  `).join("");
  return merged;
}

function renderUpcoming(subscriptions) {
  const list = document.getElementById("upcoming-list");
  if (!list) return;
  const today = new Date();
  const sorted = (subscriptions || [])
    .filter(item => item.status === "active")
    .map(item => {
      const end = item.end ? new Date(item.end) : null;
      return { ...item, end };
    })
    .filter(item => !item.end || item.end >= today)
    .sort((a, b) => {
      const aStart = a.start ? new Date(a.start).getTime() : Number.MAX_SAFE_INTEGER;
      const bStart = b.start ? new Date(b.start).getTime() : Number.MAX_SAFE_INTEGER;
      return aStart - bStart;
    })
    .slice(0, 6);

  if (!sorted.length) {
    list.innerHTML = `<p class="muted">No upcoming active subscriptions.</p>`;
    return;
  }

  list.innerHTML = sorted.map(item => `
    <article class="order-item">
      <strong>${escapeHtml(item.plan)} • ${escapeHtml(item.meal)}</strong>
      <div class="muted">Service window: ${escapeHtml(item.start || "—")} to ${escapeHtml(item.end || "—")}</div>
    </article>
  `).join("");
}

function renderAddresses(profile) {
  const list = document.getElementById("addresses-list");
  if (!list) return;
  const addresses = readScopedList(ADDRESS_KEY, profile.email);
  if (!addresses.length) {
    list.innerHTML = `<p class="muted">No saved addresses yet.</p>`;
    return;
  }
  list.innerHTML = addresses.map((item, index) => `
    <article class="order-item">
      <strong>${escapeHtml(item.label || `Address ${index + 1}`)}</strong>
      <div class="muted">${escapeHtml(item.mapLink || "No map link")}</div>
      <a class="btn btn-soft" href="calendar.html?map_app_link=${encodeURIComponent(item.mapLink || "")}" style="margin-top:8px">Use for next order</a>
      <div class="action-row">
        <button class="btn btn-soft address-action" type="button" data-action="default" data-index="${index}">${item.isDefault ? "Default" : "Set Default"}</button>
        <button class="btn btn-soft address-action" type="button" data-action="delete" data-index="${index}">Delete</button>
      </div>
    </article>
  `).join("");
}

function renderProfile(profile) {
  const nameInput = document.getElementById("profile-name");
  const phoneInput = document.getElementById("profile-phone");
  const profiles = readJsonStorage(PROFILE_KEY, {});
  const saved = profiles[profile.email] || {};
  if (nameInput) nameInput.value = saved.name || profile.name || "";
  if (phoneInput) phoneInput.value = saved.phone || "";
}

async function render() {
  const authCard = document.getElementById("auth-card");
  const profileCard = document.getElementById("profile-card");
  const summary = document.getElementById("user-summary");
  const authTitle = authCard?.querySelector("h2");
  const authEnabled = Boolean(window.cebAuth?.enabled);
  const googleSupported = Boolean(window.cebAuth?.enabled && window.cebAuth?.supportsGoogleOAuth);
  const googleLoginBtn = document.getElementById("google-login-btn");

  if (authTitle) {
    authTitle.textContent = authEnabled ? "Sign Up (Secure)" : "Sign Up (Local Demo)";
  }
  if (googleLoginBtn) {
    googleLoginBtn.style.display = googleSupported ? "inline-flex" : "none";
  }

  const profile = await getCurrentUserProfile();
  if (!profile) {
    if (authCard) authCard.style.display = "block";
    if (profileCard) profileCard.style.display = "none";
    return;
  }

  if (authCard) authCard.style.display = "none";
  if (profileCard) profileCard.style.display = "block";
  if (summary) summary.textContent = `${profile.name} • ${profile.email}`;
  await syncUserStateFromBackend(profile.email);
  const orders = await fetchOrdersForUser(profile.email);
  renderOrders(orders);
  const subscriptions = renderSubscriptions(profile, orders);
  renderUpcoming(subscriptions);
  renderAddresses(profile);
  renderProfile(profile);
}

(async function init() {
  const params = new URLSearchParams(window.location.search);
  const pickedLat = params.get("picked_lat");
  const pickedLon = params.get("picked_lon");
  const pickedLabel = params.get("picked_label") || "";
  const signupForm = document.getElementById("signup-form");
  const loginForm = document.getElementById("login-form");
  const feedback = document.getElementById("auth-feedback");
  const logoutBtn = document.getElementById("logout-btn");
  const googleLoginBtn = document.getElementById("google-login-btn");
  const subscriptionsList = document.getElementById("subscriptions-list");
  const addressForm = document.getElementById("address-form");
  const addressesList = document.getElementById("addresses-list");
  const profileForm = document.getElementById("profile-form");
  const addressLabelInput = document.getElementById("address-label");
  const addressLinkInput = document.getElementById("address-link");
  const pickAddressBtn = document.getElementById("pick-address-btn");

  function setAuthFeedback(message) {
    if (feedback) feedback.textContent = message;
  }

  function updatePickAddressLink() {
    if (!pickAddressBtn) return;
    const qp = new URLSearchParams({
      return_to: "account.html",
      picked_label: addressLabelInput?.value.trim() || "Pinned Location"
    });
    pickAddressBtn.href = `map-picker.html?${qp.toString()}`;
  }

  if (pickedLat && pickedLon) {
    if (addressLinkInput) addressLinkInput.value = `https://maps.google.com/?q=${pickedLat},${pickedLon}`;
    if (addressLabelInput && pickedLabel) addressLabelInput.value = pickedLabel;
    setAuthFeedback("Pinned location selected. Click 'Save Address' to keep it for future orders.");
  }
  updatePickAddressLink();
  if (addressLabelInput) {
    addressLabelInput.addEventListener("input", updatePickAddressLink);
  }

  if (signupForm) {
    signupForm.addEventListener("submit", async event => {
      event.preventDefault();
      const name = document.getElementById("signup-name")?.value.trim() || "";
      const email = (document.getElementById("signup-email")?.value || "").trim().toLowerCase();
      const password = document.getElementById("signup-password")?.value || "";
      if (!name || !email || !password) {
        setAuthFeedback("Please fill name, email, and password.");
        return;
      }

      try {
        if (window.cebAuth?.enabled) {
          const result = await window.cebAuth.signUp(email, password, { name });
          if (!result.ok) {
            setAuthFeedback(result.message || "Could not create account.");
            return;
          }
          setAuthFeedback("Account created. Check email if confirmation is required.");
        } else {
          if (runtime.enforceSecureAuth) {
            setAuthFeedback("Secure auth is required. Configure Supabase before creating accounts.");
            return;
          }
          const users = readUsers();
          if (users.some(user => user.email === email)) {
            setAuthFeedback("Account already exists. Please login.");
            return;
          }
          const passwordHash = await hashPassword(password);
          users.push({ name, email, passwordHash });
          writeUsers(users);
          localStorage.setItem(CURRENT_USER_KEY, email);
          setAuthFeedback("Local account created successfully.");
        }
      } catch (error) {
        setAuthFeedback(error instanceof Error ? error.message : "Could not create account.");
        return;
      }

      await render().catch(() => {
        setAuthFeedback("Account created, but profile view failed to load. Please refresh.");
      });
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async event => {
      event.preventDefault();
      const email = (document.getElementById("login-email")?.value || "").trim().toLowerCase();
      const password = document.getElementById("login-password")?.value || "";
      if (!email || !password) {
        setAuthFeedback("Please enter email and password.");
        return;
      }

      try {
        if (window.cebAuth?.enabled) {
          const result = await window.cebAuth.signIn(email, password);
          if (!result.ok) {
            setAuthFeedback(result.message || "Invalid login.");
            return;
          }
          setAuthFeedback("Logged in.");
        } else {
          if (runtime.enforceSecureAuth) {
            setAuthFeedback("Secure auth is required. Configure Supabase before login.");
            return;
          }
          const passwordHash = await hashPassword(password);
          const user = readUsers().find(entry =>
            entry.email === email && (entry.passwordHash === passwordHash || entry.password === password)
          );
          if (!user) {
            setAuthFeedback("Invalid email or password.");
            return;
          }
          localStorage.setItem(CURRENT_USER_KEY, email);
          setAuthFeedback("Logged in (local mode).");
        }
      } catch (error) {
        setAuthFeedback(error instanceof Error ? error.message : "Login failed.");
        return;
      }

      await render().catch(() => {
        setAuthFeedback("Login succeeded, but profile view failed to load. Please refresh.");
      });
    });
  }

  if (googleLoginBtn) {
    googleLoginBtn.addEventListener("click", async () => {
      if (!window.cebAuth?.enabled || !window.cebAuth?.supportsGoogleOAuth) {
        setAuthFeedback("Google login is available only when Supabase Auth is configured.");
        return;
      }
      const result = await window.cebAuth.signInWithGoogle();
      if (!result.ok) {
        setAuthFeedback(result.message || "Could not start Google login.");
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      if (window.cebAuth?.enabled) {
        await window.cebAuth.signOut();
      } else {
        localStorage.removeItem(CURRENT_USER_KEY);
      }
      await render();
    });
  }

  if (subscriptionsList) {
    subscriptionsList.addEventListener("click", async event => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const action = target?.dataset?.action;
      const id = target?.dataset?.subscriptionId;
      if (!action || !id) return;
      const profile = await getCurrentUserProfile();
      if (!profile) return;
      const stored = readScopedList(SUBSCRIPTION_KEY, profile.email);
      const next = stored.map(item => {
        if (item.id !== id) return item;
        if (action === "pause") return { ...item, status: "paused" };
        if (action === "resume") return { ...item, status: "active" };
        if (action === "skip") {
          return { ...item, status: "active", skippedCount: Number(item.skippedCount || 0) + 1 };
        }
        if (action === "save_meal") {
          const row = target.closest(".order-item");
          const select = row?.querySelector(".meal-slot-select");
          const meal = (select && "value" in select ? select.value : item.meal) || item.meal;
          return { ...item, meal };
        }
        return item;
      });
      writeScopedList(SUBSCRIPTION_KEY, profile.email, next);
      const backend = getBackend();
      if (backend?.saveSubscriptionsByEmail) {
        await backend.saveSubscriptionsByEmail(profile.email, next);
      }
      setAuthFeedback(action === "save_meal" ? "Meal slot updated." : `Subscription updated: ${action}.`);
      await render();
    });
  }

  if (addressForm) {
    addressForm.addEventListener("submit", async event => {
      event.preventDefault();
      const profile = await getCurrentUserProfile();
      if (!profile) return;
      const label = (document.getElementById("address-label")?.value || "").trim();
      const mapLink = (document.getElementById("address-link")?.value || "").trim();
      if (!label || !mapLink) {
        setAuthFeedback("Please provide both address label and map link.");
        return;
      }
      const existing = readScopedList(ADDRESS_KEY, profile.email);
      const already = existing.find(item => item.mapLink === mapLink);
      if (already) {
        setAuthFeedback("This map link is already saved.");
        return;
      }
      const next = [
        ...existing,
        { label, mapLink, isDefault: existing.length === 0 }
      ];
      writeScopedList(ADDRESS_KEY, profile.email, next);
      const backend = getBackend();
      if (backend?.saveAddressesByEmail) {
        await backend.saveAddressesByEmail(profile.email, next);
      }
      addressForm.reset();
      setAuthFeedback("Address saved.");
      renderAddresses(profile);
    });
  }

  if (addressesList) {
    addressesList.addEventListener("click", async event => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const action = target?.dataset?.action;
      const index = Number(target?.dataset?.index ?? -1);
      if (!action || Number.isNaN(index) || index < 0) return;
      const profile = await getCurrentUserProfile();
      if (!profile) return;
      const existing = readScopedList(ADDRESS_KEY, profile.email);
      if (action === "delete") {
        existing.splice(index, 1);
        if (existing.length && !existing.some(item => item.isDefault)) {
          existing[0].isDefault = true;
        }
        writeScopedList(ADDRESS_KEY, profile.email, existing);
        const backend = getBackend();
        if (backend?.saveAddressesByEmail) {
          await backend.saveAddressesByEmail(profile.email, existing);
        }
        setAuthFeedback("Address removed.");
      } else if (action === "default") {
        const next = existing.map((item, idx) => ({ ...item, isDefault: idx === index }));
        writeScopedList(ADDRESS_KEY, profile.email, next);
        const backend = getBackend();
        if (backend?.saveAddressesByEmail) {
          await backend.saveAddressesByEmail(profile.email, next);
        }
        setAuthFeedback("Default address updated.");
      }
      renderAddresses(profile);
    });
  }

  if (profileForm) {
    profileForm.addEventListener("submit", async event => {
      event.preventDefault();
      const profile = await getCurrentUserProfile();
      if (!profile) return;
      const name = (document.getElementById("profile-name")?.value || "").trim();
      const phone = (document.getElementById("profile-phone")?.value || "").trim();
      const profiles = readJsonStorage(PROFILE_KEY, {});
      profiles[profile.email] = { name, phone };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
      const backend = getBackend();
      if (backend?.upsertProfileByEmail) {
        await backend.upsertProfileByEmail(profile.email, { name, phone });
      }
      setAuthFeedback("Profile saved.");
      await render();
    });
  }

  await render().catch(() => {
    setAuthFeedback("Could not initialize account view. Please refresh the page.");
  });
})();
