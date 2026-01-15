import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../../../supabase';

import { guessType } from '../../../utils';

// Create Context
const FileContext = createContext(null);

// Custom hook for consuming the FileContext safely
export const useFileContext = () => {
  const context = useContext(FileContext);
  if (!context) {
    throw new Error('useFileContext must be used within a FileProvider');
  }
  return context;
};

export const FileProvider = ({ children }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showInfoSidebar, setShowInfoSidebar] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [downloadProgress, setDownloadProgress] = useState({});
  const [realTimeActivity, setRealTimeActivity] = useState(false); // ✅ Moved inside the provider
  const [searching, setSearching] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [clipboardFile, setClipboardFile] = useState(null); // NEW
  const [currentFolderId, setCurrentFolderId] = useState(null); 
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [activeUploads, setActiveUploads] = useState(new Set()); // Track which files are uploading
  const [uploadQueue, setUploadQueue] = useState([]);
  const [multipleFiles, setMultipleFiles] = useState([]);
  const [activeDownloads, setActiveDownloads] = useState(new Set()); // Track which files are downloading
  const [downloadQueue, setDownloadQueue] = useState([]);
  const [pausedTransfers, setPausedTransfers] = useState(new Set()); // Track which transfers are paused
  const [completedTransfers, setCompletedTransfers] = useState([]); // Track completed transfers
  
  const [ undo, setUndo] = useState([]);
  const [redo, setRedo] = useState([]);

  



const toggleFileSelection = (file) => {
  setSelectedFiles((prev) => {
    const alreadySelected = prev.find((f) => f.id === file.id);
    if (alreadySelected) {
      return prev.filter((f) => f.id !== file.id);
    } else {
      return [...prev, file];
    }
  });
};

const clearSelectedFiles = () => setSelectedFiles([]);

const [storageStats, setStorageStats] = useState({
  total: 15 * 1024 ** 3, // default to 15 GB
  used: 0,
  percentage: 0
});

const updateStorageStats = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("Supabase token not found");
    const res = await fetch('http://127.0.0.1:5000/storage/stats', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      const data = await res.json();
      const used = data.total_used_storage || 0;
      const total = data.total_storage || 15 * 1024 ** 3;
      const percentage = total > 0 ? ((used / total) * 100).toFixed(2) : 0;

      setStorageStats({ used, total, percentage });
    }
  } catch (err) {
    console.error("Failed to fetch storage stats:", err);
  }
};


  const safeSetSelectedFile = useCallback((file) => {
    if (!file || typeof file !== 'object' || !file.id || !file.name) {
      console.warn('Invalid file selected');
      return;
    }
    setSelectedFile(file);
  }, []);

  const safeSetFiles = useCallback((newFiles) => {
    if (!Array.isArray(newFiles)) {
      console.warn('Files must be an array');
      return;
    }
    setFiles(newFiles.filter(f => f.id && f.name));
  }, []);

 const enqueueUpload = useCallback(transfer => {
   setUploadQueue(q => [...q, transfer]);
 }, []);

 const updateUploadQueue = useCallback((id, fields) => {
   setUploadQueue(q =>
     q.map(t => t.id === id ? { ...t, ...fields } : t)
   );
 }, []);

 const dequeueUpload = useCallback(id => {
   setUploadQueue(q => q.filter(t => t.id !== id));
 }, []);

 const updateUploadProgress = useCallback((fileId, patch) => {
  if (!fileId) return;
  setUploadProgress(prev => {
    const prevItem = prev[fileId] || {};
    const next =
      typeof patch === 'number'
        ? { ...prevItem, percent: Math.min(Math.max(patch, 0), 100) }
        : { ...prevItem, ...patch, percent: Math.min(Math.max((patch?.percent ?? prevItem.percent ?? 0), 0), 100) };
    return { ...prev, [fileId]: next };
  });
}, []);

  const updateDownloadProgress = useCallback((fileId, percent) => {
    if (typeof fileId !== 'string' || typeof percent !== 'number') return;
    setDownloadProgress(prev => ({ ...prev, [fileId]: Math.min(Math.max(percent, 0), 100) }));
  }, []);

  const clearProgress = useCallback((fileId) => {
    if (!fileId) return;
    setUploadProgress(prev => {
      const { [fileId]: _, ...rest } = prev;
      return rest;
    });
    setDownloadProgress(prev => {
      const { [fileId]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const addFile = useCallback((file) => {
    setFiles((prev) => [...prev, file]);
  }, []);
  
  const removeFile = useCallback((fileId) => {
     console.log('🔥 removeFile running for', fileId);
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);



  useEffect(() => {
    console.log('📦 Context clipboardFile changed:', clipboardFile);
  }, [clipboardFile]);

  useEffect(() => {
    console.log('📦 Context currentFolderId changed:', currentFolderId);
  }, [currentFolderId]);
  
  useEffect(() => {
  if (currentFolderId !== null) {
    updateStorageStats();
  }
}, [currentFolderId]);

const pushUndoAction = (type, payload) => {
  const action = {
    type, // e.g., 'rename', 'delete', 'move'
    payload, // object: { file_id, old_name, new_name } etc.
    timestamp: Date.now()
  };
  setUndo(prev => [...prev, action]);
  setRedo([]); // clear redo stack on new action
};

const refreshUIAfterUndoRedo = async () => {
  try {
    // 1. get token
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session?.access_token) throw new Error("Missing Supabase token");
    const headers = { Authorization: `Bearer ${session.access_token}` };

    let folders = [];
    let files   = [];

    if (currentFolderId) {
      // ───── Sub-folder view ─────
      const res = await fetch(
        `http://127.0.0.1:5000/folder/list/${encodeURIComponent(currentFolderId)}`,
        { headers }
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Folder fetch failed (${res.status}): ${text}`);
      }
      const payload = await res.json();
      folders = payload.folders || [];
      files   = payload.files   || [];

    } else {
      // ───── Root view ─────
      const [fRes, flRes] = await Promise.all([
        fetch(`http://127.0.0.1:5000/folder/list`,    { headers }),
        fetch(`http://127.0.0.1:5000/files/file`,      { headers })
      ]);

      if (!fRes .ok) throw new Error(`Root folders failed: ${fRes .status}`);
      if (!flRes.ok) throw new Error(`Root files   failed: ${flRes.status}`);

      const [fJson, flJson] = await Promise.all([fRes.json(), flRes.json()]);
      folders = fJson.folders || [];
      files   = flJson.files   || [];
    }

    // 2. map into your UI state
    setFiles([
      ...folders.map(f => ({
        id:   f.folder_id,
        name: f.folder_name,
        type: 'folder'
      })),
      ...files.map(f => ({
        id:        f.file_id,
        name:      f.filename,
        type:      guessType(f.filename),
        size:      f.file_size,
        folder_id: f.folder_id
      }))
    ]);

  } catch (err) {
    console.error("Failed to refresh UI:", err);
    setNotification({
      open:     true,
      message:  `Refresh failed: ${err.message}`,
      severity: "error"
    });
  }
};



const handleUndo = async () => {
  if(undo.length === 0) return;
  const UndoAction = undo[undo.length - 1];
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("Missing Supabase access token");

    const res = await fetch("http://127.0.0.1:5000/undo-redo/undo", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || "Undo failed");
    }

    const result = await res.json();
    console.log("✅ Undo successful:", result);

    setUndo(prev => prev.slice(0, prev.length - 1));
    setRedo(prev => [...prev, UndoAction]);

    // Optional: You may want to refresh the file list or UI
    await refreshUIAfterUndoRedo(); // Define this function if needed

  } catch (error) {
    console.error("❌ Undo failed:", error);
    setNotification({
      open: true,
      message: `Undo failed: ${error.message}`,
      severity: "error"
    });
  }
};



const handleRedo = async () => {
  if (redo.length === 0) return;
  const lastRedoAction = redo[redo.length - 1];

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("Missing Supabase token");

    const response = await fetch("http://127.0.0.1:5000/undo-redo/redo", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error("Redo failed");

    // Update state stacks
    setRedo(prev => prev.slice(0, -1));
    setUndo(prev => [...prev, lastRedoAction]);

    // Refresh UI
    await refreshUIAfterUndoRedo();

    setNotification({
      open: true,
      message: "Action redone successfully",
      severity: "success"
    });

  } catch (error) {
    console.error("Redo failed:", error);
    setNotification({
      open: true,
      message: `Redo failed: ${error.message}`,
      severity: "error"
    });
  }
};

  return (
    <FileContext.Provider
      value={{
        selectedFile,
        setSelectedFile,
        files,
        setFiles,
        loading,
        setLoading,
        showInfoSidebar,
        setShowInfoSidebar,
        uploadProgress,
        downloadProgress,
        updateUploadProgress,
        updateDownloadProgress,
        clearProgress,
        realTimeActivity,
        setRealTimeActivity,
        searchResults,
        searching,
        setSearching,
        setSearchResults,
        isSearching,
        setIsSearching,
        addFile,
        removeFile,
        notification,
        setNotification,
        selectedFiles,
        toggleFileSelection,
        clearSelectedFiles,
        storageStats,
        setStorageStats,
        updateStorageStats,
        clipboardFile,
        setClipboardFile,
        currentFolderId,
        setCurrentFolderId,
        activeUploads,
        setActiveUploads,
        uploadQueue,
        setUploadQueue,
        multipleFiles,
        setMultipleFiles,
        enqueueUpload,
        updateUploadQueue,
        dequeueUpload,
        handleRedo,
        handleUndo,
        redo,
        undo,
        pushUndoAction,
      }}
    >
      {children}
    </FileContext.Provider>
  );
};
