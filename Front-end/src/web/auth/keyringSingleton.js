// src/web/auth/keyringSingleton.js
import { WebCryptoProvider } from "../crypto/webCryptoProvider.js";
import { Keyring } from "../../core/crypto/keyrings.js";

const cp = new WebCryptoProvider();
export const keyring = new Keyring(cp);
export const cryptoProvider = cp;

// NEW: Option-1 folder key cache (in-memory)
const folderKeys = new Map(); // folder_uid -> { fk: Uint8Array(32), fok: Uint8Array(32) }
let rootFolderUid = null;

export function setRootFolderUid(uid) {
  rootFolderUid = String(uid);
  try { localStorage.setItem("sd.rootFolderUid", rootFolderUid); } catch {}
}
export function getRootFolderUid() {
  if (rootFolderUid) return rootFolderUid;
  try { rootFolderUid = localStorage.getItem("sd.rootFolderUid"); } catch {}
  return rootFolderUid;
}

export function putFolderKeys(folderUid, fk32, fok32) {
  folderKeys.set(String(folderUid), { fk: fk32, fok: fok32 });
}
export function hasFolderKeys(folderUid) {
  return folderKeys.has(String(folderUid));
}
export function getFolderKeys(folderUid) {
  return folderKeys.get(String(folderUid)) || null;
}
export function clearFolderKeys() {
  folderKeys.clear();
}
