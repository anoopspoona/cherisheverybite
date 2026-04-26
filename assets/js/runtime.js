(function initRuntimeConfig() {
  const defaults = {
    enforceSecureAuth: false,
    requireBackendSync: false,
    adminEmails: []
  };
  const incoming = window.CEB_RUNTIME_CONFIG || {};
  const runtime = {
    enforceSecureAuth: incoming.enforceSecureAuth === true,
    requireBackendSync: incoming.requireBackendSync === true,
    adminEmails: Array.isArray(incoming.adminEmails) ? incoming.adminEmails.map(v => String(v || "").toLowerCase()).filter(Boolean) : []
  };
  window.cebRuntime = { ...defaults, ...runtime };
})();
