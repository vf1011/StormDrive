// src/pages/TrashPage.jsx
import React, { useEffect } from "react";
import { Trash2, RotateCcw, CheckSquare, Square, ArrowLeft, Trash } from "lucide-react";
import "./Styles/Trash.css"; // ✅ adjust

import { useFileContext } from "../../Hooks/filecontext"; // ✅ adjust
import { useTrashManager } from "../../Hooks/trashManager";

// ✅ use YOUR modals (restore + permanent delete)
import RestoreModal from "../Modals/RestoreModal"; // ✅ adjust
import PermanentDeleteModal from "../Modals/PermanentDeleteModal"; // ✅ adjust

export default function TrashPage() {
  const { setNotification, pushUndoAction } = useFileContext();

  const trash = useTrashManager({
    setNotification,
    pushUndoAction,
  });

  useEffect(() => {
    trash.loadTrash();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trash.currentFolderId]);

  const allSelected = trash.items.length > 0 && trash.selectedIds.length === trash.items.length;

  return (
    <div className="trash-wrapper">
      <div className="trash-header">
        <div className="trash-title">
          <Trash2 size={20} /> Trash ({trash.items.length})
        </div>

        {/* breadcrumb */}
        <div className="trash-breadcrumb">
          <button className="crumb" onClick={trash.goRoot} type="button">
            Trash Root
          </button>
          {trash.folderPath.map((c, idx) => (
            <span key={c.id} className="crumb-wrap">
              <span className="sep">/</span>
              <button className="crumb" onClick={() => trash.crumbClick(idx)} type="button">
                {c.name}
              </button>
            </span>
          ))}

          {trash.folderPath.length > 0 && (
            <button className="back-btn" onClick={trash.goBack} type="button">
              <ArrowLeft size={16} /> Back
            </button>
          )}
        </div>

        {/* actions */}
        <div className="trash-actions">
          <button
            className="btn"
            onClick={() => (allSelected ? trash.clearSelection() : trash.selectAll())}
            disabled={trash.loading || trash.items.length === 0}
            type="button"
          >
            {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
            {allSelected ? "Deselect All" : "Select All"}
          </button>

          <button
            className="btn restore"
            onClick={trash.openRestoreModal}
            disabled={trash.loading || !trash.hasSelection}
            type="button"
          >
            <RotateCcw size={16} /> Restore ({trash.selectedIds.length})
          </button>

          <button
            className="btn delete"
            onClick={trash.openPermDeleteModal}
            disabled={trash.loading || !trash.hasSelection}
            type="button"
          >
            <Trash size={16} /> Delete ({trash.selectedIds.length})
          </button>
        </div>
      </div>

      {/* list */}
      <div className="trash-list">
        {trash.items.length === 0 ? (
          <div className="trash-empty">Nothing here.</div>
        ) : (
          trash.items.map((it) => {
            const selected = trash.selectedIds.includes(String(it.id));

            return (
              <div
                key={`${it.type}-${it.id}`}
                className={`trash-row ${selected ? "selected" : ""}`}
                onClick={() => trash.toggleSelect(it.id)}
                role="button"
                tabIndex={0}
              >
                <div className="trash-row-left">
                  <div className={`trash-icon ${it.type}`}>{it.type === "folder" ? "📁" : "📄"}</div>

                  <div className="trash-meta">
                    <div
                      className="trash-name"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (it.type === "folder") trash.openFolder(it);
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      {it.name}
                      {it.type === "folder" ? <span className="open-hint"> (open)</span> : null}
                    </div>

                    <div className="trash-sub">
                      Deleted: {it.deletedAt ? new Date(it.deletedAt).toLocaleString() : "N/A"}
                      {it.parentName ? <> • From: <b>{it.parentName}</b></> : null}
                    </div>
                  </div>
                </div>

                {selected && <div className="tick">✓</div>}
              </div>
            );
          })
        )}
      </div>

      {/* modals */}
      <RestoreModal
        open={trash.restoreOpen}
        onClose={trash.closeModals}
        count={trash.selectedIds.length}
        loading={trash.loading}
        onConfirm={trash.confirmRestore}
      />

      <PermanentDeleteModal
        open={trash.permDeleteOpen}
        onClose={trash.closeModals}
        count={trash.selectedIds.length}
        loading={trash.loading}
        onConfirm={trash.confirmPermDelete}
      />
    </div>
  );
}
