// src/core/fileOps/download/downloadCore.js

import { getDownloadFilesUrl } from "../../api/filesapi";
import { getDownloadFoldersUrl } from "../../api/folderapi";

/**
 * 🔐 Placeholder for decryption – currently a no-op.
 * Later: decrypt with FK here.
 */
export async function decryptDownloadedBlob(blob, _ctx) {
  return blob;
}

/**
 * Generic streaming download with progress.
 */
export async function streamDownload({
  url,
  token,
  bodyJson,          // JSON payload (we always POST for unified API)
  onProgress,
  signal,
}) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bodyJson),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Download failed (${res.status}): ${text || res.statusText}`
    );
  }

  const contentLength = res.headers.get("Content-Length");
  const total = contentLength ? parseInt(contentLength, 10) : null;

  if (!res.body) {
    throw new Error("ReadableStream not supported for this response");
  }

  const reader = res.body.getReader();
  const chunks = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;

    if (total && typeof onProgress === "function") {
      const percent = Math.round((received / total) * 100);
      onProgress({ received, total, percent });
    }
  }

  if (typeof onProgress === "function" && total) {
    onProgress({ received, total, percent: 100 });
  }

  const blob = new Blob(chunks);

  // 🔐 when we add encryption, decrypt here
  const decrypted = await decryptDownloadedBlob(blob, { url, bodyJson });
  return decrypted;
}

/**
 * Unified files download API: single + multiple.
 * Always calls POST /files/download with file_ids: [].
 */
export async function downloadFilesCore({
  fileIds,
  token,
  onProgress,
  signal,
}) {
  const url = getDownloadFilesUrl();
  const bodyJson = { file_ids: fileIds };

  const blob = await streamDownload({
    url,
    token,
    bodyJson,
    onProgress,
    signal,
  });

  return { blob };
}

/**
 * Unified folders download API: single + multiple.
 * Always calls POST /folder/download with folder_ids: [].
 */
export async function downloadFoldersCore({
  folderIds,
  token,
  onProgress,
  signal,
}) {
  const url = getDownloadFoldersUrl();
  const bodyJson = { folder_ids: folderIds };

  const blob = await streamDownload({
    url,
    token,
    bodyJson,
    onProgress,
    signal,
  });

  return { blob };
}
