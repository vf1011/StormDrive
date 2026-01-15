// src/api/fileApi.js

import { API_BASE_URL } from "./config";

const baseUrl = API_BASE_URL;

// ---------- RENAME FILE ----------
export async function renameFileApi({ token, fileId, newName }) {
  const res = await fetch(`${baseUrl}/files/rename`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      file_id: String(fileId),
      new_file_name: newName,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Rename file failed");
  }

  return res.json().catch(() => ({}));
}


// ---------- MOVE FILES (single + multiple in one API) ----------
export async function moveFilesApi({ token, fileIds, newFolderId }) {
  const ids = (Array.isArray(fileIds) ? fileIds : [fileIds])
    .map((id) => String(id))
    .filter(Boolean);

  if (ids.length === 0) {
    throw new Error("No valid file IDs provided for move");
  }

  const payload = {
    file_ids: ids,
    new_folder_id:
      newFolderId === "root" || newFolderId === null
        ? null
        : parseInt(newFolderId, 10),
  };

  const res = await fetch(`${baseUrl}files/move`, {
    // adjust this URL if your backend uses a different path
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Move files failed with status ${res.status}`
    );
  }

  try {
    return await res.json();
  } catch {
    return null;
  }
}

// ---------- COPY FILES (single + multiple in one API) ----------

export async function copyFilesApi({ token, fileIds, targetFolderId }) {
  const ids = (Array.isArray(fileIds) ? fileIds : [fileIds])
    .map((id) => String(id))
    .filter(Boolean);

  if (ids.length === 0) {
    throw new Error("No valid file IDs provided for copy");
  }

  const res = await fetch(`${baseUrl}/files/copy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      file_ids: ids,
      new_folder_id:
        targetFolderId === "root" || targetFolderId === null
          ? null
          : parseInt(targetFolderId, 10),
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data.detail || `Copy files failed with status ${res.status}`
    );
  }

  // backend should return list of new files with final names
  return res.json().catch(() => ({}));
}

// ---------- SOFT DELETE FILES (move to trash) ----------
export async function deleteFilesApi({ token, fileIds }) {
  const ids = (Array.isArray(fileIds) ? fileIds : [fileIds])
    .map((id) => String(id))
    .filter(Boolean);

  if (ids.length === 0) {
    throw new Error("No valid file IDs provided for delete");
  }

  const res = await fetch(`${baseUrl}/files/delete`, {
    // ⬆️ change URL if your backend uses something else
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file_ids: ids }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data.detail || `Delete files failed with status ${res.status}`
    );
  }

  return res.json().catch(() => ({}));
}

// FILE: RESTORE (single + multiple)
export async function restoreFilesApi({ token, fileIds }) {
  const ids = (Array.isArray(fileIds) ? fileIds : [fileIds])
    .map((id) => String(id))
    .filter(Boolean);

  if (ids.length === 0) {
    throw new Error("No valid file IDs provided for restore");
  }

  const res = await fetch(`${baseUrl}/files/restore`, {
    // 👆 unified restore endpoint for single + multiple files
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file_ids: ids }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data.detail || `Restore files failed with status ${res.status}`
    );
  }

  return res.json().catch(() => ({}));
}

// FILE: PERMANENT DELETE (single + multiple)
export async function permDeleteFilesApi({ token, fileIds }) {
  const ids = (Array.isArray(fileIds) ? fileIds : [fileIds])
    .map((id) => String(id))
    .filter(Boolean);

  if (ids.length === 0) {
    throw new Error("No valid file IDs provided for permanent delete");
  }

  const res = await fetch(`${baseUrl}/files/perm_delete`, {
    // 👆 unified perm delete endpoint for single + multiple files
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file_ids: ids }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data.detail ||
        `Permanent delete files failed with status ${res.status}`
    );
  }

  return res.json().catch(() => ({}));
}

// ---------- FETCH FOLDERS IN RECYCLE BIN ----------

export async function fetchTrashFilesApi({ token }) {
  const res = await fetch(`${baseUrl}/files/recycle_bin`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data.detail || `Failed to fetch trashed files (status ${res.status})`
    );
  }

  return res.json().catch(() => []);
}

export function getDownloadFilesUrl() {
  return `${API_BASE_URL}/files/download`;
}