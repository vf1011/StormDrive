// core/crypto/providers/WebCryptoAesGcmProvider.js
import { concatBytes } from "../bytes.js";

function toAB(u8) {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
}
function fromAB(ab) {
  return new Uint8Array(ab);
}
function isCryptoKey(x) {
  return typeof CryptoKey !== "undefined" && x instanceof CryptoKey;
}

export class WebCryptoAesGcmProvider {
  constructor() {
    this.aead = {
      algo: "AES-256-GCM",
      nonceLength: 12,
      keyLength: 32,

      encrypt: async (key, nonce, plaintext, aad) => {
        if (nonce.length !== 12) throw new Error("AES-GCM nonce must be 12 bytes");
        const k = await this.importAesGcmKey(key, ["encrypt"]);

        const ctWithTag = await crypto.subtle.encrypt(
          { name: "AES-GCM", iv: toAB(nonce), additionalData: toAB(aad), tagLength: 128 },
          k,
          toAB(plaintext)
        );

        const out = fromAB(ctWithTag);
        const tag = out.slice(out.length - 16);
        const ciphertext = out.slice(0, out.length - 16);
        return { ciphertext, tag };
      },

      decrypt: async (key, nonce, ciphertext, tag, aad) => {
        if (nonce.length !== 12) throw new Error("AES-GCM nonce must be 12 bytes");
        if (tag.length !== 16) throw new Error("AES-GCM tag must be 16 bytes");
        const k = await this.importAesGcmKey(key, ["decrypt"]);

        const ctWithTag = concatBytes(ciphertext, tag);
        const pt = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: toAB(nonce), additionalData: toAB(aad), tagLength: 128 },
          k,
          toAB(ctWithTag)
        );
        return fromAB(pt);
      },
    };
  }

  // ✅ NEW: accepts Uint8Array(32) OR CryptoKey; always returns non-extractable CryptoKey
  async importAesGcmKey(key, usages = ["encrypt", "decrypt"]) {
    if (isCryptoKey(key)) return key;

    if (!(key instanceof Uint8Array) || key.length !== 32) {
      throw new Error("AES-256-GCM key must be Uint8Array(32) or CryptoKey");
    }

    return crypto.subtle.importKey("raw", toAB(key), { name: "AES-GCM" }, false, usages);
  }

  randomBytes(length) {
    const b = new Uint8Array(length);
    crypto.getRandomValues(b);
    return b;
  }

  async sha256(data) {
    const d = await crypto.subtle.digest("SHA-256", toAB(data));
    return fromAB(d);
  }

  async hmacSha256(key, data) {
    // HMAC is still bytes-based (fine). Keys like FK remain Uint8Array in core.
    const ck = await crypto.subtle.importKey("raw", toAB(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", ck, toAB(data));
    return fromAB(sig);
  }
}
