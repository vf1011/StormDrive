import React, { useEffect, useRef } from "react";
import "../Dashboard/Styles/FileToolbar.css"; // or your modal css file

export default function RenameModal({
  open,
  onClose,
  title = "Assign New Name",
  labelPrefix = "Enter a new name for",
  itemName = "",
  value,
  setValue,
  error,
  loading = false,
  onConfirm,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      // focus input on open
      setTimeout(() => inputRef.current?.focus(), 0);
      // lock scroll
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="share-modal-backdrop" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div className="simple-modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="close-button" onClick={onClose} type="button">
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
          <div className="rename-message">
            <p className="rename-question">
              {labelPrefix} <b>{itemName}</b> :
            </p>
          </div>

          <div className="input-section">
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={`simple-rename-input ${error ? "error" : ""}`}
              placeholder="Enter new name..."
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter") onConfirm?.();
                if (e.key === "Escape") onClose?.();
              }}
            />
            {error && <div className="rename-error">{error}</div>}
          </div>
        </div>

        {/* footer */}
        <div className="simple-modal-actions">
          <button onClick={onClose} className="cancel-btn" type="button" disabled={loading}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rename-btn enabled"
            type="button"
            disabled={loading}
          >
            {loading ? "Renaming..." : "Rename"}
          </button>
        </div>
      </div>
    </div>
  );
}
