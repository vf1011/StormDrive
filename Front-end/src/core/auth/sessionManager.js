// src/core/auth/sessionManager.js

export function createSessionManager({ auth, vault, keyBundleApi }) {
  let state = { ready: false, auth: auth.getState(), vault: vault.getState() };
  const listeners = new Set();
  const notify = () => listeners.forEach((l) => l());

  const recompute = () => {
    const a = auth.getState();
    const v = vault.getState();
    state = {
      ready: a.status === "AUTHENTICATED" && v.status === "UNLOCKED",
      auth: a,
      vault: v,
    };
    notify();
  };

  const subscribe = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };

  const getState = () => state;

  const init = async () => {
    await auth.init();
    recompute();
    auth.subscribe(recompute);
    vault.subscribe(recompute);
  };

  const unlockVaultWithPassword = async (password) => {
    const a = auth.getState();
    if (a.status !== "AUTHENTICATED") throw new Error("Not authenticated");
    const encryptedKeyBundle = await keyBundleApi.fetchEncryptedKeyBundle();
    await vault.unlock({ password, encryptedKeyBundle });
    recompute();
  };

  const logout = async () => {
    vault.lock();
    await auth.logout();
    recompute();
  };

  return { subscribe, getState, init, unlockVaultWithPassword, logout };
}

export default createSessionManager;