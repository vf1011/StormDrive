// src/fileOps/copy/copyLogic.js
 
import { copyFilesApi } from "../../web/api/filesapi";
import { copyFoldersApi } from "../../web/api/folderapi";

export function getItemId(item) {
  if (!item) return null;
  if (typeof item.id === "object" && item.id !== null) {
    return item.id.id ?? item.id;
  }
  return item.id;
}

export function validateCopy({ items, targetFolderId }) {
  if (!items || items.length === 0) {
    return { ok: false, error: "Nothing to paste" };
  }
  if (targetFolderId === undefined) {
    return { ok: false, error: "Target folder is not selected" };
  }
  return { ok: true };
}

export async function copyFilesOnServer({ token, fileIds, targetFolderId }) {
  const ids = (Array.isArray(fileIds) ? fileIds : [fileIds])
    .map((id) => String(id))
    .filter(Boolean);

  if (ids.length === 0) {
    return { success: false, error: "No valid file IDs provided" };
  }

  try {
    const data = await copyFilesApi({ token, fileIds: ids, targetFolderId });
    return { success: true, data }; // data.copied_files, etc.
  } catch (err) {
    console.error("❌ Copy files error:", err);
    return { success: false, error: err.message };
  }
}

export async function copyFoldersOnServer({
  token,
  folderIds,
  targetFolderId,
}) {
  const ids = (Array.isArray(folderIds) ? folderIds : [folderIds])
    .map((id) => parseInt(id, 10))
    .filter((id) => !Number.isNaN(id));

  if (ids.length === 0) {
    return { success: false, error: "No valid folder IDs provided" };
  }

  try {
    const data = await copyFoldersApi({ token, folderIds: ids, targetFolderId });
    return { success: true, data }; // data.copied_folders, etc.
  } catch (err) {
    console.error("❌ Copy folders error:", err);
    return { success: false, error: err.message };
  }
}

export async function copyItemsOnServer({ token, items, targetFolderId }) {
  const folders = items.filter((item) => item.type === "folder");
  const files   = items.filter((item) => item.type !== "folder");

  const folderIds = folders.map((f) => getItemId(f));
  const fileIds   = files.map((f) => getItemId(f));

  let folderResult = null;
  let fileResult   = null;

  if (folderIds.length > 0) {
    folderResult = await copyFoldersOnServer({ token, folderIds, targetFolderId });
  }
  if (fileIds.length > 0) {
    fileResult = await copyFilesOnServer({ token, fileIds, targetFolderId });
  }

  return { folderResult, fileResult };
}
