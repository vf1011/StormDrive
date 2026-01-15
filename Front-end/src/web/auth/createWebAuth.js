// src/web/auth/createWebAuthService.js
import { createAuthService } from "../../core/auth/authService";
import { webTokenStore } from "./webTokenStore";
import { supabaseAuthProvider } from "./supabaseAuthProvider";
import { createBackendAuthApi } from "./backendAuthApi";

export function createWebAuthService() {
  const api = createBackendAuthApi({
    getToken: () => webTokenStore.get(),
  });

  return createAuthService({
    auth: supabaseAuthProvider,
    api,
    tokens: webTokenStore,
  });
}
