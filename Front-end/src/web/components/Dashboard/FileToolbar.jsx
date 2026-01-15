// src/components/FileToolbar.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./Styles/FileToolbar.css";

import {
  ChevronDown,
  Upload as UploadIcon,
  Folder,
  Edit,
  SendToBack,
  Trash2,
  Share2,
  Info,
  Copy as CopyIcon,
  ClipboardPaste,
  Download,
} from "lucide-react";

// ✅ Must be the SAME FileContext hook used inside your managers
import { useFileContext } from "../../Hooks/filecontext.jsx";
// adjust to your real path

// ✅ Managers (logic)
import { useRenameManager } from "../../Hooks/renameManager.jsx";   // based on your file header
import { useMoveManager } from "../../Hooks/moveManager.jsx";        // your uploaded moveManager
import { useDeleteManager } from "../../Hooks/deleteManager.jsx";   // your uploaded deleteManager
import { useCopyManager } from "../../Hooks/copyManager.jsx";       // your uploaded copyManager

// ✅ UI Modals
import RenameModal from "../Modals/RenameModal.jsx"; // your uploaded RenameModal
import MoveModal from "../Modals/MoveModal.jsx";     // your uploaded MoveModal
import DeleteModal from "../Modals/DeleteModal.jsx"; // your uploaded DeleteModal

// ✅ Folder loader hook (the one you wrote)
import { useFolderOperations } from "../../Hooks/useFolderOperation";

const ROOT_ID = "root";

export default function FileToolbar({ expanded, onUpload, onRefreshfiles }) {
  const {
    // selection state
    selectedFile,
    setSelectedFile,
    selectedFiles,
    setSelectedFiles,   // ✅ ensure exists in provider value
    multipleFiles,
    setMultipleFiles,   // ✅ ensure exists in provider value

    // clipboard
    clipboardFile,
    setClipboardFile,

    // misc
    currentFolderId,
    setNotification,
    setShowInfoSidebar,
    files,
  } = useFileContext();

  // ---- local UI state
  const [uploadDropdownOpen, setUploadDropdownOpen] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // ---- managers
  const rename = useRenameManager(); // reads selectedFiles internally【turn19file2】

  // If you are using useFolderOperations for folder/all:
  // const folderOps = useFolderOperations({ setNotification, autoLoad: false });
  // const move = useMoveManager({
  //   availableFolders: folderOps.availableFolders,
  //   setAvailableFolders: folderOps.setAvailableFolders,
  //   loadAllFolders: folderOps.loadAllFolders,
  // });

  // If you already pass availableFolders from somewhere else, keep that.
  // For now we’ll assume you do have folderOps:
  const folderOps = useFolderOperations(null, null, setNotification);

  const move = useMoveManager({
    availableFolders: folderOps.availableFolders,
    setAvailableFolders: folderOps.setAvailableFolders,
    loadAllFolders: folderOps.loadAllFolders,
  }); // moveManager uses loadAllFolders inside openMoveDialog【turn19file3】

  const del = useDeleteManager({
    fetchFilesInFolder: async () => onRefreshfiles?.(currentFolderId),
  }); // deleteSelected refetches if provided【turn19file0】

  const { handleKeyboardPaste, isPasting } = useCopyManager({
    fetchFilesInFolder: async () => onRefreshfiles?.(currentFolderId),
  }); // paste clears clipboardFile on success【turn19file1】

  // ---- selection derivation (same as your older toolbar behavior)
  const currentSelected = useMemo(() => {
    if (multipleFiles?.length) return multipleFiles;
    if (selectedFile) return [selectedFile];
    return selectedFiles || [];
  }, [multipleFiles, selectedFile, selectedFiles]);

  const hasSelected = currentSelected.length > 0;
  const canSingle = currentSelected.length === 1;

  // Keep context selection synced so managers operate on correct selection
  useEffect(() => {
    setSelectedFiles?.(currentSelected);
    setMultipleFiles?.(currentSelected);

    if (currentSelected.length === 1) setSelectedFile?.(currentSelected[0]);
    if (currentSelected.length === 0) setSelectedFile?.(null);
  }, [currentSelected, setSelectedFiles, setMultipleFiles, setSelectedFile]);

  const clearSelection = () => {
    setSelectedFile?.(null);
    setSelectedFiles?.([]);
    setMultipleFiles?.([]);
    setShowInfoSidebar?.(false);
  };

  const refresh = async () => {
    await onRefreshfiles?.(currentFolderId);
  };

  // Close upload dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (uploadDropdownOpen && !event.target.closest(".upload-container")) {
        setUploadDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [uploadDropdownOpen]);

  // Keyboard copy/paste
  useEffect(() => {
    const onKeyDown = (e) => {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
      if (!ctrlOrCmd) return;

      const key = e.key.toLowerCase();

      if (key === "c") {
        if (!hasSelected) return;
        e.preventDefault();
        setClipboardFile?.(currentSelected);
        setNotification?.({
          open: true,
          severity: "info",
          message: `${currentSelected.length} item(s) copied.`,
        });
      }

      if (key === "v") {
        if (!clipboardFile || isPasting) return;
        e.preventDefault();
        handleKeyboardPaste?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hasSelected, currentSelected, clipboardFile, isPasting, setClipboardFile, setNotification, handleKeyboardPaste]);

  // ---- action handlers
  const openRename = () => {
    if (!canSingle) {
      setNotification?.({ open: true, severity: "info", message: "Select exactly one item to rename." });
      return;
    }
    rename.openRename(currentSelected[0]); // manager handles modal open【turn19file2】
  };

  const openMove = async () => {
    if (!hasSelected) {
      setNotification?.({ open: true, severity: "info", message: "Select at least one item to move." });
      return;
    }
    // moveManager will call loadAllFolders if provided【turn19file3】
    await move.openMoveDialog();
  };

  const openDelete = () => {
    if (!hasSelected) {
      setNotification?.({ open: true, severity: "info", message: "Select at least one item to delete." });
      return;
    }
    setDeleteOpen(true);
  };

 const confirmDelete = async () => {
  setDeleteLoading(true);
  try {
    await del.deleteSelected();
    clearSelection();
    setDeleteOpen(false);
    await refresh();
  } finally {
    setDeleteLoading(false);
  }
};

  const handleCopyClick = () => {
    if (!hasSelected) return;
    setClipboardFile?.(currentSelected);
    setNotification?.({ open: true, severity: "info", message: `${currentSelected.length} item(s) copied.` });
  };

  const handlePasteClick = () => {
    if (!clipboardFile || isPasting) return;
    handleKeyboardPaste?.();
  };

  const handleInfo = () => {
    if (!canSingle) return;
    setShowInfoSidebar?.(true);
  };

  // placeholders until you wire managers
  const handleShare = () => setNotification?.({ open: true, severity: "info", message: "Share wiring not added yet." });
  const handleDownload = () => setNotification?.({ open: true, severity: "info", message: "Download wiring not added yet." });

  const onSelectAll = () => {
    const all = files || [];
    setMultipleFiles?.(all);
    setSelectedFiles?.(all);
    if (all.length === 1) setSelectedFile?.(all[0]);
  };

  // ---- action list
  const toolbarActions = [
    { icon: UploadIcon, label: "Upload", isPrimary: true },
    { icon: Info, label: "Info", onClick: handleInfo, disabled: !canSingle },
    { icon: Download, label: "Download", onClick: handleDownload, disabled: !hasSelected },
    { icon: Edit, label: "Rename", onClick: openRename, disabled: !canSingle },
    { icon: SendToBack, label: "Move", onClick: openMove, disabled: !hasSelected },
    { icon: Trash2, label: "Delete", onClick: openDelete, disabled: !hasSelected },
    { icon: Share2, label: "Share", onClick: handleShare, disabled: !canSingle },
    { icon: CopyIcon, label: "Copy", onClick: handleCopyClick, disabled: !hasSelected },
    { icon: ClipboardPaste, label: "Paste", onClick: handlePasteClick, disabled: !clipboardFile, loading: isPasting },
  ];

  // ---- render (your same UI pattern)
  return (
    <>
      <div className={`expanding-toolbar ${expanded ? "expanded" : ""}`}>
        <div className="toolbar-actions">
          {toolbarActions.map((action, index) => {
            const Icon = action.icon;

            // Primary Upload UI
            if (action.isPrimary) {
              return (
                <div key={index} className="action-item">
                  {!expanded && (
                    <div className="upload-container">
                      <div className={`upload-button-wrapper ${uploadDropdownOpen ? "expanded" : ""} ${uploadSuccess ? "success" : ""}`}>
                        <button
                          className="main-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadDropdownOpen(!uploadDropdownOpen);
                          }}
                          type="button"
                        >
                          <span className="button-text">
                            <span style={{ fontWeight: "bold", color: "white" }}>Upload</span>
                          </span>
                          <ChevronDown className={`upload-chevron ${uploadDropdownOpen ? "rotate-180" : ""}`} size={16} />
                        </button>

                        <div className={`upload-pills-dropdown ${uploadDropdownOpen ? "visible" : "hidden"}`}>
                          <div
                            className="upload-pill-item file-pill"
                            onClick={(e) => {
                              e.stopPropagation();
                              document.getElementById("file-upload")?.click();
                              setUploadDropdownOpen(false);
                              setUploadSuccess(true);
                              setTimeout(() => setUploadSuccess(false), 500);
                            }}
                          >
                            <div className="pill-content">
                              <span className="pill-title">Upload Files</span>
                            </div>
                          </div>

                          <div
                            className="upload-pill-item folder-pill"
                            onClick={(e) => {
                              e.stopPropagation();
                              document.getElementById("folder-upload")?.click();
                              setUploadDropdownOpen(false);
                              setUploadSuccess(true);
                              setTimeout(() => setUploadSuccess(false), 500);
                            }}
                          >
                            <div className="pill-content">
                              <span className="pill-title">Upload Folder</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {expanded && (
                    <div className="upload-container">
                      <button
                        className="action-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadDropdownOpen(!uploadDropdownOpen);
                        }}
                        type="button"
                      >
                        <UploadIcon size={20} />
                      </button>

                      <div className={`upload-pills-dropdown expanded-mode ${uploadDropdownOpen ? "visible" : "hidden"}`}>
                        <div
                          className="upload-pill-item file-pill"
                          onClick={(e) => {
                            e.stopPropagation();
                            document.getElementById("file-upload")?.click();
                            setUploadDropdownOpen(false);
                            setUploadSuccess(true);
                            setTimeout(() => setUploadSuccess(false), 500);
                          }}
                        >
                          <div className="pill-icon">
                            <UploadIcon size={16} />
                          </div>
                          <div className="pill-content">
                            <span className="pill-title">Upload Files</span>
                            <span className="pill-description">Select multiple files</span>
                          </div>
                        </div>

                        <div
                          className="upload-pill-item folder-pill"
                          onClick={(e) => {
                            e.stopPropagation();
                            document.getElementById("folder-upload")?.click();
                            setUploadDropdownOpen(false);
                            setUploadSuccess(true);
                            setTimeout(() => setUploadSuccess(false), 500);
                          }}
                        >
                          <div className="pill-icon">
                            <Folder size={16} />
                          </div>
                          <div className="pill-content">
                            <span className="pill-title">Upload Folder</span>
                            <span className="pill-description">Select entire folder</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <input type="file" id="file-upload" onChange={onUpload} style={{ display: "none" }} multiple />
                  <input type="file" id="folder-upload" onChange={onUpload} style={{ display: "none" }} webkitdirectory="" multiple />

                  {expanded && <span className="action-label">{action.label}</span>}
                </div>
              );
            }

            if (!expanded) return null;

            return (
              <div key={index} className="action-item">
                <button onClick={action.onClick} disabled={action.disabled} className="action-button">
                  <Icon size={20} className={action.loading ? "loading-spinner" : ""} />
                </button>
                <span className="action-label">{action.label}</span>
              </div>
            );
          })}
        </div>

        {expanded && hasSelected && (
          <div className="selection-controls">
            <button
              onClick={onSelectAll}
              className="selection-btn"
              disabled={(multipleFiles?.length || 0) === (files?.length || 0)}
            >
              Select All ({files?.length || 0})
            </button>
            <button onClick={clearSelection} className="selection-btn" disabled={(multipleFiles?.length || 0) === 0}>
              Clear Selection
            </button>
            {(multipleFiles?.length || 0) > 0 && <span className="selection-count">{multipleFiles.length}</span>}
          </div>
        )}
      </div>

      {/* ---------- Modals wiring ---------- */}

      <RenameModal
        open={rename.isOpen}
        onClose={rename.closeRename}
        value={rename.newName}
        setValue={rename.setNewName}
        error={rename.error}
        loading={rename.status === "submitting"}
        onConfirm={async () => {
          await rename.submitRename(); // manager updates files + closes【turn19file2】
          await refresh();             // optional, keeps parity with “old flow”
        }}
      />

      <MoveModal
        open={move.isOpen}
        onClose={move.closeMoveDialog}
        availableFolders={folderOps.availableFolders}
        currentViewFolderId={move.currentViewFolderId}
        folderPath={move.folderPath}
        searchQuery={move.searchQuery}
        targetFolderId={move.targetFolderId}
        setTargetFolderId={move.setTargetFolderId}
        setSearchQuery={move.setSearchQuery}
        onOpenFolder={(id, name) => {
          if (String(id) === ROOT_ID) {
            move.setCurrentViewFolderId(ROOT_ID);
            move.setFolderPath([{ id: ROOT_ID, name: "My files" }]);
            return;
          }
          move.setCurrentViewFolderId(String(id));
          move.setFolderPath((prev) => [...prev, { id: String(id), name }]);
        }}
        onCrumbClick={(idx) => {
          move.setFolderPath((prev) => {
            const next = prev.slice(0, idx + 1);
            const last = next[next.length - 1];
            move.setCurrentViewFolderId(last?.id || ROOT_ID);
            return next;
          });
        }}
        onBack={() => {
          move.setFolderPath((prev) => {
            if (prev.length <= 1) {
              move.setCurrentViewFolderId(ROOT_ID);
              return prev;
            }
            const next = prev.slice(0, -1);
            const last = next[next.length - 1];
            move.setCurrentViewFolderId(last?.id || ROOT_ID);
            return next;
          });
        }}
        onConfirmMove={async () => {
          await move.submitMove(); 
          await refresh();        
        }}
        loading={folderOps.loading}
      />

      <DeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        selectedItems={currentSelected}
        loading={deleteLoading}
        onConfirm={confirmDelete}
      />
    </>
  );
}
