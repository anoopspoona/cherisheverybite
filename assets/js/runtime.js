(function initRuntimeConfig() {
  const defaults = {
    enforceSecureAuth: false,
    requireBackendSync: false,
    adminEmails: ["anoop.anoops@gmail.com"],
    adminAuthProvider: "google"
  };
  const incoming = window.CEB_RUNTIME_CONFIG || {};
  const runtime = {
    enforceSecureAuth: incoming.enforceSecureAuth === true,
    requireBackendSync: incoming.requireBackendSync === true,
    adminEmails: Array.isArray(incoming.adminEmails) ? incoming.adminEmails.map(v => String(v || "").toLowerCase()).filter(Boolean) : defaults.adminEmails,
    adminAuthProvider: String(incoming.adminAuthProvider || defaults.adminAuthProvider).toLowerCase()
  };
  window.cebRuntime = { ...defaults, ...runtime };
})();
