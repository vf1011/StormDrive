export function aadForMak(userId) {
  return `u:${userId}|mak|v1`;
}

export function aadForMakRecovery(userId) {
  return `u:${userId}|mak_recovery|v1`;
}

export function aadForFolder(userId, folderId, parentId, keyVersion) {
  return `u:${userId}|folder:${folderId}|parent:${parentId ?? "null"}|kv:${keyVersion}|v1`;
}

export function aadForFile(userId, fileId, folderId, keyVersion) {
  return `u:${userId}|file:${fileId}|folder:${folderId}|kv:${keyVersion}|v1`;
}

export function infoForDek(fileId, version) {
  return `stormdrive:dek|file:${fileId}|ver:${version}|alg:v1`;
}

export function infoForDekRecovery(fileId, version) {
  return `stormdrive:dek_recovery|file:${fileId}|ver:${version}|alg:v1`;
}

export function aadForFolderKey(userId, folderUid, parentUid, keyVersion, purpose) {
  if (!purpose || (purpose !== "FK" && purpose !== "FOK")) {
    throw new Error("aadForFolderKey: purpose must be 'FK' or 'FOK'");
  }
  return `u:${userId}|folder_uid:${folderUid}|parent_uid:${parentUid ?? "null"}|kv:${keyVersion}|k:${purpose}|v2`;
}

// Optional: for folder metadata encryption if you ever do it
export function aadForFolderMeta(userId, folderUid, parentUid, keyVersion) {
  return `u:${userId}|folder_uid:${folderUid}|parent_uid:${parentUid ?? "null"}|kv:${keyVersion}|meta|v2`;
}

// File AAD: recommended to use folder_uid instead of folder_id going forward
export function aadForFileV2(userId, fileId, folderUid, keyVersion) {
  return `u:${userId}|file:${fileId}|folder_uid:${folderUid}|kv:${keyVersion}|v2`;
}