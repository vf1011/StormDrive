// src/fileOps/copy/useCopyManager.js

import { useState } from "react";
import { supabase } from "../../supabase.jsx";
import { useFileContext } from "./filecontext.jsx";
import {
  validateCopy,
  copyItemsOnServer,
} from "../../core/modules/copy.js";

/**
 * options:
 *  - fetchFilesInFolder?: async (folderId) => void
 *  - formatSize?, formatDate?, guessType?, getFileIcon?
 *    (optional helpers if you want optimistic UI instead of refetch)
 */
export function useCopyManager({
  fetchFilesInFolder,
  formatSize,
  formatDate,
  guessType,
  getFileIcon,
} = {}) {
  const {
    clipboardFile,
    setClipboardFile,
    currentFolderId,
    setFiles,
    setNotification,
    pushUndoAction,
  } = useFileContext();

  const [isPasting, setIsPasting] = useState(false);

  /**
   * Main keyboard paste handler (Ctrl+V / Cmd+V)
   */
  const handleKeyboardPaste = async () => {
    if (!clipboardFile) return;

    const itemsToPaste = Array.isArray(clipboardFile)
      ? clipboardFile
      : [clipboardFile];

    // Basic validation
    const validation = validateCopy({
      items: itemsToPaste,
      targetFolderId: currentFolderId,
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
      setIsPasting(true);

      // Supabase auth
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      const userId = session?.user?.id || session?.user?.sub;
      if (!token) throw new Error("Missing Supabase access token");

      // Optional: prevent copying file(s) into the same folder they already live in
      const files = itemsToPaste.filter((i) => i.type !== "folder");
      if (files.length > 0) {
        const allSameFolder = files.every((file) => {
          const srcFolder =
            file.source_folder_id ?? file.folder_id ?? file.parent_folder_id;
          return srcFolder != null && srcFolder === currentFolderId;
        });
        if (allSameFolder) {
          setNotification?.({
            open: true,
            message:
              "Cannot paste here. Selected files are already in this folder.",
            severity: "warning",
          });
          setIsPasting(false);
          return;
        }
      }

      // 🔹 Core copy call (backend does auto-rename for conflicts)
      const { folderResult, fileResult } = await copyItemsOnServer({
        token,
        items: itemsToPaste,
        targetFolderId: currentFolderId,
      });
      // folderResult / fileResult shape:
      // { success: boolean, data?: any, error?: string }

      // 🔹 Error handling
      if (
        (folderResult && !folderResult.success) ||
        (fileResult && !fileResult.success)
      ) {
        const msg =
          folderResult?.error ||
          fileResult?.error ||
          "Copy failed";
        throw new Error(msg);
      }

      // 🔹 Success handling – push undo based on backend response
      if (folderResult?.success) {
        const data = folderResult.data || {};
        const copiedFolders =
          data.copied_folders || data.folders || data.new_folders || [];

        const newFolderIds = copiedFolders.map(
          (f) => f.folder_id ?? f.id
        );

        if (newFolderIds.length > 0) {
          pushUndoAction?.("copy_multiple_folder", {
            folder_ids: newFolderIds,
            new_parent_folder_id: currentFolderId,
            user_id: userId,
          });
        }
      }

      if (fileResult?.success) {
        const data = fileResult.data || {};
        const copiedFiles =
          data.copied_files || data.files || data.new_files || [];

        const newFileIds = copiedFiles.map((f) => f.file_id ?? f.id);

        if (newFileIds.length === 1) {
          pushUndoAction?.("copy_file", {
            file_id: newFileIds[0],
            new_folder_id: currentFolderId,
            user_id: userId,
          });
        } else if (newFileIds.length > 1) {
          pushUndoAction?.("copy_multiple_file", {
            file_ids: newFileIds,
            new_folder_id: currentFolderId,
            user_id: userId,
          });
        }
      }

      // 🔹 UI update
      if (fetchFilesInFolder) {
        // safest: refetch so we get auto-renamed names like "name (1).ext"
        await fetchFilesInFolder(currentFolderId);
      } else if (fileResult?.success || folderResult?.success) {
        // optional: optimistic update using returned data if you don't want to refetch
        const newFiles = [];
        const newFolders = [];

        if (fileResult?.success) {
          const data = fileResult.data || {};
          const copiedFiles =
            data.copied_files || data.files || data.new_files || [];

          copiedFiles.forEach((f) => {
            const name = f.file_name || f.name;
            const size = f.file_size ?? f.size ?? 0;
            const type = f.file_type || guessType?.(name) || "file";

            newFiles.push({
              id: f.file_id ?? f.id,
              name,
              type,
              size: formatSize ? formatSize(size) : size,
              rawSize: size,
              modified: formatDate
                ? formatDate(new Date())
                : new Date().toISOString(),
              file_type: f.file_type,
              icon: getFileIcon ? getFileIcon(type) : undefined,
            });
          });
        }

        if (folderResult?.success) {
          const data = folderResult.data || {};
          const copiedFolders =
            data.copied_folders || data.folders || data.new_folders || [];

          copiedFolders.forEach((folder) => {
            const name = folder.folder_name || folder.name;
            newFolders.push({
              id: folder.folder_id ?? folder.id,
              name,
              type: "folder",
              size: "--",
              rawSize: 0,
              modified: formatDate
                ? formatDate(new Date())
                : new Date().toISOString(),
            });
          });
        }

        if (newFiles.length || newFolders.length) {
          setFiles((prev) => [...newFolders, ...newFiles, ...prev]);
        }
      }

      setClipboardFile?.(null);

      setNotification?.({
        open: true,
        message: "Paste completed successfully.",
        severity: "success",
      });
    } catch (err) {
      console.error("❌ Keyboard paste error:", err);
      setNotification?.({
        open: true,
        message: `Paste failed: ${err.message}`,
        severity: "error",
      });
    } finally {
      setIsPasting(false);
    }
  };

  return {
    isPasting,
    handleKeyboardPaste,
  };
}
