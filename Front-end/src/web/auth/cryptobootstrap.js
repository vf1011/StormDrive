// src/web/auth/cryptoBootstrap.js

import { bytesToB64 } from "../../core/crypto/base64.js";
import { deriveCs, deriveKekUnlock, deriveKekRecovery } from "../../core/crypto/unlock.js";
import { aadForMak, aadForMakRecovery, aadForFolder , aadForFolderKey } from "../../core/crypto/aad.js";
import { wipeBytes } from "../../core/crypto/provider.js";
<<<<<<< HEAD

import { cryptoProvider } from "./keyringSingleton.js";
import { putFolderKeys, setRootFolderUid } from "./keyringSingleton.js";

=======
import { cryptoProvider, keyring } from "./keyringSingleton.js";

export const ROOT_FOLDER_ID = "root";

>>>>>>> 77f2c03c30354bce44987e97c7576d8e6d1c4d4a
export function generateRecoveryKeyBytes() {
  return cryptoProvider.randomBytes(32);
}

<<<<<<< HEAD
// UUID helper (no dependency)
function uuidv4() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const b = cryptoProvider.randomBytes(16);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function genKey32() {
  return cryptoProvider.randomBytes(32);
}

// Wrap a 32-byte key with AES-GCM under wrappingKey32
async function wrapKeyGcm({ wrappingKey32, plaintextKey32, nonce12, aadBytes }) {
  const ctWithTag = await cryptoProvider.aesGcmEncrypt(
    wrappingKey32,
    plaintextKey32,
    nonce12,
    aadBytes
  );
  return ctWithTag; // tag included in ctWithTag
}

/**
 * Option-1 signup init:
 * - keybundleInitPayload for /keybundle/init (your backend schema)
 * - bootstrapDefaultsPayload for /folder/bootstrap-defaults (root + defaults + wrapped FK/FOK)
 */
async function buildSignupInit({
  userId,
  password,
  recoveryKeyBytes,
  rootName = "My Drive",
  defaultNames = ["Documents", "Downloads", "Pictures", "Videos", "Music"],
}) {
=======
async function buildSignupInit({ userId, password, recoveryKeyBytes }) {
>>>>>>> 77f2c03c30354bce44987e97c7576d8e6d1c4d4a
  if (!userId) throw new Error("buildSignupInit: userId required");
  if (!password) throw new Error("buildSignupInit: password required");
  if (!(recoveryKeyBytes instanceof Uint8Array) || recoveryKeyBytes.length < 16) {
    throw new Error("buildSignupInit: recoveryKeyBytes must be Uint8Array");
  }

  // 1) userSalt + MAK
  const userSalt = cryptoProvider.randomBytes(16);
  const MAK = genKey32();

  // 2) Derive KEK from password
  const cs = await deriveCs(cryptoProvider, password, userSalt);
  const kekUnlock = await deriveKekUnlock(cryptoProvider, cs);
  wipeBytes(cs);

<<<<<<< HEAD
  // 3) Recovery KEK (not sent to backend in your current schema)
  const kekRecovery = await deriveKekRecovery(cryptoProvider, recoveryKeyBytes);

  // 4) Wrap MAK to match backend schema
=======
  // 3) (Optional) derive KEK from recovery key (not sent to backend in your current backend schema)
  const kekRecovery = await deriveKekRecovery(cryptoProvider, recoveryKeyBytes);

  // 4) Wrap MAK in the exact format backend expects:
  //    wrapped_mak_b64 + wrapp_nonce_b64 (+ optional wrapp_tag_b64)
>>>>>>> 77f2c03c30354bce44987e97c7576d8e6d1c4d4a
  const makNonce = cryptoProvider.randomBytes(12);
  const wrappedMakCtWithTag = await cryptoProvider.aesGcmEncrypt(
    kekUnlock,
    MAK,
    makNonce,
    aadForMak(userId)
  );

<<<<<<< HEAD
  // optional local recovery-wrapped MAK (not sent to backend)
  try {
    const recNonce = cryptoProvider.randomBytes(12);
    await cryptoProvider.aesGcmEncrypt(kekRecovery, MAK, recNonce, aadForMakRecovery(userId));
=======
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
>>>>>>> 77f2c03c30354bce44987e97c7576d8e6d1c4d4a
  } catch {}

  const keybundleInitPayload = {
    user_salt_b64: bytesToB64(userSalt),
    wrapped_mak_b64: bytesToB64(wrappedMakCtWithTag),
    wrapp_nonce_b64: bytesToB64(makNonce),
<<<<<<< HEAD
    wrapp_tag_b64: null,
    wrapp_algo: "AES-256-GCM",
    kdf_algo: "argon2id",
    kdf_params: { timeCost: 3, memoryKiB: 65536, parallelism: 1, hashLen: 32 },
    version: 1,
  };

  // ---------- Option 1 folder bootstrap ----------
  const keyVersion = 1;

  // Root uid + keys
  const rootUid = uuidv4();
  const rootFK = genKey32();
  const rootFOK = genKey32();

  // AAD separation for FK vs FOK (without changing aad.js)
    const aadRootFK  = aadForFolderKey(userId, rootUid, null, keyVersion, "FK");
    const aadRootFOK = aadForFolderKey(userId, rootUid, null, keyVersion, "FOK");

  const rootFkNonce = cryptoProvider.randomBytes(12);
  const rootFokNonce = cryptoProvider.randomBytes(12);

  const wrapped_root_fk = await wrapKeyGcm({
    wrappingKey32: MAK,
    plaintextKey32: rootFK,
    nonce12: rootFkNonce,
    aadBytes: aadRootFK,
  });

  const wrapped_root_fok = await wrapKeyGcm({
    wrappingKey32: MAK,
    plaintextKey32: rootFOK,
    nonce12: rootFokNonce,
    aadBytes: aadRootFOK,
  });

  // Children defaults (wrapped by rootFOK)
  const children = [];
  for (const name of defaultNames) {
    const uid = uuidv4();
    const fk = genKey32();
    const fok = genKey32();

    const aadRootFK  = aadForFolderKey(userId, rootUid, null, keyVersion, "FK");
    const aadRootFOK = aadForFolderKey(userId, rootUid, null, keyVersion, "FOK");

    const fkNonce = cryptoProvider.randomBytes(12);
    const fokNonce = cryptoProvider.randomBytes(12);

    const wrapped_fk = await wrapKeyGcm({
      wrappingKey32: rootFOK,
      plaintextKey32: fk,
      nonce12: fkNonce,
      aadBytes: aadFK,
    });

    const wrapped_fok = await wrapKeyGcm({
      wrappingKey32: rootFOK,
      plaintextKey32: fok,
      nonce12: fokNonce,
      aadBytes: aadFOK,
    });

    children.push({
      folder_uid: uid,
      parent_folder_uid: rootUid,
      folder_name: name,
      key_version: keyVersion,
      enc: {
        wrapped_fk_b64: bytesToB64(wrapped_fk),
        nonce_fk_b64: bytesToB64(fkNonce),
        wrapped_fok_b64: bytesToB64(wrapped_fok),
        nonce_fok_b64: bytesToB64(fokNonce),
        wrapp_algo: "AES-256-GCM",
        version: 1,
      },
    });

    // keep plaintext in-memory for immediate UX
    putFolderKeys(uid, fk, fok);
  }

  // keep root keys in-memory + store root pointer
  setRootFolderUid(rootUid);
  putFolderKeys(rootUid, rootFK, rootFOK);

  const bootstrapDefaultsPayload = {
    root: {
      folder_uid: rootUid,
      parent_folder_uid: null,
      folder_name: rootName,
      key_version: keyVersion,
      enc: {
        wrapped_fk_b64: bytesToB64(wrapped_root_fk),
        nonce_fk_b64: bytesToB64(rootFkNonce),
        wrapped_fok_b64: bytesToB64(wrapped_root_fok),
        nonce_fok_b64: bytesToB64(rootFokNonce),
        wrapp_algo: "AES-256-GCM",
        version: 1,
      },
    },
    children,
  };

  // wipe sensitive intermediates
  wipeBytes(kekUnlock);
  wipeBytes(kekRecovery);
  wipeBytes(MAK); // we already used it to wrap root FK/FOK

  return {
    keybundleInitPayload,
    bootstrapDefaultsPayload,
    recoveryKey_b64: bytesToB64(recoveryKeyBytes),
    root_folder_uid: rootUid,
  };
=======
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
>>>>>>> 77f2c03c30354bce44987e97c7576d8e6d1c4d4a
}

export const cryptoBootstrap = {
  buildSignupInit,
  generateRecoveryKeyBytes,
};
