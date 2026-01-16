// src/web/auth/keyringSingleton.js


import { WebCryptoProvider } from "../crypto-bridge/WebCryptoProvider.js";
import { Keyring } from "../../../packages/core/src/keyring/Keyring.js";

// Create once per tab/session (in-memory only)
const cp = new WebCryptoProvider();
export const keyring = new Keyring(cp);

// Export provider too (handy for cryptoBootstrap and other modules)
export const cryptoProvider = cp;
