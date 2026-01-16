// src/web/auth/bootstrap.js
import { createAuthManager } from "../../core/auth/authManager.js";
import { createVaultManager } from "../../core/auth/vaultManager.js";
import { createSessionManager } from "../../core/auth/sessionManager.js";
import { supabaseAuthProvider } from "./supabaseAuthProvider.js";
import { createBackendAuthApi } from "./backendAuthApi.js";
import { keyBundleApi } from "./keybundleAPI.js";
import { folderApi } from "../api/folderApi.js";
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

  const session = createSessionManager({
    auth,
    vault,
    keyBundleApi,
    folderApi,
    cryptoBootstrap,
  });

  return { auth, vault, session };
}
