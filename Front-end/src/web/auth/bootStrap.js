// src/web/auth/bootstrap.js
import { createAuthManager } from "../../core/auth/authManager.js";
import { createVaultManager } from "../../core/auth/vaultManager.js";
import { createSessionManager } from "../../core/auth/sessionManager.js";

import { supabaseAuthProvider} from "./supabaseAuthProvider.js";
import { backendAuth } from "./backendAuth.js";
import { keyBundleApi } from "../api/keybundleAPI.js";

export function createAppAuth() {
  const auth = createAuthManager({ authAdapter: supabaseAuthProvider, backendAuth });
  const vault = createVaultManager();
  const session = createSessionManager({ auth, vault, keyBundleApi });

  return { auth, vault, session };
}
