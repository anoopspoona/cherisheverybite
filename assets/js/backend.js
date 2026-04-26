(function initBackendConfig() {
  const globalConfig = window.CEB_BACKEND_CONFIG || {};
  const apiBase = String(globalConfig.apiBase || "").trim().replace(/\/$/, "");
  const apiToken = String(globalConfig.apiToken || "").trim();
  const timeoutMs = Number(globalConfig.timeoutMs || 8000);

  async function request(path, options = {}) {
    if (!apiBase) {
      return { ok: false, skipped: true, reason: "missing_api_base" };
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${apiBase}${path}`, {
        method: options.method || "GET",
        headers: {
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
          ...(options.headers || {})
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return { ok: false, status: response.status, data };
      return { ok: true, status: response.status, data };
    } catch (error) {
      return { ok: false, error: String(error && error.message ? error.message : error) };
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function submitOrder(orderPayload) {
    return request("/orders", { method: "POST", body: orderPayload });
  }

  async function fetchOrdersByEmail(email) {
    if (!email) {
      return { ok: false, skipped: true, reason: "missing_email" };
    }
    const result = await request(`/orders?userEmail=${encodeURIComponent(email)}`);
    if (!result.ok) return result;
    return { ok: true, data: Array.isArray(result.data) ? result.data : [] };
  }

  async function fetchProfileByEmail(email) {
    if (!email) return { ok: false, skipped: true, reason: "missing_email" };
    return request(`/profiles?userEmail=${encodeURIComponent(email)}`);
  }

  async function upsertProfileByEmail(email, payload) {
    if (!email) return { ok: false, skipped: true, reason: "missing_email" };
    return request("/profiles", {
      method: "POST",
      body: {
        userEmail: email,
        ...payload
      }
    });
  }

  async function fetchAddressesByEmail(email) {
    if (!email) return { ok: false, skipped: true, reason: "missing_email" };
    const result = await request(`/addresses?userEmail=${encodeURIComponent(email)}`);
    if (!result.ok) return result;
    return { ok: true, data: Array.isArray(result.data) ? result.data : [] };
  }

  async function saveAddressesByEmail(email, addresses) {
    if (!email) return { ok: false, skipped: true, reason: "missing_email" };
    return request("/addresses", {
      method: "PUT",
      body: {
        userEmail: email,
        addresses: Array.isArray(addresses) ? addresses : []
      }
    });
  }

  async function fetchSubscriptionsByEmail(email) {
    if (!email) return { ok: false, skipped: true, reason: "missing_email" };
    const result = await request(`/subscriptions?userEmail=${encodeURIComponent(email)}`);
    if (!result.ok) return result;
    return { ok: true, data: Array.isArray(result.data) ? result.data : [] };
  }

  async function saveSubscriptionsByEmail(email, subscriptions) {
    if (!email) return { ok: false, skipped: true, reason: "missing_email" };
    return request("/subscriptions", {
      method: "PUT",
      body: {
        userEmail: email,
        subscriptions: Array.isArray(subscriptions) ? subscriptions : []
      }
    });
  }

  async function saveAdminMenu(payload) {
    return request("/admin/menu", { method: "PUT", body: payload });
  }

  async function saveAdminCalendar(payload) {
    return request("/admin/calendar", { method: "PUT", body: payload });
  }

  window.cebBackend = {
    apiBase,
    request,
    submitOrder,
    fetchOrdersByEmail,
    fetchProfileByEmail,
    upsertProfileByEmail,
    fetchAddressesByEmail,
    saveAddressesByEmail,
    fetchSubscriptionsByEmail,
    saveSubscriptionsByEmail,
    saveAdminMenu,
    saveAdminCalendar
  };
})();
