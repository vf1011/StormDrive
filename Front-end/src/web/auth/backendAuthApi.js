// src/web/auth/backendAuthApi.js
import { API_BASE_URL } from "../../api/config";

async function jsonOrEmpty(res) {
  return res.json().catch(() => ({}));
}

async function readErr(res) {
  const d = await jsonOrEmpty(res);
  return d?.detail || d?.message || `HTTP ${res.status}`;
}

export function createBackendAuthApi({ getAccessToken }) {
  const base = String(API_BASE_URL || "").replace(/\/+$/, "");

  async function authedHeaders(extra = {}) {
    const token = await getAccessToken?.();
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extra,
    };
  }

  return {
    // ---------- PUBLIC ----------
    async signup(payload) {
      const res = await fetch(`${base}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readErr(res));
      return jsonOrEmpty(res);
    },

    // authManager expects: login(email, password)
    async login(email, password) {
      const res = await fetch(`${base}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error(await readErr(res));
      return jsonOrEmpty(res);
    },

    // ---------- MFA ----------
    // authManager expects: validateTotp(code)
    async validateTotp(code) {
      const res = await fetch(`${base}/auth/2fa/validate`, {
        method: "POST",
        headers: await authedHeaders({ "Content-Type": "application/json" }),
        // send BOTH keys to tolerate backend naming differences
        body: JSON.stringify({ code, qr_code: code }),
      });
      if (!res.ok) throw new Error(await readErr(res));
      return jsonOrEmpty(res);
    },

    async setup2fa() {
      const res = await fetch(`${base}/auth/2fa/setup`, {
        method: "GET",
        headers: await authedHeaders(),
      });
      if (!res.ok) throw new Error(await readErr(res));
      return jsonOrEmpty(res);
    },

    async verify2fa(payload) {
      const res = await fetch(`${base}/auth/2fa/verify`, {
        method: "POST",
        headers: await authedHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readErr(res));
      return jsonOrEmpty(res);
    },

    async disable2fa(payload = {}) {
      const res = await fetch(`${base}/auth/2fa/disable`, {
        method: "POST",
        headers: await authedHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readErr(res));
      return jsonOrEmpty(res);
    },

    // ---------- PROFILE ----------
    async me() {
      const res = await fetch(`${base}/auth/users/me`, {
        method: "GET",
        headers: await authedHeaders(),
      });
      if (!res.ok) throw new Error(await readErr(res));
      return jsonOrEmpty(res);
    },

    async updateMe(payload) {
      const res = await fetch(`${base}/auth/users/me`, {
        method: "PUT",
        headers: await authedHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readErr(res));
      return jsonOrEmpty(res);
    },

    async deleteMe() {
      const res = await fetch(`${base}/auth/users/me`, {
        method: "DELETE",
        headers: await authedHeaders(),
      });
      if (!res.ok) throw new Error(await readErr(res));
      return jsonOrEmpty(res);
    },

    // ---------- PASSWORD / SESSION ----------
    async logout(payload = {}) {
      const res = await fetch(`${base}/auth/logout`, {
        method: "POST",
        headers: await authedHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readErr(res));
      return jsonOrEmpty(res);
    },

    async refreshToken(payload = {}) {
      const res = await fetch(`${base}/auth/refresh-token`, {
        method: "POST",
        headers: await authedHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readErr(res));
      return jsonOrEmpty(res);
    },

    // IMPORTANT: must carry wrapped_mak_password_new in your final flow
    async changePassword(payload) {
      const res = await fetch(`${base}/auth/users/change-password`, {
        method: "PUT",
        headers: await authedHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readErr(res));
      return jsonOrEmpty(res);
    },

    async resetPassword(payload) {
      const res = await fetch(`${base}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readErr(res));
      return jsonOrEmpty(res);
    },

    async verifyEmail(payload) {
      const res = await fetch(`${base}/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readErr(res));
      return jsonOrEmpty(res);
    },
  };
}

export default backendAuthApi;