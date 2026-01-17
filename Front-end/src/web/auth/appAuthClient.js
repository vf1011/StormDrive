// src/auth/appAuthClient.js
import { createAppAuth } from "./bootstrap"; // IMPORTANT: must point to the file that has bootstrapDefaults wired

let app = null;
let initPromise = null;

export function getAppAuth() {
  if (!app) app = createAppAuth();
  return app;
}

export function ensureAuthStarted() {
  if (!initPromise) initPromise = getAppAuth().session.init();
  return initPromise;
}
