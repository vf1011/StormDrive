// npm i argon2-browser
import * as argon2 from "argon2-browser";

/** @returns {boolean} */
function hasWebCrypto() {
  return typeof crypto !== "undefined" && crypto.subtle;
}

/** @param {ArrayBuffer} ab */
function abToU8(ab) {
  return new Uint8Array(ab);
}

/** @param {Uint8Array} a @param {Uint8Array} b */
function concat(a, b) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

/** HKDF-Extract: PRK = HMAC(salt, ikm) */
async function hmacSha256(keyBytes, dataBytes) {
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, dataBytes);
  return abToU8(sig);
}

/** HKDF-Expand per RFC5869 */
async function hkdfExpand(prk, info, len) {
  const hashLen = 32; // SHA-256
  const n = Math.ceil(len / hashLen);
  if (n > 255) throw new Error("HKDF too long");

  let t = new Uint8Array(0);
  const okm = new Uint8Array(n * hashLen);

  for (let i = 1; i <= n; i++) {
    const input = concat(concat(t, info), new Uint8Array([i]));
    t = await hmacSha256(prk, input);
    okm.set(t, (i - 1) * hashLen);
  }
  return okm.slice(0, len);
}

// ----------------------
// NEW: AAD normalization
// ----------------------
const _te = new TextEncoder();

/** @param {string|Uint8Array|ArrayBuffer|ArrayBufferView|null|undefined} x */
function toBytes(x) {
  if (x == null) return undefined;

  if (typeof x === "string") return _te.encode(x);

  if (x instanceof Uint8Array) return x;

  if (x instanceof ArrayBuffer) return new Uint8Array(x);

  if (ArrayBuffer.isView(x)) {
    return new Uint8Array(x.buffer, x.byteOffset, x.byteLength);
  }

  throw new Error("Unsupported AAD type; use string, Uint8Array, or ArrayBuffer");
}

export class WebCryptoProvider {
  randomBytes(len) {
    const out = new Uint8Array(len);
    crypto.getRandomValues(out);
    return out;
  }

  async argon2id(passwordUtf8, salt, params) {
    // argon2-browser expects strings/Uint8Array; pass bytes
    const res = await argon2.hash({
      pass: passwordUtf8,
      salt,
      time: params.timeCost,
      mem: params.memoryKiB, // KiB
      parallelism: params.parallelism,
      hashLen: params.hashLen,
      type: argon2.ArgonType.Argon2id,
    });

    // res.hash is Uint8Array in argon2-browser
    return res.hash instanceof Uint8Array ? res.hash : new Uint8Array(res.hash);
  }

  async hkdfExtract(salt, ikm) {
    return hmacSha256(salt, ikm);
  }

  async hkdfExpand(prk, info, len) {
    return hkdfExpand(prk, info, len);
  }

  async aesGcmEncrypt(keyBytes, plaintext, nonce, aad) {
    if (!hasWebCrypto()) throw new Error("WebCrypto unavailable");
    const key = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "AES-GCM" },
      false,
      ["encrypt"]
    );
    const ct = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce, additionalData: toBytes(aad) },
      key,
      plaintext
    );
    return abToU8(ct);
  }

  async aesGcmDecrypt(keyBytes, ciphertext, nonce, aad) {
    if (!hasWebCrypto()) throw new Error("WebCrypto unavailable");
    const key = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: nonce, additionalData: toBytes(aad) },
      key,
      ciphertext
    );
    return abToU8(pt);
  }
}
