import { createAuthManager } from "../../core/auth/authManager.js";
import { createVaultManager } from "../../core/auth/vaultManager.js";
import { createSessionManager } from "../../core/auth/sessionManager.js";

import { supabaseAuthProvider } from "./supabaseAuthProvider.js";
import { createBackendAuthApi } from "./backendAuthApi.js";

import { keybundleInit, getKeybundle } from "../api/keybundleAPI.js";
import { bootstrapDefaultsApi  } from "../api/folderapi.js"; // <-- import both if you want

import { keyring } from "./keyringSingleton.js";
import { cryptoBootstrap } from "./cryptoBootstrap.js";

export function createAppAuth() {
  const getAccessToken = async () => {
    const s = await supabaseAuthProvider.getSession();
    return s?.accessToken || null;
  };

  const backendAuth = createBackendAuthApi({ getAccessToken });

  const auth = createAuthManager({ authAdapter: supabaseAuthProvider, backendAuth });
  const vault = createVaultManager({ keyring });

  const folderApi = {
    bootstrapDefaults: (token, payload) => bootstrapDefaultsApi({ token, payload }),
    // keep this only if dashboard still uses it:
  };

  const keyBundleApi = {
    getBundle: (token) => getKeybundle(token),
    init: (token, payload) => keybundleInit(token, payload),
  };

  const session = createSessionManager({ auth, vault, keyBundleApi, folderApi, cryptoBootstrap });

  return { auth, vault, session };
}
