// src/web/hooks/useFolderOperation.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabase";
import { API_BASE_URL} from "../../core/api/config";

// ✅ IMPORTANT: use the SAME FileContext file everywhere (toolbar + managers + hooks)
import { useFileContext } from "../Hooks/filecontext";

// Core helpers (platform-agnostic)
import {
  normalizeFolders,
  buildFolderIndex,
  getChildrenFolders,
  getBreadcrumbPath,
  searchFoldersByName,
} from "../../core/modules/folder";

/**
 * Web-only hook: manages folder picker state + calls backend endpoints.
 * - API calls stay here (web), since you already have folderApi.js; if you prefer,
 *   you can replace fetch() with your folderApi.js functions later.
 *
 * Signature kept compatible with what you were using:
 * useFolderOperations(user, session, setNotification)
 */
export const useFolderOperations = (user, session, setNotification) => {
  const {
    setFiles,
    setMultipleFiles,
    setSelectedFile,
    pushUndoAction,
    currentFolderId,
  } = useFileContext();

  const API_BASE = API_BASE_URL;

  // ----- Folder picker state -----
  const [availableFolders, setAvailableFolders] = useState([]);
  const [folderIndex, setFolderIndex] = useState(() => buildFolderIndex([]));

  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Picker navigation state
  const [currentViewFolderId, setCurrentViewFolderId] = useState("root");
  const [folderPath, setFolderPath] = useState([{ id: "root", name: "My files" }]);
  const [searchQuery, setSearchQuery] = useState("");

  // Create folder inside picker (optional)
  const [createFolderMode, setCreateFolderMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [createFolderError, setCreateFolderError] = useState("");

  // ---------- helpers ----------
  const notify = useCallback(
    (message, severity = "info") => {
      setNotification?.({ open: true, message, severity });
    },
    [setNotification]
  );

  const getAuthToken = useCallback(async () => {
    // prefer passed session
    if (session?.access_token) return session.access_token;

    // fallback supabase session
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error("Missing Supabase token");
    return token;
  }, [session]);

  const rebuildIndex = useCallback((folders) => {
    const normalized = normalizeFolders(folders);
    const idx = buildFolderIndex(normalized);
    setAvailableFolders(normalized);
    setFolderIndex(idx);
    return { normalized, idx };
  }, []);

  // ---------- API: load all folders ----------
  const loadAllFolders = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();

      const res = await fetch(`${API_BASE}/folder/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Failed to load folders (${res.status}) ${txt}`);
      }

      const data = await res.json().catch(() => ({}));
      const folders = data.folders || [];

      rebuildIndex(folders);
      setInitialized(true);
      return folders;
    } catch (err) {
      notify(err.message || "Failed to load folders", "error");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [API_BASE, getAuthToken, rebuildIndex, notify]);

  // Auto-init once (optional)
  useEffect(() => {
    if (initialized) return;
    // If you only want to load folders when opening MoveModal, remove this effect.
    loadAllFolders().catch(() => {});
  }, [initialized, loadAllFolders]);

  // ---------- Picker derived lists ----------
  const breadcrumb = useMemo(
    () => getBreadcrumbPath(folderIndex, currentViewFolderId),
    [folderIndex, currentViewFolderId]
  );

  const visibleFolders = useMemo(() => {
    const q = (searchQuery || "").trim();
    if (!q) return getChildrenFolders(folderIndex, currentViewFolderId);

    // For pickers, global search is usually better UX:
    return searchFoldersByName(availableFolders, q);
  }, [availableFolders, folderIndex, currentViewFolderId, searchQuery]);

  // ---------- Picker navigation actions ----------
  const openFolder = useCallback((folderId, folderName) => {
    const id = folderId == null ? "root" : String(folderId);

    setCurrentViewFolderId(id);

    if (id === "root") {
      setFolderPath([{ id: "root", name: "My files" }]);
      return;
    }

    setFolderPath((prev) => {
      // if you open a folder that already exists in path, slice to it
      const existingIndex = prev.findIndex((p) => String(p.id) === id);
      if (existingIndex >= 0) return prev.slice(0, existingIndex + 1);

      return [...prev, { id, name: folderName || "Folder" }];
    });
  }, []);

  const goBack = useCallback(() => {
    setFolderPath((prev) => {
      if (prev.length <= 1) {
        setCurrentViewFolderId("root");
        return prev;
      }
      const next = prev.slice(0, -1);
      const last = next[next.length - 1];
      setCurrentViewFolderId(last?.id || "root");
      return next;
    });
  }, []);

  const crumbClick = useCallback((index) => {
    setFolderPath((prev) => {
      const next = prev.slice(0, index + 1);
      const last = next[next.length - 1];
      setCurrentViewFolderId(last?.id || "root");
      return next;
    });
  }, []);

  // ---------- Create folder (used inside MoveModal picker) ----------
  const validateFolderName = useCallback(
    (name, parentId) => {
      const trimmed = (name || "").trim();
      if (!trimmed) return { ok: false, error: "Folder name is required" };
      if (trimmed.length > 120) return { ok: false, error: "Folder name too long" };

      // basic reserved names
      const lower = trimmed.toLowerCase();
      if (lower === "con" || lower === "nul" || lower === "prn") {
        return { ok: false, error: "This folder name is reserved" };
      }

      // duplicate check among siblings
      const pid = parentId == null || parentId === "root" ? null : String(parentId);
      const dup = availableFolders.some(
        (f) =>
          (f.parentId == null ? null : String(f.parentId)) === pid &&
          String(f.name || "").toLowerCase() === lower
      );

      if (dup) return { ok: false, error: "A folder with this name already exists" };
      return { ok: true, error: null };
    },
    [availableFolders]
  );

  const createFolder = useCallback(
    async ({ folderName, parentFolderId }) => {
      setCreateFolderError("");
      const parentId =
        parentFolderId == null || parentFolderId === "root" ? null : String(parentFolderId);

      const v = validateFolderName(folderName, parentId);
      if (!v.ok) {
        setCreateFolderError(v.error);
        throw new Error(v.error);
      }

      setLoading(true);
      try {
        const token = await getAuthToken();

        const body = {
          folder_name: folderName.trim(),
          parent_folder_id: parentId, // backend expects null for root
        };

        const res = await fetch(`${API_BASE}/folder/create`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const msg = data?.detail || "Failed to create folder";
          notify(msg, "error");
          throw new Error(msg);
        }

        // Expected: { folder_id, folder_name, parent_folder_id, ... }
        // Normalize and add to cache
        const created = normalizeFolders([data])[0] || {
          id: String(data.folder_id),
          name: data.folder_name,
          parentId: data.parent_folder_id ?? null,
          raw: data,
        };

        const next = [...availableFolders, created];
        setAvailableFolders(next);
        setFolderIndex(buildFolderIndex(next));

        pushUndoAction?.("create-folder", {
          folder_id: created.id,
          folder_name: created.name,
          parent_folder_id: created.parentId,
        });

        notify("Folder created", "success");
        return created;
      } finally {
        setLoading(false);
      }
    },
    [
      API_BASE,
      availableFolders,
      getAuthToken,
      notify,
      pushUndoAction,
      validateFolderName,
    ]
  );

  // Optional helper used by your picker UI
  const createFolderInCurrentView = useCallback(async () => {
    const targetParent = currentViewFolderId === "root" ? null : currentViewFolderId;
    const created = await createFolder({
      folderName: newFolderName,
      parentFolderId: targetParent,
    });

    // If you're in that parent, keep you there and reset input
    setCreateFolderMode(false);
    setNewFolderName("");
    setCreateFolderError("");

    // Optionally auto-open the created folder:
    // openFolder(created.id, created.name);

    return created;
  }, [createFolder, currentViewFolderId, newFolderName]);

  // ---------- Delete folders (single or multiple) ----------
  const deleteFolders = useCallback(
    async (folderIds) => {
      const ids = (Array.isArray(folderIds) ? folderIds : [folderIds])
        .filter(Boolean)
        .map(String);

      if (ids.length === 0) return;

      setLoading(true);
      try {
        const token = await getAuthToken();

        const endpoint =
          ids.length === 1 ? `${API_BASE}/folder/delete` : `${API_BASE}/folder/delete_multiple_folders`;

        const body =
          ids.length === 1
            ? { folder_id: ids[0] }
            : { folder_ids: ids };

        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = data?.detail || "Delete failed";
          notify(msg, "error");
          throw new Error(msg);
        }

        pushUndoAction?.("delete-folder", { folder_ids: ids });

        // remove from folder cache + grid
        const next = availableFolders.filter((f) => !ids.includes(String(f.id)));
        setAvailableFolders(next);
        setFolderIndex(buildFolderIndex(next));

        setFiles?.((prev) => (Array.isArray(prev) ? prev.filter((x) => !ids.includes(String(x.id))) : prev));
        setMultipleFiles?.((prev) => (Array.isArray(prev) ? prev.filter((x) => !ids.includes(String(x.id))) : prev));
        setSelectedFile?.((prev) => (prev && ids.includes(String(prev.id)) ? null : prev));

        notify("Folder deleted", "success");
      } finally {
        setLoading(false);
      }
    },
    [
      API_BASE,
      availableFolders,
      getAuthToken,
      notify,
      pushUndoAction,
      setFiles,
      setMultipleFiles,
      setSelectedFile,
    ]
  );

  // ---------- Public API ----------
  return {
    // data
    loading,
    initialized,
    availableFolders,          // normalized FolderNode[]
    folderIndex,               // { byId, childrenByParent, roots }
    visibleFolders,            // derived (children or search results)
    breadcrumb,                // derived

    // picker state
    currentViewFolderId,
    folderPath,
    searchQuery,

    // picker setters
    setSearchQuery,
    setCurrentViewFolderId,
    setFolderPath,

    // picker actions
    openFolder,
    goBack,
    crumbClick,

    // folder loading
    loadAllFolders,

    // create folder inside picker
    createFolderMode,
    setCreateFolderMode,
    newFolderName,
    setNewFolderName,
    createFolderError,
    createFolderInCurrentView,
    createFolder,

    // delete
    deleteFolders,

    // raw setters (if another manager wants to inject)
    setAvailableFolders,
  };
};
