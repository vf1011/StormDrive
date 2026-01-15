// core/crypto/hkdf.js
import { concatBytes } from "./bytes.js";

// HKDF-Extract(salt, IKM) = HMAC(salt, IKM)
async function hkdfExtract(c, salt, ikm) {
  return c.hmacSha256(salt, ikm);
}

// HKDF-Expand(PRK, info, L)
async function hkdfExpand(c, prk, info, length) {
  const hashLen = 32; // SHA-256
  const n = Math.ceil(length / hashLen);
  if (n > 255) throw new Error("HKDF length too large");

  let t = new Uint8Array(0);
  const okmParts = [];

  for (let i = 1; i <= n; i++) {
    const input = concatBytes(t, info, new Uint8Array([i]));
    t = await c.hmacSha256(prk, input);
    okmParts.push(t);
  }

  const okm = concatBytes(...okmParts);
  return okm.slice(0, length);
}

/**
 * @param {any} c CryptoProvider
 * @param {Uint8Array} ikm
 * @param {Uint8Array} salt
 * @param {Uint8Array} info
 * @param {number} length
 */
export async function hkdfSha256(c, ikm, salt, info, length) {
  const prk = await hkdfExtract(c, salt, ikm);
  return hkdfExpand(c, prk, info, length);
}
