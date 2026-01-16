// apps/web/src/api/fileApi.js
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

async function fetchBytes(url, { token } = {}) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
  return new Uint8Array(await res.arrayBuffer());
}

async function putBytes(url, { token, bytes, headers = {} } = {}) {
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/octet-stream",
      ...headers,
    },
    body: bytes,
  });
  if (!res.ok) throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
  return true;
}

// -----------------------------
// BASIC FILE OPS (route-fixed)
// -----------------------------

export async function renameFileApi({ token, fileId, newName }) {
  return fetchJson(`${baseUrl}/file/rename`, {
    token,
    method: "POST",
    body: {
      file_id: String(fileId),
      new_file_name: newName,
    },
  });
}

// Legacy move: works only if backend doesn't require wrapped_fmk
export async function moveFilesApi({ token, fileIds, newFolderId }) {
  const ids = (Array.isArray(fileIds) ? fileIds : [fileIds]).map(String).filter(Boolean);
  if (!ids.length) throw new Error("No valid file IDs provided for move");

  return fetchJson(`${baseUrl}/file/move`, {
    token,
    method: "POST",
    body: {
      file_ids: ids,
      new_folder_id: newFolderId === "root" || newFolderId == null ? null : Number(newFolderId),
    },
  });
}

// ✅ Zero-knowledge move: include wrapped_fmk per file
// Backend should accept either { moves: [...] } or you adjust here to your schema.
export async function moveFilesEncryptedApi({ token, moves }) {
  if (!Array.isArray(moves) || moves.length === 0) throw new Error("moves[] required");
  // moves: [{ file_id, new_folder_id, wrapped_fmk }]
  return fetchJson(`${baseUrl}/file/move`, { token, method: "POST", body: { moves } });
}

// Legacy copy (no crypto)
export async function copyFilesApi({ token, fileIds, targetFolderId }) {
  const ids = (Array.isArray(fileIds) ? fileIds : [fileIds]).map(String).filter(Boolean);
  if (!ids.length) throw new Error("No valid file IDs provided for copy");

  return fetchJson(`${baseUrl}/file/copy`, {
    token,
    method: "POST",
    body: {
      file_ids: ids,
      new_folder_id: targetFolderId === "root" || targetFolderId == null ? null : Number(targetFolderId),
    },
  });
}

// ✅ Zero-knowledge copy: new file_id + wrapped_fmk (AAD changes if you bind to file_id)
export async function copyFilesEncryptedApi({ token, copies }) {
  if (!Array.isArray(copies) || copies.length === 0) throw new Error("copies[] required");
  // copies: [{ src_file_id, new_folder_id, new_file_id, wrapped_fmk }]
  return fetchJson(`${baseUrl}/file/copy`, { token, method: "POST", body: { copies } });
}

export async function deleteFilesApi({ token, fileIds }) {
  const ids = (Array.isArray(fileIds) ? fileIds : [fileIds]).map(String).filter(Boolean);
  if (!ids.length) throw new Error("No valid file IDs provided for delete");

  return fetchJson(`${baseUrl}/file/delete`, {
    token,
    method: "POST",
    body: { file_ids: ids },
  });
}

export async function restoreFilesApi({ token, fileIds }) {
  const ids = (Array.isArray(fileIds) ? fileIds : [fileIds]).map(String).filter(Boolean);
  if (!ids.length) throw new Error("No valid file IDs provided for restore");

  return fetchJson(`${baseUrl}/file/restore`, {
    token,
    method: "POST",
    body: { file_ids: ids },
  });
}

export async function permDeleteFilesApi({ token, fileIds }) {
  const ids = (Array.isArray(fileIds) ? fileIds : [fileIds]).map(String).filter(Boolean);
  if (!ids.length) throw new Error("No valid file IDs provided for permanent delete");

  return fetchJson(`${baseUrl}/file/permanent-delete`, {
    token,
    method: "POST",
    body: { file_ids: ids },
  });
}

export async function fetchTrashFilesApi({ token }) {
  return fetchJson(`${baseUrl}/file/recycle-bin`, { token });
}

// -----------------------------
// VERSIONING (route-fixed)
// -----------------------------

export async function listFileVersionsApi({ token, fileId }) {
  const q = fileId ? `?file_id=${encodeURIComponent(String(fileId))}` : "";
  return fetchJson(`${baseUrl}/file/list-version${q}`, { token });
}

export async function restoreFileVersionApi({ token, versionId }) {
  return fetchJson(`${baseUrl}/file/${encodeURIComponent(String(versionId))}/restore`, {
    token,
    method: "POST",
    body: {},
  });
}

export async function deleteFileVersionApi({ token, versionId }) {
  const res = await fetch(`${baseUrl}/file/${encodeURIComponent(String(versionId))}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
  return true;
}

// -----------------------------
// ENCRYPTION META + CIPHERTEXT (new model required)
// -----------------------------

export async function getFileEncMetaApi({ token, fileId }) {
  return fetchJson(`${baseUrl}/file/${encodeURIComponent(String(fileId))}/enc-meta`, { token });
}

export async function getFileCipherApi({ token, fileId }) {
  // Returns ciphertext bytes (or you can stream; depends on backend)
  return fetchBytes(`${baseUrl}/file/${encodeURIComponent(String(fileId))}/cipher`, { token });
}

// Direct download route (as-is in your backend list)
export function getDirectDownloadUrl(fileId) {
  return `${baseUrl}/file/download/${encodeURIComponent(String(fileId))}`;
}

export async function downloadPlanFilesApi({ token, body }) {
  // body depends on backend: usually { file_ids: [...] }
  return fetchJson(`${baseUrl}/file/download/plan/files`, { token, method: "POST", body });
}

// -----------------------------
// RESUMABLE UPLOAD (new model required)
// -----------------------------

export async function fileInitUploadApi({ token, payload }) {
  // payload recommended:
  // {
  //   file_id, folder_id, filename, mime,
  //   wrapped_fmk, header, version
  // }
  return fetchJson(`${baseUrl}/file/init`, { token, method: "POST", body: payload });
}

export async function putFileChunkApi({ token, uploadId, chunkIndex, ciphertextBytes }) {
  const url = `${baseUrl}/file/${encodeURIComponent(String(uploadId))}/chunks/${encodeURIComponent(String(chunkIndex))}`;
  return putBytes(url, { token, bytes: ciphertextBytes });
}

export async function getFileUploadStatusApi({ token, uploadId }) {
  return fetchJson(`${baseUrl}/file/${encodeURIComponent(String(uploadId))}/status`, { token });
}

export async function finalizeFileUploadApi({ token, uploadId, payload = {} }) {
  return fetchJson(`${baseUrl}/file/${encodeURIComponent(String(uploadId))}/finalize`, {
    token,
    method: "POST",
    body: payload,
  });
}
