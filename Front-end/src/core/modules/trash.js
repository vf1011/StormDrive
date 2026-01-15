// src/fileOps/trash/trash.js

import {
  fetchTrashFilesApi,
  restoreFilesApi,
  permDeleteFilesApi,
} from "../api/filesapi"; // ✅ adjust path
import {
  fetchTrashFoldersApi,
  restoreFoldersApi,
  permDeleteFoldersApi,
} from "../api/folderapi"; // ✅ adjust path

export function getItemId(item) {
  if (!item) return null;
  if (typeof item.id === "object" && item.id !== null) {
    return item.id.id ?? item.id;
  }
  return item.id;
}

export function validateTrashSelection({ items }) {
  if (!items || items.length === 0) {
    return { ok: false, error: "No items selected" };
  }
  return { ok: true };
}

function pickDeletedAt(obj) {
  return (
    obj.deleted_at ||
    obj.deletedAt ||
    obj.deleted_time ||
    obj.deletedOn ||
    obj.deletedDate ||
    null
  );
}

/**
 * Fetch trash contents (files + folders) and return normalized items.
 *
 * currentFolderId:
 *  - null  => trash root
 *  - <id>  => inside a deleted folder
 */
export async function fetchTrashOnServer({ token, currentFolderId = null }) {
  const fileData = await fetchTrashFilesApi({ token });
  const folderData = await fetchTrashFoldersApi({ token });

  const mappedFiles = (fileData || []).map((f, i) => ({
    id: f.file_id ?? f.id ?? `file-${i}`,
    name: f.file_name ?? f.name ?? f.filename ?? "Unnamed file",
    type: "file",
    size: f.file_size ?? f.size ?? 0,
    parentId: f.parent_folder_id ?? f.folder_id ?? null,
    parentName: f.parent_name ?? null,
    deletedAt: pickDeletedAt(f),
    raw: f,
  }));

  const mappedFolders = (folderData || []).map((f, i) => ({
    id: f.folder_id ?? f.id ?? `folder-${i}`,
    name: f.folder_name ?? f.name ?? "Unnamed folder",
    type: "folder",
    size: 0,
    parentId: f.parent_folder_id ?? null,
    parentName: f.parent_name ?? null,
    deletedAt: pickDeletedAt(f),
    raw: f,
  }));

  const allItems = [...mappedFiles, ...mappedFolders];

  // IDs of all deleted folders
  const deletedFolderIds = mappedFolders.map((f) => f.id);

  const filteredItems = allItems.filter((item) => {
    if (currentFolderId == null) {
      // Trash root: show only items whose parent is NOT a deleted folder
      return !deletedFolderIds.includes(item.parentId);
    }
    // Inside a deleted folder
    return String(item.parentId) === String(currentFolderId);
  });

  return filteredItems;
}

/* ---------- RESTORE: FILES + FOLDERS ---------- */

export async function restoreFoldersOnServer({ token, folderIds }) {
  const ids = (Array.isArray(folderIds) ? folderIds : [folderIds])
    .map((id) => parseInt(id, 10))
    .filter((id) => !Number.isNaN(id));

  if (ids.length === 0) return { success: false, error: "No valid folder IDs" };

  try {
    const data = await restoreFoldersApi({ token, folderIds: ids });
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err?.message || "Restore folders failed" };
  }
}

export async function restoreFilesOnServer({ token, fileIds }) {
  const ids = (Array.isArray(fileIds) ? fileIds : [fileIds])
    .map((id) => String(id))
    .filter(Boolean);

  if (ids.length === 0) return { success: false, error: "No valid file IDs" };

  try {
    const data = await restoreFilesApi({ token, fileIds: ids });
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err?.message || "Restore files failed" };
  }
}

export async function restoreItemsOnServer({ token, items }) {
  const folders = items.filter((i) => i.type === "folder");
  const files = items.filter((i) => i.type !== "folder");

  const folderIds = folders.map((f) => getItemId(f));
  const fileIds = files.map((f) => getItemId(f));

  const folderResult = folderIds.length
    ? await restoreFoldersOnServer({ token, folderIds })
    : null;

  const fileResult = fileIds.length
    ? await restoreFilesOnServer({ token, fileIds })
    : null;

  return { folderResult, fileResult };
}

/* ---------- PERMANENT DELETE: FILES + FOLDERS ---------- */

export async function permDeleteFoldersOnServer({ token, folderIds }) {
  const ids = (Array.isArray(folderIds) ? folderIds : [folderIds])
    .map((id) => parseInt(id, 10))
    .filter((id) => !Number.isNaN(id));

  if (ids.length === 0) return { success: false, error: "No valid folder IDs" };

  try {
    const data = await permDeleteFoldersApi({ token, folderIds: ids });
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err?.message || "Permanent delete folders failed" };
  }
}

export async function permDeleteFilesOnServer({ token, fileIds }) {
  const ids = (Array.isArray(fileIds) ? fileIds : [fileIds])
    .map((id) => String(id))
    .filter(Boolean);

  if (ids.length === 0) return { success: false, error: "No valid file IDs" };

  try {
    const data = await permDeleteFilesApi({ token, fileIds: ids });
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err?.message || "Permanent delete files failed" };
  }
}

export async function permDeleteItemsOnServer({ token, items }) {
  const folders = items.filter((i) => i.type === "folder");
  const files = items.filter((i) => i.type !== "folder");

  const folderIds = folders.map((f) => getItemId(f));
  const fileIds = files.map((f) => getItemId(f));

  const folderResult = folderIds.length
    ? await permDeleteFoldersOnServer({ token, folderIds })
    : null;

  const fileResult = fileIds.length
    ? await permDeleteFilesOnServer({ token, fileIds })
    : null;

  return { folderResult, fileResult };
}
