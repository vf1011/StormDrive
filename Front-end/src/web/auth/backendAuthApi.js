// src/web/auth/backendAuthApi.js
import { API_BASE_URL } from "../../api/config";

async function jsonOrEmpty(res) {
  return res.json().catch(() => ({}));
}

export function createBackendAuthApi({ getToken }) {
  const base = API_BASE_URL;

  return {
    async signup(payload) {
      const res = await fetch(`${base}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await jsonOrEmpty(res);
        throw new Error(d.detail || "Signup failed");
      }
      return jsonOrEmpty(res);
    },

    async login(payload) {
      const res = await fetch(`${base}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await jsonOrEmpty(res);
        throw new Error(d.detail || "Login check failed");
      }
      return jsonOrEmpty(res);
    },

    async validateTotp(payload) {
      const token = await getToken();
      const res = await fetch(`${base}/auth/2fa/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await jsonOrEmpty(res);
        throw new Error(d.detail || "Invalid code");
      }
      return jsonOrEmpty(res);
    },

  async me() {
  const token = await getToken();
  const res = await fetch(`${base}/auth/users/me`, {
    method: "GET",
    headers: { Authorization: token ? `Bearer ${token}` : "" },
  });
  if (!res.ok) {
    const d = await jsonOrEmpty(res);
    throw new Error(d.detail || "Auth check failed");
  }
  return jsonOrEmpty(res);
},
  };
}
