const USERS_KEY = "ceb_users_v1";
const CURRENT_USER_KEY = "ceb_current_user_v1";
const ORDER_KEY = "ceb_saved_orders_v1";

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

function currentUserEmail() {
  return localStorage.getItem(CURRENT_USER_KEY) || "";
}

function setCurrentUser(email) {
  localStorage.setItem(CURRENT_USER_KEY, email);
}

function logout() {
  localStorage.removeItem(CURRENT_USER_KEY);
  render();
}

function renderOrders(email) {
  const list = document.getElementById("orders-list");
  if (!list) return;
  let orders = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(ORDER_KEY) || "[]");
    orders = Array.isArray(parsed) ? parsed : [];
  } catch {
    orders = [];
  }

  const mine = orders.filter(order => (order.userEmail || "") === email);
  if (!mine.length) {
    list.innerHTML = `<p class="muted">No saved orders yet.</p>`;
    return;
  }

  list.innerHTML = mine.map(order => {
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

function render() {
  const authCard = document.getElementById("auth-card");
  const profileCard = document.getElementById("profile-card");
  const summary = document.getElementById("user-summary");
  const email = currentUserEmail();
  const users = readUsers();
  const user = users.find(u => u.email === email);

  if (!email || !user) {
    if (authCard) authCard.style.display = "block";
    if (profileCard) profileCard.style.display = "none";
    return;
  }

  if (authCard) authCard.style.display = "none";
  if (profileCard) profileCard.style.display = "block";
  if (summary) summary.textContent = `${user.name} • ${user.email}`;
  renderOrders(email);
}

(function init() {
  const signupForm = document.getElementById("signup-form");
  const loginForm = document.getElementById("login-form");
  const feedback = document.getElementById("auth-feedback");
  const logoutBtn = document.getElementById("logout-btn");

  if (signupForm) {
    signupForm.addEventListener("submit", event => {
      event.preventDefault();
      const name = document.getElementById("signup-name")?.value.trim() || "";
      const email = (document.getElementById("signup-email")?.value || "").trim().toLowerCase();
      const password = document.getElementById("signup-password")?.value || "";
      const users = readUsers();

      if (users.some(user => user.email === email)) {
        if (feedback) feedback.textContent = "Account already exists. Please login.";
        return;
      }

      users.push({ name, email, password });
      writeUsers(users);
      setCurrentUser(email);
      if (feedback) feedback.textContent = "Account created successfully.";
      render();
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", event => {
      event.preventDefault();
      const email = (document.getElementById("login-email")?.value || "").trim().toLowerCase();
      const password = document.getElementById("login-password")?.value || "";
      const user = readUsers().find(entry => entry.email === email && entry.password === password);

      if (!user) {
        if (feedback) feedback.textContent = "Invalid email or password.";
        return;
      }

      setCurrentUser(email);
      if (feedback) feedback.textContent = "Logged in.";
      render();
    });
  }

  if (logoutBtn) logoutBtn.addEventListener("click", logout);
  render();
})();
