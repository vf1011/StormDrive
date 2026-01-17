// src/core/auth/sessionManager.js

export function createSessionManager({
  auth,
  vault,
  keyBundleApi,

  // optional, but required for full signup flow:
  // folderApi.initFolder(token, payload)
  folderApi = null,

  // optional, but required for full signup flow:
  // cryptoBootstrap.buildSignupInit({ userId, password, recoveryKeyBytes })
  // -> { keybundleInitPayload, rootFolderInitPayload }
  cryptoBootstrap = null,
}) {
  let state = {
    ready: false,
    auth: auth.getState(),
    vault: vault.getState(),
  };

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

  const requireAuthenticated = () => {
    const a = auth.getState();
    if (a.status !== "AUTHENTICATED") {
      // IMPORTANT: blocks MFA_REQUIRED from unlocking crypto
      throw new Error("Not fully authenticated");
    }
    return a;
  };

  const init = async () => {
    await auth.init();
    recompute();

    // Recompute + auto-lock vault if auth is lost
    auth.subscribe(() => {
      const a = auth.getState();
      if (a.status !== "AUTHENTICATED") {
        // wipe keys immediately if user signs out / session expires
        vault.lock();
      }
      recompute();
    });

    vault.subscribe(recompute);
  };

  const unlockVaultWithPassword = async (password) => {
    const a = requireAuthenticated();
    const token = auth.getAccessToken?.() || a.session?.accessToken;
    if (!token) throw new Error("Missing access token");

    // normalize keyBundleApi naming: getBundle(token)
    const bundle = await keyBundleApi.getBundle(token);
    await vault.unlockWithPassword({ bundle, password });
    recompute();
  };

  const unlockVaultWithRecoveryKey = async (recoveryKeyBytes) => {
    const a = requireAuthenticated();
    const token = auth.getAccessToken?.() || a.session?.accessToken;
    if (!token) throw new Error("Missing access token");

    const bundle = await keyBundleApi.getBundle(token);
    await vault.unlockWithRecoveryKey({ bundle, recoveryKeyBytes });
    recompute();
  };

  /**
   * MUST be called after successful signup + authenticated session exists:
   * - POST /keybundle/init
   * - POST /folder/init-folder (root)
   *
   * This keeps your flow correct: no uploads before keybundle + root FoK exist.
   */
 const completeSignupCrypto = async ({ password, recoveryKeyBytes }) => {
  const a = requireAuthenticated();
  const token = auth.getAccessToken?.() || a.session?.accessToken;
  if (!token) throw new Error("Missing access token");

  if (!cryptoBootstrap) throw new Error("cryptoBootstrap not provided to sessionManager");
  if (!keyBundleApi?.init) throw new Error("keyBundleApi.init not provided to sessionManager");
  if (!folderApi?.bootstrapDefaults) throw new Error("folderApi.bootstrapDefaults not provided to sessionManager");

  const userId = a.user?.id || a.session?.user?.id;
  if (!userId) throw new Error("Missing user id");

  const { keybundleInitPayload, bootstrapDefaultsPayload } =
    await cryptoBootstrap.buildSignupInit({ userId, password, recoveryKeyBytes });

  await keyBundleApi.init(token, keybundleInitPayload);

  // Option-1: creates root + defaults + stores wrapped FK/FOK (idempotent)
  await folderApi.bootstrapDefaults(token, bootstrapDefaultsPayload);

  return { ok: true };
};


  const logout = async () => {
    vault.lock();
    await auth.logout();
    recompute();
  };

  return {
    subscribe,
    getState,
    init,

    unlockVaultWithPassword,
    unlockVaultWithRecoveryKey,

    completeSignupCrypto,

    logout,
  };
}

export default createSessionManager;
