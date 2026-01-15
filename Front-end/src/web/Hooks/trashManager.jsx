// src/fileOps/trash/trashManager.jsx

import { useCallback, useMemo, useState } from "react";
import {
  fetchTrashOnServer,
  restoreItemsOnServer,
  permDeleteItemsOnServer,
  validateTrashSelection,
} from "../../core/modules/trash";

// ✅ adjust to your supabase file
import { supabase } from "../../supabase";

const ROOT_ID = null;

export function useTrashManager({ setNotification, pushUndoAction } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // navigation inside deleted folders
  const [currentFolderId, setCurrentFolderId] = useState(ROOT_ID);
  const [folderPath, setFolderPath] = useState([]); // [{id,name}]

  // selection
  const [selectedIds, setSelectedIds] = useState([]);

  // modals
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [permDeleteOpen, setPermDeleteOpen] = useState(false);

  const notify = useCallback(
    (message, severity = "info") => {
      setNotification?.({ open: true, message, severity });
    },
    [setNotification]
  );

  const selectedItems = useMemo(() => {
    const map = new Map(items.map((x) => [String(x.id), x]));
    return selectedIds.map((id) => map.get(String(id))).filter(Boolean);
  }, [items, selectedIds]);

  const hasSelection = selectedIds.length > 0;

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error("Missing Supabase access token");
    return token;
  }, []);

  const loadTrash = useCallback(
    async (folderId = currentFolderId) => {
      setLoading(true);
      try {
        const token = await getToken();
        const data = await fetchTrashOnServer({ token, currentFolderId: folderId });
        setItems(data || []);
      } catch (e) {
        notify(e?.message || "Failed to load trash", "error");
      } finally {
        setLoading(false);
      }
    },
    [currentFolderId, getToken, notify]
  );

  // navigation helpers
  const openFolder = useCallback((folder) => {
    setCurrentFolderId(folder.id);
    setFolderPath((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setSelectedIds([]);
  }, []);

  const goRoot = useCallback(() => {
    setCurrentFolderId(ROOT_ID);
    setFolderPath([]);
    setSelectedIds([]);
  }, []);

  const crumbClick = useCallback((index) => {
    setFolderPath((prev) => {
      const next = prev.slice(0, index + 1);
      const last = next[next.length - 1];
      setCurrentFolderId(last?.id ?? ROOT_ID);
      setSelectedIds([]);
      return next;
    });
  }, []);

  const goBack = useCallback(() => {
    setFolderPath((prev) => {
      if (prev.length <= 1) {
        setCurrentFolderId(ROOT_ID);
        setSelectedIds([]);
        return [];
      }
      const next = prev.slice(0, -1);
      const last = next[next.length - 1];
      setCurrentFolderId(last?.id ?? ROOT_ID);
      setSelectedIds([]);
      return next;
    });
  }, []);

  // selection helpers
  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const s = String(id);
      return prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s];
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  const selectAll = useCallback(() => {
    setSelectedIds(items.map((x) => String(x.id)));
  }, [items]);

  // modals open/close
  const openRestoreModal = useCallback(() => {
    if (!hasSelection) return notify("No items selected", "info");
    setRestoreOpen(true);
  }, [hasSelection, notify]);

  const openPermDeleteModal = useCallback(() => {
    if (!hasSelection) return notify("No items selected", "info");
    setPermDeleteOpen(true);
  }, [hasSelection, notify]);

  const closeModals = useCallback(() => {
    setRestoreOpen(false);
    setPermDeleteOpen(false);
  }, []);

  // actions
  const confirmRestore = useCallback(async () => {
    const v = validateTrashSelection({ items: selectedItems });
    if (!v.ok) return notify(v.error, "info");

    setLoading(true);
    try {
      const token = await getToken();
      await restoreItemsOnServer({ token, items: selectedItems });

      // undo log (optional)
      if (pushUndoAction) {
        const fileIds = selectedItems.filter(i => i.type === "file").map(i => i.id);
        const folderIds = selectedItems.filter(i => i.type === "folder").map(i => i.id);
        if (fileIds.length) pushUndoAction("restore_multiple_file", { file_ids: fileIds });
        if (folderIds.length) pushUndoAction("restore_multiple_folder", { folder_ids: folderIds });
      }

      // remove restored items locally + refresh view
      const selectedSet = new Set(selectedIds.map(String));
      setItems((prev) => prev.filter((x) => !selectedSet.has(String(x.id))));
      setSelectedIds([]);
      setRestoreOpen(false);

      notify("Restored successfully", "success");
      await loadTrash(currentFolderId);
    } catch (e) {
      notify(e?.message || "Restore failed", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedItems, selectedIds, notify, getToken, loadTrash, currentFolderId, pushUndoAction]);

  const confirmPermDelete = useCallback(async () => {
    const v = validateTrashSelection({ items: selectedItems });
    if (!v.ok) return notify(v.error, "info");

    setLoading(true);
    try {
      const token = await getToken();
      await permDeleteItemsOnServer({ token, items: selectedItems });

      const selectedSet = new Set(selectedIds.map(String));
      setItems((prev) => prev.filter((x) => !selectedSet.has(String(x.id))));
      setSelectedIds([]);
      setPermDeleteOpen(false);

      notify("Permanently deleted", "success");
      await loadTrash(currentFolderId);
    } catch (e) {
      notify(e?.message || "Permanent delete failed", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedItems, selectedIds, notify, getToken, loadTrash, currentFolderId]);

  return {
    // data
    items,
    loading,

    // navigation
    currentFolderId,
    folderPath,
    openFolder,
    goRoot,
    crumbClick,
    goBack,

    // selection
    selectedIds,
    selectedItems,
    hasSelection,
    toggleSelect,
    clearSelection,
    selectAll,

    // modals
    restoreOpen,
    permDeleteOpen,
    openRestoreModal,
    openPermDeleteModal,
    closeModals,

    // actions
    loadTrash,
    confirmRestore,
    confirmPermDelete,
  };
}
