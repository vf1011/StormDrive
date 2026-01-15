// core/crypto/bytes.js

/** @typedef {Uint8Array} Bytes */

export const utf8 = {
  /** @param {string} s @returns {Bytes} */
  toBytes: (s) => new TextEncoder().encode(s),

  /** @param {Bytes} b @returns {string} */
  fromBytes: (b) => new TextDecoder().decode(b),
};

/** @param {...Bytes} parts @returns {Bytes} */
export function concatBytes(...parts) {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

/** @param {number} n @returns {Bytes} */
export function u32be(n) {
  const out = new Uint8Array(4);
  out[0] = (n >>> 24) & 0xff;
  out[1] = (n >>> 16) & 0xff;
  out[2] = (n >>> 8) & 0xff;
  out[3] = n & 0xff;
  return out;
}

/** @param {Bytes} a @param {Bytes} b @returns {boolean} */
export function equalBytes(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
