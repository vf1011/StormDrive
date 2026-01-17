// src/web/auth/webCryptoProvider.js
import argon2BundleUrl from "argon2-browser/dist/argon2-bundled.min.js?url";

const _te = new TextEncoder();
let _argon2Promise = null;

function hasWebCrypto() {
  return typeof crypto !== "undefined" && !!crypto.subtle;
}

function abToU8(ab) {
  return new Uint8Array(ab);
}

function concat(a, b) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

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

async function hkdfExpand(prk, info, len) {
  const hashLen = 32;
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

function toBytes(x) {
  if (x == null) return undefined;
  if (typeof x === "string") return _te.encode(x);
  if (x instanceof Uint8Array) return x;
  if (x instanceof ArrayBuffer) return new Uint8Array(x);
  if (ArrayBuffer.isView(x)) return new Uint8Array(x.buffer, x.byteOffset, x.byteLength);
  throw new Error("Unsupported AAD type");
}

async function getArgon2Global() {
  // already loaded
  if (globalThis.argon2?.hash) return globalThis.argon2;

  // load once
  if (!_argon2Promise) {
    _argon2Promise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = argon2BundleUrl;
      s.async = true;
      s.onload = () => resolve(globalThis.argon2);
      s.onerror = () => reject(new Error("Failed to load argon2 bundle"));
      document.head.appendChild(s);
    });
  }

  const a = await _argon2Promise;
  if (!a?.hash) throw new Error("argon2-browser: hash() not found");
  return a;
}

export class WebCryptoProvider {
  randomBytes(len) {
    const out = new Uint8Array(len);
    crypto.getRandomValues(out);
    return out;
  }

  async argon2id(passwordUtf8, salt, params) {
    const argon2 = await getArgon2Global();

    // In bundled build, ArgonType usually exists; fallback to numeric 2
    const type = argon2.ArgonType?.Argon2id ?? argon2.argon2id ?? 2;

    const res = await argon2.hash({
      pass: passwordUtf8,           // string or Uint8Array
      salt,                         // Uint8Array
      time: params.timeCost,
      mem: params.memoryKiB,        // KiB
      parallelism: params.parallelism,
      hashLen: params.hashLen,
      type,
    });

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
    const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt"]);
    const ct = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce, additionalData: toBytes(aad) },
      key,
      plaintext
    );
    return abToU8(ct);
  }

  async aesGcmDecrypt(keyBytes, ciphertext, nonce, aad) {
    if (!hasWebCrypto()) throw new Error("WebCrypto unavailable");
    const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["decrypt"]);
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: nonce, additionalData: toBytes(aad) },
      key,
      ciphertext
    );
    return abToU8(pt);
  }
}
