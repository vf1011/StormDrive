import { b64ToBytes } from "./base64.js";
import { wrapBytesV1 } from "./envelope.js";
import { deriveCs, deriveKekUnlock, deriveKekRecovery } from "./unlock.js";
import { aadForMak, aadForMakRecovery } from "./aad.js";
import { wipeBytes } from "./provider.js";

/**
 * Create wrapped_mak_password for a (new) password.
 * @param {import("../crypto/provider.js").CryptoProvider} cp
 * @param {{ userId:string, userSaltB64:string, password:string, makBytes:Uint8Array }} args
 */
export async function makeWrappedMakPassword(cp, { userId, userSaltB64, password, makBytes }) {
  const salt = b64ToBytes(userSaltB64);
  const cs = await deriveCs(cp, password, salt);
  const kek = await deriveKekUnlock(cp, cs);
  wipeBytes(cs);

  const wrapped = await wrapBytesV1(cp, kek, makBytes, aadForMak(userId));
  wipeBytes(kek);
  return wrapped;
}

/**
 * Create wrapped_mak_recovery from a RecoveryKey.
 * @param {import("../crypto/provider.js").CryptoProvider} cp
 * @param {{ userId:string, recoveryKeyBytes:Uint8Array, makBytes:Uint8Array }} args
 */
export async function makeWrappedMakRecovery(cp, { userId, recoveryKeyBytes, makBytes }) {
  const kek = await deriveKekRecovery(cp, recoveryKeyBytes);
  const wrapped = await wrapBytesV1(cp, kek, makBytes, aadForMakRecovery(userId));
  wipeBytes(kek);
  return wrapped;
}
