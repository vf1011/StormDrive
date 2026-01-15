// web/download/downloadSingleFile.web.js
import { decryptPackageStream } from "../../core/download/decryptPackageStream.js";

export async function downloadSingleFileWeb({
  api,               // createDownloadApi(...)
  cryptoKit,         // your CryptoKit instance
  token,
  fileId,
  getWrappingKey,    // async (folderId) => Uint8Array(32)
  onProgressPct,     // (pct:number) => void
  signal,
}) {
  // 1) meta
  const meta = await api.getFileMeta({ fileId, token, signal });

  // 2) wrapping key (your keyring logic)
  const wrappingKey = await getWrappingKey(meta.folder_id ?? null);

  // 3) open encrypted stream
  const res = await api.openSingleFileStream({ fileId, token, signal });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  if (!res.body) throw new Error("Missing response body stream");

  const reader = res.body.getReader();

  const parts = [];
  const fileType = meta.encryption_metadata?.c1?.file_type || "application/octet-stream";
  const fileName = meta.file_name || meta.name || `${fileId}`;

  // progress adapter
  const onProgress = ({ doneBytes, totalBytes }) => {
    if (!totalBytes) return onProgressPct?.(100);
    const pct = Math.min(100, Math.round((doneBytes / totalBytes) * 100));
    onProgressPct?.(pct);
  };

  for await (const { bytes } of decryptPackageStream({
    cryptoKit,
    metaRaw: meta,
    wrappingKey,
    read: async () => {
      const { done, value } = await reader.read();
      return done ? null : value;
    },
    onProgress,
  })) {
    parts.push(bytes);
  }

  const blob = new Blob(parts, { type: fileType });
  return { blob, fileName, fileType };
}
