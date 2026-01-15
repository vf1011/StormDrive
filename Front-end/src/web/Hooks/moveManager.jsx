
import { useState } from "react";
import { supabase } from "../../supabase.jsx";
import { useFileContext } from "./filecontext.jsx";
import {
  validateMove,
  moveItemsOnServer,
  getItemId,
} from "../../core/modules/move.js";

/**
 * options:
 * - availableFolders: array from useFolderOperations (folder tree used in move dialog)
 * - setAvailableFolders: setter from useFolderOperations
 * - loadAllFolders: async function that fetches all folders for move dialog
 */
export function useMoveManager({
  availableFolders,
  setAvailableFolders,
  loadAllFolders,
} = {}) {
  const {
    selectedFiles,
    setSelectedFile,
    clearSelectedFiles,
    currentFolderId,
    setFiles,
    pushUndoAction,
    setNotification,
  } = useFileContext();

  // Move dialog state
  const [isOpen, setIsOpen] = useState(false);

  // Folder navigation state *inside* the move dialog
  const [currentViewFolderId, setCurrentViewFolderId] = useState("root");
  const [folderPath, setFolderPath] = useState([{ id: "root", name: "My files" }]);
  const [targetFolderId, setTargetFolderId] = useState("root");
  const [searchQuery, setSearchQuery] = useState("");


  // Helpers

  function resetDialogState() {
    setCurrentViewFolderId("root");
    setFolderPath([{ id: "root", name: "My files" }]);
    setTargetFolderId("root");
    setSearchQuery("");
  }

  function closeMoveDialog() {
    setIsOpen(false);
    resetDialogState();
  }

  function getCurrentFolderName() {
    if (currentViewFolderId === "root") return "My files";
    const f =
      availableFolders?.find(
        (folder) => folder.folder_id?.toString() === currentViewFolderId?.toString()
      ) || null;
    return f?.folder_name || "Unknown";
  }

  // Open dialog (similar to your old handleMove)

  async function openMoveDialog() {
    if (!selectedFiles || selectedFiles.length === 0) {
      setNotification?.({
        open: true,
        message: "Select at least one file or folder to move",
        severity: "info",
      });
      return;
    }

    try {
      if (loadAllFolders && setAvailableFolders) {
        const folders = await loadAllFolders();
        setAvailableFolders(folders);
      }
      resetDialogState();
      setIsOpen(true);
    } catch (err) {
      console.error("Failed to load folders for move dialog:", err);
      setNotification?.({
        open: true,
        message: `Failed to load folders: ${err.message}`,
        severity: "error",
      });
    }
  }

  // Submit move (similar to your old handleMoveToFolder)

  async function submitMove(customTargetFolderId) {
    const finalTargetFolderId =
      customTargetFolderId !== undefined ? customTargetFolderId : targetFolderId;

    const validation = validateMove({
      items: selectedFiles,
      targetFolderId: finalTargetFolderId,
    });

    if (!validation.ok) {
      if (validation.error) {
        setNotification?.({
          open: true,
          message: validation.error,
          severity: "warning",
        });
      }
      return;
    }

    try {
      // Auth
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      const userId = session?.user?.id || session?.user?.sub;
      if (!token) throw new Error("Missing Supabase access token");

      // You can plug your old filterParentFolders here if you want
      const itemsToMove = selectedFiles;

      // Build undo payloads
      const fileIds = [];
      const folderIds = [];

      itemsToMove.forEach((item) => {
        const id = getItemId(item);
        if (item.type === "folder") {
          folderIds.push(id);
        } else {
          fileIds.push(id);
        }
      });

      if (fileIds.length > 0) {
        pushUndoAction?.("move_multiple_files", {
          file_ids: fileIds,
          old_folder_id: currentFolderId,
          new_folder_id: finalTargetFolderId,
          user_id: userId,
        });
      }

      if (folderIds.length > 0) {
        pushUndoAction?.("move_multiple_folders", {
          folder_ids: folderIds,
          old_parent_folder_id: currentFolderId,
          new_parent_folder_id: finalTargetFolderId,
          user_id: userId,
        });
      }

      // 🔹 Core move (files + folders) using your moveLogic
      const { success, failed } = await moveItemsOnServer({
        token,
        items: itemsToMove,
        targetFolderId: finalTargetFolderId,
      });

      // Remove moved items from current view
      if (success.length > 0) {
        const movedIds = new Set(
          success.map((item) => getItemId(item).toString())
        );

        setFiles((prev) =>
          prev.filter((f) => !movedIds.has(getItemId(f).toString()))
        );
      }

      // Update folder tree for moved folders if we have it
      if (setAvailableFolders && success.length > 0) {
        const movedFolders = success.filter((item) => item.type === "folder");

        if (movedFolders.length > 0) {
          setAvailableFolders((prev) =>
            prev.map((folder) => {
              const moved = movedFolders.find(
                (m) =>
                  getItemId(m)?.toString() === folder.folder_id?.toString()
              );
              if (!moved) return folder;
              return {
                ...folder,
                parent_folder_id:
                  finalTargetFolderId === "root" || finalTargetFolderId === null
                    ? null
                    : parseInt(finalTargetFolderId, 10),
              };
            })
          );
        }
      }

      // Selection updates
      if (success.length === selectedFiles.length) {
        clearSelectedFiles?.();
        setSelectedFile?.(null);
      }

      // Notification
      const successCount = success.length;
      const errorCount = failed.length;
      const folderName =
        finalTargetFolderId === "root"
          ? "My files"
          : availableFolders?.find(
              (f) =>
                f.folder_id?.toString() === finalTargetFolderId?.toString()
            )?.folder_name || "Unknown";

      let message = "";
      if (successCount > 0) {
        message =
          successCount === 1
            ? `1 item moved to ${folderName}`
            : `${successCount} items moved to ${folderName}`;
      }
      if (errorCount > 0) {
        message += successCount > 0
          ? ` (${errorCount} failed)`
          : `${errorCount} items failed to move`;
      }

      setNotification?.({
        open: true,
        message: message || "Move completed",
        severity:
          successCount > 0
            ? errorCount > 0
              ? "warning"
              : "success"
            : "error",
      });
    } catch (err) {
      console.error("Move failed:", err);
      setNotification?.({
        open: true,
        message: `Move failed: ${err.message}`,
        severity: "error",
      });
    } finally {
      closeMoveDialog();
    }
  }

  // Public API of the hook (similar style to useRenameManager)

  return {
    // dialog state
    isOpen,
    openMoveDialog,
    closeMoveDialog,

    // target + navigation state
    currentViewFolderId,
    setCurrentViewFolderId,
    folderPath,
    setFolderPath,
    targetFolderId,
    setTargetFolderId,
    searchQuery,
    setSearchQuery,
    getCurrentFolderName,
    submitMove,
  };
}
