// frontend/src/api.js

let BASE =
  import.meta.env.VITE_API_BASE ||
  (import.meta.env.PROD ? "http://13.201.46.13" : "http://localhost:3001");

let configPromise = null;
let refreshPromise = null;

async function getApiBase() {
  // Electron desktop app
  if (window.worktracker?.getConfig) {
    if (!configPromise) {
      configPromise = window.worktracker
        .getConfig()
        .then((cfg) => {
          if (cfg?.SERVER_URL) {
            BASE = cfg.SERVER_URL;
            console.log("🌐 API base set from Electron config:", BASE);
          }
          return BASE;
        })
        .catch((err) => {
          console.warn("Could not load Electron config, using fallback BASE:", BASE, err);
          return BASE;
        });
    }

    return configPromise;
  }

  // Web / production fallback
  if (import.meta.env.PROD && BASE.includes("localhost")) {
    BASE = "http://13.201.46.13";
  }

  return BASE;
}

/**
 * Perform silent token refresh using stored refreshToken.
 * Deduplicates simultaneous refresh requests with a singleton promise.
 * 🔒 NEVER logs out the user on network errors or server hiccups;
 * only logs out if server definitively rejects credentials (401/403).
 */
async function getRefreshedToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    let isDefinitiveAuthFailure = false;

    // Helper: Attempt silent re-authentication with remembered credentials if available
    async function trySavedCredentialsLogin(baseUrl) {
      try {
        const savedEmail = localStorage.getItem("email");
        const savedPassword = localStorage.getItem("password");
        if (!savedEmail || !savedPassword) return null;

        const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: savedEmail, password: savedPassword }),
        });

        if (loginRes.ok) {
          const data = await loginRes.json();
          if (data?.token) {
            const updatedAuth = {
              token: data.token,
              refreshToken: data.refreshToken,
              user: data.user,
            };
            localStorage.setItem("auth", JSON.stringify(updatedAuth));
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("auth:refreshed", { detail: updatedAuth })
              );
            }
            return updatedAuth.token;
          }
        }
      } catch (e) {
        console.warn("Silent re-login attempt error:", e.message);
      }
      return null;
    }

    try {
      const base = await getApiBase();
      const stored = localStorage.getItem("auth");
      if (!stored) {
        const recoveredToken = await trySavedCredentialsLogin(base);
        if (recoveredToken) return recoveredToken;
        isDefinitiveAuthFailure = true;
        throw new Error("No auth stored");
      }

      let authObj;
      try {
        authObj = JSON.parse(stored);
      } catch {
        const recoveredToken = await trySavedCredentialsLogin(base);
        if (recoveredToken) return recoveredToken;
        isDefinitiveAuthFailure = true;
        throw new Error("Invalid stored auth JSON");
      }

      const refreshToken = authObj?.refreshToken;
      if (!refreshToken) {
        // No refresh token stored (legacy session) -> attempt recovery with saved credentials
        const recoveredToken = await trySavedCredentialsLogin(base);
        if (recoveredToken) return recoveredToken;
        isDefinitiveAuthFailure = true;
        throw new Error("No refresh token available");
      }

      // Attempt refresh with a 1-time retry for transient network recovery (e.g. waking from sleep)
      let res;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          res = await fetch(`${base}/api/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          });
          break; // Request completed, break retry loop
        } catch (fetchErr) {
          if (attempt === 0) {
            // Wait 1.2s and retry once in case network is reconnecting after sleep/wake
            await new Promise((r) => setTimeout(r, 1200));
            continue;
          }
          // Network is still down; mark as offline network error, NOT auth rejection
          const netErr = new Error(`Cannot connect to server during token refresh: ${fetchErr.message}`);
          netErr.isOffline = true;
          netErr.status = 0;
          throw netErr;
        }
      }

      // If server returned 401 (Invalid/expired refresh token) or 403 (User inactive/forbidden)
      if (res.status === 401 || res.status === 403) {
        // Attempt recovery with saved credentials before kicking user out
        const recoveredToken = await trySavedCredentialsLogin(base);
        if (recoveredToken) return recoveredToken;

        isDefinitiveAuthFailure = true;
        throw new Error(`Refresh token rejected with status ${res.status}`);
      }

      // If server returned 5xx (temporary server hiccup), DO NOT log out user!
      if (!res.ok) {
        const serverErr = new Error(`Server returned status ${res.status} during token refresh`);
        serverErr.status = res.status;
        serverErr.isServerError = true;
        throw serverErr;
      }

      const data = await res.json();
      if (!data?.token) {
        isDefinitiveAuthFailure = true;
        throw new Error("No access token returned from refresh");
      }

      const updatedAuth = {
        ...authObj,
        token: data.token,
        refreshToken: data.refreshToken || refreshToken,
        user: data.user || authObj.user,
      };

      localStorage.setItem("auth", JSON.stringify(updatedAuth));

      // Notify React components of new token
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("auth:refreshed", { detail: updatedAuth })
        );
      }

      return updatedAuth.token;
    } catch (err) {
      console.warn("Silent token refresh error:", err.message);

      // 🔒 ONLY remove auth and trigger logout if server EXPLICITLY rejected credentials (401/403)
      // or if auth storage is permanently corrupted. NEVER log out on network drop or server 5xx!
      if (isDefinitiveAuthFailure) {
        localStorage.removeItem("auth");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("auth:expired"));
        }
      }

      throw err;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function api(path, { method = "GET", body, token, headers, _isRetry = false } = {}) {
  const base = await getApiBase();
  const url = path.startsWith("http") ? path : `${base}${path}`;

  // If token is not provided explicitly, try reading active token from stored auth
  let activeToken = token;
  if (!path.includes("/api/auth/")) {
    try {
      const stored = localStorage.getItem("auth");
      if (stored) {
        const storedToken = JSON.parse(stored)?.token;
        // Prefer stored token to avoid stale closure tokens in long-running components
        if (!activeToken || (storedToken && storedToken !== activeToken && !_isRetry)) {
          activeToken = storedToken;
        }
      }
    } catch {}
  }

  const mergedHeaders = {
    "Content-Type": "application/json",
    ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
    ...(headers || {}),
  };

  let res;

  try {
    res = await fetch(url, {
      method,
      headers: mergedHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    const networkError = new Error(
      `Network error. Could not connect to server: ${url}`
    );
    networkError.status = 0;
    networkError.isOffline = true;
    networkError.originalError = err;
    throw networkError;
  }

  // 🔄 Transparent Silent Refresh: If 401 Unauthorized and not already retried
  if (res.status === 401 && !_isRetry && !path.includes("/api/auth/login") && !path.includes("/api/auth/refresh")) {
    try {
      const newToken = await getRefreshedToken();
      // Retry original request with newly refreshed token
      return await api(path, {
        method,
        body,
        token: newToken,
        headers,
        _isRetry: true,
      });
    } catch (refreshErr) {
      if (refreshErr?.isOffline || refreshErr?.isServerError || refreshErr?.status === 0) {
        // Network or server issue -> bubble network error, preserve session & offline mode
        const netErr = new Error("Network error during session refresh. Preserving offline state.");
        netErr.status = 0;
        netErr.isOffline = true;
        throw netErr;
      }

      // Refresh failed definitively with 401/403 -> bubble session expired error
      const sessionError = new Error("Session expired. Please log in again.");
      sessionError.status = 401;
      sessionError.isAuthExpired = true;
      throw sessionError;
    }
  }

  const contentType = res.headers.get("content-type") || "";

  let data;
  try {
    data = contentType.includes("application/json")
      ? await res.json()
      : await res.text();
  } catch {
    data = "";
  }

  if (!res.ok) {
    const msg =
      typeof data === "object"
        ? data.error || data.message || JSON.stringify(data)
        : data;

    const error = new Error(msg || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    error.url = url;
    throw error;
  }

  return data;
}