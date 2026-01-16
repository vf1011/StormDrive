// src/web/auth/keyringSingleton.js


import { WebCryptoProvider } from "../crypto/webCryptoProvider.js";
import { Keyring } from "../../core/crypto/keyrings.js";

// Create once per tab/session (in-memory only)
const cp = new WebCryptoProvider();
export const keyring = new Keyring(cp);

// Export provider too (handy for cryptoBootstrap and other modules)
export const cryptoProvider = cp;
