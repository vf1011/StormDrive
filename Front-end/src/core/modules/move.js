// src/fileOps/move/moveLogic.js

import { moveFilesApi } from "../api/filesapi";
import { moveFoldersApi } from "../api/folderapi";

// Normalise id like in your old code
export function getItemId(item) {
  if (!item) return null;
  if (typeof item.id === "object" && item.id !== null) {
    return item.id.id ?? item.id;
  }
  return item.id;
}

/* Basic validation before move. */
export function validateMove({ items, targetFolderId }) {
  if (!items || items.length === 0) {
    return { ok: false, error: "No items selected to move" };
  }
  if (targetFolderId === undefined) {
    return { ok: false, error: "Target folder is not selected" };
  }
  return { ok: true };
}

/*Core logic: move FILES only (single + multiple via one API). */
export async function moveFilesOnServer({ token, fileIds, targetFolderId }) {
  const idList = (Array.isArray(fileIds) ? fileIds : [fileIds])
    .map((id) => String(id))
    .filter(Boolean);

  if (idList.length === 0) {
    return { success: false, error: "No valid file IDs provided" };
  }

  try {
    await moveFilesApi({
      token,
      fileIds: idList,
      newFolderId: targetFolderId,
    });
    return { success: true };
  } catch (err) {
    console.error("❌ Move files error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Core logic: move FOLDERS only (single + multiple via one API).
 */
export async function moveFoldersOnServer({
  token,
  folderIds,
  targetFolderId,
}) {
  const idList = (Array.isArray(folderIds) ? folderIds : [folderIds])
    .map((id) => parseInt(id, 10))
    .filter((id) => !Number.isNaN(id));

  if (idList.length === 0) {
    return { success: false, error: "No valid folder IDs provided" };
  }

  try {
    await moveFoldersApi({
      token,
      folderIds: idList,
      targetFolderId,
    });
    return { success: true };
  } catch (err) {
    console.error("❌ Move folders error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Core logic: move items (files + folders) together.
 * items: [{ id, type: "file" | "folder", name, parentId? }, ...]
 *
 * Returns: { success: Array<item>, failed: Array<item> }
 */
export async function moveItemsOnServer({ token, items, targetFolderId }) {
  const files = items.filter((item) => item.type !== "folder");
  const folders = items.filter((item) => item.type === "folder");

  const fileIds = files.map((f) => getItemId(f));
  const folderIds = folders.map((f) => getItemId(f));

  const success = [];
  const failed = [];

  // Move files via unified API
  if (fileIds.length > 0) {
    const res = await moveFilesOnServer({
      token,
      fileIds,
      targetFolderId,
    });
    if (res.success) success.push(...files);
    else failed.push(...files);
  }

  // Move folders via unified API
  if (folderIds.length > 0) {
    const res = await moveFoldersOnServer({
      token,
      folderIds,
      targetFolderId,
    });
    if (res.success) success.push(...folders);
    else failed.push(...folders);
  }

  return { success, failed };
}
