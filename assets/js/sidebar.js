(function initFloatingSidebar() {
  const currentUser = String(localStorage.getItem("ceb_current_user_v1") || "").trim();
  const minimizedKey = "ceb_sidebar_minimized_v1";
  const minimized = localStorage.getItem(minimizedKey) === "1";

  const toggle = document.createElement("button");
  toggle.className = "ceb-side-toggle";
  toggle.type = "button";
  toggle.textContent = minimized ? "☰ Settings" : "✕ Close";
  toggle.setAttribute("aria-label", "Toggle account and admin settings");

  const panel = document.createElement("aside");
  panel.className = "ceb-side";
  panel.setAttribute("data-minimized", minimized ? "true" : "false");
  panel.innerHTML = `
    <h3>Settings</h3>
    <p>${currentUser ? `Signed in as ${currentUser}` : "Not signed in yet"}</p>
    <div class="ceb-side-links">
      <a href="account.html">User Account</a>
      <a href="admin.html">Admin Console</a>
    </div>
  `;

  function setMinimized(next) {
    panel.setAttribute("data-minimized", next ? "true" : "false");
    toggle.textContent = next ? "☰ Settings" : "✕ Close";
    localStorage.setItem(minimizedKey, next ? "1" : "0");
  }

  toggle.addEventListener("click", () => {
    const nowMinimized = panel.getAttribute("data-minimized") === "true";
    setMinimized(!nowMinimized);
  });

  document.body.appendChild(panel);
  document.body.appendChild(toggle);
})();
