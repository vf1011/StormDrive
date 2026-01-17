import { bytesToB64, b64ToBytes } from "./base64.js";
import { utf8 } from "./provider.js";

/**
 * @param {import("./provider.js").CryptoProvider} cp
 * @param {Uint8Array} wrappingKeyBytes
 * @param {Uint8Array} rawKeyBytes
 * @param {string} aadStr
 * @returns {Promise<import("../protocols/types.js").EnvelopeV1>}
 */
export async function wrapBytesV1(cp, wrappingKeyBytes, rawKeyBytes, aadStr) {
  const nonce = cp.randomBytes(12); // AES-GCM standard 96-bit nonce
  const aad = utf8(aadStr);
  const ct = await cp.aesGcmEncrypt(wrappingKeyBytes, rawKeyBytes, nonce, aad);

  return {
    v: 1,
    alg: "AES-GCM",
    nonce_b64: bytesToB64(nonce),
    ct_b64: bytesToB64(ct),
    aad_v: 1,
  };
}

/**
 * @param {import("./provider.js").CryptoProvider} cp
 * @param {Uint8Array} wrappingKeyBytes
 * @param {import("../protocols/types.js").EnvelopeV1} env
 * @param {string} aadStr
 * @returns {Promise<Uint8Array>}
 */
export async function unwrapBytesV1(cp, wrappingKeyBytes, env, aadStr) {
  if (!env || env.v !== 1 || env.alg !== "AES-GCM") throw new Error("Unsupported envelope");
  const nonce = b64ToBytes(env.nonce_b64);
  const ct = b64ToBytes(env.ct_b64);
  const aad = utf8(aadStr);
  return cp.aesGcmDecrypt(wrappingKeyBytes, ct, nonce, aad);
}
