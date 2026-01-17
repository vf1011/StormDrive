import {  useState, useEffect,useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import DOMPurify from 'dompurify';  
import { useFileContext } from "../Hooks/FileContext.jsx";
import { useFolderOperations } from "../Hooks/useFolderOperation.jsx"; 
import FileToolbar from './FileToolbar.jsx';
import { FileText, LayoutGrid, List , FolderPlus, Undo2, Redo2, FileClock } from 'lucide-react';
import './Styles/FileDisplay.css';
import useWebSocket from '../Hooks/useWebSocket.jsx';
import VersionManager from '../VersionHistory/VersionManager.jsx';
import Notification from '../Transitions/Notification.jsx';
import Breadcrumb from './Breadcrumb.jsx';
import { supabase } from '../../../supabase.jsx';
import { useSupabaseAuth } from "../Hooks/useSupabaseAuth.jsx";
import ModalPortal from './Modalportal.jsx';
import Overview from './Overview.jsx';
import Files from './Files.jsx';
import Shared from './Shared.jsx';
import Upload from './Upload.jsx'; 
import Trash from './Trash.jsx';
import FilePreview from './FilePreview.jsx';
import { formatSize, formatDate, guessType, formatToUserLocalTime } from '../../../utils.js';
import { API_BASE_URL } from '../../api/config';
import FileTransferPanel from './FilePanel.jsx';
import { categorizeFile } from '../../../utils.js';


const FileDisplay = ({ category = 'myfiles' }) => {
  const [viewMode, setViewMode] = useState('grid');
  const [drag, setDrag] = useState(false);
  const [multipleFiles, setMultipleFiles] = useState([]);
  const [loading, setLoading] = useState(false); 
  const [toolbarExpanded, setToolbarExpanded] = useState(false);
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? '';
  const { messages } = useWebSocket(apiBase.replace("http", "ws"));
  const [ previewFile , setPreviewFile ] = useState(null);
  const [previewOperation, setPreviewOperation ] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [isRenameMode, setIsRenameMode] = useState(false);
  const [folderPath, setFolderPath] = useState([]);
  const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [downloadProgress, setDownloadProgress] = useState({});
  const [newFolderName, setNewFolderName] = useState('');
  const [folderError, setFolderError] = useState('');
  const [folderDescription, setFolderDescription] = useState('');
  const [folderSizes , setFolderSizes] = useState({});
  const [filePanel, setFilePanel] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);
const [isProcessingQueue, setIsProcessingQueue] = useState(false);
const [versionModalFile, setVersionModalFile] = useState(null);
const [typeFilter, setTypeFilter] = useState('all');
const [showTypeMenu, setShowTypeMenu] = useState(false);

const api = API_BASE_URL;

const TYPE_OPTIONS = [
  { key: 'all',    label: 'All' },
  { key: 'folder', label: 'Folders' },
  { key: 'image',  label: 'Images' },
  { key: 'pdf',    label: 'PDF' },
  { key: 'doc',    label: 'Docs' },     // doc/docx/rtf/txt/md
  // { key: 'sheet',  label: 'Sheets' },   // xls/xlsx/csv
  { key: 'ppt',    label: 'Slides' },   // ppt/pptx
  { key: 'video',  label: 'Videos' },
  // { key: 'audio',  label: 'Audio' },
  // { key: 'archive',label: 'Archives' }, // zip/rar/7z
  // { key: 'code',   label: 'Code' },
  { key: 'other',  label: 'Other' },
];

  const alreadyFetchedSizes = useRef(new Set());

  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB is a good default

function makeSessionId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
  const {
    clipboardFile,
    setClipboardFile,
    currentFolderId,
    setCurrentFolderId,
    setActiveUploads,
  setSelectedFile,
   files, setFiles, 
   searchResults, isSearching,
   updateStorageStats,
   enqueueUpload,
    dequeueUpload,
    updateUploadProgress,
    clearProgress,
   handleUndo,
   handleRedo,
   redo,undo,
    pushUndoAction,
    searching,
  } = useFileContext();

  const [duplicateDialog, setDuplicateDialog] = useState({
  isOpen: false,
  fileName: '',
  file: null,
  duplicateFileId: null,
  duplicateFolderId: null,
  isFolder: false,
  // ⬇️ add these two if missing
  selectedAction: 'rename',
  customName: '',
  // optional — if you computed it
  identical: undefined
});

  const [conflictDialog, setConflictDialog] = useState({
  isOpen: false,
  fileName: '',
  conflictData: null,
  customName: '',
  selectedAction: 'rename' // Default to rename
});

const [showHistory, setShowHistory] = useState(false);
  const [historyFileId, setHistoryFileId] = useState(null);


  const context = useFileContext();
  if (!context) return <div>Error: Context not available</div>;

  const { notification, setNotification } = context;

  const { user, session } = useSupabaseAuth(); // ✅ Supabase auth hook
  const folderOperations = useFolderOperations(user, session, setNotification);

  const { uploadFolder , setAvailableFolders , loadFolderContents } = folderOperations;

useEffect(() => {
  if (!session || !folderOperations.hasInitialized) return;
  (async () => {
    try {
      const stats = folderOperations.getFolderStats();
      if (stats.total === 0) {
        await folderOperations.createDefaultFolders();
        await fetchFilesInFolder(null);
      }
    } catch (error) {
      console.error('Failed to auto-create default folders:', error);
    }
  })();
  }, [session, folderOperations.hasInitialized]);


    const handleHomeClick = () => {
    setCurrentFolderId(null);
    setFolderPath([]);
    setMultipleFiles([]);
    setSelectedFile(null);
  };

  // Helper function to remove duplicate folders
  const deduplicateFolders = (items) => {
    const folderMap = new Map();
    const files = [];
    
    items.forEach(item => {
      if (item.type === 'folder') {
        const key = `${item.name}_${item.parent_folder_id || 'root'}`;
        
        if (folderMap.has(key)) {
          const existing = folderMap.get(key);
          if (item.id > existing.id) {
            folderMap.set(key, item);
          }
        } else {
          folderMap.set(key, item);
        }
      } else {
        files.push(item);
      }
    });
    
    return [...Array.from(folderMap.values()), ...files];
  };

const handleFileNameClick = async (file, event) => {
  event.stopPropagation();
  if (file.type === 'folder') return;

  setPreviewFile(file);
    setPreviewOperation(true);
  
};

    const openCreateFolderModal = () => {
    setNewFolderName('');
    setFolderDescription('');
    setFolderError('');
    setCreateFolderModalOpen(true);
  };

  const handleKeepBoth = () => {
    const fileNameWithoutExt = duplicateDialog.fileName.includes('.') 
      ? duplicateDialog.fileName.substring(0, duplicateDialog.fileName.lastIndexOf('.'))
      : duplicateDialog.fileName;
    
    const fileExtension = duplicateDialog.fileName.includes('.') 
      ? duplicateDialog.fileName.substring(duplicateDialog.fileName.lastIndexOf('.'))
      : '';
    
    const suggestedName = `Copy of ${fileNameWithoutExt}${fileExtension}`;
    setRenameInput(suggestedName);
    setIsRenameMode(true);
  };


  useEffect(() => {
    setToolbarExpanded(multipleFiles.length > 0);
    if(multipleFiles.length===1){
      setSelectedFile(multipleFiles[0]);
    } else{
      setSelectedFile(null);
    }
  }, [multipleFiles,setSelectedFile]);



  const getFileIcon = (type, file = null, enhanced = false) => {
  if (enhanced && type === 'folder') {
    return (
      <div className="enhanced-folder-icon">
        <div className="enhanced-folder-tab"></div>
        <div className="enhanced-folder-body">
        </div>
      </div>
    );
  }

  const iconMap = {
    folder: '/images/icons8-folder.svg',
    image: '/images/image-svg.svg',
    pdf: '/images/pdf-svg.svg',
    video: '/images/video-svg.svg',
    file: '/images/docs-file-svg.svg',
    ppt:'/images/pptx.png',

  };

  return (
    <img
      src={iconMap[type] || iconMap['file']}
      alt={`${type} icon`}
      className={`file-icon ${enhanced ? 'enhanced' : ''}`}
      style={{ 
        width: enhanced ? '80px' : '48px', 
        height: enhanced ? '80px' : '48px', 
        objectFit: 'contain' 
      }}
    />
  );
};

const handleUndoWithRefresh = async () => {
  await handleUndo();
  await fetchFilesInFolder(currentFolderId);  // your local function
};

const handleRedoWithRefresh = async () => {
  await handleRedo();
  await fetchFilesInFolder(currentFolderId);
};

  // FIXED: fetchFileById with proper date formatting
  const fetchItemById = async (id , type ='file') => {
    try {
      const endpoint = type === 'folder' ? `/folder/${id}` : `/files/${id}`;
      const res = await api.get(endpoint);
      if (res.status >= 200 && res.status < 300) {
        const data = res.data;

         if (type === 'folder') {
        const folderName = data.folder_name || data.name || `folder_${data.folder_id}`;
        const createdDate = data.created_at || new Date();

        return {
          id: data.folder_id,
          name: folderName,
          type: 'folder',
          size: '—',
          modified: formatDate(createdDate),
        };
      } else {
        const fileSize = data.file_size || data.size || data.fileSize || 0;
        const fileName = data.file_name || data.filename || data.name || data.original_name || `file_${data.file_id}`;
        const uploadDate = data.uploaded_at || data.upload_date || data.created_at;

        return {
          id: data.file_id,
          name: fileName,
          type: guessType(fileName),
          size: formatSize(fileSize),
          modified: formatDate(uploadDate), // Use the helper function
        };
      }
    } 
  }catch (err) {
      console.error("Failed to fetch file by ID:", err);
    }
  };

  useEffect(() => {
  if (!messages?.length) return;

  const dedupeFolders = (list) => {
    const byId = new Map(list.map(f => [String(f.folder_id), f]));
    return Array.from(byId.values());
  };

  const asNull = (v) => (v === undefined ? null : v);
  const isId = (v) => typeof v === "string" || typeof v === "number";
  const isStr = (v) => typeof v === "string" && v.length > 0;
  const toId = (v) => String(v);

  const currentFolder = asNull(currentFolderId);

  messages.forEach((data) => {
    try {
      if (!data || !isStr(data.action)) return; // hard guard

      switch (data.action) {
        case "uploaded": {
          if (!isId(data.file_id) || !isStr(data.file_name)) break; // guard
          setFiles(prev => {
            const tempIdx = prev.findIndex(
              it => it.name === data.file_name && it.uploading === true && it.isTemporary === true
            );

            if (tempIdx !== -1) {
              const existingTemp = prev[tempIdx];
              const isUploadedFolder =
                existingTemp.type === "folder" ||
                existingTemp.size === "—" ||
                existingTemp.size === "--" ||
                (!existingTemp.name.includes(".") && existingTemp.rawSize === 0);

              const updatedItem = {
                ...existingTemp,
                id: data.file_id,
                uploading: false,
                progress: 100,
                type: isUploadedFolder ? "folder" : guessType(data.file_name),
                isTemporary: false,
              };

              const next = [...prev];
              next[tempIdx] = updatedItem;
              return next;
            }

            if (data.replaced_file_id) {
              const replacedIdS = toId(data.replaced_file_id);
              return prev.map(f =>
                toId(f.id) === replacedIdS
                  ? {
                      ...f,
                      id: data.file_id,
                      name: data.file_name,
                      type: guessType(data.file_name),
                      uploading: false,
                    }
                  : f
              );
            }

            console.warn("⚠️ No temporary item or replaced id found for uploaded file:", data.file_name);
            return prev;
          });
          break;
        }

        case "folder_created": {
          if (!data.folder || !isId(data.folder.folder_id)) break;

          const newFolder = {
            folder_id: data.folder.folder_id,
            folder_name: data.folder.folder_name,
            parent_folder_id: asNull(data.folder.parent_folder_id),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          setFiles(prev => {
            const belongsHere = newFolder.parent_folder_id === currentFolder;
            if (!belongsHere) return prev;
            if (prev.some(it => toId(it.id) === toId(newFolder.folder_id))) return prev;

            const display = {
              id: newFolder.folder_id,
              name: newFolder.folder_name,
              type: "folder",
              size: "—",
              modified: formatDate(new Date()),
              rawSize: 0,
            };
            return [display, ...prev];
          });

          setAvailableFolders(prev => dedupeFolders([...prev, newFolder]));
          break;
        }

        case "delete": {
          const idsToRemove = new Set(
            (Array.isArray(data.file_ids) ? data.file_ids : (data.file_id ? [data.file_id] : []))
              .map(toId)
          );
          if (!idsToRemove.size) break;

          setFiles(prev => prev.filter(f => !idsToRemove.has(toId(f.id))));
          setMultipleFiles(prev => prev.filter(f => !idsToRemove.has(toId(f.id))));
          setSelectedFile(prev => (prev && idsToRemove.has(toId(prev.id)) ? null : prev));
          break;
        }

        case "delete_folder": {
          const fid = data.folder_id;
          if (!isId(fid)) break;
          const fidS = toId(fid);

          setFiles(prev => prev.filter(f => toId(f.id) !== fidS));
          setMultipleFiles(prev => prev.filter(f => toId(f.id) !== fidS));
          setSelectedFile(prev => (prev && toId(prev.id) === fidS ? null : prev));
          setAvailableFolders(prev => prev.filter(f => toId(f.folder_id) !== fidS));
          break;
        }

        case "renamed": {
          if (!isId(data.file_id) || !isStr(data.new_name)) break;
          const safeNewName = DOMPurify.sanitize(data.new_name);
          const fileIdS = toId(data.file_id);
          setFiles(prev => prev.map(f => (toId(f.id) === fileIdS ? { ...f, name: safeNewName } : f)));
          setMultipleFiles(prev => prev.map(f => (toId(f.id) === fileIdS ? { ...f, name: safeNewName } : f)));
          break;
        }

        case "rename_folder": {
          if (!isId(data.folder_id) || !isStr(data.new_name)) break;
          const safeNewName = DOMPurify.sanitize(data.new_name);
          const folderIdS = toId(data.folder_id);
          setFiles(prev => prev.map(f => (toId(f.id) === folderIdS ? { ...f, name: safeNewName } : f)));
          setAvailableFolders(prev =>
            prev.map(f => (toId(f.folder_id) === folderIdS ? { ...f, folder_name: safeNewName } : f))
          );
          break;
        }

        case "move_folder": {
          if (!isId(data.folder_id) || !isId(data.new_parent_id)) break;
          const folderIdS = toId(data.folder_id);
          setAvailableFolders(prev =>
            prev.map(f =>
              toId(f.folder_id) === folderIdS ? { ...f, parent_folder_id: data.new_parent_id } : f
            )
          );
          setNotification({
            open: true,
            message: `Folder "${data.folder_name || ""}" moved successfully`,
            severity: "info",
          });
          break;
        }

        case "restore": {
          const itemType = data.file_type || data.type || "file";

          if (itemType === "folder") {
            if (!isId(data.file_id) || !isStr(data.file_name)) break;
            const parentId = asNull(data.parent_folder_id);
            const belongsHere = parentId === currentFolder;

            if (belongsHere) {
              setFiles(prev => {
                if (prev.some(it => toId(it.id) === toId(data.file_id))) return prev;
                const restoredFolder = {
                  id: data.file_id,
                  name: data.file_name,
                  type: "folder",
                  size: "—",
                  modified: new Date().toLocaleString(),
                  rawSize: 0,
                };
                return [restoredFolder, ...prev];
              });
            }

            setAvailableFolders(prev =>
              dedupeFolders([
                ...prev,
                {
                  folder_id: data.file_id,
                  folder_name: data.file_name,
                  parent_folder_id: parentId,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
              ])
            );

            setNotification({
              open: true,
              message: `Folder "${data.file_name}" restored successfully!`,
              severity: "success",
            });
          } else {
            if (!isId(data.file_id) || !isStr(data.file_name)) break;
            const parentId = asNull(data.folder_id);
            const restoredFile = {
              id: data.file_id,
              name: data.file_name,
              type: guessType(data.file_name),
              size: data.file_size ? formatSize(data.file_size) : "Unknown",
              modified: new Date().toLocaleString(),
              rawSize: data.file_size || 0,
              folder_id: parentId,
            };

            const belongsHere = parentId === currentFolder;
            if (belongsHere) {
              setFiles(prev => {
                if (prev.some(it => toId(it.id) === toId(data.file_id))) return prev;
                return [...prev, restoredFile];
              });
            }

            setNotification({
              open: true,
              message: `File "${data.file_name}" restored successfully!`,
              severity: "success",
            });
          }
          break;
        }

        case "restore_folder": {
          if (!isId(data.folder_id)) break;
          setNotification({
            open: true,
            message: `Folder restored! Click here to view restored files.`,
            severity: "success",
            action: () => setCurrentFolderId(data.folder_id),
          });
          break;
        }

        case "perm_delete_folder": {
          const toRemove = (Array.isArray(data.deleted_folder_ids) && data.deleted_folder_ids.length)
            ? data.deleted_folder_ids
            : (isId(data.folder_id) ? [data.folder_id] : []);
          if (!toRemove.length) break;
          const toRemoveSet = new Set(toRemove.map(toId));

          setFiles(prev => prev.filter(f => !toRemoveSet.has(toId(f.id))));
          setAvailableFolders(prev => prev.filter(f => !toRemoveSet.has(toId(f.folder_id))));
          setMultipleFiles(prev => prev.filter(f => !toRemoveSet.has(toId(f.id))));
          setSelectedFile(prev => (prev && toRemoveSet.has(toId(prev.id)) ? null : prev));
          setFolderSizes(prev => {
            const next = { ...prev };
            toRemove.forEach(id => delete next[id]);
            return next;
          });
          break;
        }

        case "permanent_delete": {
          if (!isId(data.file_id)) break;
          const fileIdS = toId(data.file_id);
          setFiles(prev => prev.filter(f => toId(f.id) !== fileIdS));
          setMultipleFiles(prev => prev.filter(f => toId(f.id) !== fileIdS));
          setSelectedFile(prev => (prev && toId(prev.id) === fileIdS ? null : prev));
          setNotification({
            open: true,
            message: `File permanently deleted.`,
            severity: "warning",
          });
          break;
        }

        case "bulk_permanent_delete": {
          const deletedIds = (data.deleted_files || [])
            .filter(f => f && f.success && isId(f.file_id))
            .map(f => toId(f.file_id));
          if (!deletedIds.length) break;
          const deletedSet = new Set(deletedIds);

          setFiles(prev => prev.filter(f => !deletedSet.has(toId(f.id))));
          setMultipleFiles(prev => prev.filter(f => !deletedSet.has(toId(f.id))));
          setSelectedFile(prev => (prev && deletedSet.has(toId(prev.id)) ? null : prev));
          setNotification({
            open: true,
            message: `${deletedIds.length} file${deletedIds.length > 1 ? "s" : ""} permanently deleted.`,
            severity: "warning",
          });
          break;
        }

        case "copy": {
          if (!isId(data.file_id) || !isStr(data.file_name)) break;
          const targetFolderId = asNull(data.new_folder_id);
          const belongsHere = String(targetFolderId) === String(currentFolder);

          if (belongsHere) {
            const copiedFile = {
              id: data.file_id,
              name: data.file_name,
              type: guessType(data.file_name),
              size: formatSize(data.file_size || 0),
              modified: formatDate(new Date()),
              rawSize: data.file_size || 0,
              folder_id: targetFolderId,
            };
            setFiles(prev => {
              if (prev.some(it => toId(it.id) === toId(copiedFile.id))) return prev;
              return [...prev, copiedFile];
            });
            setNotification({
              open: true,
              message: `File "${data.file_name}" copied successfully.`,
              severity: "success",
            });
          }
          break;
        }

        case "folder-size-updated": {
          if (!isId(data.folder_id)) break;
          const folderId = data.folder_id;
          setFolderSizes(prev => {
            const updated = { ...prev };
            delete updated[folderId];
            return updated;
          });
          fetchFolderSize(folderId); // optionally debounce if backend bursts
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error("WS handler error:", err, "payload:", data);
    }
  });

  // Keep folders first (stable ordering)
  setFiles(prev => {
    const folders = prev.filter(f => f.type === "folder");
    const others = prev.filter(f => f.type !== "folder");
    return [...folders, ...others];
  });
}, [messages]);



const handleFileClick = (file, event) => {
    if (event.target.closest('.folder-clickable')) {
    return;
  }
    event.preventDefault();
    event.stopPropagation();
    
    const fileWithType = {
    ...file,
   type: file.type === 'folder' ? 'folder' : 'file'
  };
    
    if (event.ctrlKey || event.metaKey) {
      setMultipleFiles(prev => {
        const isSelected = prev.find(f => f.id === file.id);
        if (isSelected) {
          return prev.filter(f => f.id !== file.id);
        } else {
          return [...prev, fileWithType];
        }
      });
    } else if (event.shiftKey && multipleFiles.length > 0) {
      const lastSelected = multipleFiles[multipleFiles.length - 1];
      const lastIndex = files.findIndex(f => f.id === lastSelected.id);
      const currentIndex = files.findIndex(f => f.id === file.id);
      const start = Math.min(lastIndex, currentIndex);
      const end = Math.max(lastIndex, currentIndex);
     if (lastIndex < 0 || currentIndex < 0) return;
     const rangeFiles = files.slice(start, end + 1).map(f =>({...f, type: f.type === 'folder' ? 'folder' : 'file'}));
      setMultipleFiles(rangeFiles);
    } else {
      const isSelected = multipleFiles.find(f => f.id === file.id);
      if (isSelected && multipleFiles.length === 1) {
        setMultipleFiles([]);
    
      } else {
        setMultipleFiles([fileWithType]);
        setSelectedFile(fileWithType);
       
      }
    }
  };

const suggestName = (base, n = 1) => `${base} (${n})`;

const processFolder = async (
  folderName,
  folderFiles,
  action = 'upload',             // 'upload' | 'replace' | 'upload-rename'
  duplicateFolderId = null,
  newFolderName = null,
  queueMode = false              // 👈 NEW: when true, avoid modals and auto-resolve duplicates
) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('Missing Supabase access token');

    // Check duplicate only for brand-new uploads
    if (action === 'upload') {
      const checkForm = new FormData();
      checkForm.append('folder_name', folderName);
      checkForm.append('parent_folder_id', currentFolderId == null ? '' : String(currentFolderId));

      const checkRes = await fetch('http://127.0.0.1:5000/folder/check-folder-duplication', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: checkForm
      });
      if (!checkRes.ok) throw new Error('Failed to check for duplicates');
      const dup = await checkRes.json();

      if (dup.has_duplicate) {
        if (!queueMode) {
          // Existing behavior: open dialog and stop
          setDuplicateDialog({
            isOpen: true,
            fileName: folderName,
            file: folderFiles,
            duplicateFolderId: dup.existing_folder_id,
            isFolder: true
          });
          return; // stops queue
        }
        // 👉 Queue mode: auto-rename to keep going
        action = 'upload-rename';
        duplicateFolderId = dup.existing_folder_id;
        newFolderName = dup.suggested_name || suggestName(folderName);
      }
    }

    // Normalize relative paths so backend sees real structure
    const normalized = folderFiles.map(f => {
      let rel = (f.webkitRelativePath || '').trim();
      if (!rel || !rel.includes('/')) {
        rel = `${folderName}/${f.name}`;
        Object.defineProperty(f, 'webkitRelativePath', {
          value: rel, writable: false, enumerable: true, configurable: true
        });
      }
      return f;
    });

    // Dedupe by full relative path
    const uniqueFiles = Array.from(new Map(normalized.map(f => [f.webkitRelativePath, f])).values());

    console.log('🕵️ processFolder (queueMode:', queueMode, ') will upload:', uniqueFiles.map(f => f.webkitRelativePath));

    await uploadFolder(
      uniqueFiles,
      currentFolderId,
      setFiles,
      setUploadProgress,
      setNotification,
      action,
      duplicateFolderId,
      newFolderName
    );
  } catch (err) {
    console.error('processFolder error:', err);
    setNotification({ open: true, message: err.message, severity: 'error' });
  }
};

  const processFile = async (file) => {
    if (!file) return;

    const sanitizedFileName = DOMPurify.sanitize(file.name);

    const rel = file.webkitRelativePath || '';
    if (rel.includes('/')) {
      const folderName = rel.split('/')[0];
      await processFolder(folderName, [file]);
      return;
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Missing Supabase access token");
      
      const checkResponse = await fetch('http://127.0.0.1:5000/files/check-duplication', {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:JSON.stringify({ file_name: sanitizedFileName,folder_id: currentFolderId })
      });

      if (!checkResponse.ok) {
        throw new Error('Failed to check for duplicates');
      }

      const {
        has_duplicate,
        existing_file_id,
        existing_file_size,
        suggested_name
      } = await checkResponse.json();

      if (has_duplicate) {
        // mark identical if sizes match
        const identical = Number(existing_file_size) === file.size;
        setDuplicateDialog({
          isOpen:          true,
          file:            file,
          fileName:        sanitizedFileName,
          duplicateFileId: existing_file_id,
          suggestedName:   suggested_name,
          identical,      // true if exactly same size (no version change)
          selectedAction: 'rename',
           customName: ''
        });
        setLoading(false);
        return;
      }

      // no duplicate → proceed with normal upload
      await uploadFile(file, sanitizedFileName, 'upload');
      await fetchFilesInFolder(currentFolderId);

    } catch (error) {
      console.error("Error checking for duplicates:", error);
      setNotification({ 
        open: true, 
        message: `Error checking file: ${error.message}`, 
        severity: "error" 
      });
      setLoading(false);
    }
  };


const handleDuplicateResolve = async (action) => {
  // close dialog first (keeps UI snappy)
  setDuplicateDialog(d => ({ ...d, isOpen: false }));

  const { file, duplicateFileId, customName, fileName } = duplicateDialog;

  try {
    if (action === 'replace') {
      // Overwrite live file; backend will snapshot old version
      await uploadFile(file, fileName, 'replace', duplicateFileId);
      await fetchFilesInFolder(currentFolderId);
      return;
    }

    if (action === 'rename') {
      // upload-rename endpoint expects your uploadFile to read renameInput,
      // so prime it with duplicateDialog.customName before calling
      if (!customName?.trim()) {
        setNotification({
          open: true,
          message: "Please enter a new name.",
          severity: "warning"
        });
        // re-open dialog if neededs
        setDuplicateDialog(d => ({ ...d, isOpen: true }));
        return;
      }
      setRenameInput(customName.trim());
      await uploadFile(file, fileName, 'upload-rename', duplicateFileId);
      await fetchFilesInFolder(currentFolderId);
      return;
    }

    if (action === 'history') {
      // Open version history for the existing file
      setHistoryFileId(duplicateFileId);
      setShowHistory(true);
      return;
    }

    // cancel: do nothing

  } catch (err) {
    console.error('Resolve duplicate failed:', err);
    setNotification({
      open: true,
      message: `Operation failed: ${err.message}`,
      severity: "error"
    });
  }
};



const handleUpload = async (e) => {
  const allFiles = Array.from(e.target.files);
  if (!allFiles.length) return;

  const folderFiles = allFiles.filter(f => f.webkitRelativePath);
  const isFolder = !!folderFiles.length;

  if (isFolder) {
    const folderName = folderFiles[0].webkitRelativePath.split('/')[0];
    // 1) upfront dedupe
    const unique = Array.from(
      new Map(folderFiles.map(f => [f.webkitRelativePath||f.name, f])).values()
    );
    await processFolder(folderName, unique, 'upload', currentFolderId);

  } else {
    for (const file of allFiles) {
      await processFile(file); 
    }
  }

  // 2) clear + replace state
  e.target.value = '';
  const { folders, files } = await loadFolderContents(currentFolderId);
  setFiles([
    ...folders.map(f => ({ id:f.folder_id, name:f.folder_name, type:'folder' })),
    ...files  .map(f => ({ id:f.file_id,   name:f.filename,    type:guessType(f.filename)   }))
  ]);
};



const fetchFilesInFolder = useCallback(async (folderId = null) => {
  try {
    const { folders, files: folderFiles } = await folderOperations.loadFolderContents(folderId);

    console.log('📁 Loaded from hook:', { folders, files: folderFiles });

    // ✅ Ensure folders have type 'folder'
    const folderItems = folders.map(folder => ({
      id: folder.folder_id,
      name: folder.folder_name,
      type: 'folder',
      size: '—',
      modified: formatDate(folder.created_at || folder.updated_at),
      rawSize: 0
    }));

    // ✅ Ensure files have proper type using guessType
    const fileItems = folderFiles.map(file => {
      const fileName = file.filename || file.file_name || 'Unnamed file';
      const fileSize = file.file_size || file.size || file.fileSize || 0;
      const uploadRawDate = file.uploaded_at || file.upload_date || file.created_at || file.modified_date;
      const uploadDate = formatToUserLocalTime(uploadRawDate);

      return {
        id: file.file_id,
        name: fileName,
        type: guessType(fileName),
        size: formatSize(fileSize),
        modified: formatDate(uploadDate),
        rawSize: fileSize
      };
    });

    const allItems = [...folderItems, ...fileItems];
    const dedupedItems = deduplicateFolders(allItems);

    const visibleItems = dedupedItems.filter(item => {
  if (item.deleted_at || item.is_deleted) return false;
  if (!item.name || !item.id) return false;
  return true;
});

console.log("✅ Visible items:", visibleItems);
setFiles(visibleItems);
  } catch (error) {
    console.error("❌ fetchFilesInFolder error:", error);
    setNotification({
      open: true,
      message: `Error loading folder: ${error.message}`,
      severity: "error"
    });
  } finally {
    setLoading(false);
  }
},[]);

const readEntry = useCallback((entry) => {
  return new Promise((resolve, reject) => {
    console.log(`🔍 Reading entry: ${entry.name} (${entry.isFile ? 'file' : 'directory'})`);
    
    if (entry.isFile) {
      entry.file(file => {
        const relativePath = (entry.fullPath || '').replace(/^\//, ""); // e.g. "Folder/a.txt" OR "certificate.pdf"

        // ✅ Only mark relativePath when it indicates a real folder structure
        if (relativePath.includes('/')) {
          Object.defineProperty(file, "webkitRelativePath", {
            value: relativePath,
            writable: false,
            enumerable: true,
            configurable: true
          });
        } else {
          // Ensure top-level files DON'T carry a bogus folder path
          // If your later code needs a marker, use a separate flag:
          // Object.defineProperty(file, "isTopLevel", { value: true });
        }

        console.log(`✅ File processed: ${relativePath || file.name}`);
        resolve([file]);
      }, error => {
        console.error(`❌ Error reading file ${entry.name}:`, error);
        reject(error);
      });
      
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const allEntries = [];

      const readAllEntries = () => {
        reader.readEntries(entries => {
          if (entries.length === 0) {
            if (allEntries.length === 0) {
              console.log(`📁 Empty directory: ${entry.name}`);
              resolve([]);
              return;
            }
            Promise.all(allEntries.map(readEntry))
              .then(results => {
                const allFiles = results.flat();
                console.log(`✅ Directory ${entry.name}: ${allFiles.length} files processed`);
                resolve(allFiles);
              })
              .catch(reject);
          } else {
            allEntries.push(...entries);
            readAllEntries(); // keep reading until empty batch
          }
        }, error => {
          console.error(`❌ Error reading directory ${entry.name}:`, error);
          reject(error);
        });
      };

      readAllEntries();
    } else {
      console.log(`⚠️ Unknown entry type: ${entry.name}`);
      resolve([]);
    }
  });
}, []);


// 3. Enhanced drag and drop event handlers
const handleDragEnter = useCallback((e) => {
  e.preventDefault();
  e.stopPropagation();
  setDrag(true);
}, []);

const handleDragLeave = useCallback((e) => {
  e.preventDefault();
  e.stopPropagation();
  
  // Only hide overlay if leaving the entire drop zone
  if (!e.currentTarget.contains(e.relatedTarget)) {
    setDrag(false);
  }
}, []);

const handleDragOver = useCallback((e) => {
  e.preventDefault();
  e.stopPropagation();
  setDrag(true);
}, []);

// 4. Queue processing function
// const processUploadQueue = async (queue) => {
//   if (isProcessingQueue || queue.length === 0) return;
  
//   setIsProcessingQueue(true);
//   console.log(`📋 Processing upload queue with ${queue.length} items`);
  
//   try {
//     for (let i = 0; i < queue.length; i++) {
//       const item = queue[i];
//       console.log(`🔄 Processing queue item ${i + 1}/${queue.length}: ${item.name}`);
      
//       try {
//         if (item.type === 'folder') {
//           await processFolder(item.name, item.files, 'upload', null, null);
//         } else {
//           await processFile(item.file);
//         }
        
//         // Update progress
//         setNotification({
//           open: true,
//           message: `Processed ${i + 1}/${queue.length}: ${item.name}`,
//           severity: "info"
//         });
        
//       } catch (error) {
//         console.error(`❌ Failed to process ${item.name}:`, error);
//         setNotification({
//           open: true,
//           message: `Failed to process ${item.name}: ${error.message}`,
//           severity: "error"
//         });
//       }
//     }
    
//     // Refresh view after all uploads
//     await fetchFilesInFolder(currentFolderId);
    
//     setNotification({
//       open: true,
//       message: `Successfully processed ${queue.length} items`,
//       severity: "success"
//     });
    
//   } catch (error) {
//     console.error('❌ Queue processing error:', error);
//     setNotification({
//       open: true,
//       message: `Queue processing failed: ${error.message}`,
//       severity: "error"
//     });
//   } finally {
//     setIsProcessingQueue(false);
//     setUploadQueue([]);
//   }
// };

const processUploadQueue = async (queue) => {
  if (isProcessingQueue || queue.length === 0) return;
  setIsProcessingQueue(true);

  try {
    // FOLDERS FIRST (sequential)
    const folders = queue.filter(i => i.type === 'folder');
    for (let i = 0; i < folders.length; i++) {
      const item = folders[i];
      try {
        await processFolder(
          item.name,
          item.files,
          'upload',
          null,
          null,
          true             // 👈 queueMode: auto-handle duplicates
        );
        setNotification({
          open: true,
          message: `Uploaded folder ${i + 1}/${folders.length}: ${item.name}`,
          severity: "info"
        });
      } catch (err) {
        console.error(`❌ Folder failed (${item.name}):`, err);
      }
    }

    // THEN FILES (also sequential here)
    const files = queue.filter(i => i.type === 'file');
    for (let j = 0; j < files.length; j++) {
      const item = files[j];
      try {
        await processFile(item.file); // your existing file path does dup-checks per file
        setNotification({
          open: true,
          message: `Uploaded file ${j + 1}/${files.length}: ${item.name}`,
          severity: "info"
        });
      } catch (err) {
        console.error(`❌ File failed (${item.name}):`, err);
      }
    }

    await fetchFilesInFolder(currentFolderId);
    setNotification({
      open: true,
      message: `Upload complete: ${folders.length} folder(s), ${files.length} file(s)`,
      severity: "success"
    });
  } finally {
    setIsProcessingQueue(false);
    setUploadQueue([]);
  }
};



// 5. Main drop handler with queue support
const handleDrop = useCallback(async (e) => {
  e.preventDefault();
  e.stopPropagation();
  setDrag(false);

  console.log('📦 Drop event triggered');

  try {
    const items = Array.from(e.dataTransfer.items || []);
    const nativeFiles = Array.from(e.dataTransfer.files || []);

    if (items.length === 0 && nativeFiles.length === 0) {
      return;
    }

    let allFiles = [];

    // Prefer DataTransferItem for folder traversal
    if (items.length > 0) {
      for (const item of items) {
        if (item.kind !== 'file') continue;

        const entry = item.webkitGetAsEntry?.() || item.getAsEntry?.();
        if (entry) {
          try {
            const entryFiles = await readEntry(entry); // your recursive reader
            allFiles.push(...entryFiles);
          } catch (err) {
            const f = item.getAsFile();
            if (f) allFiles.push(f);
          }
        } else {
          const f = item.getAsFile();
          if (f) allFiles.push(f);
        }
      }
    }

    // 🔗 Always merge native files (even if allFiles already has some)
    const fp = (f) => {
      const rel = (f.webkitRelativePath || '').trim();
      if (rel && rel.includes('/')) return `REL:${rel}`; // folder members keyed by full path
      return `TOP:${f.name}|${f.size}|${f.lastModified}`; // top-level by fingerprint
    };
    const seen = new Set(allFiles.map(fp));
    for (const nf of nativeFiles) {
      const k = fp(nf);
      if (!seen.has(k)) {
        allFiles.push(nf);
        seen.add(k);
      }
    }

    if (allFiles.length === 0) {
      setNotification({ open: true, message: "No valid files found to upload", severity: "warning" });
      return;
    }

    console.log(`📊 Total files collected: ${allFiles.length}`);

    // 🧼 Safer de-dupe (keeps all top-level files even if names collide)
    const keyFor = (f, i) => {
      const rel = (f.webkitRelativePath || '').trim();
      if (rel && rel.includes('/')) return `REL:${rel}`;
      return `TOP:${f.name}|${f.size}|${f.lastModified}|#${i}`;
    };
    const uniqueFiles = Array.from(new Map(allFiles.map((f, i) => [keyFor(f, i), f])).values());
    console.log(`📊 Unique files after deduplication: ${uniqueFiles.length}`);

    // 📁 Group only when there’s a real subpath
    const folderMap = new Map();   // topFolderName -> File[]
    const topLevelFiles = [];
    for (const f of uniqueFiles) {
      const rel = f.webkitRelativePath || '';
      if (rel.includes('/')) {
        const top = rel.split('/')[0];
        if (!folderMap.has(top)) folderMap.set(top, []);
        folderMap.get(top).push(f);
      } else {
        topLevelFiles.push(f);
      }
    }

    // 📦 Build queue (folders first, then files)
    const queue = [];
    for (const [folderName, folderFiles] of folderMap) {
      queue.push({ type: 'folder', name: folderName, files: folderFiles });
    }
    for (const file of topLevelFiles) {
      queue.push({ type: 'file', name: file.name, file });
    }

    console.log(`📋 Upload queue created with ${queue.length} items:`, queue.map(i => `${i.type}: ${i.name}`));
    if (queue.length === 0) {
      setNotification({ open: true, message: "No files to upload", severity: "warning" });
      return;
    }

    const folderCount = queue.filter(i => i.type === 'folder').length;
    const fileCount   = queue.filter(i => i.type === 'file').length;
    setNotification({
      open: true,
      message: `Starting upload: ${folderCount} folders, ${fileCount} files`,
      severity: "info"
    });

    setUploadQueue(queue);
    await processUploadQueue(queue);
  } catch (error) {
    console.error('❌ Drop handler error:', error);
    setNotification({ open: true, message: `Drop failed: ${error.message}`, severity: "error" });
  } finally {
    if (e.dataTransfer) e.dataTransfer.clearData();
  }
}, [
  readEntry,
  processFolder,
  processFile,
  fetchFilesInFolder,
  currentFolderId,
  isProcessingQueue,
  setNotification,
  setUploadQueue
]);



// 6. Updated useEffect for event listeners
useEffect(() => {
  const dropZone = document.querySelector('.file-display') || document.body;
  
  // Add event listeners
  dropZone.addEventListener('dragenter', handleDragEnter, { passive: false });
  dropZone.addEventListener('dragover', handleDragOver, { passive: false });
  dropZone.addEventListener('dragleave', handleDragLeave, { passive: false });
  dropZone.addEventListener('drop', handleDrop, { passive: false });
  
  return () => {
    // Clean up event listeners
    dropZone.removeEventListener('dragenter', handleDragEnter);
    dropZone.removeEventListener('dragover', handleDragOver);
    dropZone.removeEventListener('dragleave', handleDragLeave);
    dropZone.removeEventListener('drop', handleDrop);
  };
}, [handleDragEnter, handleDragOver, handleDragLeave, handleDrop]);

// 7. Queue status component (optional - add to your JSX)
const QueueStatus = () => {
  if (!isProcessingQueue || uploadQueue.length === 0) return null;
  
  return (
    <div className="upload-queue-status">
      <div className="queue-header">
        <h4>Processing Upload Queue</h4>
        <span className="queue-count">{uploadQueue.length} items</span>
      </div>
      <div className="queue-items">
        {uploadQueue.map((item, index) => (
          <div key={index} className="queue-item">
            <span className="item-type">{item.type}</span>
            <span className="item-name">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// useEffect(() => {
//   const handleDrop = async e => {
//     e.preventDefault();
//     setDrag(false);

//     // build a flat list of files from every directory entry
//     const items = Array.from(e.dataTransfer.items || []);
//     let allFiles = [], sawDir = false;

//     for (let it of items) {
//       const entry = it.webkitGetAsEntry?.() || it.getAsEntry?.();
//       if (entry) {
//         sawDir ||= entry.isDirectory;
//         allFiles.push(...await readEntry(entry));
//       } else if (it.kind === "file") {
//         const f = it.getAsFile();
//         if (f) allFiles.push(f);
//       }
//     }

//     // fallback if no directory entries at all
//     if (!sawDir && !allFiles.length) {
//       allFiles = Array.from(e.dataTransfer.files);
//     }
//     if (!allFiles.length) return;

//     // remove dupes
//     const unique = Array.from(
//       new Map(allFiles.map(f => [f.webkitRelativePath || f.name, f]))
//     .values());

//     // **one** call into your existing folder‐upload helper,
//     // which splits out folder structure & files server-side
//     await uploadFolder(
//       unique,
//       currentFolderId,
//       setFiles,
//       setUploadProgress,
//       setNotification,
//       "upload"
//     );

//     await fetchFilesInFolder(currentFolderId);
//     e.dataTransfer.clearData();
//   };

//   window.addEventListener("drop", handleDrop);
//   window.addEventListener("dragover", e => { e.preventDefault(); setDrag(true); });
//   window.addEventListener("dragleave", e => { e.preventDefault(); setDrag(false); });
//   return () => {
//     window.removeEventListener("drop", handleDrop);
//     window.removeEventListener("dragover", () => {});
//     window.removeEventListener("dragleave", () => {});
//   };
// }, [
//   readEntry,
//   fetchFilesInFolder,
//   uploadFolder,
//   currentFolderId,
//   setFiles,
//   setUploadProgress,
//   setNotification
// ]);





// REPLACE the handleFolderClick function in FileDisplay.jsx with this improved version:

const handleFolderClick = (folder) => {
  console.log('📁 Folder clicked:', folder);
  
  setCurrentFolderId(folder.id);
  
  // SIMPLE INCREMENTAL APPROACH - Build path step by step
  setFolderPath(prev => {
    console.log('🔍 Current folderPath:', prev);
    console.log('🔍 Folder being clicked:', folder);
    
    // Check if this folder is already in the path (navigating backwards)
    const existingIndex = prev.findIndex(f => f.id === folder.id);
    
    if (existingIndex >= 0) {
      // If folder exists in path, trim to that point (backward navigation)
      console.log('⬅️ Backward navigation detected, trimming path at index:', existingIndex);
      return prev.slice(0, existingIndex + 1);
    } else {
      // Add new folder to the path (forward navigation)
      console.log('➡️ Forward navigation, adding folder to path');
      const newFolder = { 
        id: folder.id, 
        name: folder.name,
        folder_name: folder.name // for compatibility with Breadcrumb component
      };
      return [...prev, newFolder];
    }
  });

  const folderWithType = { ...folder, type: 'folder' };
  setMultipleFiles([]);
  setSelectedFile(null);
};


//     useEffect(() => {
//   const checkSessionAndLoad = async () => {
//     const { data: { session } } = await supabase.auth.getSession();
//     if (session?.access_token) {
//       await folderOperations.loadAllFolders();
//     }
//   };
//   checkSessionAndLoad();
// }, []);

useEffect(() => {
  let isMounted = true;

  const checkSessionAndLoad = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token && isMounted) {
      await folderOperations.loadAllFolders();
    }
  };

  checkSessionAndLoad();

  return () => {
    isMounted = false;
  };
}, []);


   const handleCreateFolder = async () => {
    const folderName = newFolderName.trim();
    if (!folderName) return;

    try {
      setLoading(true);
      
      // Use the hook's createFolder method
      const newFolder = await folderOperations.createFolder(folderName, currentFolderId);

      // Convert to display format and add to current files
      const folderItem = {
        id: newFolder.folder_id,
        name: newFolder.folder_name,
        type: 'folder',
        size: '—',
        modified: formatDate(newFolder.created_at),
        rawSize: 0
      };
      
      setFiles(prev => [folderItem, ...prev]);
      setCreateFolderModalOpen(false);
      setNewFolderName("");

    } catch (err) {
      // Error handling is already done in the hook
      console.error('Create folder error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Initial load and folder changes
  useEffect(() => {
    fetchFilesInFolder(currentFolderId); // Load folder contents when currentFolderId changes
  }, [currentFolderId]);

  const handleViewChange = (mode) => setViewMode(mode);

  const selectAll = () => {
  const selectableFiles = files
    .filter(f => f.type !== 'folder')
    .map(f => ({ ...f, type: 'file' })); // ✅ Ensure type is added

  setMultipleFiles(selectableFiles);
};

  const clearSelection = () => {
      setMultipleFiles([]);
  setSelectedFile(null); 
  };



const handleKeyboardPaste = async () => {
  // if (!clipboardFile || clipboardFile.length === 0) return;
    if (!clipboardFile) return;

  console.log('⌨️ Keyboard paste requested:', clipboardFile);

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const userId = session.user.id;
  if (!token) throw new Error("Missing Supabase access token");

  const itemsToPaste = Array.isArray(clipboardFile)
    ? clipboardFile
    : [clipboardFile];


console.log("🧪 clipboardFile raw:", clipboardFile);
console.log("📋 itemsToPaste:", itemsToPaste);

  try {
    setLoading(true);

    // Separate files and folders
    // const foldersToPaste = clipboardFile.filter(item => item.type === 'folder');
    // const filesToPaste   = itemsToPaste.filter(i => i.type !== 'folder');

  // const foldersToPaste = itemsToPaste.filter(item => item.type === 'folder');
const foldersToPaste = itemsToPaste.filter(item =>
  typeof item.id === 'number'
);
    const filesToPaste = itemsToPaste.filter(
  item => item.type !== 'folder' && typeof item.id === 'string' && item.id.length >= 32
);

console.log("📂 foldersToPaste:", foldersToPaste);
console.log("📄 filesToPaste:", filesToPaste);

    // ✅ Handle folder paste (single folder with conflict detection)
    if (foldersToPaste.length === 1) {
      const response = await fetch('http://127.0.0.1:5000/folder/copy', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folder_id: Number(foldersToPaste[0].id),
          new_folder_id: Number(currentFolderId) || null
        }),
      });

      if (response.status === 409) {
        const conflictData = await response.json();
        console.log('⚠️ Folder name conflict detected:', conflictData);

        setConflictDialog({
          isOpen: true,
          fileName: foldersToPaste[0].name,
          conflictData: conflictData.detail,
          customName: conflictData.detail.suggested_names?.[0] || `Copy of ${foldersToPaste[0].name}`,
          selectedAction: 'rename'
        });

        setLoading(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Folder paste API error:', errorData);
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Folder pasted successfully:', result);

     const newFolder = {
        id: result.new_folder_id,
        name: foldersToPaste[0].name + ' (Copy)', 
        type: 'folder',
        size: '--',
        modified: formatDate(new Date()),
        rawSize: 0
      };
  

      setFiles(prev => [newFolder, ...prev]);
      pushUndoAction("copy_folder", {
      new_folder_id: result.new_folder_id,
      new_parent_folder_id: currentFolderId,
      user_id: session.user.id
      });
    

      // Clear clipboard after successful paste
      setClipboardFile(null);

      setNotification({
        open: true,
        message: result.message || `"${foldersToPaste[0].name}" pasted successfully.`,
        severity: "success"
      });
    }
    // ✅ Handle multi-folder paste (batch API)
    else if (foldersToPaste.length > 1) {
      const response = await fetch('http://127.0.0.1:5000/folder/copy_folder_multiple', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folder_ids: foldersToPaste.map(f => Number(f.id)),
          new_parent_folder_id: currentFolderId || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Folder paste API error:', errorData);
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Folders pasted successfully:', result);
      
      pushUndoAction("copy_multiple_folder", {
        folder_ids: result.copied_folders.map(f => f.folder_id),
        new_parent_folder_id: currentFolderId,
        user_id: session.user.id
      });

      // const newFolders = result.copied_folders.map(folder => ({
      //   id: folder.folder_id,
      //   // name: folder.file_name,
      //   name : `${itemsToPaste.name} (Copy)`,
      //   type: 'folder',
      //   size: '--',
      //   modified: formatDate(new Date()),
      //   rawSize: 0
      // }));

      // setFiles(prev => [...newFolders, ...prev]);
      // loadfiles(currentFolderId);
      // setClipboardFile(null);

      await fetchFilesInFolder(currentFolderId);
    }

    // ✅ Handle single file paste
    if (filesToPaste.length === 1) {
      const file = filesToPaste[0];
      const sourceFolder = file.source_folder_id ?? file.folder_id;

      if (sourceFolder === currentFolderId) {
        setNotification({
          open: true,
          message: `Cannot paste "${file.name}" here. File is already in this folder.`,
          severity: "warning"
        });
        return;
      }

      const response = await fetch('http://127.0.0.1:5000/files/copy', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_id: String(file.id),
          new_folder_id: currentFolderId || null
        }),
      });

      if (response.status === 409) {
        const conflictData = await response.json();
        console.log('⚠️ File name conflict detected:', conflictData);

        setConflictDialog({
          isOpen: true,
          fileName: file.name,
          conflictData: conflictData.detail,
          customName: conflictData.detail.suggested_names?.[0] || `Copy of ${file.name}`,
          selectedAction: 'rename'
        });

        setLoading(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ File paste API error:', errorData);
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ File pasted successfully:', result);

      const newFile = {
        id: result.file_id,
        name: result.file_name || file.name,
        type: result.file_type || guessType(file.name),
        size: formatSize(file.size),
        modified: formatDate(new Date()),
        rawSize: file.rawSize || 0,
        file_type: file.file_type,
        icon : getFileIcon(file.type)
        
      };

      setFiles(prev => [newFile, ...prev]);
      pushUndoAction("copy_file", {
        file_id: file.id,
        new_folder_id: currentFolderId,
        user_id: session.user.id
      });
      
    }
    // ✅ Handle multi-file paste (using your new API)
    else if (filesToPaste.length > 1) {
      const sourceFolders = filesToPaste.map(file => file.source_folder_id ?? file.folder_id);

      if (sourceFolders.every(folderId => folderId === currentFolderId)) {
        setNotification({
          open: true,
          message: `Cannot paste files here. They are already in this folder.`,
          severity: "warning"
        });
        return;
      }

      const response = await fetch('http://127.0.0.1:5000/files/copy_multiple_files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_ids: filesToPaste.map(f => String(f.id)),
          new_folder_id: currentFolderId || null
        }),
      });

      if (response.status === 409) {
        const conflictData = await response.json();
        console.log('⚠️ Multi-file name conflict detected:', conflictData);

        setConflictDialog({
          isOpen: true,
          fileName: 'One or more files',
          conflictData: conflictData.detail,
          customName: 'Resolve conflicts',
          selectedAction: 'rename'
        });

        setLoading(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Multi-file paste API error:', errorData);
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Files pasted successfully:', result);

      const newFiles = result.copied_files.map(file => ({
        id: file.file_id,
        name: file.file_name,
        type: file.file_type || guessType(file.file_name),
        size: formatSize(file.file_size),
        modified: formatDate(new Date()),
        rawSize: file.file_size || 0,
        file_type: file.file_type,
        icon : getFileIcon(file.type),
      }));

      setFiles(prev => [...newFiles, ...prev]);

      
      pushUndoAction("copy_multiple_file", {
        file_ids: result.copied_files.map(f => f.file_id),
        new_folder_id: currentFolderId,
        user_id: session.user.id
      });

    //   loadfiles(currentFolderId);
    //   setClipboardFile(null);
    }


    setClipboardFile(null);

    setNotification({
      open: true,
      message: "Paste completed successfully.",
      severity: "success"
    });

  } catch (err) {
    console.error('❌ Keyboard paste error:', err);
    setNotification({
      open: true,
      message: `Paste failed: ${err.message}`,
      severity: "error"
    });
  } finally {
    setLoading(false);
  }
};

const handleConflictResolution = async (action) => {
  if (!conflictDialog.conflictData || !clipboardFile) return;

  console.log('🔧 Resolving conflict:', action, conflictDialog.customName);

  try {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("Missing Supabase access token");

    if (action === 'cancel') {
      setConflictDialog({
        isOpen: false,
        fileName: '',
        conflictData: null,
        customName: '',
        selectedAction: 'rename'
      });
      setLoading(false);
      return;
    }

    // Prepare request body
    let requestBody = {
      file_id: clipboardFile.id,
      new_folder_id: currentFolderId || null,
      action: action
    };

    if (action === 'rename') {
      if (!conflictDialog.customName.trim()) {
        setNotification({
          open: true,
          message: "Please enter a new name.",
          severity: "warning"
        });
        setLoading(false);
        return;
      }
      requestBody.custom_name = conflictDialog.customName.trim();
    }

    console.log('📡 Sending conflict resolution request:', requestBody);

    // 🔥 Dynamic endpoint selection based on item type
    const endpoint = clipboardFile.type === 'folder'
      ? 'http://127.0.0.1:5000/folder/copy-with-name'
      : 'http://127.0.0.1:5000/files/copy-with-name';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Conflict resolution failed:', errorData);
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Conflict resolved:', result);

    // Create new object (file or folder)
    const newItem = {
      id: result.file_id,
      name: result.new_file_name || (action === 'rename' ? conflictDialog.customName : clipboardFile.name),
      type: clipboardFile.type,
      size: clipboardFile.type === 'folder' ? '--' : clipboardFile.size,
      modified: formatDate(new Date()),
      rawSize: clipboardFile.rawSize || 0,
    };

    if (action === 'replace') {
      // Replace existing item in the list
      setFiles(prev => prev.map(f => {
        if (f.name === clipboardFile.name && f.id !== clipboardFile.id) {
          return newItem;
        }
        return f;
      }));
    } else {
      // Add new item to the list
      setFiles(prev => [newItem, ...prev]);
    }

    // Clear clipboard and close dialog
    setClipboardFile(null);
    setConflictDialog({
      isOpen: false,
      fileName: '',
      conflictData: null,
      customName: '',
      selectedAction: 'rename'
    });

    const actionText = action === 'replace' ? 'replaced' : 'renamed and copied';
    setNotification({
      open: true,
      message: result.message || `${clipboardFile.type === 'folder' ? 'Folder' : 'File'} ${actionText} successfully.`,
      severity: "success"
    });

  } catch (err) {
    console.error('❌ Conflict resolution error:', err);
    setNotification({
      open: true,
      message: `Operation failed: ${err.message}`,
      severity: "error"
    });
  } finally {
    setLoading(false);
  }
};


useEffect(() => {
  const handleKeyDown = (event) => {
    // Ignore if user is typing in an input field
    if (event.target.tagName === 'INPUT' || 
        event.target.tagName === 'TEXTAREA' || 
        event.target.isContentEditable) {
      return;
    }

      // ✅ Undo: Ctrl+Z / Cmd+Z
    const isRedo = 
    (event.ctrlKey && !event.shiftKey && event.key.toLowerCase() === 'y') ||
    (event.ctrlKey && event.shiftKey  && event.key.toLowerCase() === 'z');

  if (isRedo) {
    event.preventDefault();
    handleRedo();
  }

    // ✅ Redo: Ctrl+Shift+Z / Cmd+Shift+Z
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      handleRedo();
    }

    // Ctrl+C or Cmd+C for copy
    if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
      event.preventDefault();
      
      if (multipleFiles.length === 1) {
        const fileToCopy = multipleFiles[0];
        
        if (fileToCopy.type === 'folder') {
          setNotification({
            open: true,
            message: "Folder copying is not currently supported.",
            severity: "warning"
          });
          return;
        }

        const fileWithFolderInfo = {
          ...fileToCopy,
          source_folder_id: currentFolderId,
          folder_id: currentFolderId,
        };

        setClipboardFile(fileWithFolderInfo);

        setNotification({
          open: true,
          message: `"${fileToCopy.name}" copied. Navigate to target folder and press Ctrl+V to paste.`,
          severity: "info"
        });
        
        console.log('📋 File copied via keyboard:', fileToCopy.name);
        
      } else if (multipleFiles.length === 0) {
        setNotification({
          open: true,
          message: "Select a file first to copy.",
          severity: "warning"
        });
      } else {
        setNotification({
          open: true,
          message: "Please select exactly one file to copy.",
          severity: "warning"
        });
      }
    }

    // Ctrl+V or Cmd+V for paste
    if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
      event.preventDefault();
      
      if (!clipboardFile) {
        setNotification({
          open: true,
          message: "Nothing to paste. Copy a file first (Ctrl+C).",
          severity: "warning"
        });
        return;
      }

      handleKeyboardPaste();
    }

    // Escape to clear clipboard
    if (event.key === 'Escape' && clipboardFile) {
      setClipboardFile(null);
      setNotification({
        open: true,
        message: "Clipboard cleared.",
        severity: "info"
      });
      console.log('🧹 Clipboard cleared via Escape key');
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [multipleFiles, currentFolderId, clipboardFile]);

const fetchFolderSize = async (folderId) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

 const response = await fetch(`http://127.0.0.1:5000/storage/folder-level-storage?folder_id=${folderId}`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` }
});

    if (!response.ok) throw new Error('Failed to fetch folder size');

    const data = await response.json();
    const sizeText = data.total_size_gb > 0.1 ? `${data.total_size_gb.toFixed(2)} GB` : `${data.total_size_mb.toFixed(0)} MB`;

    setFolderSizes(prev => ({ ...prev, [folderId]: sizeText }));
  } catch (err) {
    console.error('❌ Failed to fetch folder size:', err);
    setFolderSizes(prev => ({ ...prev, [folderId]: 'Error' }));
  }
};

const typeMenuRef = useRef(null);

useEffect(() => {
  function onDocClick(e) {
    if (showTypeMenu && typeMenuRef.current && !typeMenuRef.current.contains(e.target)) {
      setShowTypeMenu(false);
    }
  }
  document.addEventListener('mousedown', onDocClick);
  return () => document.removeEventListener('mousedown', onDocClick);
}, [showTypeMenu]);




const filteredFiles = (files || []).filter(it => {
  if (typeFilter === 'all') return true;
  return categorizeFile(it) === typeFilter;
});



  // 🔍 ENHANCED SEARCH RESULTS RENDERING WITH DEBUG
  const renderCategoryComponent = () => {
    if (isSearching && searching.trim()) {
    console.log('🔍 Rendering search results:', { searchResults, searching });
    
    
  return (
    <div className={`files-container ${viewMode} ${viewMode === 'grid' ? 'enhanced' : ''}`}>
     {Array.isArray(searchResults?.folders) && searchResults.folders.length > 0&& (
        <>
            {searchResults.folders.map((folder) => {
              const searchFolder = {
                id: folder.folder_id,
                name: folder.folder_name,
                type: 'folder',
                size: '—',
                modified: folder.created_at ? formatDate(folder.created_at) : '—',
                rawSize: 0
              };
               if (viewMode === 'grid') {
                // Enhanced Grid View for folders
                return (
                  <div
                    key={searchFolder.id}
                    className={`enhanced-file-item ${
                      multipleFiles.find(f => f.id === searchFolder.id) ? 'selected' : ''
                    }`}
                    onClick={(e) => handleFileClick(searchFolder, e)}
                  >
                    <div className="enhanced-file-icon">
                      {getFileIcon('folder', searchFolder, true)}
                      {multipleFiles.find(f => f.id === searchFolder.id) && (
                        <div className="enhanced-selection-indicator">✓</div>
                      )}
                    </div>
                    <div 
                      className="enhanced-file-name folder-name"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFolderClick(searchFolder);
                      }}
                      title={searchFolder.name}
                    >
                      {searchFolder.name}
                    </div>
                    <div className="enhanced-file-date">
                      {searchFolder.modified}
                    </div>
                  </div>
                );
              } else {
            return (
              <div
                key={searchFolder.id}
                className={`file-item folder ${
                  multipleFiles.find(f => f.id === searchFolder.id) ? 'selected' : ''
                }`}
                onClick={(e) => handleFileClick(searchFolder, e)}
              >
                {getFileIcon('folder')}
                <div className="file-details">
                  <span
                    className={`file-name ${previewFile?.id === searchFolder.id ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFolderClick(searchFolder);
                    }}
                  >
                    {searchFolder.name}
                  </span>
                  <div className="file-meta">
                    <span className="file-size">{searchFolder.size}</span>
                    <span className="file-modified">{searchFolder.modified}</span>
                  </div>
                </div>
                {multipleFiles.find(f => f.id === searchFolder.id) && (
                            <div className="multi-select-overlay">✓</div>
                          )}
                  </div>
                );
              }
            })}
          </>
        )}

      {Array.isArray(searchResults?.result) && searchResults.result.length > 0 && (
        <>

            {searchResults.result.map((file) => {
              const searchFile = {
                id: file.file_id,
                name: file.file_name,
                type: guessType(file.file_name),
                size: formatSize(file.file_size || 0),
                modified: file.created_at ? formatDate(file.created_at) : '—',
                rawSize: formatSize(file.file_size) || 0
              };
                if (viewMode === 'grid') {
                // Enhanced Grid View for files
                return (
                  <div
                    key={searchFile.id}
                    className={`enhanced-file-item ${
                      multipleFiles.find(f => f.id === searchFile.id) ? 'selected' : ''
                    }`}
                    onClick={(e) => handleFileClick(searchFile, e)}
                  >
                    <div className="enhanced-file-icon">
                      {getFileIcon(searchFile.type, searchFile, true)}
                      {multipleFiles.find(f => f.id === searchFile.id) && (
                        <div className="enhanced-selection-indicator">✓</div>
                      )}
                    </div>
                    <div 
                      className="enhanced-file-name"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFileNameClick(searchFile, e);
                      }}
                      title={searchFile.name}
                    >
                      {searchFile.name}
                    </div>
                    <div className="enhanced-file-date">
                      <span className="file-size">{searchFile.size}</span>

                      <div className="enhanced-file-actions" style={{ marginTop: 8 }}>
                      <button
                        className="versions-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setVersionModalFile({ id: searchFile.id, name: searchFile.name });
                        }}
                        title="View versions"
                      >
                        <FileClock size={16} />
                      </button>
                    </div>
              
                    </div>
                  </div>
                );
              } else {

            return (
              <div
                key={searchFile.id}
                className={`file-item ${searchFile.type} ${
                  multipleFiles.find(f => f.id === searchFile.id) ? 'selected' : ''
                }`}
                onClick={(e) => handleFileClick(searchFile, e)}
              >
                {getFileIcon(searchFile.type)}
                <div className="file-details">
                  <span
                    className={`file-name ${previewFile?.id === searchFile.id ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFileNameClick(searchFile, e);
                    }}
                  >
                    {searchFile.name}
                  </span>
                  <div className="file-meta">
                    <span className="file-size">{searchFile.size}</span>
                    <span className="file-modified">{searchFile.modified}</span>
                  </div>
                  <div className="file-actions-inline" style={{ marginTop: 8 }}>
                      <button
                        className="versions-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setVersionModalFile({ id: searchFile.id, name: searchFile.name });
                        }}
                        title="View versions"
                      >
                        <FileClock size={16} />
                      </button>
                    </div>
                </div>
                {multipleFiles.find(f => f.id === searchFile.id) && (
                          <div className="multi-select-overlay">✓</div>
                        )}
                </div>
                );
              }
            })}
          </>
        )}
       {(!searchResults?.folders?.length && !searchResults?.result?.length) && (
          <div className="empty-files" style={{ padding: '2rem', textAlign: 'center' }}>
            <FileText size={48} color="#ccc" />
            <p style={{ marginTop: '1rem', color: '#666' }}>
              No files or folders found matching {searching}
            </p>
            <p style={{ color: '#999', fontSize: '0.9rem' }}>
              Try different keywords or check your spelling
            </p>
          </div>
        )}
      </div>
    );
  }

    
    switch (category) {
      case 'overview':
        return <Overview />;
      case 'files':
        return <Files viewMode={viewMode} files={files} />;
      case 'shared':
        return <Shared viewMode={viewMode} files={files} />;
      case 'upload':
        return <Upload viewMode={viewMode} files={files} />;
      case 'trash':
        return <Trash 
          viewMode={viewMode} 
          files={files} 
          onRefreshNeeded={() => {
            console.log("📢 Trash requested refresh, refetching files...");
            fetchFilesInFolder(currentFolderId);
          }}
        />;
      default:
  return (
    <div className={`files-container ${viewMode} ${viewMode === 'grid' ? 'enhanced' : ''}`}>
      {filteredFiles.length > 0 ? (
        filteredFiles.map((file) => {
          if (viewMode === 'grid') {
            // Enhanced Grid View
            return (
              <div
                key={file.id}
                className={`enhanced-file-item ${
                  multipleFiles.find(f => f.id === file.id) ? 'selected' : ''
                }`}
                onClick={(event) => handleFileClick(file, event)}
                style={{ 
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none'
                }}
              >
                <div className="enhanced-file-icon">
                  {getFileIcon(file.type, file, true)}
                  {multipleFiles.find(f => f.id === file.id) && (
                    <div className="enhanced-selection-indicator">✓</div>
                  )}
                </div>

                  {/* Upload Progress */}
              {(file.uploading || uploadProgress[file.id]) && file.type === 'file' && (
                <div className="progress-container">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill upload" 
                      style={{ width: `${uploadProgress[file.id]?.percent || 0}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">
                    Uploading {uploadProgress[file.id]?.percent || 0}%
                  </span>
                </div>
              )}


                {/* Download Progress  */}
                {downloadProgress[`download_${file.id}`] !== undefined && (
                  <div className="progress-container">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill download" 
                        style={{ width: `${downloadProgress[`download_${file.id}`]}%` }}
                      ></div>
                    </div>
                    <span className="progress-text">
                      Downloading {downloadProgress[`download_${file.id}`]}%
                    </span>
                  </div>
                )}            
                <div 
                  className={`enhanced-file-name ${file.type === 'folder' ? 'folder-name' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (file.type === 'folder') {
                      handleFolderClick(file);
                    } else {
                      handleFileNameClick(file, e);
                    }
                  }}
                  title={file.name}
                >
                  {file.name}
                </div>
                
                
                  <div className="enhanced-file-date">
                  {file.type === 'folder' && !folderSizes[file.id] && !alreadyFetchedSizes.current.has(file.id) && (
                    alreadyFetchedSizes.current.add(file.id),
                    fetchFolderSize(file.id)
                  )}
                  <span className="folder-size">
                    {folderSizes[file.id] === 'Error' ? 'Error' : folderSizes[file.id] || ''}
                  </span>
                </div>
                {file.type !== 'folder' && (
                  <div className="enhanced-file-actions" style={{ marginTop: 8 }}>
                    <button
                      className="versions-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setVersionModalFile({
                          id: file.id,
                          name: file.name,
                          // mime_type: file.mime_type // include if you have it on file objects
                        });
                      }}
                      title="View versions"
                    >
                      <FileClock size={16} />
                    </button>
                  </div>
                )}
                </div>
            );
          } else {
            // Original List View
            return (
              <div
                key={file.id}
                className={`file-item ${file.type} ${
                  multipleFiles.find(f => f.id === file.id) ? 'selected' : ''
                }`}
                onClick={(event) => handleFileClick(file, event)}
                style={{ 
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none'
                }}
              >
                {getFileIcon(file.type, file, false)}
                <div className="file-details">
                  <span
                    className={`file-name ${previewFile?.id === file.id ? 'active' : ''} ${file.type === 'folder' ? 'folder-clickable' : ''}`}

                    onClick={(e) => {
                      e.stopPropagation();
                      if (file.type === 'folder') {
                        handleFolderClick(file);
                      } else {
                        handleFileNameClick(file, e);
                      }
                    }} 
                  >
                    {file.name}
                  </span>
                  <div className="file-meta">
                    {file.type === 'folder' ? (
                          <span 
                            className="file-size folder-size"
                            onClick={() => {
                              if (!folderSizes[file.id]) fetchFolderSize(file.id);
                            }}
                            style={{ cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            {folderSizes[file.id] || 'View Size'}
                          </span>
                        ) : (
                          <span className="file-size">{file.size}</span>
                        )}
                        <span className="file-modified">{file.modified}</span>
                      </div>

                      {(file.uploading || uploadProgress[file.id]) && (
                  <div className="progress-container" style={{ marginTop: '8px' }}>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill upload" 
                        style={{ width: `${uploadProgress[file.id]?.percent || 0}%` }}
                      ></div>
                    </div>
                    <span className="progress-text">
                      Uploading {uploadProgress[file.id]?.percent || 0}%
                    </span>
                  </div>
                )}

                  {downloadProgress[`download_${file.id}`] !== undefined && (
                    <div className="progress-container">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill download" 
                          style={{ width: `${downloadProgress[`download_${file.id}`]}%` }}
                        ></div>
                      </div>
                      <span className="progress-text">
                        Downloading {downloadProgress[`download_${file.id}`]}%
                      </span>
                    </div>
                  )}

              {file.type !== 'folder' && (
                  <div className="enhanced-file-actions" style={{ marginTop: 8 }}>
                    <button
                      className="versions-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setVersionModalFile({
                          id: file.id,
                          name: file.name,
                          // mime_type: file.mime_type // include if you have it on file objects
                        });
                      }}
                      title="View versions"
                    >
                      <FileClock size={16} />
                    </button>
                  </div>
                )}

                </div>
                {multipleFiles.find(f => f.id === file.id) && file.type !== 'folder' && (
                  <div className="multi-select-overlay">✓</div>
                )}
              </div>
            );
          }
        })
      ) : (
        <div className="empty-files">
          <FileText size={48} />
          <p>No files or folders found</p>
        </div>
      )}
    </div>
  );
    }
  };


  return (
    <div className="file-display">
      <FileTransferPanel 
      forceVisible={filePanel}
      onClose={() => setFilePanel(false)} />
      <input
        type="file"
        id="hidden-file-input"
        onChange={handleUpload}
        style={{ display: "none" }}
         webkitdirectory=""
        multiple
      />

      <div className="fixed-header-section">

      {/* Breadcrumb Navigation */}
{(category === 'myfiles' || category === 'uploads')  && (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '16px',
      padding: '1rem 1.5rem',
      gap: '1rem',
      flexWrap: 'wrap'
    }}
  >
    {/* Breadcrumb (left) */}
    <div style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', minWidth: 0 }}>
      <Breadcrumb
        folderPath={folderPath}
        currentFolderId={currentFolderId}
        onHomeClick={handleHomeClick}
        onFolderClick={(index) => {
          const targetFolder = folderPath[index];
          if (!targetFolder) return;
          setCurrentFolderId(targetFolder.id);
          setFolderPath(folderPath.slice(0, index + 1));
          setMultipleFiles([]);
          setSelectedFile(null);
        }}
        showBreadcrumb={true}
      />
    </div>

    {/* Type filter (right, beside breadcrumb) */}
   <div ref={typeMenuRef} className="type-menu">
  <button
    type="button"
    onClick={() => setShowTypeMenu(v => !v)}
    aria-haspopup="listbox"
    aria-expanded={showTypeMenu}
    className="type-menu__trigger"
  >
    <span className="type-menu__dot" />
    <span className="type-menu__label">
      Type: {TYPE_OPTIONS.find(o => o.key === typeFilter)?.label || 'All'}
    </span>
    <svg className="type-menu__chevron" viewBox="0 0 20 20">
      <path d="M5 7l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  </button>

  {showTypeMenu && (
    <div role="listbox" className="type-menu__dropdown">
      {TYPE_OPTIONS.map(opt => (
        <button
          key={opt.key}
          role="option"
          aria-selected={typeFilter === opt.key}
          onClick={() => { setTypeFilter(opt.key); setShowTypeMenu(false); }}
          className={`type-option ${typeFilter === opt.key ? 'type-option--active' : ''}`}
        >
          <span className="type-option__icon">{getFileIcon(opt.key)}</span>
          <span className="type-option__text">{opt.label}</span>
        </button>
      ))}
    </div>
  )}
</div>


  </div>
)}



      {/* Header Actions */}
      {category !== 'trash' && category !== 'overview' && (
        <div className="header-actions">
          <FileToolbar 
            onUpload={handleUpload}
            expanded={toolbarExpanded}
            multipleFiles={multipleFiles}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
            downloadProgress={downloadProgress}
            setDownloadProgress={setDownloadProgress}
            availableFolders={folderOperations.availableFolders}
            onRefreshFolders={folderOperations.refreshFolders}
            onRefreshfiles={() => fetchFilesInFolder(currentFolderId)}
          />
          <button
            className="create-folder-button"
            onClick={openCreateFolderModal}
            disabled={loading}
          >
            <div className='create-folder-content'>
              <FolderPlus size={23} /> 
              {/* <span className='create-folder-text'>Create Folder</span> */}
            </div>
          </button>



          <div className="view-controls">
                <div style={{ display: 'flex', gap: '9px' }}>
              <button
                onClick={handleUndoWithRefresh}
                disabled={undo.length === 0}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  fontSize: '18px',
                  border: '1px solid var(--border)',
                  backgroundColor: undo.length > 0 ? '#fff' : '#f3f3f3',
                  color: undo.length > 0 ? '#000' : '#ccc',
                  cursor: undo.length > 0 ? 'pointer' : 'not-allowed',
                }}
                title="Undo"
              >
              <Undo2 size={20} />
              </button>

              <button
                onClick={handleRedoWithRefresh}
                disabled={redo.length === 0}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  fontSize: '18px',
                  border: '1px solid var(--border)',
                  backgroundColor: redo.length > 0 ? '#fff' : '#f3f3f3',
                  color: redo.length > 0 ? '#000' : '#ccc',
                  cursor: redo.length > 0 ? 'pointer' : 'not-allowed',
                }}
                title="Redo"
              >
                <Redo2 size={20} />
              </button>
            </div>
            <button
              className="layout-btn"
              onClick={() => handleViewChange(viewMode === 'grid' ? 'list' : 'grid')}
              aria-label={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
              title={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
            >
              {viewMode === 'grid' ? (
                <List size={20} />
              ) : (
                <LayoutGrid size={20} />
              )}
            </button>
          </div>
        </div>
      )}
    </div>

      <div className="scrollable-content"
       onClick={() => {
        setMultipleFiles([]);
        setSelectedFile(null);
      
      }}>
         {/* Main Content */}
      {renderCategoryComponent()}
      </div>


         {duplicateDialog.isOpen && (
        <ModalPortal>
          <div className="conflict-dialog-overlay">
            <div className="conflict-dialog">
              <div className="conflict-header">
                <h3>⚠️ File Already Exists</h3>
                <button onClick={() => handleDuplicateResolve('cancel')} className="close-button">
                  ✕
                </button>
              </div>

              <div className="conflict-body">
                <p>
                  A file named <strong>{duplicateDialog.fileName}</strong> already exists in this folder.
                  What would you like to do?
                </p>

                <div className="conflict-options">
                  {/* Replace Option */}
                  <label className={`option-card ${duplicateDialog.selectedAction === 'replace' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      id="replace"
                      name="conflict-action"
                      value="replace"
                      checked={duplicateDialog.selectedAction === 'replace'}
                      onChange={() => setDuplicateDialog(prev => ({ ...prev, selectedAction: 'replace' }))}
                    />
                    <div className="option-content">
                      <div className="option-title">🔄 Replace Existing File</div>
                      <div className="option-description">The existing file will be permanently replaced</div>
                    </div>
                  </label>

                  {/* Rename Option */}
                  <label className={`option-card ${duplicateDialog.selectedAction === 'rename' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      id="rename"
                      name="conflict-action"
                      value="rename"
                      checked={duplicateDialog.selectedAction === 'rename'}
                      onChange={() => setDuplicateDialog(prev => ({ ...prev, selectedAction: 'rename' }))}
                    />
                    <div className="option-content">
                      <div className="option-title">✏️ Save with Different Name</div>
                      <div className="option-description">Keep both files by giving this one a new name</div>
                    </div>
                  </label>

                  {/* Version History Option */}
                {!duplicateDialog.isFolder &&
              duplicateDialog.duplicateFileId &&
              duplicateDialog.identical === false && (
                <label className={`option-card ${duplicateDialog.selectedAction === 'history' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    id="history"
                    name="conflict-action"
                    value="history"
                    checked={duplicateDialog.selectedAction === 'history'}
                    onChange={() => {
                      setDuplicateDialog(prev => ({ ...prev, selectedAction: 'history' }));
                      setVersionModalFile({
                        id: duplicateDialog.duplicateFileId,
                        name: duplicateDialog.file?.name,
                        mime_type: duplicateDialog.file?.mime_type
                      });
                    }}
                  />
                <div className="option-content">
                  <div className="option-title"> View Version History</div>
                  <div className="option-description">See all previous versions before deciding</div>
                </div>
              </label>
            )}

                </div>

                {duplicateDialog.selectedAction === 'rename' && (
                  <div className="custom-name-section">
                    <label htmlFor="customName">New filename:</label>
                    <input
                      id="customName"
                      type="text"
                      className="custom-name-input"
                      value={duplicateDialog.customName}
                      onChange={e => setDuplicateDialog(prev => ({ ...prev, customName: e.target.value }))} 
                      placeholder="Enter new filename"
                      autoFocus
                    />
                    {duplicateDialog.conflictData?.suggested_names && (
                      <div className="suggested-names">
                        <span>Quick suggestions:</span>
                        <div className="suggestions-grid">
                          {duplicateDialog.conflictData.suggested_names.map((s, i) => (
                            <button
                              key={i}
                              className={duplicateDialog.customName === s ? 'active' : ''}
                              onClick={() => setDuplicateDialog(prev => ({ ...prev, customName: s }))}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="conflict-actions">
                <button className="btn btn-cancel" onClick={() => handleDuplicateResolve('cancel')}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={() => handleDuplicateResolve(duplicateDialog.selectedAction)}
                  disabled={duplicateDialog.selectedAction === 'rename' && !duplicateDialog.customName.trim()}
                >
                  {duplicateDialog.selectedAction === 'replace' ? ' Replace File' : 
                  duplicateDialog.selectedAction === 'history' ? ' View History' :
                  'Save with New Name'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* VersionManager panel */}
      {/* {showHistory && (
        <VersionManager
          isOpen={showHistory}
          fileId={historyFileId}
          onClose={() => setShowHistory(false)}
          onFileListRefresh={() => {
            setShowHistory(false);
            fetchFilesInFolder(currentFolderId);
          }
        />
      
      )} */}

{versionModalFile && (
  <VersionManager
    isOpen={!!versionModalFile}
    fileId={versionModalFile?.id}
    liveFileName={versionModalFile?.name}
    liveMimeType={versionModalFile?.mime_type}
    onClose={() => setVersionModalFile(null)}
    onFileListRefresh={() => fetchFilesInFolder(currentFolderId)}
    openFilePreview={({ fileId, versionId, name, mimeType }) => {
      setPreviewFile({ id: fileId, name, versionId, mimeType }); // ✅ correct keys
      setPreviewOperation(true);                                   // ✅ open modal
    }}
  />
)}

  


    
      {/* Loading State */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <span>Loading...</span>
        </div>
      )}

      

      {/* Drag and Drop Overlay */}
      
      {drag && (
        <ModalPortal>
        <div className="drop-overlay">
          Drop your file here to upload
        </div>
        </ModalPortal>
      )}


      {/* Version Manager Modal */}
      {/* {versionModalOpen && (
        <VersionManager
          isOpen={versionModalOpen}
          fileId={selectedId.id}
          onClose={() => setVersionModalOpen(false)}
        />
      )} */}

      {/* File Preview */}
      {previewFile && (
        <FilePreview
          key={`${previewFile?.id}-${previewFile?.versionId ?? 'current'}`}
          isOpen={previewOperation}
          fileId={previewFile.id}
          fileName={previewFile.name}
         versionId={previewFile.versionId}  // ← support versioned preview
          mimeType={previewFile.mimeType}
          onClose={() => {
            setPreviewOperation(false);
            setPreviewFile(null);
          }}
        />
      )}

      {/* Conflict Dialog */}
      {conflictDialog.isOpen && (
        <ModalPortal>
        <div className="conflict-dialog-overlay">
          <div className="conflict-dialog">
            <div className="conflict-header">
              <h3>⚠️ File Already Exists</h3>
              <button 
                className="close-button"
                onClick={() => handleConflictResolution('cancel')}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
              </button>
            </div>
            
            <div className="conflict-body">
              <p className="conflict-message">
                A file named <strong>{conflictDialog.fileName}</strong> already exists in this folder.
                What would you like to do?
              </p>
              
              <div className="conflict-options">
                {/* Replace Option */}
                <div className={`option-card ${conflictDialog.selectedAction === 'replace' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    id="replace"
                    name="conflict-action"
                    value="replace"
                    checked={conflictDialog.selectedAction === 'replace'}
                    onChange={(e) => setConflictDialog(prev => ({ ...prev, selectedAction: e.target.value }))}
                  />
                  <label htmlFor="replace" className="option-label">
                    <div className="option-title">🔄 Replace Existing File</div>
                    <div className="option-description">
                      The existing file will be permanently replaced
                    </div>
                  </label>
                </div>

                {/* Rename Option */}
                <div className={`option-card ${conflictDialog.selectedAction === 'rename' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    id="rename"
                    name="conflict-action"
                    value="rename"
                    checked={conflictDialog.selectedAction === 'rename'}
                    onChange={(e) => setConflictDialog(prev => ({ ...prev, selectedAction: e.target.value }))}
                  />
                  <label htmlFor="rename" className="option-label">
                    <div className="option-title">✏️ Save with Different Name</div>
                    <div className="option-description">
                      Keep both files by giving this one a new name
                    </div>
                  </label>
                </div>
              </div>

              {/* Custom Name Input - only show for rename option */}
              {conflictDialog.selectedAction === 'rename' && (
                <div className="custom-name-section">
                  <label className="input-label">New filename:</label>
                  <input
                    type="text"
                    className="custom-name-input"
                    value={conflictDialog.customName}
                    onChange={(e) => setConflictDialog(prev => ({ ...prev, customName: e.target.value }))}
                    placeholder="Enter new filename"
                    onFocus={(e) => e.target.select()}
                    autoFocus
                  />
                  
                  {/* Suggested Names */}
                  {conflictDialog.conflictData?.suggested_names && (
                    <div className="suggested-names">
                      <span className="suggestions-label">Quick suggestions:</span>
                      <div className="suggestions-grid">
                        {conflictDialog.conflictData.suggested_names.map((suggestion, index) => (
                          <button
                            key={index}
                            className={`suggestion-btn ${conflictDialog.customName === suggestion ? 'active' : ''}`}
                            onClick={() => setConflictDialog(prev => ({ ...prev, customName: suggestion }))}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="conflict-actions">
              <button
                className="btn btn-cancel"
                onClick={() => handleConflictResolution('cancel')}
              >
                Cancel
              </button>
              
              <button
                className="btn btn-primary"
                onClick={() => handleConflictResolution(conflictDialog.selectedAction)}
                disabled={
                  conflictDialog.selectedAction === 'rename' && !conflictDialog.customName.trim()
                }
              >
                {conflictDialog.selectedAction === 'replace' ? (
                  <>🔄 Replace File</>
                ) : (
                  <>✏️ Save with New Name</>
                )}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Create Folder Modal */}
      
     {createFolderModalOpen && (
  <ModalPortal>
    <div className="modal-overlay" onClick={() => setCreateFolderModalOpen(false)}>
      <div className="modal-content create-folder-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Create New Folder</h3>

        <input
          type="text"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreateFolder();
            if (e.key === 'Escape') setCreateFolderModalOpen(false);
          }}
          placeholder="Enter folder name..."
          autoFocus
          className="modal-input"
        />

        <div className="modal-actions">
          <button className="cancel-btn" onClick={() => setCreateFolderModalOpen(false)}>
            Cancel
          </button>
          <button
            className="create-btn"
            onClick={handleCreateFolder}
            disabled={!newFolderName.trim()}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  </ModalPortal>
)}
    {createFolderModalOpen && (
            <ModalPortal>
            <div className="share-modal-backdrop" onClick={() => setCreateFolderModalOpen(false)}>
              <div className="share-modal" onClick={(e) => e.stopPropagation()}>
                
                {/* Header */}
                <div className="modal-header">
                  <h2 className="modal-title">Create New Folder</h2>
                  <button 
                    className="close-button" 
                    onClick={() => setCreateFolderModalOpen(false)}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>

                {/* Content */}
                <div className="create-modal-content">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateFolder();
                        if (e.key === 'Escape') setCreateFolderModalOpen(false);
                      }}
                      placeholder="Enter folder name..."
                      autoFocus
                      className='folder-input'
                    />
                  
                </div>

                {/* Actions */}
                <div className="modal-actions">
                  <button
                    className="create-button"
                    onClick={handleCreateFolder}
                    disabled={!newFolderName.trim()}
                  >
                    Create
                  </button>
                  <button className="cancel-button" onClick={() => setCreateFolderModalOpen(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
            </ModalPortal>
          )}


      
      <ModalPortal>
      <Notification
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={() => setNotification({ open: false, message: '', severity: 'info' })}
      /></ModalPortal>
    </div>
  );
};

FileDisplay.propTypes = {
  category: PropTypes.string
};

export default FileDisplay;

