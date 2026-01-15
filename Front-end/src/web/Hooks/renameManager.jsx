// src/fileOps/rename/useRenameManager.js
import { useState } from "react";
import { supabase } from "../../supabase.jsx";
import { useFileContext } from "./filecontext.jsx"; 
import { validateRenameName, renameItemOnServer } from "../../core/modules/rename.js";

export function useRenameManager() {
  const {
    selectedFiles,
    setFiles,
    pushUndoAction,
    setNotification,
    setLoading,
  } = useFileContext();

  const [isOpen, setIsOpen] = useState(false);
  const [target, setTarget] = useState(null); // { id, type, name }
  const [newName, setNewName] = useState("");
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | submitting

  // Open dialog for a specific item (or from currently selectedFiles[0])
  function openRename(item) {
    const base =
      item ||
      (selectedFiles && selectedFiles.length > 0 ? selectedFiles[0] : null);

    if (!base) return;

    setTarget({
      id: base.id,
      type: base.type === "folder" ? "folder" : "file",
      name: base.name,
    });
    setNewName(base.name || "");
    setError(null);
    setIsOpen(true);
  }

  function closeRename() {
    setIsOpen(false);
    setTarget(null);
    setNewName("");
    setError(null);
    setStatus("idle");
  }

  async function submitRename() {
    if (!target) return;

    const validation = validateRenameName(newName, target.name);
    if (!validation.ok) {
      if (validation.noChange) {
        // Name unchanged — just close modal quietly
        closeRename();
        return;
      }
      setError(validation.error);
      return;
    }

    const finalName = validation.value;

    try {
      setStatus("submitting");
      setError(null);
      setLoading?.(true);

      // Get Supabase token (same as your old code)
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      const userId = session?.user?.id || session?.user?.sub;
      if (!token) throw new Error("Missing Supabase access token");

      // Call backend (file or folder)
      const result = await renameItemOnServer({
        token,
        item: target,
        newName: finalName,
      });

      // Undo stack
      if (result.type === "file") {
        pushUndoAction?.("rename_file", {
          target: "file",
          file_id: result.id,
          old_name: result.oldName,
          new_name: result.newName,
          user_id: userId,
        });
      } else {
        pushUndoAction?.("rename_folder", {
          target: "folder",
          folder_id: result.id,
          old_name: result.oldName,
          new_name: result.newName,
          user_id: userId,
        });
      }

      // Update FileContext.files (folders are also entries with type 'folder')
      setFiles((prev) =>
        prev.map((f) =>
          f.id === result.id ? { ...f, name: result.newName } : f
        )
      );

      // Toast
      setNotification?.({
        open: true,
        message: `Renamed to "${finalName}"`,
        severity: "success",
      });

      closeRename();
    } catch (err) {
      console.error("Rename failed", err);
      const msg = err?.message || "Rename failed";
      setError(msg);
      setNotification?.({
        open: true,
        message: `Rename failed: ${msg}`,
        severity: "error",
      });
    } finally {
      setStatus("idle");
      setLoading?.(false);
    }
  }

  return {
    // state
    isOpen,
    target,
    newName,
    error,
    status,

    // actions
    openRename,
    closeRename,
    setNewName,
    submitRename,
  };
}
