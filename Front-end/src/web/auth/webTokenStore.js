// src/web/auth/webTokenStore.js
const KEY = "userToken";

export const webTokenStore = {
  async set(token) {
    localStorage.setItem(KEY, token);
  },
  async get() {
    return localStorage.getItem(KEY);
  },
  async clear() {
    localStorage.removeItem(KEY);
  },
};
