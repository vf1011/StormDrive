// src/web/auth/cryptoBootstrap.js
// Web-only crypto bootstrap used by sessionManager.completeSignupCrypto().
// Responsibilities:
// - Generate userSalt + MAK
// - Wrap MAK for password + recovery (keybundle/init payload)
// - Create root folder FoK and wrap under MAK (folder/init-folder payload)
//
// This uses ONLY client-side crypto; backend stores only wrapped blobs.

import { bytesToB64, b64ToBytes } from "../../core/crypto/base64.js";
import { wrapBytesV1 } from "../../core/crypto/envelope.js";
import { deriveCs, deriveKekUnlock, deriveKekRecovery } from "../../core/crypto/unlock.js";
import { aadForMak, aadForMakRecovery, aadForFolder } from "../../core/crypto/aad.js";
import { wipeBytes } from "../../core/crypto/provider.js";

import { cryptoProvider, keyring } from "./keyringSingleton.js";

export const ROOT_FOLDER_ID = "root";

/**
 * Create a random Recovery Key bytes (32 bytes).
 * You should display it to the user and make them confirm saving it.
 */
export function generateRecoveryKeyBytes() {
  return cryptoProvider.randomBytes(32);
}

/**

 *
 * @param {{ userId:string, password:string, recoveryKeyBytes:Uint8Array }} args
 * @returns {Promise<{ keybundleInitPayload: any, rootFolderInitPayload: any, recoveryKey_b64?: string }>}
 */
async function buildSignupInit({ userId, password, recoveryKeyBytes }) {
  if (!userId) throw new Error("buildSignupInit: userId required");
  if (!password) throw new Error("buildSignupInit: password required");
  if (!(recoveryKeyBytes instanceof Uint8Array) || recoveryKeyBytes.length < 16) {
    throw new Error("buildSignupInit: recoveryKeyBytes must be Uint8Array");
  }

  // 1) userSalt + MAK
  const userSalt = cryptoProvider.randomBytes(16);
  const MAK = cryptoProvider.randomBytes(32);

  // 2) Derive KEK from password
  const cs = await deriveCs(cryptoProvider, password, userSalt);
  const kekUnlock = await deriveKekUnlock(cryptoProvider, cs);
  wipeBytes(cs);

  // 3) Derive KEK from recovery key
  const kekRecovery = await deriveKekRecovery(cryptoProvider, recoveryKeyBytes);

  // 4) Wrap MAK (password + recovery)
  const wrapped_mak_password = await wrapBytesV1(
    cryptoProvider,
    kekUnlock,
    MAK,
    aadForMak(userId)
  );

  const wrapped_mak_recovery = await wrapBytesV1(
    cryptoProvider,
    kekRecovery,
    MAK,
    aadForMakRecovery(userId)
  );

  wipeBytes(kekUnlock);
  wipeBytes(kekRecovery);

  const keybundleInitPayload = {
    user_salt_b64: bytesToB64(userSalt),
    wrapped_mak_password,
    wrapped_mak_recovery,
    kdf_v: 1,
  };

  // 5) Create root FoK and wrap under MAK
  // Root folder key version starts at 1
  const rootKeyVersion = 1;
  const FoK_root = cryptoProvider.randomBytes(32);

  const rootAad = aadForFolder(userId, ROOT_FOLDER_ID, null, rootKeyVersion);
  const wrapped_fok_root = await wrapBytesV1(
    cryptoProvider,
    MAK,
    FoK_root,
    rootAad
  );

  // Root folder init payload: backend may ignore folder_id and generate its own.
  // If your backend expects numeric folder_id, set folder_id: null and let backend assign.
  const rootFolderInitPayload = {
    // folder_id: null, // optional; include only if your backend supports client-provided id
    parent_id: null,
    name: "My Drive",
    key_version: rootKeyVersion,
    wrapped_fok: wrapped_fok_root,
    // If your backend needs to explicitly mark root:
    // is_root: true,
  };


  // BUT sessionManager will still fetch bundle and unlock later; this is only for smooth UX.
  // If you prefer strict flow, comment this out.
  try {
    keyring.userId = userId; // only if your Keyring exposes userId; if not, ignore
    // You can also leave it locked and let normal flow unlock after bundle fetch.
  } catch {}

  // Return recovery key as b64 so UI can show/store it (optional)
  const recoveryKey_b64 = bytesToB64(recoveryKeyBytes);

  // Wipe MAK only if you don't want it in memory before unlock.
  // If you want to keep it for immediate use, keep it and rely on keyring unlocking later.
  // For strictness, we wipe it here.
  wipeBytes(MAK);
  wipeBytes(FoK_root);

  return { keybundleInitPayload, rootFolderInitPayload, recoveryKey_b64 };
}

export const cryptoBootstrap = {
  buildSignupInit,
  generateRecoveryKeyBytes,
};
