// src/web/auth/bootstrap.js
import { createAuthManager } from "../../core/auth/authManager.js";
import { createVaultManager } from "../../core/auth/vaultManager.js";
import { createSessionManager } from "../../core/auth/sessionManager.js";

import { webAuthAdapter } from "./webAuthAdaptor.js";
import { backendAuth } from "./backendAuth.js";
import { keyBundleApi } from "./keybundleAPI.js";

export function createAppAuth() {
  const auth = createAuthManager({ authAdapter: webAuthAdapter, backendAuth });
  const vault = createVaultManager();
  const session = createSessionManager({ auth, vault, keyBundleApi });

  return { auth, vault, session };
}
