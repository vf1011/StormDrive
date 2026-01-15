
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../../supabase';
import { useFileContext } from './FileContext';
import { guessType } from '../../../utils';

export const useFolderOperations = (user, session, setNotification) => {
  const [availableFolders, setAvailableFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const { downloadProgress, setDownloadProgress , setMultipleFiles,setSelectedFile,setFiles,pushUndoAction } = useFileContext();
  const [clipboardFile, setClipboardFile] = useState(null);
  

  // Helper function to get the correct token



  const getAuthToken = async () => {
    const { data, error } = await supabase.auth.getSession();

    if (error) throw new Error("Failed to get session");
    if (!data?.session?.access_token) throw new Error("No active session found. Please log in again.");

    return data.session.access_token;
  };

  // Show notification helper
  const showNotification = useCallback((message, severity = 'info') => {
    if (setNotification) {
      setNotification({
        open: true,
        message,
        severity
      });
    }
  }, [setNotification]);

  // Create default folders
const createDefaultFolders = useCallback(async () => {
  try {
    setLoading(true);
    const token = await getAuthToken();

    // ✅ Change POST → GET and update endpoint
    const response = await fetch("http://127.0.0.1:5000/folder/list", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Failed to fetch/create default folders");
    }

    const result = await response.json();

    // ✅ Use result.folders (backend returns { folders: [...], success: true })
    await loadRootFolders();

    if (result.folders?.length > 0) {
      showNotification(
        `Default folders ready: ${result.folders.map(f => f.folder_name).join(", ")}`,
        "success"
      );
    } else {
      showNotification("No default folders found", "info");
    }

    return result;
  } catch (error) {
    showNotification(`Failed to create default folders: ${error.message}`, "error");
    throw error;
  } finally {
    setLoading(false);
  }
}, [setNotification]);

  // Create a new folder
const createFolder = useCallback(
  async (folderName, parentFolderId = null) => {
    try {
      setLoading(true);

      const token = await getAuthToken();
      const resp = await fetch('http://127.0.0.1:5000/folder/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folder_name: folderName,
          parent_folder_id: parentFolderId, // null is OK in JSON
        }),
      });

      // Read body once
      const text = await resp.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!resp.ok) {
        // 409 = duplicate folder
        if (resp.status === 409 && data?.detail) {
          showNotification(data.detail, 'warning');
          throw new Error(data.detail);
        }
        throw new Error(data?.detail || 'Failed to create folder');
      }

      // API returns { folder_id: string, name: string, creation_date: ISO }
      const result = data;

      const newFolder = {
        folder_id: result.folder_id,                  // keep as string (works for UUID or int-as-string)
        folder_name: result.name,
        parent_folder_id: parentFolderId,
        created_at: result.creation_date,
        updated_at: result.creation_date,
      };

      // Prevent duplicate if WS event will also add it
      setAvailableFolders(prev => {
        const exists = prev.some(f => f.folder_id === newFolder.folder_id);
        return exists ? prev : [...prev, newFolder];
      });

      // Client-side undo log (if your UI uses it)
      pushUndoAction('create_folder', {
        folder_id: newFolder.folder_id,
        folder_name: newFolder.folder_name,
        user_id: user?.id ?? null,
        parent_folder_id: parentFolderId,
      });

      showNotification(`Folder "${folderName}" created successfully`, 'success');
      return newFolder;
    } catch (err) {
      console.error('Create folder error:', err);
      const msg = String(err?.message || err);
      showNotification(
        /session|token/i.test(msg)
          ? 'Authentication expired. Please log in again.'
          : `Failed to create folder: ${msg}`,
        'error'
      );
      throw err;
    } finally {
      setLoading(false);
    }
  },
  [getAuthToken, setAvailableFolders, pushUndoAction, showNotification, user?.id]
);


  const loadAllFolders = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();

      const response = await fetch('http://127.0.0.1:5000/folder/all', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to load folders');
      }

      const data = await response.json();
      const folders = data.folders || [];

      setAvailableFolders(folders);
      setHasInitialized(true);
      return folders;
    } catch (error) {
      showNotification(`Failed to load folders: ${error.message}`, 'error');
      return [];
    } finally {
      setLoading(false);
    }
  }, [session, setNotification]);

  // Load root folders (automatically creates defaults if none exist)
  const loadRootFolders = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();

      const response = await fetch('http://127.0.0.1:5000/folder/list', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to load root folders');
      }

      const data = await response.json();
      const folders = data.folders || [];

      setAvailableFolders(folders);
      setHasInitialized(true);

      // Show welcome message if default folders were just created and this is first load
      if (folders.length === 5 && !hasInitialized) {
        const defaultFolderNames = ['Documents', 'Downloads', 'Pictures', 'Videos', 'Music'];
        const hasAllDefaults = defaultFolderNames.every(name => 
          folders.some(folder => folder.folder_name === name && folder.parent_folder_id === null)
        );
        
        if (hasAllDefaults) {
          console.log('Welcome! Your default folders have been created automatically.', 'success');
        }
      }

      return folders;
    } catch (error) {
      showNotification(`Failed to load folders: ${error.message}`, 'error');
      return [];
    } finally {
      setLoading(false);
    }
  }, [session, setNotification, hasInitialized]);

  // Load folder contents (folders and files) - Enhanced
  const loadFolderContents = useCallback(async (folderId = null) => {
    try {
      setLoading(true);
      const token = await getAuthToken();

      if (folderId === null) {
        // Load root level - both files and folders
        const [filesData, foldersData] = await Promise.all([
          fetch('http://127.0.0.1:5000/files/file', {
            headers: { Authorization: `Bearer ${token}` },
          }).then(res => res.ok ? res.json() : { files: [] }),

          fetch('http://127.0.0.1:5000/folder/list', {
            headers: { Authorization: `Bearer ${token}` }
          }).then(res => res.ok ? res.json() : { folders: [] })
        ]);

        return {
          folders: foldersData.folders || [],
          files: filesData.files || [],
          folder_name: 'Root',
          parent_folder_id: null,
          folder_id: null
        };
      } else {
        // Load specific folder contents
        const response = await fetch(`http://127.0.0.1:5000/folder/list/${folderId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch folder contents: ${response.status}`);
        }

        const data = await response.json();
        return {
          folders: data.folders || [],
          files: data.files || [],
          folder_name: data.folder_name || 'Unknown Folder',
          parent_folder_id: data.parent_folder_id,
          folder_id: data.folder_id,
          subfolder_count: data.subfolder_count || 0,
          file_count: data.file_count || 0
        };
      }
    } catch (error) {
      showNotification(`Failed to load folder: ${error.message}`, 'error');
      return { 
        folders: [], 
        files: [], 
        folder_name: 'Error', 
        parent_folder_id: null,
        folder_id: folderId 
      };
    } finally {
      setLoading(false);
    }
  }, [session, setNotification]);

  
const deleteFolder = useCallback(async (folderIds) => {
  try {
    setLoading(true);
    const token = await getAuthToken();

    const folderIdList = Array.isArray(folderIds) ? folderIds : [folderIds];

    const url = folderIdList.length === 1
      ? 'http://127.0.0.1:5000/folder/delete'
      : 'http://127.0.0.1:5000/folder/delete_multiple_folders';

    const requestBody = folderIdList.length === 1
      ? { folder_id: folderIdList[0] }
      : { folder_ids: folderIdList };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      let errorMsg = 'Delete failed';
      try {
        const data = await res.json();
        console.error('❌ Folder delete error:', data);
        errorMsg = data.detail || JSON.stringify(data);
      } catch (jsonErr) {
        console.warn('⚠️ Failed to parse error response');
      }
      throw new Error(errorMsg);
    }

    // ✅ Remove from local folder cache
    setAvailableFolders(prev =>
      prev.filter(folder => !folderIdList.includes(folder.folder_id))
    );

    // ✅ Also remove from the main files grid
    setFiles(prev =>
      prev.filter(item => !folderIdList.includes(item.id))
    );

    // ✅ Clear selection if any deleted folder was selected
    setSelectedFile(prev =>
      prev && folderIdList.includes(prev.id) ? null : prev
    );
    setMultipleFiles(prev =>
      prev.filter(item => !folderIdList.includes(item.id))
    );

    showNotification('Folder(s) deleted successfully', 'success');
    return true;

  } catch (error) {
    showNotification(`Failed to delete folder(s): ${error.message}`, 'error');
    throw error;

  } finally {
    setLoading(false);
  }
}, [getAuthToken, setAvailableFolders, showNotification, setLoading]);



  const renameFolder = useCallback(async (folderId, newName) => {
    try {
      setLoading(true);
      const token = await getAuthToken();

      const response = await fetch(`http://127.0.0.1:5000/folder/rename`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folder_id: folderId,
          new_folder_name: newName
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to rename folder');
      }

      setAvailableFolders(prev =>
        prev.map(folder =>
          folder.folder_id === folderId
            ? { ...folder, folder_name: newName, updated_at: new Date().toISOString() }
            : folder
        )
      );

      showNotification(` Folder renamed to "${newName}"`, 'success');
      return true;
    } catch (error) {
      showNotification(`Failed to rename folder: ${error.message}`, 'error');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [session, setNotification]);

  const refreshFolders = useCallback(async (loadAll = false) => {
    if (loadAll) {
      return await loadAllFolders();
    } else {
      return await loadRootFolders();
    }
  }, [loadAllFolders, loadRootFolders]);

  const getFolderById = useCallback((folderId) => {
    return availableFolders.find(folder => folder.folder_id === folderId);
  }, [availableFolders]);

  



// function buildFolderStructure(files) {
//   // 1. Filter out system files
//   const visible = files.filter(f => {
//     const n = f.name;
//     return !n.startsWith('.') && n !== 'Thumbs.db';
//   });

//   // 2. Build a simple object-tree
//   const root = { __files: [], __folders: {} };

//   visible.forEach(f => {
//     // Normalize Windows backslashes & split
//     const rel = (f.webkitRelativePath || f.name).replace(/\\/g, '/');
//     const parts = rel.split('/');
//     const filename = parts.pop();  // the leaf

//     // Traverse/​create each folder along the way
//     let node = root;
//     parts.forEach(folderName => {
//       if (!node.__folders[folderName]) {
//         node.__folders[folderName] = { __files: [], __folders: {} };
//       }
//       node = node.__folders[folderName];
//     });

//     // Dedupe pushes
//     if (!node.__files.includes(filename)) {
//       node.__files.push(filename);
//     }
//   });

//   // 3. Recursively convert to the array form
//   function toArray(node) {
//     return Object.entries(node.__folders)
//       .map(([folder_name, child]) => {
//         // Sort files
//         child.__files.sort();

//         // Recurse into subfolders
//         const childFolders = toArray(child);
//         childFolders.sort((a, b) => a.folder_name.localeCompare(b.folder_name));

//         return {
//           folder_name,
//           files: child.__files,
//           folders: childFolders
//         };
//       })
//       .sort((a, b) => a.folder_name.localeCompare(b.folder_name));
//   }

//   // 4. Return just your top-level entries
//   return toArray(root);
// }
function buildFolderStructure(files, skipRoot = false, parentFolderId = null) {
  const visible = files.filter(f => {
    const n = f.name;
    return !n.startsWith('.') && n !== 'Thumbs.db';
  });

  const root = { __files: [], __folders: {} };

  visible.forEach(f => {
    const rel = (f.webkitRelativePath || f.name).replace(/\\/g, '/');
    const parts = rel.split('/');
    const filename = parts.pop();

    let node = root;
    parts.forEach(folderName => {
      if (!node.__folders[folderName]) {
        node.__folders[folderName] = { __files: [], __folders: {} };
      }
      node = node.__folders[folderName];
    });

    if (!node.__files.includes(filename)) {
      node.__files.push(filename);
    }
  });

  function toArray(node, parentId = parentFolderId, isRoot = false) {
    return Object.entries(node.__folders).map(([folder_name, child]) => ({
      folder_name,
      parent_folder_id: parentId,
      root: isRoot,
      files: child.__files.sort(),
      folders: toArray(child, null, false)  // 👈 nested here
    }));
  }

  const arr = toArray(root, parentFolderId, true);

  return skipRoot && arr.length === 1 ? arr[0].folders : arr;
}



// function buildFolderStructure(files, skipRoot = false) {
//   const visible = files.filter(f => {
//     const n = f.name;
//     return !n.startsWith('.') && n !== 'Thumbs.db';
//   });

//   const root = { __files: [], __folders: {} };

//   visible.forEach(f => {
//     const rel = (f.webkitRelativePath || f.name).replace(/\\/g, '/');
//     const parts = rel.split('/');
//     // const filename = parts.pop();
//     const filename = parts.pop(); // use full path!

//     let node = root;
//     parts.slice(0, -1).forEach(folderName => {
//       if (!node.__folders[folderName]) {
//         node.__folders[folderName] = { __files: [], __folders: {} };
//       }
//       node = node.__folders[folderName];
//     });
//     if (!node.__files.includes(filename)) {
//       node.__files.push(filename);
//     }
//   });

//   function toArray(node) {
//     return Object.entries(node.__folders)
//       .map(([folder_name, child]) => ({
//         folder_name,
//         files: child.__files.sort(),
//         folders: toArray(child)
//       }))
//       .sort((a, b) => a.folder_name.localeCompare(b.folder_name));
//   }

//   const arr = toArray(root);
//   if (skipRoot && arr.length === 1) {
//     return arr[0].folders;
//   }
//   return arr;
// }


// function buildFolderStructure(files, skipRoot = false) {
//   // ...[same as yours above]...
//   const visible = files.filter(f => {
//     const n = f.name;
//     return !n.startsWith('.') && n !== 'Thumbs.db';
//   });

//   const root = { __files: [], __folders: {} };

//   visible.forEach(f => {
//     const rel = (f.webkitRelativePath || f.name).replace(/\\/g, '/');
//     const parts = rel.split('/');
//     const filename = parts.pop();

//     let node = root;
//     parts.forEach(folderName => {
//       if (!node.__folders[folderName]) {
//         node.__folders[folderName] = { __files: [], __folders: {} };
//       }
//       node = node.__folders[folderName];
//     });
//     if (!node.__files.includes(filename)) {
//       node.__files.push(filename);
//     }
//   });

//   function toArray(node) {
//     return Object.entries(node.__folders)
//       .map(([folder_name, child]) => ({
//         folder_name,
//         files: child.__files.sort(),
//         folders: toArray(child)
//       }))
//       .sort((a, b) => a.folder_name.localeCompare(b.folder_name));
//   }

//   const arr = toArray(root);

//   // <--- THIS IS THE KEY: Only return the children for replace
//   if (skipRoot && arr.length === 1) {
//     // Only return the subfolders of the root node (so backend doesn't see a wrapper)
//     return arr[0].folders;
//   }
//   return arr;
// }


// function buildFolderStructure(files, skipRoot = false) {
//   // 1. Filter out system files
//   const visible = files.filter(f => {
//     const n = f.name;
//     return !n.startsWith('.') && n !== 'Thumbs.db';
//   });

//   // 2. Build a simple object-tree
//   const root = { __files: [], __folders: {} };

//   visible.forEach(f => {
//     // Normalize Windows backslashes & split
//     const rel = (f.webkitRelativePath || f.name).replace(/\\/g, '/');
//     const parts = rel.split('/');
//     const filename = parts.pop();  // the leaf

//     // Traverse/​create each folder along the way
//     let node = root;
//     parts.forEach(folderName => {
//       if (!node.__folders[folderName]) {
//         node.__folders[folderName] = { __files: [], __folders: {} };
//       }
//       node = node.__folders[folderName];
//     });

//     // Dedupe pushes
//     if (!node.__files.includes(filename)) {
//       node.__files.push(filename);
//     }
//   });

//   // 3. Recursively convert to the array form
//   function toArray(node) {
//     return Object.entries(node.__folders)
//       .map(([folder_name, child]) => {
//         // Sort files
//         child.__files.sort();

//         // Recurse into subfolders
//         const childFolders = toArray(child);
//         childFolders.sort((a, b) => a.folder_name.localeCompare(b.folder_name));

//         return {
//           folder_name,
//           files: child.__files,
//           folders: childFolders
//         };
//       })
//       .sort((a, b) => a.folder_name.localeCompare(b.folder_name));
//   }

//   const arr = toArray(root);

//   // 4. For "replace", return just children (files/folders), not the root node
//   if (skipRoot && arr.length === 1) {
//     // Return *just* the files/folders inside, not the top-level wrapper
//      return arr[0].folders.length > 0 || arr[0].files.length > 0
//       ? [ { ...arr[0], folder_name: undefined } ]  // Remove folder_name for root node
//       : [];
//   }
//   return arr;
// }




// const uploadFolder = async (
//   files,
//   currentFolderId,
//   setFiles,
//   setUploadProgress,
//   setNotification,
//   action = 'upload',
//   targetFolderId = null,
//   newFolderName = null
// ) => {
//   if (!files || files.length === 0) return;

//   try {
//     const topLevelFolderName = files[0]?.webkitRelativePath?.split('/')[0] || 'New Folder';

//     setNotification({
//       open: true,
//       message: `Uploading folder "${topLevelFolderName}" with ${files.length} files...`,
//       severity: 'info'
//     });

//     const folderStructure = buildFolderStructure(files);
//     console.log('📁 Folder structure to upload:', folderStructure);

//     const formData = new FormData();
//     formData.append('structures', JSON.stringify(folderStructure));
    
//     if (currentFolderId != null) {
//       formData.append('parent_folder_id', String(currentFolderId));
//     }
    
//     // ✅ IMPROVED: Append files with their full relative paths preserved
//     files.forEach(file => {
//       formData.append('files', file);
//       console.log(`📄 Added file to FormData: ${file.name} (${file.webkitRelativePath})`);
//     });

//     if (action === 'replace' && targetFolderId) {
//       formData.append('replace_folder_id', String(targetFolderId));
//     }
//     if (action === 'upload-rename' && newFolderName) {
//       formData.append('new_folder_name', newFolderName);
//     }

//     const { data: { session } } = await supabase.auth.getSession();
//     const token = session?.access_token;
//     const uploadEndpoint = 'http://127.0.0.1:5000/folder/upload';

//     const xhr = new XMLHttpRequest();

//     xhr.upload.addEventListener('progress', (evt) => {
//       if (evt.lengthComputable) {
//         const percent = Math.round((evt.loaded / evt.total) * 100);
//         setUploadProgress(percent);
        
//         // Update notification with progress
//         setNotification({
//           open: true,
//           message: `Uploading "${topLevelFolderName}": ${percent}%`,
//           severity: 'info'
//         });
//       }
//     });

//     xhr.onload = () => {
//       console.log('📁 Folder upload response status:', xhr.status);
//       console.log('📁 Folder upload response:', xhr.responseText);

//       if (xhr.status >= 200 && xhr.status < 300) {
//         setNotification({
//           open: true,
//           message: `Folder "${topLevelFolderName}" uploaded successfully!`,
//           severity: 'success'
//         });
//       } else {
//         setNotification({
//           open: true,
//           message: `Upload failed: ${xhr.status} ${xhr.statusText}`,
//           severity: 'error'
//         });
//       }
//     };

//     xhr.onerror = () => {
//       setNotification({
//         open: true,
//         message: 'Network error during folder upload',
//         severity: 'error'
//       });
//     };

//     xhr.open('POST', uploadEndpoint);
//     xhr.setRequestHeader('Authorization', `Bearer ${token}`);
//     xhr.send(formData);

//   } catch (error) {
//     console.error('❌ Folder upload error:', error);
//     setNotification({
//       open: true,
//       message: `Folder upload failed: ${error.message}`,
//       severity: 'error'
//     });
//   }
// };


// const uploadFolder = async (
//   files,
//   currentFolderId,
//   setFiles,
//   setUploadProgress,
//   setNotification,
//   action = 'upload',         // 'upload' | 'replace' | 'upload-rename'
//   duplicateFolderId = null,  // for replace & rename
//   newFolderName = null,      // for rename only
//   onComplete                // unused if you don't want fetchFilesInFolder
// ) => {
//   if (action === 'upload' && !files?.length) return;

//   const topLevelName = action === 'upload'
//     ? files[0].webkitRelativePath.split('/')[0]
//     : newFolderName;
//   const tempId = `temp_folder_${Date.now()}`;

//   // 1️⃣ Insert temp placeholder
//   setFiles(prev => [
//     ...prev,
//     { id: tempId, name: topLevelName, type: 'folder', uploading: true, isTemporary: true }
//   ]);
//   setUploadProgress(prev => ({ ...prev, [tempId]: 0 }));
//   setNotification({ open: true, message: `Processing folder…`, severity: 'info' });

//   try {
//     // 2️⃣ Build form data
//     const formData = new FormData();

//     if (action === 'upload' || action === 'replace') {
//       let tree = buildFolderStructure(files);
//       if (action === 'replace') {
//         tree = tree.map(n => ({ ...n, folder_id: duplicateFolderId }));
//       }
//       formData.append('structures', JSON.stringify(tree));
//       files.forEach(f => formData.append('files', f));
//     }

//     if (action === 'upload-rename') {
//       formData.append('structures', JSON.stringify([{
//         folder_id:   duplicateFolderId,
//         folder_name: newFolderName,
//         files:       [],
//         folders:     []
//       }]));
//     }

//     if (currentFolderId != null) {
//       formData.append('parent_folder_id', String(currentFolderId));
//     }

//     // 3️⃣ Pick endpoint
//     const endpoint = action === 'replace'
//       ? 'http://127.0.0.1:5000/folder/replace'
//       : 'http://127.0.0.1:5000/folder/upload';

//     const { data:{session} } = await supabase.auth.getSession();
//     const token = session?.access_token;
//     if (!token) throw new Error('Missing token');

//     // 4️⃣ XHR
//     const xhr = new XMLHttpRequest();
//     xhr.upload.addEventListener('progress', e => {
//       if (!e.lengthComputable) return;
//       const pct = Math.round((e.loaded / e.total)*100);
//       setUploadProgress(prev => ({ ...prev, [tempId]: pct }));
//     });

//     const responseData = await new Promise((resolve, reject) => {
//       xhr.onload  = () => {
//         if (xhr.status >= 200 && xhr.status < 300) {
//           resolve(JSON.parse(xhr.responseText));
//         } else {
//           reject(new Error(`HTTP ${xhr.status}`));
//         }
//       };
//       xhr.onerror = () => reject(new Error('Network error'));
//       xhr.open('POST', endpoint);
//       xhr.setRequestHeader('Authorization', `Bearer ${token}`);
//       xhr.send(formData);
//     });

//     // 5️⃣ Replace temp placeholder with real folder entry
//     const realFolder = {
//       id:           responseData.folder_id,
//       name:         responseData.folder_name,
//       type:         'folder',
//       uploading:    false,
//       isTemporary:  false
//     };
//     setFiles(prev =>
//       prev.map(item => item.id === tempId ? realFolder : item)
//     );

//     // 6️⃣ Clean up progress
//     setUploadProgress(prev => {
//       const next = { ...prev };
//       delete next[tempId];
//       return next;
//     });

//     setNotification({
//       open: true,
//       message: action === 'replace'
//         ? 'Folder replaced successfully'
//         : action === 'upload-rename'
//           ? 'Folder renamed successfully'
//           : 'Folder uploaded successfully',
//       severity: 'success'
//     });

//   } catch (err) {
//     console.error('Folder op error:', err);
//     // Roll back the temp placeholder
//     setFiles(prev => prev.filter(item => item.id !== tempId));
//     setUploadProgress(prev => {
//       const next = { ...prev };
//       delete next[tempId];
//       return next;
//     });
//     setNotification({ open: true, message: err.message, severity: 'error' });
//   }
// };


// In your useFolderOperations hook or wherever you define uploadFolder:
// const uploadFolder = async (
//   filesArray,
//   parentFolderId,
//   setFiles,
//   setUploadProgress,
//   setNotification,
//   action = 'upload',            // 'upload' | 'replace' | 'upload-rename'
//   duplicateFolderId = null,
//   newFolderName = null
// ) => {
//   // 1) for normal uploads, bail if nothing selected
//   if (action === 'upload' && (!filesArray || filesArray.length === 0)) return;

//   // 2) temp ID & display name
//   const tempId = `temp_folder_${Date.now()}`;
//   const displayName =
//     action === 'upload'
//       ? filesArray[0].webkitRelativePath.split('/')[0]
//       : newFolderName;

//   // 3) insert a placeholder: splice in-place for replace, append otherwise
//   setFiles(prev => {
//     if (action === 'replace') {
//       const idx = prev.findIndex(item => item.id === duplicateFolderId);
//       const placeholder = {
//         id:          tempId,
//         name:        prev[idx]?.name || displayName,
//         type:        'folder',
//         uploading:   true,
//         isTemporary: true
//       };
//       if (idx >= 0) {
//         const next = [...prev];
//         next.splice(idx, 1, placeholder);
//         return next;
//       }
//       // fallback: if we didn’t find the old folder, just append
//       return [...prev, placeholder];
//     } else {
//       return [
//         ...prev,
//         {
//           id:          tempId,
//           name:        displayName,
//           type:        'folder',
//           uploading:   true,
//           isTemporary: true
//         }
//       ];
//     }
//   });

//   // 4) init progress + notify
//   setUploadProgress(prev => ({ ...prev, [tempId]: 0 }));
//   setNotification({
//     open: true,
//     message:
//       action === 'replace'
//         ? `Replacing folder "${displayName}"…`
//         : action === 'upload-rename'
//         ? `Renaming folder to "${displayName}"…`
//         : `Uploading folder "${displayName}"…`,
//     severity: 'info'
//   });

//   try {
//     // 5) pick endpoint
//     const endpoint =
//       action === 'replace'
//         ? 'http://127.0.0.1:5000/folder/replace'
//         : 'http://127.0.0.1:5000/folder/upload';

//     // 6) build FormData
//     const formData = new FormData();
   
// if (action === 'replace' || action === 'upload') {
//   // build & send new folder tree
//   const tree = buildFolderStructure(filesArray);
//   formData.append('structures', JSON.stringify(tree));
//   filesArray.forEach(f => formData.append('files', f));
//   if (parentFolderId != null) {
//     formData.append('parent_folder_id', String(parentFolderId));
//   }
//   if (action === 'replace') {
//     formData.append('folder_id', String(duplicateFolderId));
//   }
//     } else if (action === 'upload-rename') {
//       formData.append(
//         'structures',
//         JSON.stringify([
//           {
//             folder_id:   duplicateFolderId,
//             folder_name: newFolderName,
//             files:       [],
//             folders:     []
//           }
//         ])
//       );
//       if (parentFolderId != null) {
//         formData.append('parent_folder_id', String(parentFolderId));
//       }
//     }

//     // 7) authenticate & send via XHR for progress events
//     const {
//       data: { session }
//     } = await supabase.auth.getSession();
//     const token = session?.access_token;
//     if (!token) throw new Error('Missing auth token');

//     const xhr = new XMLHttpRequest();
//     xhr.upload.addEventListener('progress', evt => {
//       if (!evt.lengthComputable) return;
//       const pct = Math.round((evt.loaded / evt.total) * 100);
//       setUploadProgress(prev => ({ ...prev, [tempId]: pct }));
//     });

//     const responseData = await new Promise((resolve, reject) => {
//       xhr.onload = () => {
//         if (xhr.status >= 200 && xhr.status < 300) {
//           resolve(JSON.parse(xhr.responseText));
//         } else {
//           reject(new Error(`HTTP ${xhr.status}`));
//         }
//       };
//       xhr.onerror = () => reject(new Error('Network error'));
//       xhr.open('POST', endpoint);
//       xhr.setRequestHeader('Authorization', `Bearer ${token}`);
//       xhr.send(formData);
//     });

//     // 8) create the real folder object
//     const realFolder = {
//       id:
//         action === 'replace'
//           ? duplicateFolderId
//           : responseData.folder_id,
//       name:
//         action === 'upload-rename'
//           ? newFolderName
//           : responseData.folder_name,
//       type:        'folder',
//       uploading:   false,
//       isTemporary: false
//     };

//     // 9) splice placeholder → real at the exact same index
//     setFiles(prev => {
//       const idx = prev.findIndex(item => item.id === tempId);
//       if (idx >= 0) {
//         const next = [...prev];
//         next.splice(idx, 1, realFolder);
//         return next;
//       }
//       // fallback: append if for some reason we can’t find the temp
//       return [...prev, realFolder];
//     });

//     // 10) cleanup & success notify
//     setUploadProgress(prev => {
//       const next = { ...prev };
//       delete next[tempId];
//       return next;
//     });
//     setNotification({
//       open:    true,
//       message:
//         action === 'replace'
//           ? 'Folder replaced successfully'
//           : action === 'upload-rename'
//           ? 'Folder renamed successfully'
//           : 'Folder uploaded successfully',
//       severity:'success'
//     });
//   } catch (err) {
//     console.error('uploadFolder error:', err);

//     // 11) rollback on failure
//     setFiles(prev => prev.filter(item => item.id !== tempId));
//     setUploadProgress(prev => {
//       const next = { ...prev };
//       delete next[tempId];
//       return next;
//     });
//     setNotification({
//       open:    true,
//       message: err.message,
//       severity:'error'
//     });
//   }
// };




// useFolderOperation.jsx



 const uploadFolder = async (
  filesArray,
  parentFolderId,
  setFiles,
  setUploadProgress,
  setNotification,
  action = 'upload',            // 'upload' | 'replace' | 'upload-rename'
  duplicateFolderId = null,
  newFolderName = null,
  useId = null
) => {
  // 1) nothing to do?
  if (action === 'upload' && (!filesArray || filesArray.length === 0)) return;

  // 2) notify start
  setNotification({
    open:    true,
    message: action === 'replace'
      ? 'Replacing folder…'
      : action === 'upload-rename'
      ? `Renaming folder to “${newFolderName}”…`
      : 'Uploading folder…',
    severity:'info'
  });

  try {
    // 3) build FormData
    const fd = new FormData();
    let endpoint;

    if (action === 'upload') {
      // normal upload
      endpoint = 'http://127.0.0.1:5000/folder/upload';

      const unique = Array.from(
        new Map(filesArray.map(f => [f.webkitRelativePath || f.name, f]))
          .values()
      );
      const structureArr = buildFolderStructure(unique, false, parentFolderId);
      console.log('Final structure:', JSON.stringify(structureArr, null, 2));
        if (!structureArr.length) {
          throw new Error("No folder structure detected.");
        }

  // ✅ Only send the single root folder object
    fd.append('structures', JSON.stringify(structureArr));
      if (parentFolderId != null) {
        fd.append('parent_folder_id', String(parentFolderId));
      }
      unique.forEach(f => fd.append('files', f));

    } else if (action === 'replace') {

      
      // replace existing folder
      endpoint = 'http://127.0.0.1:5000/folder/replace';

      fd.append('folder_id', String(duplicateFolderId));
      fd.append(
        'folders',
        JSON.stringify(buildFolderStructure(filesArray, true))
      );
       fd.append(
          'files_metadata',
          JSON.stringify(filesArray.map(f => ({
            name: f.webkitRelativePath || f.name,
            parent_folder_id: parentFolderId ?? duplicateFolderId
          })))
        );
      filesArray.forEach(f => fd.append('files_upload', f));

 } else if (action === 'upload-rename') {
  // Duplicate/copy folder: upload all files, but change root folder name
  endpoint = 'http://127.0.0.1:5000/folder/upload';

  const unique = Array.from(
    new Map(filesArray.map(f => [f.webkitRelativePath || f.name, f])).values()
  );
  const structureArr = buildFolderStructure(unique, false, parentFolderId);

  // Change the root folder's name to newFolderName
  if (structureArr.length) {
    structureArr[0].folder_name = newFolderName;
  }

  fd.append('structures', JSON.stringify(structureArr));
  if (parentFolderId != null) {
    fd.append('parent_folder_id', String(parentFolderId));
  }
  unique.forEach(f => fd.append('files', f));  // 👈 this is the important part!
}

    // 4) auth + XHR
    const { data:{ session }} = await supabase.auth.getSession();
    const token = session?.access_token;
    const userId = session?.user.id;
    if (!token) throw new Error('Not logged in');

    await new Promise((res, rej) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', endpoint);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = e => {
        if (!e.lengthComputable) return;
        setUploadProgress(p => ({
          ...p,
          progress: Math.round((e.loaded / e.total) * 100)
        }));
      };
      xhr.onload  = () =>
        xhr.status >= 200 && xhr.status < 300
          ? res(xhr.responseText)
          : rej(new Error(`HTTP ${xhr.status}`));
      xhr.onerror = () => rej(new Error('Network error'));
      xhr.send(fd);
    });

    // 5) on success, reload the folder’s contents
    const { folders, files } = await loadFolderContents(parentFolderId);
    setFiles([
      ...folders.map(f => ({
        id:   f.folder_id,
        name: f.folder_name,
        type: 'folder'
      })),
      ...files.map(f => ({
        id:   f.file_id,
        name: f.filename,
        type: guessType(f.filename)
      }))
    ]);
    
   if (action === 'replace') {
      pushUndoAction("replace_folder", {
        parent_folder_id: parentFolderId,
        old_folder: { folder_id: duplicateFolderId },
        new_folder: { folder_id: "temp-id" }, // replace with actual new folder_id if available
        user_id: userId
      });
    }

    // 6) done
    setUploadProgress({});
    setNotification({
      open:    true,
      message:
        action === 'replace'
          ? 'Folder replaced successfully!'
          : action === 'upload-rename'
          ? 'Folder renamed successfully!'
          : 'Folder uploaded successfully!',
      severity: 'success'
    });

  } catch (err) {
    console.error('uploadFolder error:', err);
    setUploadProgress({});
    setNotification({
      open:    true,
      message: err.message,
      severity:'error'
    });
  }
};




const downloadFolder = async (folderIds, token , setDownloadProgress, downloadId) => {
  const folderIdList = Array.isArray(folderIds) ? folderIds : [folderIds];

  // Choose the correct route
  const url = folderIdList.length === 1
    ? 'http://127.0.0.1:5000/folder/download'
    : 'http://127.0.0.1:5000/folder/download_multiple';

  const requestBody = folderIdList.length === 1
    ? { folder_id: folderIdList[0] }
    : { folder_ids: folderIdList };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) throw new Error('Folder download failed');

    const contentLength = res.headers.get('Content-Length');
    const total = contentLength ? parseInt(contentLength, 10) : null;

    setDownloadProgress(prev => ({ ...prev, [downloadId]: 0 }));

    const reader = res.body.getReader();
    const chunks = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;

      if (total) {
        const percent = Math.round((received / total) * 100);
        setDownloadProgress(prev => ({ ...prev, [downloadId]: percent }));
      }
    }

    setDownloadProgress(prev => ({ ...prev, [downloadId]: 100 }));

    const blob = new Blob(chunks);

    // ✅ Clean up after 2 seconds
    setTimeout(() => {
      setDownloadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[downloadId];
        return newProgress;
      });
    }, 2000);

    return { success: true, blob };

  } catch (err) {
    console.error('Folder download error:', err);
    return { success: false, message: err.message };
  }
};

//MoveFolder
// const moveFolder = async (folderIds, targetParentId, token) => {
//   // Convert to array if a single folder ID is passed
//   const folderIdList = Array.isArray(folderIds) ? folderIds : [folderIds];

//    const endpoint = folderIdList.length === 1
//     ? 'http://127.0.0.1:5000/folder/move'
//     : 'http://127.0.0.1:5000/folder/move_multiple_folders';

//      const payload = folderIdList.length === 1
//     ? {
//         folder_id: folderIdList[0],
//         target_folder_id: targetParentId === 'root' ? null : targetParentId
//       }
//     : {
//         folder_ids: folderIdList,
//         target_folder_id: targetParentId === 'root' ? null : targetParentId
//       };

//   try {
//   const res = await fetch(endpoint, {
//       method: 'POST',
//       headers: {
//         'Authorization': `Bearer ${token}`,
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify(payload),
//     });
//     if (!res.ok) {
//       const errorData = await res.json().catch(() => ({}));
//       throw new Error(errorData.detail || 'Move operation failed.');
//     }

//     const result = await res.json();
//     return { success: true, data: result };

//   } catch (err) {
//     console.error('❌ Move operation error:', err);
//     return { success: false, error: err.message };
//   }
// };

const moveFolder = async (folderIds, targetParentId, token) => {
  // Convert to array if a single folder ID is passed
  const folderIdList = Array.isArray(folderIds) ? folderIds : [folderIds];
  
  // Ensure all IDs are integers
  const validFolderIds = folderIdList.map(id => parseInt(id)).filter(id => !isNaN(id));
  
  if (validFolderIds.length === 0) {
    return { success: false, error: 'No valid folder IDs provided' };
  }

  const endpoint = validFolderIds.length === 1
    ? 'http://127.0.0.1:5000/folder/move'
    : 'http://127.0.0.1:5000/folder/move_multiple_folders';

  const payload = validFolderIds.length === 1
    ? {
        folder_id: validFolderIds[0],
        target_folder_id: targetParentId === 'root' || targetParentId === null ? null : parseInt(targetParentId)
      }
    : {
        folder_ids: validFolderIds,
        target_folder_id: targetParentId === 'root' || targetParentId === null ? null : parseInt(targetParentId)
      };

  console.log('📤 Folder move payload:', payload);
  console.log('📤 Folder move endpoint:', endpoint);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('❌ Move API error:', errorData);
      throw new Error(errorData.detail || `Move operation failed with status ${res.status}`);
    }

    const result = await res.json();
    console.log('✅ Move API success:', result);
    return { success: true, data: result };

  } catch (err) {
    console.error('❌ Move operation error:', err);
    return { success: false, error: err.message };
  }
};

//RestoreFolder

const restoreFolder = async (folderIds, token) => {
  const folderIdList = Array.isArray(folderIds) ? folderIds : [folderIds];

  const url = folderIdList.length === 1
    ? 'http://127.0.0.1:5000/folder/restore'
    : 'http://127.0.0.1:5000/folder/restore_multiple';

  const requestBody = folderIdList.length === 1
    ? { folder_id: folderIdList[0] }
    : { folder_ids: folderIdList };

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) throw new Error('Restore failed');
  return res.json();
};

//permanentlyDelete

const permanent_DeleteFolder = async (folderIds, token) => {
  const folderIdList = Array.isArray(folderIds) ? folderIds : [folderIds];

  const url = folderIdList.length === 1
    ? 'http://127.0.0.1:5000/folder/perm_delete'
    : 'http://127.0.0.1:5000/folder/perm_delete_multiple';

  const requestBody = folderIdList.length === 1
    ? { folder_id: folderIdList[0] }
    : { folder_ids: folderIdList };

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) throw new Error('Permanent delete failed');
  return res.json();
};

//ShareFolder
const shareFolder = async (folderId) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('Missing Supabase access token');

    const res = await fetch('http://127.0.0.1:5000/folder/share', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ folder_id: folderId }),  // must match your ShareLinkFolderRequest
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('❌ /folder/share validation error:', err);
      throw new Error(err.detail?.map(d => d.msg).join(', ') || `Status ${res.status}`);
    }

    const data = await res.json();
    console.log('📂 shareFolder response payload:', data);

    // pick the correct key:
    const url = data.share_link || data.share_url || data.url;
    if (!url) {
      throw new Error('No share URL in response: ' + JSON.stringify(data));
    }
    return url;

  } catch (err) {
    console.error('Error sharing folder:', err.message);
    throw err;
  }
};


  // Enhanced folder path with breadcrumb support
  const getFolderPath = useCallback((folderId) => {
    if (!folderId) return [];

    const path = [];
    let currentId = folderId;
    let depth = 0;
    const maxDepth = 20; // Prevent infinite loops

    const folderMap = new Map(availableFolders.map(f => [f.folder_id, f]));

    while (currentId && depth < maxDepth) {
      const folder = folderMap.get(currentId);
      if (folder) {
        path.unshift({ 
          id: folder.folder_id, 
          name: folder.folder_name,
          parent_id: folder.parent_folder_id 
        });
        currentId = folder.parent_folder_id;
      } else {
        break;
      }
      depth++;
    }

    return path;
  }, [availableFolders]);

  const buildFolderTree = useCallback((folders = null, parentId = null) => {
    const foldersToUse = folders || availableFolders;

    return foldersToUse
      .filter(folder => folder.parent_folder_id === parentId)
      .sort((a, b) => a.folder_name.localeCompare(b.folder_name))
      .map(folder => ({
        ...folder,
        children: buildFolderTree(foldersToUse, folder.folder_id),
        path: getFolderPath(folder.folder_id)
      }));
  }, [availableFolders, getFolderPath]);

  const checkFolderNameExists = useCallback((folderName, parentFolderId = null) => {
    return availableFolders.some(folder =>
      folder.folder_name.toLowerCase() === folderName.toLowerCase() &&
      folder.parent_folder_id === parentFolderId
    );
  }, [availableFolders]);

  const validateFolderName = useCallback((folderName, parentFolderId = null) => {
    const trimmedName = folderName.trim();

    if (!trimmedName) {
      return { isValid: false, error: 'Please enter a folder name' };
    }

    if (trimmedName.length > 255) {
      return { isValid: false, error: 'Folder name is too long (max 255 characters)' };
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*\x00-\x1f]/g;
    if (invalidChars.test(trimmedName)) {
      return { isValid: false, error: 'Folder name contains invalid characters' };
    }

    // Check for reserved names
    const reservedNames = [
      'CON', 'PRN', 'AUX', 'NUL', 
      'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
      'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    ];
    if (reservedNames.includes(trimmedName.toUpperCase())) {
      return { isValid: false, error: 'This name is reserved by the system' };
    }

    // Check for existing folder with same name
    if (checkFolderNameExists(trimmedName, parentFolderId)) {
      return { isValid: false, error: 'A folder with this name already exists' };
    }

    return { isValid: true, error: null };
  }, [checkFolderNameExists]);

  // Get folder statistics
  const getFolderStats = useCallback(() => {
    const totalFolders = availableFolders.length;
    const rootFolders = availableFolders.filter(f => f.parent_folder_id === null).length;
    const nestedFolders = totalFolders - rootFolders;
    
    return {
      total: totalFolders,
      root: rootFolders,
      nested: nestedFolders,
      hasDefaultFolders: ['Documents', 'Downloads', 'Pictures', 'Videos', 'Music'].every(name =>
        availableFolders.some(folder => folder.folder_name === name && folder.parent_folder_id === null)
      )
    };
  }, [availableFolders]);

  // Auto-initialize on mount if user is authenticated
  useEffect(() => {
    if (session && !hasInitialized && availableFolders.length === 0) {
      loadRootFolders().catch(console.error);
    }
  }, [session, hasInitialized, availableFolders.length, loadRootFolders]);

  return {
    // State
    availableFolders,
    setAvailableFolders,
    loading,
    hasInitialized,

    // Core operations
    createFolder,
    deleteFolder,
    renameFolder,
    uploadFolder,
    permanent_DeleteFolder,
    restoreFolder,
    moveFolder,
    downloadFolder,
    shareFolder,
    createDefaultFolders,

    // Loading operations
    loadAllFolders,
    loadRootFolders,
    loadFolderContents,
    refreshFolders,

    // Utility functions
    getFolderById,
    getFolderPath,
    buildFolderTree,
    checkFolderNameExists,
    validateFolderName,
    getFolderStats,

    // Auth helper
    getAuthToken
  };
};

// Enhanced folder tree view state hook
export const useFolderTree = (folders) => {
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [selectedFolder, setSelectedFolder] = useState(null);

  const toggleFolder = useCallback((folderId) => {
    setExpandedFolders(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(folderId)) {
        newExpanded.delete(folderId);
      } else {
        newExpanded.add(folderId);
      }
      return newExpanded;
    });
  }, []);

  const expandFolder = useCallback((folderId) => {
    setExpandedFolders(prev => new Set([...prev, folderId]));
  }, []);

  const collapseFolder = useCallback((folderId) => {
    setExpandedFolders(prev => {
      const newExpanded = new Set(prev);
      newExpanded.delete(folderId);
      return newExpanded;
    });
  }, []);

  const expandAll = useCallback(() => {
    const allFolderIds = folders.map(folder => folder.folder_id);
    setExpandedFolders(new Set(allFolderIds));
  }, [folders]);

  const collapseAll = useCallback(() => {
    setExpandedFolders(new Set());
  }, []);

  const autoExpandFolders = useCallback((maxLevels = 3) => {
    const buildFolderTree = (folders, parentId = null) => {
      return folders
        .filter(folder => folder.parent_folder_id === parentId)
        .map(folder => ({
          ...folder,
          children: buildFolderTree(folders, folder.folder_id)
        }));
    };

    const folderTree = buildFolderTree(folders);
    const foldersWithChildren = folders
      .filter(folder => folders.some(f => f.parent_folder_id === folder.folder_id))
      .slice(0, maxLevels)
      .map(folder => folder.folder_id);

    setExpandedFolders(new Set(foldersWithChildren));
  }, [folders]);

  const selectFolder = useCallback((folderId) => {
    setSelectedFolder(folderId);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedFolder(null);
  }, []);

  return {
    expandedFolders,
    setExpandedFolders,
    selectedFolder,
    toggleFolder,
    expandFolder,
    collapseFolder,
    expandAll,
    collapseAll,
    autoExpandFolders,
    selectFolder,
    clearSelection
  };
};