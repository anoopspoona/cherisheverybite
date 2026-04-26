(function initFloatingSidebar() {
  const currentUser = String(localStorage.getItem("ceb_current_user_v1") || "").trim();
  const openKey = "ceb_sidebar_open_v1";
  const open = localStorage.getItem(openKey) === "1";

  const toggle = document.createElement("button");
  toggle.className = "ceb-side-toggle";
  toggle.type = "button";
  toggle.innerHTML = `<span class="bars" aria-hidden="true"><span></span><span></span><span></span></span>`;
  toggle.setAttribute("aria-label", "Toggle account and admin settings");

  const backdrop = document.createElement("div");
  backdrop.className = "ceb-side-backdrop";
  backdrop.setAttribute("data-open", open ? "true" : "false");

  const panel = document.createElement("aside");
  panel.className = "ceb-side";
  panel.setAttribute("data-open", open ? "true" : "false");
  panel.setAttribute("aria-label", "Settings sidebar");
  panel.innerHTML = `
    <h3>Settings</h3>
    <p>${currentUser ? `Signed in as ${currentUser}` : "Not signed in yet"}</p>
    <div class="ceb-side-links">
      <a href="account.html">User Account</a>
      <a href="admin.html">Admin Console</a>
    </div>
  `;

  function setOpen(next) {
    panel.setAttribute("data-open", next ? "true" : "false");
    backdrop.setAttribute("data-open", next ? "true" : "false");
    localStorage.setItem(openKey, next ? "1" : "0");
  }

  toggle.addEventListener("click", () => {
    const isOpen = panel.getAttribute("data-open") === "true";
    setOpen(!isOpen);
  });

  backdrop.addEventListener("click", () => setOpen(false));
  panel.addEventListener("click", event => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;
    if (target.closest("a")) setOpen(false);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") setOpen(false);
  });

  document.body.appendChild(backdrop);
  document.body.appendChild(panel);
  document.body.appendChild(toggle);
})();
