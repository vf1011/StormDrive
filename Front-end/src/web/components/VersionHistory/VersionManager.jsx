
import React, { useEffect, useRef, useState } from "react";
import ModalPortal from "../Dashboard/Modalportal";
import { supabase } from "../../../supabase";
import { formatDate , formatSize } from "../../../utils";
import "./VersionManager.css";
import { API_BASE_URL } from "../../api/config";

const API = API_BASE_URL;

export default function VersionManager({
  isOpen,
  fileId,
  onClose,
  onFileListRefresh,
  liveFileName,
  liveMimeType,
  openFilePreview
}) {
  const [versions, setVersions] = useState([]);
  const [fileMeta, setFileMeta] = useState({ name: liveFileName || "", mime: liveMimeType || "" });
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [retentionDays, setRetentionDays] = useState(0);
  const abortRef = useRef(null);

  useEffect(() => {
    if (isOpen && fileId) fetchVersions();
    return () => abortRef.current?.abort();
  }, [isOpen, fileId]);

  async function authFetch(url, options = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("Missing auth token");
    return fetch(url, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` } });
  }

  async function fetchVersions() {
    setLoading(true);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await authFetch(`${API}/files/list?file_id=${encodeURIComponent(fileId)}`, { signal: ac.signal });
      if (!res.ok) throw new Error("Could not load versions");
      const data = await res.json();

      let list = [];
      let meta = { name: liveFileName || "", mime: liveMimeType || "" };
      if (data?.live_file) {
        meta.name = data.live_file.file_name || meta.name;
        meta.mime = data.live_file.mime_type || meta.mime;
        list.push({
          version_id: "current",
          isCurrent: true,
          file_name: data.live_file.file_name,
          file_size: data.live_file.file_size,
          created_at: data.live_file.uploaded_at || data.live_file.updated_at || data.live_file.created_at,
          mime_type: data.live_file.mime_type || meta.mime,
        });
      }
      if (Array.isArray(data?.versions)) list = list.concat(data.versions);
      else if (Array.isArray(data)) list = data;
      else if (Array.isArray(data?.file_versions)) list = list.concat(data.file_versions);

      setFileMeta(meta);
      setVersions(list);
    } catch (e) {
      if (e.name !== "AbortError") console.error("Version list error:", e);
    } finally {
      setLoading(false);
    }
  }

 

  function filenameFor(version) {
    return version?.file_name || fileMeta.name || "file";
  }

  async function downloadVersion(version) {
    setActing(`download:${version.version_id}`);
    try {
      const qs = new URLSearchParams({ file_id: fileId });
      if (version.version_id !== 'current') qs.append('version_id', version.version_id);
  
      const res = await authFetch(`${API}/files/download?${qs}`);
      if (!res.ok || !res.body) throw new Error('Download failed');
  
      const suggestedName = filenameFor(version);
      const handle = await window.showSaveFilePicker({ suggestedName });
      const writable = await handle.createWritable();
  
      const reader = res.body.getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        await writable.write(value);
      }
      await writable.close();
    } catch (e) {
      console.error('Download error:', e);
    } finally {
      setActing(null);
    }
  }

  async function restoreVersion(version) {
    if (!window.confirm(`Restore ${filenameFor(version)} as current?`)) return;
    setActing(`restore:${version.version_id}`);
  
    try {
      // Skip no-op
      if (version.version_id === "current") {
        alert("This version is already current.");
        return;
      }
  
      // version_id must be a number (backend: int path param)
      const versionIdNum = Number(version.version_id);
      if (!Number.isInteger(versionIdNum)) throw new Error("Invalid version_id");
  
      const url = `${API}/files/${versionIdNum}/restore?file_id=${encodeURIComponent(fileId)}`;
  
      const res = await authFetch(url, { method: "POST" });
      if (!res.ok) throw new Error((await res.text()) || "Restore failed");
  
      await fetchVersions();
      onFileListRefresh && onFileListRefresh();
    } catch (e) {
      console.error("Restore error:", e);
      alert(e.message || "Restore failed");
    } finally {
      setActing(null);
    }
  }
  
  

  async function deleteVersion(version) {
    if (!window.confirm(`Delete ${filenameFor(version)}? This cannot be undone.`)) return;
    setActing(`delete:${version.version_id}`);
    try {
      const query = new URLSearchParams({ file_id: fileId });
      if (version.version_id !== "current") query.append("version_id", version.version_id);
      const res = await authFetch(`${API}/files/delete?${query.toString()}`, { method: "POST" });
      if (!res.ok) throw new Error("Delete failed");
      await fetchVersions();
      onFileListRefresh && onFileListRefresh();
    } catch (e) {
      console.error("Delete error:", e);
    } finally {
      setActing(null);
    }
  }

  async function clearPreviousVersions() {
    if (!window.confirm("Clear all previous versions?")) return;
    setActing("clear-versions");
    try {
      const body = retentionDays > 0 ? { retention_days: retentionDays } : null;
      await authFetch(`${API}/files/versions/clear?file_id=${encodeURIComponent(fileId)}`, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined
      });
      setClearOpen(false);
      await fetchVersions();
      onFileListRefresh && onFileListRefresh();
    } catch (e) {
      console.error("Clear versions error:", e);
    } finally {
      setActing(null);
    }
  }

  // function openPreview(version) {
  //   if (typeof openFilePreview === 'function') {
  //     openFilePreview({
  //       fileId,
  //       versionId: version.version_id,
  //       name: filenameFor(version),
  //       mimeType: version.mime_type || fileMeta.mime
  //     });
  //   }
  // }
    function openPreview(version) {
        if (typeof openFilePreview === 'function') {
        const vid = version.isCurrent ? undefined : version.version_id; // 👈 key line
        openFilePreview({
          fileId,
          versionId: vid,
          name: filenameFor(version),
          mimeType: version.mime_type || fileMeta.mime
        });
        }
      }
  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="version-modal-overlay" onClick={onClose}>
        <div className="version-modal" onClick={(e) => e.stopPropagation()}>
          <header className="version-header">
            <h2>Version History - {fileMeta.name}</h2>
            <button className="danger ghost" onClick={() => setClearOpen(true)}>Clear previous versions</button>
            <button className="close-btn" onClick={onClose}>×</button>
          </header>

          {loading ? (
            <p className="loading">Loading versions…</p>
          ) : versions.length === 0 ? (
            <p className="empty">No versions yet.</p>
          ) : (
            <ul className="version-list">
              {versions.map((v) => (
                <li key={v.version_id} className="version-item">
                  <div className="version-meta">
                    <button className="file-name" onClick={() => openPreview(v)}>{filenameFor(v)}</button>
                    {v.isCurrent && <span className="badge">Current</span>}
                    <div className="sub">{v.created_at ? formatDate(v.created_at) : ""}  • {formatSize(v.file_size)}</div>
                  </div>
                  <div className="version-actions">
                    <button onClick={() => openPreview(v)}>Preview</button>
                    <button onClick={() => downloadVersion(v)}>Download</button>
                    {!v.isCurrent && <button onClick={() => restoreVersion(v)}>Restore</button>}
                    {!v.isCurrent && <button onClick={() => deleteVersion(v)}>Delete</button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {clearOpen && (
          <div className="small-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Clear previous versions</h3>
            <label>
              Keep last N days:
              <input type="number" min="0" value={retentionDays} onChange={(e) => setRetentionDays(Number(e.target.value) || 0)} />
            </label>
            <div className="actions">
              <button onClick={() => setClearOpen(false)}>Cancel</button>
              <button onClick={clearPreviousVersions}>Clear</button>
            </div>
          </div>
        )}
      </div>
    </ModalPortal>
  );
}