import { wrapBytesV1 } from "./envelope.js";
import { bytesToB64 } from "./base64.js";
import { aadForFolder, aadForFile } from "./aad.js";

/**
 * Create Root FoK (wrapped by MAK)
 * @param {import("../crypto/provider.js").CryptoProvider} cp
 * @param {import("./Keyring.js").Keyring} keyring
 * @param {{ folderId:string, keyVersion:number }} args
 */
export async function createRootFolderKey(cp, keyring, { folderId, keyVersion }) {
  const userId = keyring.userId;
  if (!userId) throw new Error("Keyring not unlocked");

  const fok = cp.randomBytes(32);
  const aad = aadForFolder(userId, folderId, null, keyVersion);
  const wrapped_fok = await wrapBytesV1(cp, keyring.getMakBytes(), fok, aad);

  return { fokBytes: fok, wrapped_fok };
}

/**
 * Create child folder FoK (wrapped by parent FoK)
 * @param {import("../crypto/provider.js").CryptoProvider} cp
 * @param {import("./Keyring.js").Keyring} keyring
 * @param {{ folderId:string, parentId:string, parentFoKBytes:Uint8Array, keyVersion:number }} args
 */
export async function createChildFolderKey(cp, keyring, { folderId, parentId, parentFoKBytes, keyVersion }) {
  const userId = keyring.userId;
  if (!userId) throw new Error("Keyring not unlocked");

  const fok = cp.randomBytes(32);
  const aad = aadForFolder(userId, folderId, parentId, keyVersion);
  const wrapped_fok = await wrapBytesV1(cp, parentFoKBytes, fok, aad);

  return { fokBytes: fok, wrapped_fok };
}

/**
 * Create file FMK (wrapped by folder FoK)
 * @param {import("../crypto/provider.js").CryptoProvider} cp
 * @param {import("./Keyring.js").Keyring} keyring
 * @param {{ fileId:string, folderId:string, folderFoKBytes:Uint8Array, keyVersion:number }} args
 */
export async function createFileFMK(cp, keyring, { fileId, folderId, folderFoKBytes, keyVersion }) {
  const userId = keyring.userId;
  if (!userId) throw new Error("Keyring not unlocked");

  const fmk = cp.randomBytes(32);
  const aad = aadForFile(userId, fileId, folderId, keyVersion);
  const wrapped_fmk = await wrapBytesV1(cp, folderFoKBytes, fmk, aad);

  return { fmkBytes: fmk, wrapped_fmk };
}

/**
 * Create file version header (nonce_seed is random per version)
 * @param {import("../crypto/provider.js").CryptoProvider} cp
 * @param {{ alg:"AES-GCM"|"XCHACHA20-POLY1305", chunkSize:number, totalChunks:number }} args
 */
export function createFileVersionHeaderV1(cp, { alg, chunkSize, totalChunks }) {
  const nonceSeed = cp.randomBytes(32);
  return {
    v: 1,
    alg,
    chunk_size: chunkSize,
    nonce_seed_b64: bytesToB64(nonceSeed),
    total_chunks: totalChunks,
  };
}
