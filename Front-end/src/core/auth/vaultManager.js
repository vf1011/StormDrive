// src/core/auth/vaultManager.js

export function createVaultManager({ keyring }) {
  if (!keyring) {
    throw new Error("VaultManager requires a keyring instance (inject from web bootstrap)");
  }

  let state = {
    status: "LOCKED", // LOCKED | UNLOCKED
  };

  const listeners = new Set();
  const notify = () => listeners.forEach((l) => l());
  const setState = (patch) => {
    state = { ...state, ...patch };
    notify();
  };

  const subscribe = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };

  const getState = () => state;

  const isUnlocked = () => state.status === "UNLOCKED";

  const getKeyring = () => {
    if (!isUnlocked()) throw new Error("Vault locked");
    return keyring;
  };

  const unlockWithPassword = async ({ bundle, password }) => {
    if (!bundle) throw new Error("Keybundle missing");
    if (!password) throw new Error("Password required");

    await keyring.unlockWithPassword(bundle, password);
    setState({ status: "UNLOCKED" });
    return keyring;
  };

  const unlockWithRecoveryKey = async ({ bundle, recoveryKeyBytes }) => {
    if (!bundle) throw new Error("Keybundle missing");
    if (!recoveryKeyBytes) throw new Error("Recovery key required");

    await keyring.unlockWithRecoveryKey(bundle, recoveryKeyBytes);
    setState({ status: "UNLOCKED" });
    return keyring;
  };

  const lock = () => {
    try {
      keyring.lock?.();
    } finally {
      setState({ status: "LOCKED" });
    }
  };

  return {
    subscribe,
    getState,
    isUnlocked,
    getKeyring,

    unlockWithPassword,
    unlockWithRecoveryKey,
    lock,
  };
}
