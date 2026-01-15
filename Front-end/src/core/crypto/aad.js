// core/crypto/aad.js
import { utf8, concatBytes, u32be } from "./bytes.js";

export const C1_SCHEMA_VERSION = 1;


export function buildAadC1Chunk({ encStreamId, chunkIndex, chunkSize, fileSize, fileType }) {
  const prefix = `SD:C1|v${C1_SCHEMA_VERSION}|`;
  return concatBytes(
    utf8.toBytes(prefix),
    utf8.toBytes(encStreamId),
    utf8.toBytes("|"),
    u32be(chunkIndex),
    u32be(chunkSize),
    utf8.toBytes(String(fileSize)),
    utf8.toBytes("|"),
    utf8.toBytes(fileType)
  );
}

export function buildAadWrapFK({ encStreamId, folderId }) {
  const prefix = `SD:WrapFK|v${C1_SCHEMA_VERSION}|`;
  const folderPart = folderId === null || folderId === undefined ? "none" : String(folderId);
  return utf8.toBytes(`${prefix}${encStreamId}|${folderPart}`);
}

export function buildAadWrapFoK({ folderId }) {
  const prefix = `SD:WrapFoK|v${C1_SCHEMA_VERSION}|`;
  const folderPart = folderId === null || folderId === undefined ? "root" : String(folderId);
  return utf8.toBytes(`${prefix}${folderPart}`);
}