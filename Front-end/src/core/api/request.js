// src/core/api/request.js
import API_BASE_URL from "./config.js";

/**
 * Creates a simple request helper that:
 * - attaches Authorization token
 * - on 401: refresh session once, retry once
 */
export function createRequest({ auth, onLogout }) {
  return async function request(path, options = {}) {
    const doFetch = async () => {
      const token = auth.getAccessToken?.() || null;

      const headers = new Headers(options.headers || {});
      if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
      }
      if (token) headers.set("Authorization", `Bearer ${token}`);

      return fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
      });
    };

    let res = await doFetch();

    if (res.status === 401) {
      const ok = await auth.refreshSession?.();
      if (!ok) {
        await onLogout?.();
        return res;
      }
      res = await doFetch(); // retry once
    }

    return res;
  };
}

export async function readJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text; // fallback if backend returns plain text
  }
}
