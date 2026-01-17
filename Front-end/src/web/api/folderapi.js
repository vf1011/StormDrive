// apps/web/src/api/folderApi.js
import { API_BASE_URL } from "./config";

const baseUrl = String(API_BASE_URL || "").replace(/\/+$/, "");

async function readError(res) {
  const data = await res.json().catch(() => null);
  return (data && (data.detail || data.message)) || `HTTP ${res.status}`;
}

async function fetchJson(url, { token, method = "GET", body } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json().catch(() => ({}));
}

// -----------------------------
// BASIC FOLDER OPS (route-fixed)
// -----------------------------

export async function renameFolderApi({ token, folderId, newName }) {
  return fetchJson(`${baseUrl}/folder/rename`, {
    token,
    method: "POST",
    body: { folder_id: Number(folderId), new_folder_name: newName },
  });
}

// Legacy move (no crypto)
export async function moveFoldersApi({ token, folderIds, targetFolderId }) {
  const ids = (Array.isArray(folderIds) ? folderIds : [folderIds])
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id));

  if (!ids.length) throw new Error("No valid folder IDs provided for move");

  return fetchJson(`${baseUrl}/folder/move`, {
    token,
    method: "POST",
    body: {
      folder_ids: ids,
      target_folder_id: targetFolderId === "root" || targetFolderId == null ? null : Number(targetFolderId),
    },
  });
}

// ✅ Zero-knowledge move: include wrapped_fok per moved folder
export async function moveFoldersEncryptedApi({ token, moves }) {
  if (!Array.isArray(moves) || moves.length === 0) throw new Error("moves[] required");
  // moves: [{ folder_id, target_folder_id, wrapped_fok }]
  return fetchJson(`${baseUrl}/folder/move`, { token, method: "POST", body: { moves } });
}

export async function copyFoldersApi({ token, folderIds, targetFolderId }) {
  const ids = (Array.isArray(folderIds) ? folderIds : [folderIds])
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id));

  if (!ids.length) throw new Error("No valid folder IDs provided for copy");

  return fetchJson(`${baseUrl}/folder/copy`, {
    token,
    method: "POST",
    body: {
      folder_ids: ids,
      target_folder_id: targetFolderId === "root" || targetFolderId == null ? null : Number(targetFolderId),
    },
  });
}

export async function deleteFoldersApi({ token, folderIds }) {
  const ids = (Array.isArray(folderIds) ? folderIds : [folderIds])
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id));

  if (!ids.length) throw new Error("No valid folder IDs provided for delete");

  return fetchJson(`${baseUrl}/folder/delete`, {
    token,
    method: "POST",
    body: { folder_ids: ids },
  });
}

export async function restoreFoldersApi({ token, folderIds }) {
  const ids = (Array.isArray(folderIds) ? folderIds : [folderIds])
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id));

  if (!ids.length) throw new Error("No valid folder IDs provided for restore");

  return fetchJson(`${baseUrl}/folder/restore`, {
    token,
    method: "POST",
    body: { folder_ids: ids },
  });
}

export async function permDeleteFoldersApi({ token, folderIds }) {
  const ids = (Array.isArray(folderIds) ? folderIds : [folderIds])
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id));

  if (!ids.length) throw new Error("No valid folder IDs provided for permanent delete");

  return fetchJson(`${baseUrl}/folder/perm-delete`, {
    token,
    method: "POST",
    body: { folder_ids: ids },
  });
}

export async function fetchTrashFoldersApi({ token }) {
  return fetchJson(`${baseUrl}/folder/recycle_bin`, { token });
}

// -----------------------------
// ENCRYPTION META (new model required)
// -----------------------------

export async function initFolderApi({ token, payload }) {
  // payload recommended:
  // { folder_id?, parent_id, name, wrapped_fok, key_version }
  return fetchJson(`${baseUrl}/folder/init-folder`, { token, method: "POST", body: payload });
}

export async function getFolderStatusApi({ token, folderId }) {
  // Must return: folder_id, parent_id, key_version, wrapped_fok
  return fetchJson(`${baseUrl}/folder/${encodeURIComponent(String(folderId))}/status`, { token });
}

// Folder download planning (exists in your backend list)
export async function folderDownloadPlanApi({ token, body }) {
  return fetchJson(`${baseUrl}/folder/folders/plan`, { token, method: "POST", body });
}

// NEW: bootstrap defaults in one call (Option 1)
export async function bootstrapDefaultsApi({ token, payload }) {
  return fetchJson(`${baseUrl}/folder/bootstrap-defaults`, {
    token,
    method: "POST",
    body: payload,
  });
}

// NEW: rename using folder_uid
export async function renameFolderUidApi({ token, folderUid, newName }) {
  return fetchJson(`${baseUrl}/folder/rename`, {
    token,
    method: "POST",
    body: { folder_uid: String(folderUid), new_folder_name: newName },
  });
}

// NEW: move using folder_uid (crypto-safe)
// You must rewrap moved folder's (FK + FOK) under new parent's FOK.
export async function moveFoldersUidEncryptedApi({ token, moves }) {
  // moves: [{ folder_uid, target_parent_uid, enc: { wrapped_fk_b64, nonce_fk_b64, wrapped_fok_b64, nonce_fok_b64, wrap_alg } }]
  return fetchJson(`${baseUrl}/folder/move`, { token, method: "POST", body: { moves } });
}

// NEW: create folder using folder_uid + enc keys
export async function createFolderUidApi({ token, payload }) {
  // payload: { folder_uid, parent_folder_uid, name, enc: {...} }
  return fetchJson(`${baseUrl}/folder/create`, { token, method: "POST", body: payload });
}

