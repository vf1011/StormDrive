import { folderStatus } from "../api/folderApi.js";
import { getKeyring, getCryptoProvider } from "../state/sessionKeyring.js";

export async function resolveFolderFoK(token, folderId) {
  const keyring = getKeyring();
  const cp = getCryptoProvider();
  if (!keyring.isUnlocked()) throw new Error("Keyring locked");

  // fetch meta
  const meta = await folderStatus(token, folderId);
  // meta must include: folder_id, parent_id, key_version, wrapped_fok

  if (!meta.parent_id) {
    // root: unwrap with MAK
    return keyring.unwrapFoK(meta, keyring.getMakBytes());
  }

  // recurse on parent
  const parentFoK = await resolveFolderFoK(token, meta.parent_id);
  return keyring.unwrapFoK(meta, parentFoK);
}
