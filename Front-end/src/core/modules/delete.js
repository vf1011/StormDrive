// src/fileOps/delete/deleteLogic.js

import { deleteFilesApi } from "../../web/api/filesapi";
import { deleteFoldersApi } from "../../web/api/folderapi";

export function getItemId(item) {
  if (!item) return null;
  if (typeof item.id === "object" && item.id !== null) {
    return item.id.id ?? item.id;
  }
  return item.id;
}

export function validateDelete({ items }) {
  if (!items || items.length === 0) {
    return { ok: false, error: "No items selected to delete" };
  }
  return { ok: true };
}

/**
 * Soft delete files only (to trash).
 */
export async function deleteFilesOnServer({ token, fileIds }) {
  const ids = (Array.isArray(fileIds) ? fileIds : [fileIds])
    .map((id) => String(id))
    .filter(Boolean);

  if (ids.length === 0) {
    return { success: false, error: "No valid file IDs provided" };
  }

  try {
    const data = await deleteFilesApi({ token, fileIds: ids });
    return { success: true, data };
  } catch (err) {
    console.error("❌ Delete files error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Soft delete folders only (to trash).
 */
export async function deleteFoldersOnServer({ token, folderIds }) {
  const ids = (Array.isArray(folderIds) ? folderIds : [folderIds])
    .map((id) => parseInt(id, 10))
    .filter((id) => !Number.isNaN(id));

  if (ids.length === 0) {
    return { success: false, error: "No valid folder IDs provided" };
  }

  try {
    const data = await deleteFoldersApi({ token, folderIds: ids });
    return { success: true, data };
  } catch (err) {
    console.error("❌ Delete folders error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Soft delete mixed items (files + folders) to trash.
 *
 * items: [{ id, type: "file" | "folder", ... }]
 *
 * Returns: { folderResult, fileResult }
 */
export async function deleteItemsOnServer({ token, items }) {
  const folders = items.filter((i) => i.type === "folder");
  const files = items.filter((i) => i.type !== "folder");

  const folderIds = folders.map((f) => getItemId(f));
  const fileIds = files.map((f) => getItemId(f));

  let folderResult = null;
  let fileResult = null;

  if (folderIds.length > 0) {
    folderResult = await deleteFoldersOnServer({ token, folderIds });
  }
  if (fileIds.length > 0) {
    fileResult = await deleteFilesOnServer({ token, fileIds });
  }

  return { folderResult, fileResult };
}
