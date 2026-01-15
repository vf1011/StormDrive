// web/keys/folderKeyCache.js
const fokCache = new Map();  // folderId(string) -> Uint8Array(32)
const inflight = new Map();  // folderId(string) -> Promise<Uint8Array(32)>

export function getCachedFoK(folderId) {
  return fokCache.get(String(folderId)) || null;
}

export function setCachedFoK(folderId, fok32) {
  if (!(fok32 instanceof Uint8Array) || fok32.length !== 32) {
    throw new Error("FoK must be Uint8Array(32)");
  }
  fokCache.set(String(folderId), fok32);
}

export function getInflightFoK(folderId) {
  return inflight.get(String(folderId)) || null;
}

export function setInflightFoK(folderId, p) {
  inflight.set(String(folderId), p);
}

export function clearInflightFoK(folderId) {
  inflight.delete(String(folderId));
}

export function clearAllFoKs() {
  fokCache.clear();
  inflight.clear();
}
