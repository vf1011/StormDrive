// src/fileOps/delete/useDeleteManager.js

import { supabase } from "../../supabase.jsx";
import { useFileContext } from "./filecontext.jsx";
import {
  validateDelete,
  deleteItemsOnServer,
  getItemId,
} from "../../core/modules/delete.js";

/**
 * options:
 *  - fetchFilesInFolder?: async (folderId) => void
 *    (optional refetch helper; if not given, we just filter setFiles)
 */
export function useDeleteManager({ fetchFilesInFolder } = {}) {
  const {
    selectedFiles,
    clearSelectedFiles,
    setSelectedFile,
    setFiles,
    setNotification,
    currentFolderId,
    pushUndoAction,
  } = useFileContext();

  const deleteSelected = async () => {
    const validation = validateDelete({ items: selectedFiles });
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

      const items = selectedFiles;

      // Build undo payloads before we delete
      const files = items.filter((i) => i.type !== "folder");
      const folders = items.filter((i) => i.type === "folder");

      const fileIds = files.map((f) => getItemId(f));
      const folderIds = folders.map((f) => getItemId(f));

      if (fileIds.length > 0) {
        pushUndoAction?.("delete_multiple_files", {
          file_ids: fileIds,
          folder_id: currentFolderId,
          user_id: userId,
        });
      }

      if (folderIds.length > 0) {
        pushUndoAction?.("delete_multiple_folders", {
          folder_ids: folderIds,
          parent_folder_id: currentFolderId,
          user_id: userId,
        });
      }

      // Call core delete (soft delete → trash)
      const { folderResult, fileResult } = await deleteItemsOnServer({
        token,
        items,
      });

      if (
        (folderResult && !folderResult.success) ||
        (fileResult && !fileResult.success)
      ) {
        const msg =
          folderResult?.error || fileResult?.error || "Delete failed";
        throw new Error(msg);
      }

      // Update UI
      if (fetchFilesInFolder) {
        // safest: refetch folder contents
        await fetchFilesInFolder(currentFolderId);
      } else {
        // simple: remove deleted items from current list
        const deletedIds = new Set(
          items.map((i) => String(getItemId(i)))
        );
        setFiles?.((prev) =>
          prev.filter((f) => !deletedIds.has(String(getItemId(f))))
        );
      }

      clearSelectedFiles?.();
      setSelectedFile?.(null);

      setNotification?.({
        open: true,
        message: "Items moved to trash.",
        severity: "success",
      });
    } catch (err) {
      console.error("❌ Delete error:", err);
      setNotification?.({
        open: true,
        message: `Delete failed: ${err.message}`,
        severity: "error",
      });
    }
  };

  return {
    deleteSelected, // soft delete to trash
  };
}
