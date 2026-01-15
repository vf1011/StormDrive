import React, { useEffect } from "react";
import { RotateCcw, X } from "lucide-react";
import ModalPortal from "../Dashboard/Modalportal";

export default function RestoreModal({
  open,
  onClose,
  isLoading = false,

  // data
  selectedCount = 0,
  selectedName = "",

  // actions
  onConfirmSingle,
  onConfirmMultiple,
}) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = "");
  }, [open]);

  if (!open) return null;

  const isMulti = selectedCount > 1;

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content restore-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">{isMulti ? "Restore Files" : "Restore File"}</h2>
            <button className="modal-close" onClick={onClose} disabled={isLoading}>
              <X size={20} />
            </button>
          </div>

          <div className="simple-modal-content">
            <div className="restore-modal-body">
              {isMulti ? (
                <p className="restore-question">
                  Are you sure you want to restore <strong>{selectedCount}</strong> items?
                </p>
              ) : (
                <p className="restore-question">
                  Are you sure you want to restore <strong>{selectedName}</strong>?
                </p>
              )}
            </div>
          </div>

          <div className="simple-modal-actions">
            <button onClick={onClose} className="cancel-btn" disabled={isLoading}>
              Cancel
            </button>

            <button
              className="restore-btn"
              onClick={isMulti ? onConfirmMultiple : onConfirmSingle}
              disabled={isLoading}
            >
              <RotateCcw size={16} />
              {isLoading ? "Restoring..." : "Restore"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
