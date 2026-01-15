import React, { useEffect } from "react";
import "../Dashboard/Styles/FileToolbar.css"; // or your modal css file

export default function DeleteModal({
  open,
  onClose,
  selectedItems = [],
  loading = false,
  onConfirm,

  // optional text overrides
  title = "Delete",
  confirmText = "Move to Trash",
  cancelText = "Cancel",
}) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const count = selectedItems.length;
  const first = count ? selectedItems[0]?.name : "";
  const remaining = Math.max(count - 1, 0);

  const summary =
    count <= 1
      ? first
      : remaining
      ? `${first} and ${remaining} more`
      : first;

  return (
    <div className="share-modal-backdrop" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div className="simple-modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="close-button" onClick={onClose} type="button" disabled={loading}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* body */}
        <div className="simple-modal-content">
          {count === 0 ? (
            <p className="text-sm opacity-70 mt-1">No items selected.</p>
          ) : (
            <>
              <p className="text-sm opacity-70 mt-1">{summary}</p>
              <p className="text-sm opacity-70 mt-2">
                You can restore items later from Trash.
              </p>
            </>
          )}
        </div>

        {/* footer */}
        <div className="simple-modal-actions">
          <button onClick={onClose} className="cancel-btn" type="button" disabled={loading}>
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            className="delete-btn"
            type="button"
            disabled={loading || count === 0}
          >
            {loading ? "Deleting..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
