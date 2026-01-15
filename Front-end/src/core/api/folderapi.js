// src/api/folderApi.js

import { API_BASE_URL } from "./config";

const baseUrl = API_BASE_URL;

// src/core/api/folderApi.js
export async function renameFolderApi({ token, folderId, newName }) {
  const res = await fetch(`${baseUrl}/folder/rename`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      folder_id: Number(folderId),
      new_folder_name: newName,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Rename folder failed");
  }

  return res.json().catch(() => ({}));
}


// ---------- MOVE FOLDERS (single + multiple in one API) ----------
export async function moveFoldersApi({ token, folderIds, targetFolderId }) {
  const ids = (Array.isArray(folderIds) ? folderIds : [folderIds])
    .map((id) => parseInt(id, 10))
    .filter((id) => !Number.isNaN(id));

  if (ids.length === 0) {
    throw new Error("No valid folder IDs provided for move");
  }

  const payload = {
    folder_ids: ids,
    target_folder_id:
      targetFolderId === "root" || targetFolderId === null
        ? null
        : parseInt(targetFolderId, 10),
  };

  const res = await fetch(`${baseUrl}/folder/move`, {
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
      errorData.detail || `Move folders failed with status ${res.status}`
    );
  }

  try {
    return await res.json();
  } catch {
    return null;
  }
}


// ---------- COPY FOLDERS (single + multiple in one API) ----------

export async function copyFoldersApi({ token, folderIds, targetFolderId }) {
  const ids = (Array.isArray(folderIds) ? folderIds : [folderIds])
    .map((id) => parseInt(id, 10))
    .filter((id) => !Number.isNaN(id));

  if (ids.length === 0) {
    throw new Error("No valid folder IDs provided for copy");
  }

  const res = await fetch(`${baseUrl}/folder/copy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      folder_ids: ids,
      target_folder_id:
        targetFolderId === "root" || targetFolderId === null
          ? null
          : parseInt(targetFolderId, 10),
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data.detail || `Copy folders failed with status ${res.status}`
    );
  }

  // backend returns new folders with final names
  return res.json().catch(() => ({}));
}

// ---------- SOFT DELETE FOLDERS (move to trash) ----------
export async function deleteFoldersApi({ token, folderIds }) {
  const ids = (Array.isArray(folderIds) ? folderIds : [folderIds])
    .map((id) => parseInt(id, 10))
    .filter((id) => !Number.isNaN(id));

  if (ids.length === 0) {
    throw new Error("No valid folder IDs provided for delete");
  }

  const res = await fetch(`${baseUrl}/folder/delete`, {
    // ⬆️ change URL if your backend uses something else
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ folder_ids: ids }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data.detail || `Delete folders failed with status ${res.status}`
    );
  }

  return res.json().catch(() => ({}));
}

// FOLDER: RESTORE (single + multiple in one API)
export async function restoreFoldersApi({ token, folderIds }) {
  const ids = (Array.isArray(folderIds) ? folderIds : [folderIds])
    .map((id) => parseInt(id, 10))
    .filter((id) => !Number.isNaN(id));

  if (ids.length === 0) {
    throw new Error("No valid folder IDs provided for restore");
  }

  const res = await fetch(`${baseUrl}/folder/restore`, {
    // 👆 unified restore endpoint for single + multiple folders
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ folder_ids: ids }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data.detail || `Restore folders failed with status ${res.status}`
    );
  }

  return res.json().catch(() => ({}));
}

// FOLDER: PERMANENT DELETE (single + multiple)
export async function permDeleteFoldersApi({ token, folderIds }) {
  const ids = (Array.isArray(folderIds) ? folderIds : [folderIds])
    .map((id) => parseInt(id, 10))
    .filter((id) => !Number.isNaN(id));

  if (ids.length === 0) {
    throw new Error("No valid folder IDs provided for permanent delete");
  }

  const res = await fetch(`${baseUrl}/folder/perm_delete`, {
    // 👆 unified perm delete endpoint for single + multiple
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ folder_ids: ids }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data.detail ||
        `Permanent delete folders failed with status ${res.status}`
    );
  }

  return res.json().catch(() => ({}));
}

// ---------- FETCH FOLDERS IN RECYCLE BIN ----------
export async function fetchTrashFoldersApi({ token }) {
  const res = await fetch(`${baseUrl}/folder/recycle_bin_folders`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data.detail || `Failed to fetch trashed folders (status ${res.status})`
    );
  }

  return res.json().catch(() => []);
}

export function getDownloadFoldersUrl() {
  return `${API_BASE_URL}/folder/download`;
}
