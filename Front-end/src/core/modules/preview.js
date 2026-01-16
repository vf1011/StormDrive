import {API_BASE_URL} from "../../web/api/config";

export function buildPreviewMetadataUrl({ fileId, versionId, apiBaseUrl }) {
  if (!fileId) {
    throw new Error("Missing fileId for preview");
  }

  const base = apiBaseUrl || API_BASE_URL;
  const params = new URLSearchParams({ file_id: String(fileId) });
  if (versionId != null) {
    params.append("version_id", String(versionId));
  }

  return `${base}/files/preview?${params.toString()}`;
}

export async function fetchPreviewMetadata({ fileId, versionId, token, apiBaseUrl }) {
  if (!token) {
    throw new Error("Not logged in");
  }

  const url = buildPreviewMetadataUrl({ fileId, versionId, apiBaseUrl });

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    // your backend returns JSON error with detail
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to generate preview");
  }

  const data = await res.json();
  if (!data.success || !data.preview) {
    throw new Error("No preview data returned");
  }



    // 🚩 THIS is where, in future, we can inject decryption if
  // backend returns encrypted preview blobs instead of raw base64.
  return {
    preview: data.preview,
  };
}

export function buildVideoStreamUrl({ fileId, versionId, token, apiBaseUrl }) {
  if (!fileId) {
    throw new Error("Missing fileId for video stream");
  }
  if (!token) {
    throw new Error("Not logged in");
  }

  const base = apiBaseUrl || API_BASE_URL;
  const params = new URLSearchParams({ token });

  if (versionId != null) {
    params.append("version_id", String(versionId));
  }

  // You currently use /files/stream/<fileId>?version_id=...&token=...
  return `${base}/files/stream/${encodeURIComponent(fileId)}?${params.toString()}`;
}

export async function fetchVideoBlob({ fileId, versionId, token, apiBaseUrl, signal }) {
  if (!token) {
    throw new Error("Not logged in");
  }

  const base = apiBaseUrl || API_BASE_URL;
  const url =
    versionId != null
      ? `${base}/files/stream/${encodeURIComponent(fileId)}?version_id=${versionId}`
      : `${base}/files/stream/${encodeURIComponent(fileId)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });

  if (!res.ok) {
    throw new Error(`Stream error: ${res.status}`);
  }

  const blob = await res.blob();

  // 🚩 In the future, if stream is encrypted:
  //  - read it as arrayBuffer
  //  - decrypt chunks with file key (FK)
  //  - build a new Blob from decrypted bytes
  // Then return that decrypted Blob here.
  return { blob };
}

export function buildDownloadUrl({ fileId, apiBaseUrl }) {
  if (!fileId) throw new Error("Missing fileId for download");
  const base = apiBaseUrl || API_BASE_URL;
  return `${base}/files/download?file_id=${encodeURIComponent(fileId)}`;
}