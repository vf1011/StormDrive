import { WebCryptoProvider } from "../crypto-bridge/WebCryptoProvider.js";
import { Keyring } from "../../../../packages/core/src/keyring/Keyring.js";

const cp = new WebCryptoProvider();
const keyring = new Keyring(cp);

export function getCryptoProvider() {
  return cp;
}

export function getKeyring() {
  return keyring;
}

// optional: lock on tab close
window.addEventListener("beforeunload", () => {
  try { keyring.lock(); } catch {}
});
