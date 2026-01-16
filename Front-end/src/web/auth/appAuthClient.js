// src/web/auth/appAuthClient.js
import { createAppAuth } from "./bootStrap";

const appAuth = createAppAuth();
let started = false;

export async function ensureAuthStarted() {
  if (started) return appAuth;
  started = true;
  await appAuth.session.init();
  return appAuth;
}

export function getAppAuth() {
  return appAuth;
}
