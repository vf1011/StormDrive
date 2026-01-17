// src/web/auth/bootstrap.js
import { createAuthManager } from "../../core/auth/authManager.js";
import { createVaultManager } from "../../core/auth/vaultManager.js";
import { createSessionManager } from "../../core/auth/sessionManager.js";

import { supabaseAuthProvider } from "./supabaseAuthProvider.js";
import { createBackendAuthApi } from "./backendAuthApi.js";

import { keybundleInit, getKeybundle } from "../api/keybundleAPI.js";
import { initFolderApi } from "../api/folderapi.js";

import { keyring } from "./keyringSingleton.js";
import { cryptoBootstrap } from "./cryptoBootstrap.js"; // ✅ ensure file name matches

export function createAppAuth() {
  const getAccessToken = async () => {
    const s = await supabaseAuthProvider.getSession();
    return s?.accessToken || null;
  };

  const backendAuth = createBackendAuthApi({ getAccessToken });

  const auth = createAuthManager({
    authAdapter: supabaseAuthProvider,
    backendAuth,
  });

  const vault = createVaultManager({ keyring });

  const folderApi = {
    initFolder: (token, payload) => initFolderApi({ token, payload }),
  };

  // ✅ the object shape SessionManager expects
  const keyBundleApi = {
    getBundle: (token) => getKeybundle(token),
    init: (token, payload) => keybundleInit(token, payload),
  };

  const session = createSessionManager({
    auth,
    vault,
    keyBundleApi, // ✅ not keybundleInit
    folderApi,
    cryptoBootstrap, // ✅ spelling consistent everywhere
  });

  return { auth, vault, session };
}
