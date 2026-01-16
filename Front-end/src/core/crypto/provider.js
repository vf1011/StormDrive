/**
 * @typedef {Object} Argon2Params
 * @property {number} timeCost
 * @property {number} memoryKiB
 * @property {number} parallelism
 * @property {number} hashLen
 */

/**
 * @typedef {Object} CryptoProvider
 * @property {(len:number)=>Uint8Array} randomBytes
 * @property {(passwordUtf8:Uint8Array, salt:Uint8Array, params:Argon2Params)=>Promise<Uint8Array>} argon2id
 * @property {(salt:Uint8Array, ikm:Uint8Array)=>Promise<Uint8Array>} hkdfExtract
 * @property {(prk:Uint8Array, info:Uint8Array, len:number)=>Promise<Uint8Array>} hkdfExpand
 * @property {(keyBytes:Uint8Array, plaintext:Uint8Array, nonce:Uint8Array, aad?:Uint8Array)=>Promise<Uint8Array>} aesGcmEncrypt
 * @property {(keyBytes:Uint8Array, ciphertext:Uint8Array, nonce:Uint8Array, aad?:Uint8Array)=>Promise<Uint8Array>} aesGcmDecrypt
 */

export function utf8(s) {
  return new TextEncoder().encode(s);
}

// Best-effort wipe (JS cannot guarantee due to GC/copies, but still worth doing)
export function wipeBytes(b) {
  if (b && b.fill) b.fill(0);
}
