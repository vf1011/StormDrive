import React, { useEffect } from "react";
import { Trash2, X } from "lucide-react";
import ModalPortal from "../Dashboard/Modalportal";

export default function PermanentDeleteModal({
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
            <h2 className="modal-title">
              {isMulti ? "Permanently Delete Files" : "Permanently Delete File"}
            </h2>
            <button className="modal-close" onClick={onClose} disabled={isLoading}>
              <X size={20} />
            </button>
          </div>

          <div className="modal-body">
            {isMulti ? (
              <p className="modal-question">
                Are you sure you want to permanently delete <strong>{selectedCount}</strong> items?
              </p>
            ) : (
              <p className="modal-question">
                Are you sure you want to permanently delete <strong>{selectedName}</strong>?
              </p>
            )}
          </div>

          <div className="modal-actions">
            <button className="cancel-btn" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button
              className="delete-btn"
              onClick={isMulti ? onConfirmMultiple : onConfirmSingle}
              disabled={isLoading}
            >
              <Trash2 size={16} />
              {isLoading ? "Deleting..." : "Permanently Delete"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
