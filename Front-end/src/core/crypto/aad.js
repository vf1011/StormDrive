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
