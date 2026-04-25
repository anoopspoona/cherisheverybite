(function initBackendConfig() {
  const globalConfig = window.CEB_BACKEND_CONFIG || {};
  const apiBase = String(globalConfig.apiBase || "").trim().replace(/\/$/, "");
  const apiToken = String(globalConfig.apiToken || "").trim();
  const timeoutMs = Number(globalConfig.timeoutMs || 8000);

  async function submitOrder(orderPayload) {
    if (!apiBase) {
      return { ok: false, skipped: true, reason: "missing_api_base" };
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${apiBase}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {})
        },
        body: JSON.stringify(orderPayload),
        signal: controller.signal
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { ok: false, status: response.status, data };
      }

      return { ok: true, status: response.status, data };
    } catch (error) {
      return { ok: false, error: String(error && error.message ? error.message : error) };
    } finally {
      window.clearTimeout(timer);
    }
  }

  window.cebBackend = {
    apiBase,
    submitOrder
  };
})();
