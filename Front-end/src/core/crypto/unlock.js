import { utf8 } from "./provider.js";

export const DEFAULT_ARGON2 = {
  timeCost: 3,
  memoryKiB: 64 * 1024, // tune for mobile later
  parallelism: 1,
  hashLen: 32,
};

/**
 * @param {import("../crypto/provider.js").CryptoProvider} cp
 * @param {string} password
 * @param {Uint8Array} salt
 * @param {import("../crypto/provider.js").Argon2Params} [params]
 */
export async function deriveCs(cp, password, salt, params = DEFAULT_ARGON2) {
  return cp.argon2id(utf8(password), salt, params);
}

export async function deriveKekUnlock(cp, csBytes) {
  const prk = await cp.hkdfExtract(utf8("stormdrive:unlock:salt:v1"), csBytes);
  return cp.hkdfExpand(prk, utf8("stormdrive:unlock:kek:v1"), 32);
}

export async function deriveKekRecovery(cp, recoveryKeyBytes) {
  const prk = await cp.hkdfExtract(utf8("stormdrive:recovery:salt:v1"), recoveryKeyBytes);
  return cp.hkdfExpand(prk, utf8("stormdrive:recovery:kek:v1"), 32);
}
