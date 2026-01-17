// src/web/auth/cryptoBootstrap.js

import { bytesToB64 } from "../../core/crypto/base64.js";
import { deriveCs, deriveKekUnlock, deriveKekRecovery } from "../../core/crypto/unlock.js";
import { aadForMak, aadForMakRecovery, aadForFolder } from "../../core/crypto/aad.js";
import { wipeBytes } from "../../core/crypto/provider.js";
import { cryptoProvider, keyring } from "./keyringSingleton.js";

export const ROOT_FOLDER_ID = "root";

export function generateRecoveryKeyBytes() {
  return cryptoProvider.randomBytes(32);
}

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

  // 3) (Optional) derive KEK from recovery key (not sent to backend in your current backend schema)
  const kekRecovery = await deriveKekRecovery(cryptoProvider, recoveryKeyBytes);

  // 4) Wrap MAK in the exact format backend expects:
  //    wrapped_mak_b64 + wrapp_nonce_b64 (+ optional wrapp_tag_b64)
  const makNonce = cryptoProvider.randomBytes(12);
  const wrappedMakCtWithTag = await cryptoProvider.aesGcmEncrypt(
    kekUnlock,
    MAK,
    makNonce,
    aadForMak(userId)
  );

  // OPTIONAL: keep a local recovery-wrapped MAK for later UX (DO NOT send to backend /keybundle/init)
  // You can remove this block if you don’t need it right now.
  try {
    const recNonce = cryptoProvider.randomBytes(12);
    const wrappedRec = await cryptoProvider.aesGcmEncrypt(
      kekRecovery,
      MAK,
      recNonce,
      aadForMakRecovery(userId)
    );
    // store locally if you want (not used by backend currently)
    void wrappedRec;
    void recNonce;
  } catch {}

  const keybundleInitPayload = {
    user_salt_b64: bytesToB64(userSalt),
    wrapped_mak_b64: bytesToB64(wrappedMakCtWithTag),
    wrapp_nonce_b64: bytesToB64(makNonce),
    wrapp_tag_b64: null,          // tag is included in wrappedMakCtWithTag (WebCrypto)
    wrapp_algo: "AES-256-GCM",
    kdf_algo: "argon2id",
    kdf_params: {
      timeCost: 3,
      memoryKiB: 65536,
      parallelism: 1,
      hashLen: 32,
    },
    version: 1,
  };

  // 5) Root folder FoK wrapped under MAK (leave as you had, or update to your folder API schema)
  const rootKeyVersion = 1;
  const FoK_root = cryptoProvider.randomBytes(32);

  const rootAad = aadForFolder(userId, ROOT_FOLDER_ID, null, rootKeyVersion);

  // If your folder backend expects envelope, keep your existing wrapBytesV1 approach.
  // Otherwise, you need to match that backend schema too.
  const fokNonce = cryptoProvider.randomBytes(12);
  const wrappedFokCtWithTag = await cryptoProvider.aesGcmEncrypt(MAK, FoK_root, fokNonce, rootAad);

 const rootFolderInitPayload = {
  folder_name: "My Drive",
  parent_id: 0,                 // safer than null
  key_version: rootKeyVersion,

  wrapped_fok_b64: bytesToB64(wrappedFokCtWithTag),
  wrapp_nonce_b64: bytesToB64(fokNonce),
  wrapp_tag_b64: null,
  wrapp_algo: "AES-256-GCM",
  version: 1,

  entries: [],
  chunk_size: 4 * 1024 * 1024,
};

  try {
    keyring.userId = userId;
  } catch {}

  wipeBytes(kekUnlock);
  wipeBytes(kekRecovery);
  wipeBytes(MAK);
  wipeBytes(FoK_root);

  return { keybundleInitPayload, rootFolderInitPayload };
}

export const cryptoBootstrap = {
  buildSignupInit,
  generateRecoveryKeyBytes,
};
