const te = new TextEncoder();
const b = (s) => te.encode(s); // string -> Uint8Array

export function aadForMak(userId) {
  return b(`u:${userId}|mak|v1`);
}

export function aadForMakRecovery(userId) {
  return b(`u:${userId}|mak_recovery|v1`);
}

export function aadForFolder(userId, folderId, parentId, keyVersion) {
  return b(`u:${userId}|folder:${folderId}|parent:${parentId ?? "null"}|kv:${keyVersion}|v1`);
}

export function aadForFile(userId, fileId, folderId, keyVersion) {
  return b(`u:${userId}|file:${fileId}|folder:${folderId}|kv:${keyVersion}|v1`);
}

export function infoForDek(fileId, version) {
  return b(`stormdrive:dek|file:${fileId}|ver:${version}|alg:v1`);
}
