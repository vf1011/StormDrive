import { utf8 } from "./provider.js";

/**
 * @param {import("./provider.js").CryptoProvider} cp
 * @param {Uint8Array} dekBytes
 * @param {Uint8Array} nonce12
 * @param {Uint8Array} plaintext
 * @param {string} aadStr
 */
export async function encryptChunkAesGcmV1(cp, dekBytes, nonce12, plaintext, aadStr) {
  return cp.aesGcmEncrypt(dekBytes, plaintext, nonce12, utf8(aadStr));
}

/**
 * @param {import("./provider.js").CryptoProvider} cp
 * @param {Uint8Array} dekBytes
 * @param {Uint8Array} nonce12
 * @param {Uint8Array} ciphertext
 * @param {string} aadStr
 */
export async function decryptChunkAesGcmV1(cp, dekBytes, nonce12, ciphertext, aadStr) {
  return cp.aesGcmDecrypt(dekBytes, ciphertext, nonce12, utf8(aadStr));
}
