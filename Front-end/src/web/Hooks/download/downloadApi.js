// web/api/downloadApi.js

import { API_BASE_URL } from "../../core/api/config.js";


export function createDownloadApi() {

const baseUrl = API_BASE_URL;

  const routes = {
    // adjust these when backend dev finalizes
    fileMeta: (fileId) => `${baseUrl}/files/meta?file_id=${encodeURIComponent(fileId)}`,
    fileDownload: (fileId) => `${baseUrl}/files/download?file_id=${encodeURIComponent(fileId)}`,

    // placeholders for later
    filesDownloadMultiple: () => `${baseUrl}/files/download_multiple`,
    folderDownload: () => `${baseUrl}/folder/download`,
    folderDownloadMultiple: () => `${baseUrl}/folder/download_multiple`,
  };

  return {
    async getFileMeta({ fileId, token, signal }) {
      const res = await fetch(routes.fileMeta(fileId), {
        method: "GET",
        headers: { 
            Authorization: `Bearer ${token}`,
            Accept: "application/json", 
        },
        signal,
      });
     if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Meta fetch failed: ${res.status} ${text}`);
        }
      return res.json();
    },

    async openSingleFileStream({ fileId, token, signal }) {
      const res = await fetch(routes.fileDownload(fileId), {
        method: "GET",
        headers: { 
            Authorization: `Bearer ${token}`,
            Accept: "application/octet-stream",},
        signal,
      });
      return res; // caller checks res.ok + res.body
    },
  };
}
