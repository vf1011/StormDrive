import React, { useEffect, useMemo } from "react";
import "../Dashboard/Styles/FileToolbar.css";

const ROOT_ID = "root";

export default function MoveModal({
  open,
  onClose,

  // data
  availableFolders = [],            // [{ folder_id, folder_name, parent_folder_id }]
  currentViewFolderId = ROOT_ID,    // "root" or folder_id
  folderPath = [{ id: ROOT_ID, name: "My files" }], // breadcrumb objects
  searchQuery = "",

  // selection
  targetFolderId = ROOT_ID,

  // actions
  setTargetFolderId,                // (id) => void
  setSearchQuery,                   // (q) => void
  onOpenFolder,                     // (id, name) => void
  onCrumbClick,                     // (index) => void
  onBack,                           // () => void
  onConfirmMove,                    // () => void

  loading = false,
  title = "Move to",
  confirmText = "Move here",
}) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = "");
  }, [open]);

  const q = (searchQuery || "").trim().toLowerCase();

  const visibleFolders = useMemo(() => {
    if (q) {
      return availableFolders
        .filter((f) => (f.folder_name || "").toLowerCase().includes(q))
        .sort((a, b) => (a.folder_name || "").localeCompare(b.folder_name || ""));
    }

    // children of current view folder
    const parentMatch =
      currentViewFolderId === ROOT_ID ? null : parseInt(currentViewFolderId, 10);

    return availableFolders
      .filter((f) => {
        const pid = f.parent_folder_id ?? null;
        return pid === parentMatch;
      })
      .sort((a, b) => (a.folder_name || "").localeCompare(b.folder_name || ""));
  }, [availableFolders, currentViewFolderId, q]);

  const targetLabel = useMemo(() => {
    if (String(targetFolderId) === String(ROOT_ID)) return "My files";
    const hit = availableFolders.find(
      (f) => f.folder_id?.toString() === targetFolderId?.toString()
    );
    return hit?.folder_name || "Unknown";
  }, [targetFolderId, availableFolders]);

  if (!open) return null;

  return (
    <div className="share-modal-backdrop" onClick={onClose}>
      <div className="share-modal move-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="simple-modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="close-button" onClick={onClose} type="button" disabled={loading}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="simple-modal-content">
          {/* Breadcrumb */}
          <div className="move-topbar">
            <div className="move-breadcrumb">
              {folderPath.map((p, idx) => (
                <button
                  key={`${p.id}-${idx}`}
                  type="button"
                  className="breadcrumb-item"
                  onClick={() => onCrumbClick?.(idx)}
                  disabled={loading}
                >
                  {p.name}
                </button>
              ))}
            </div>

            <div className="move-top-actions">
              <button
                type="button"
                className="selection-btn"
                onClick={onBack}
                disabled={loading || folderPath.length <= 1}
              >
                Back
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="move-search">
            <input
              className="simple-rename-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery?.(e.target.value)}
              placeholder="Search folders…"
              disabled={loading}
            />
          </div>

          {/* Root option (only when not searching) */}
          {!q && (
            <div
              className={`move-folder-item ${String(targetFolderId) === String(ROOT_ID) ? "selected" : ""}`}
              onClick={() => setTargetFolderId?.(ROOT_ID)}
              role="button"
              tabIndex={0}
            >
              <div className="move-folder-name">
                <span className="folder-icon">📁</span>
                <span>My files</span>
              </div>
              <div className="move-folder-actions">
                <button
                  type="button"
                  className="selection-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenFolder?.(ROOT_ID, "My files");
                  }}
                  disabled={loading}
                >
                  Open
                </button>
              </div>
            </div>
          )}

          {/* Folder list */}
          <div className="move-folder-list">
            {visibleFolders.length === 0 ? (
              <div className="empty-move-state">
                {q ? "No matching folders." : "No folders here."}
              </div>
            ) : (
              visibleFolders.map((f) => {
                const id = f.folder_id?.toString();
                const selected = id === targetFolderId?.toString();

                return (
                  <div
                    key={id}
                    className={`move-folder-item ${selected ? "selected" : ""}`}
                    onClick={() => setTargetFolderId?.(id)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="move-folder-name">
                      <span className="folder-icon">📁</span>
                      <span>{f.folder_name}</span>
                    </div>
                    <div className="move-folder-actions">
                      <button
                        type="button"
                        className="selection-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenFolder?.(id, f.folder_name);
                        }}
                        disabled={loading}
                      >
                        Open
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Destination summary */}
          <div className="move-target-summary">
            <span className="text-sm opacity-70">Destination:</span> <b>{targetLabel}</b>
          </div>
        </div>

        {/* Footer */}
        <div className="simple-modal-actions">
          <button onClick={onClose} className="cancel-btn" type="button" disabled={loading}>
            Cancel
          </button>
          <button
            onClick={onConfirmMove}
            className="rename-btn enabled"
            type="button"
            disabled={loading}
          >
            {loading ? "Moving..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
