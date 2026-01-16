import { utf8 } from "./provider.js";

/**
 * Nonce derivation v1:
 * prk = HKDF-Extract(salt, nonceSeed)
 * nonce_i = HKDF-Expand(prk, info="chunk:i", len=12)
 *
 * @param {import("./provider.js").CryptoProvider} cp
 * @param {Uint8Array} nonceSeedBytes   // from file version header (random 32 bytes)
 * @param {number} chunkIndex
 * @returns {Promise<Uint8Array>} 12-byte nonce for AES-GCM
 */
export async function deriveChunkNonceV1(cp, nonceSeedBytes, chunkIndex) {
  const prk = await cp.hkdfExtract(utf8("stormdrive:nonce:salt:v1"), nonceSeedBytes);
  return cp.hkdfExpand(prk, utf8(`stormdrive:nonce|chunk:${chunkIndex}|v1`), 12);
}
