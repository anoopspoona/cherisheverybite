(function initAuthBridge() {
  const CURRENT_USER_KEY = "ceb_current_user_v1";
  const config = window.CEB_SUPABASE_CONFIG || {};
  const runtime = window.cebRuntime || {};
  const url = String(config.url || "").trim();
  const anonKey = String(config.anonKey || "").trim();
  const enabled = Boolean(url && anonKey && window.supabase && typeof window.supabase.createClient === "function");

  if (!enabled) {
    window.cebAuth = {
      enabled: false,
      supportsGoogleOAuth: false,
      async signUp() {
        return { ok: false, reason: runtime.enforceSecureAuth ? "secure_auth_required" : "auth_not_configured" };
      },
      async signIn() {
        return { ok: false, reason: runtime.enforceSecureAuth ? "secure_auth_required" : "auth_not_configured" };
      },
      async signInWithGoogle() {
        return { ok: false, reason: "auth_not_configured" };
      },
      async signInWithOtp() {
        return { ok: false, reason: "auth_not_configured" };
      },
      async signOut() {
        localStorage.removeItem(CURRENT_USER_KEY);
        return { ok: true };
      },
      async getCurrentUser() {
        const email = localStorage.getItem(CURRENT_USER_KEY) || "";
        return email ? { email } : null;
      }
    };
    return;
  }

  const client = window.supabase.createClient(url, anonKey);
  const oauthRedirectTo = new URL("account.html", window.location.href).toString();

  const authCode = new URLSearchParams(window.location.search).get("code");
  if (authCode && typeof client.auth.exchangeCodeForSession === "function") {
    client.auth.exchangeCodeForSession(authCode).finally(() => {
      window.history.replaceState({}, document.title, window.location.pathname);
    });
  } else if (window.location.hash && window.location.hash.includes("access_token=")) {
    client.auth.getSession().finally(() => {
      const cleanUrl = `${window.location.pathname}${window.location.search}`;
      window.history.replaceState({}, document.title, cleanUrl);
    });
  }

  async function refreshMirrorFromSession() {
    const { data } = await client.auth.getSession();
    const identifier = data?.session?.user?.email || data?.session?.user?.phone || "";
    if (identifier) localStorage.setItem(CURRENT_USER_KEY, identifier);
    else localStorage.removeItem(CURRENT_USER_KEY);
    return identifier;
  }

  client.auth.onAuthStateChange((_event, session) => {
    const identifier = session?.user?.email || session?.user?.phone || "";
    if (identifier) localStorage.setItem(CURRENT_USER_KEY, identifier);
    else localStorage.removeItem(CURRENT_USER_KEY);
  });

  window.cebAuth = {
    enabled: true,
    supportsGoogleOAuth: true,
    async signUp(email, password, metadata = {}) {
      const { error } = await client.auth.signUp({
        email,
        password,
        options: { data: metadata }
      });
      if (error) return { ok: false, message: error.message };
      await refreshMirrorFromSession();
      return { ok: true };
    },
    async signIn(email, password) {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, message: error.message };
      await refreshMirrorFromSession();
      return { ok: true };
    },
    async signInWithGoogle(redirectTo = oauthRedirectTo) {
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo
        }
      });
      if (error) return { ok: false, message: error.message };
      return { ok: true };
    },
    async signOut() {
      const { error } = await client.auth.signOut();
      if (error) return { ok: false, message: error.message };
      localStorage.removeItem(CURRENT_USER_KEY);
      return { ok: true };
    },
    async signInWithOtp(email, redirectTo = window.location.href) {
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo }
      });
      if (error) return { ok: false, message: error.message };
      return { ok: true };
    },
    async getCurrentUser() {
      const { data: sessionData } = await client.auth.getSession();
      const sessionUser = sessionData?.session?.user || null;
      if (sessionUser) {
        await refreshMirrorFromSession();
        return sessionUser;
      }
      const { data } = await client.auth.getUser();
      if (data?.user) await refreshMirrorFromSession();
      return data?.user || null;
    }
  };
})();
