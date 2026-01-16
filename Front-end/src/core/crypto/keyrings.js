import { wipeBytes, utf8 } from "./provider.js";
import { b64ToBytes } from "./base64.js";
import { unwrapBytesV1 } from "./envelope.js";
import { deriveCs, deriveKekUnlock, deriveKekRecovery } from "./unlock.js";
import {
  aadForMak,
  aadForMakRecovery,
  aadForFolder,
  aadForFile,
  infoForDek,
} from "./aad.js";

export class Keyring {
  /**
   * @param {import("../crypto/provider.js").CryptoProvider} cp
   */
  constructor(cp) {
    this.cp = cp;
    this.userId = null;

    this.MAK = null; // Uint8Array (plaintext in memory)
    this.fokCache = new Map(); // folder_id -> Uint8Array
    this.fmkCache = new Map(); // file_id -> Uint8Array
  }

  isUnlocked() {
    return !!this.MAK && !!this.userId;
  }

  lock() {
    if (this.MAK) wipeBytes(this.MAK);
    for (const v of this.fokCache.values()) wipeBytes(v);
    for (const v of this.fmkCache.values()) wipeBytes(v);
    this.fokCache.clear();
    this.fmkCache.clear();
    this.MAK = null;
    this.userId = null;
  }

  /**
   * @param {import("../protocols/types.js").Keybundle} bundle
   * @param {string} password
   */
  async unlockWithPassword(bundle, password) {
    const salt = b64ToBytes(bundle.user_salt_b64);
    const cs = await deriveCs(this.cp, password, salt);
    const kek = await deriveKekUnlock(this.cp, cs);
    wipeBytes(cs);

    const mak = await unwrapBytesV1(this.cp, kek, bundle.wrapped_mak_password, aadForMak(bundle.user_id));
    wipeBytes(kek);

    this.userId = bundle.user_id;
    this.MAK = mak;
  }

  /**
   * @param {import("../protocols/types.js").Keybundle} bundle
   * @param {Uint8Array} recoveryKeyBytes
   */
  async unlockWithRecoveryKey(bundle, recoveryKeyBytes) {
    const kek = await deriveKekRecovery(this.cp, recoveryKeyBytes);
    const mak = await unwrapBytesV1(this.cp, kek, bundle.wrapped_mak_recovery, aadForMakRecovery(bundle.user_id));
    wipeBytes(kek);

    this.userId = bundle.user_id;
    this.MAK = mak;
  }

  getMakBytes() {
    if (!this.MAK) throw new Error("Not unlocked");
    return this.MAK;
  }

  /**
   * Unwrap and cache folder FoK
   * @param {import("../protocols/types.js").FolderMeta} folder
   * @param {Uint8Array} parentWrappingKeyBytes  // parent FoK or MAK for root
   */
  async unwrapFoK(folder, parentWrappingKeyBytes) {
    if (!this.userId) throw new Error("Not unlocked");

    const cached = this.fokCache.get(folder.folder_id);
    if (cached) return cached;

    const aad = aadForFolder(this.userId, folder.folder_id, folder.parent_id, folder.key_version);
    const fok = await unwrapBytesV1(this.cp, parentWrappingKeyBytes, folder.wrapped_fok, aad);
    this.fokCache.set(folder.folder_id, fok);
    return fok;
  }

  /**
   * Unwrap and cache file FMK
   * @param {import("../protocols/types.js").FileMeta} file
   * @param {Uint8Array} folderFoK
   */
  async unwrapFMK(file, folderFoK) {
    if (!this.userId) throw new Error("Not unlocked");

    const cached = this.fmkCache.get(file.file_id);
    if (cached) return cached;

    const aad = aadForFile(this.userId, file.file_id, file.folder_id, file.key_version);
    const fmk = await unwrapBytesV1(this.cp, folderFoK, file.wrapped_fmk, aad);
    this.fmkCache.set(file.file_id, fmk);
    return fmk;
  }

  /**
   * DEK_v = HKDF(FMK, info=file+version)
   * @param {string} fileId
   * @param {number} version
   * @param {Uint8Array} fmk
   */
  async deriveDEK(fileId, version, fmk) {
    const prk = await this.cp.hkdfExtract(utf8("stormdrive:dek:salt:v1"), fmk);
    return this.cp.hkdfExpand(prk, utf8(infoForDek(fileId, version)), 32);
  }
}
