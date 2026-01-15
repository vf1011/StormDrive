// core/crypto/base64.js

/**
 * Web: uses btoa/atob
 * RN: if Buffer exists (polyfill), uses Buffer
 *
 * For RN, do once in your app entry:
 *   import { Buffer } from "buffer";
 *   global.Buffer = Buffer;
 */

/** @param {Uint8Array} bytes @returns {string} */
export function toBase64(bytes) {
  const g = globalThis;

  if (g.Buffer) {
    return g.Buffer.from(bytes).toString("base64");
  }

  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
  }
  return btoa(binary);
}

/** @param {string} b64 @returns {Uint8Array} */
export function fromBase64(b64) {
  const g = globalThis;

  if (g.Buffer) {
    const buf = g.Buffer.from(b64, "base64");
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }

  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export default { toBase64, fromBase64 };