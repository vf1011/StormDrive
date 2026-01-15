// FileTransferPanel.jsx - Integrated with your dashboard
import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, File, X, Check, ChevronUp, ChevronDown, Pause, Play } from 'lucide-react';
import { useFileContext } from '../Hooks/FileContext.jsx';
import { useSupabaseAuth } from '..//Hooks/useSupabaseAuth.jsx';
import { supabase } from '../../../supabase.jsx';
import './Styles/FilePanel.css';

const FileTransferPanel = ({forceVisible = false , onClose}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('uploads');
  const [dragActive, setDragActive] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const {
    activeUploads,
    setActiveUploads,
    uploadProgress,
    setUploadProgress,
    downloadProgress,
    setDownloadProgress,
    setNotification,
    currentFolderId,
    setFiles,
    addFile
  } = useFileContext();

  const { session } = useSupabaseAuth();

  // Enhanced transfer queues with more metadata
  const [uploadQueue, setUploadQueue] = useState([]);
  const [downloadQueue, setDownloadQueue] = useState([]);
  const [completedTransfers, setCompletedTransfers] = useState([]);

  // Transfer controls
  const [pausedTransfers, setPausedTransfers] = useState(new Set());
  const lastUploadsRef = useRef([]);
  const [uploadSession, setUploadSession] = useState({
  all: new Set(),   // all file IDs being uploaded
  done: new Set(),  // completed file IDs
});

const allCompleteTimerRef = useRef(null);
const [uploadBatch, setUploadBatch] = useState({
  total: 0,
  done: 0,
  active: false,
});
const prevActiveUploadsRef = useRef(0); 
const batchIdsRef = useRef(new Set());      // IDs in this batch
const completedIdsRef = useRef(new Set());
const [batchIntakeOpen, setBatchIntakeOpen] = useState(false);
const batchIntakeTimerRef = useRef(null);


// useEffect(() => {
//   const hasActiveTransfers =
//     (activeUploads?.size > 0) ||
//     downloadQueue.some(item => item.status !== 'completed');

//   // If user had closed it, any new activity or forceVisible re-opens it
//   if ((forceVisible || hasActiveTransfers) && isDismissed) {
//     setIsDismissed(false);
//   }

//   // Auto-open only; never auto-close
//   if ((forceVisible || hasActiveTransfers) && !isDismissed) {
//   setIsVisible(true);
// }
// }, [forceVisible, activeUploads, downloadQueue, isVisible, isDismissed]);


useEffect(() => {
  const hasActiveTransfers =
    (uploadQueue.length > 0) ||
    downloadQueue.some(item => item.status !== 'completed');

     if ((forceVisible || hasActiveTransfers) && isDismissed) {
    setIsDismissed(false);
  }

  // Only auto-open when not dismissed
  // if (!isVisible && (forceVisible || hasActiveTransfers) && !isDismissed) {
  //   setIsVisible(true);
  // }
}, [forceVisible, uploadQueue.length, downloadQueue, isVisible, isDismissed]);



// const getUploadCounts = () => {
//   const progress = uploadProgress || {};
//   const ids = Object.keys(progress);

//   // total = all files seen in this batch via progress map
//   const total = ids.length;

//   // done = those with percent >= 100
//   const done = ids.reduce((acc, id) => {
//     const pct = progress[id]?.percent ?? 0;
//     return acc + (pct >= 100 ? 1 : 0);
//   }, 0);

//   return { total, done };
// };

useEffect(() => {
  const activeNow = activeUploads?.size || 0;
  const wasActive = prevActiveUploadsRef.current;

  // NEW BATCH: idle -> active
  if (wasActive === 0 && activeNow > 0) {
    const initialIds = new Set(Array.from(activeUploads)); // freeze early starters
    batchIdsRef.current = initialIds;
    completedIdsRef.current = new Set();

    // Start batch with initial total = early starters
    setUploadBatch({
      total: initialIds.size,
      done: 0,
      active: true,
    });

    // Open intake window to catch late starters in the same batch
    if (batchIntakeTimerRef.current) {
      clearTimeout(batchIntakeTimerRef.current);
      batchIntakeTimerRef.current = null;
    }
    setBatchIntakeOpen(true);
    batchIntakeTimerRef.current = setTimeout(() => {
      setBatchIntakeOpen(false); // freeze total after window
      batchIntakeTimerRef.current = null;
    }, 400); // adjust to your UX; 300–600ms works well
  }

  // BATCH ENDS: active -> idle
  if (wasActive > 0 && activeNow === 0) {
    setUploadBatch(prev => ({ ...prev, active: false }));
  }

  prevActiveUploadsRef.current = activeNow;
}, [activeUploads]);



// useEffect(() => {
//   const { total, done } = getUploadCounts();
//   const activeCount = activeUploads?.size || 0;

//   // candidate: looks complete only if totals match AND no active uploads
//   const looksComplete = total > 0 && done === total && activeCount === 0;

//   // clear any pending timer
//   if (allCompleteTimerRef.current) {
//     clearTimeout(allCompleteTimerRef.current);
//     allCompleteTimerRef.current = null;
//   }

//   if (looksComplete) {
//     // small debounce so transient states can't flash "All complete"
//     allCompleteTimerRef.current = setTimeout(() => {
//       const { total: t2, done: d2 } = getUploadCounts();
//       const active2 = activeUploads?.size || 0;
//       setShowAllComplete(t2 > 0 && d2 === t2 && active2 === 0);
//     }, 250);
//   } else {
//     setShowAllComplete(false);
//   }

//   return () => {
//     if (allCompleteTimerRef.current) {
//       clearTimeout(allCompleteTimerRef.current);
//       allCompleteTimerRef.current = null;
//     }
//   };
// }, [uploadProgress, activeUploads]);

useEffect(() => {
  if (!uploadProgress) return;

  // 1) While intake is open, add any new IDs that appear in progress map
  if (batchIntakeOpen && uploadBatch.active) {
    for (const id of Object.keys(uploadProgress)) {
      if (!batchIdsRef.current.has(id)) {
        batchIdsRef.current.add(id); // expand batch *only* during intake
      }
    }
  }

  // 2) Recompute total (from batchIdsRef) and done (>=100%) for this batch
  setUploadBatch(prev => {
    if (prev.total === 0) return prev; // no batch yet

    let done = 0;
    for (const id of batchIdsRef.current) {
      const pct = uploadProgress[id]?.percent || 0;
      if (pct >= 100) done += 1;
    }

    const total = batchIdsRef.current.size;

    if (done !== prev.done || total !== prev.total) {
      return { ...prev, total, done };
    }
    return prev;
  });
}, [uploadProgress, batchIntakeOpen, uploadBatch.active]);





 const completedUploads = completedTransfers.filter(t => t.type === 'upload');
 const uploadsToRender = [
   ...uploadQueue,
   ...completedUploads.filter(c => !uploadQueue.some(u => u.id === c.id))
 ];

  const handleClose = () => {
  setIsDismissed(true);     // remember user choice
  setIsVisible(false);      // hide now
  onClose?.();              // let parent clear its own flag if it has one
};

  // Sync with your existing upload system
  useEffect(() => {
    const all = Array.from(activeUploads).map(fileId => {
    const p = uploadProgress[fileId] || {};
    return {
      id: fileId,
      name: p.name || `File ${fileId}`,
      type: 'upload',
      status: p.percent >= 100 ? 'completed' : 'uploading',
      progress: p.percent || 0,
      speed: p.speed || 0,
      eta: p.eta || 0,
      size: p.total ? formatBytes(p.total) : 'Unknown'
    };
  });

  // split into in-progress and completed
  const inProgress = all.filter(t => t.status === 'uploading');
  const newlyCompleted = all.filter(t => t.status === 'completed');

  setUploadQueue(inProgress); // only in-progress items live here

  // add completed items once
  newlyCompleted.forEach(item => {
    setCompletedTransfers(prev => (
      prev.some(c => c.id === item.id) ? prev : [...prev, item]
    ));
  });
 }, [activeUploads, uploadProgress]);

  // Download functionality that integrates with your existing system
  const startDownload = async (file) => {
    const downloadId = `download_${file.id}_${Date.now()}`;
    
    const downloadItem = {
      id: downloadId,
      fileId: file.id,
      name: file.name,
      type: 'download',
      status: 'downloading',
      progress: 0,
      speed: 0,
      eta: 0,
      size: file.size || 'Unknown'
    };

    setDownloadQueue(prev => [...prev, downloadItem]);
    setIsVisible(true);
    setActiveTab('downloads');

    try {
      const token = session?.access_token;
      if (!token) throw new Error("Authentication required");

      // Use your existing download endpoint
      const downloadUrl = `http://192.168.1.33:5000/files/download/?file_id=${file.id}`;
      
      const response = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Download failed');

      const contentLength = response.headers.get('Content-Length');
      const total = contentLength ? parseInt(contentLength, 10) : null;

      const reader = response.body.getReader();
      const chunks = [];
      let received = 0;
      let startTime = Date.now();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        received += value.length;

        if (total) {
          const progress = Math.round((received / total) * 100);
          const elapsed = (Date.now() - startTime) / 1000;
          const speed = received / elapsed; // bytes per second
          const remaining = total - received;
          const eta = speed > 0 ? Math.round(remaining / speed) : 0;

          setDownloadQueue(prev => 
            prev.map(item => 
              item.id === downloadId 
                ? { 
                    ...item, 
                    progress, 
                    speed: Math.round(speed / 1024), // KB/s
                    eta 
                  }
                : item
            )
          );
        }
      }

      // Complete download
      const blob = new Blob(chunks);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Mark as completed
      setDownloadQueue(prev => 
        prev.map(item => 
          item.id === downloadId 
            ? { ...item, status: 'completed', progress: 100 }
            : item
        )
      );

      // Move to completed transfers after delay
      setTimeout(() => {
        setDownloadQueue(prev => prev.filter(item => item.id !== downloadId));
        setCompletedTransfers(prev => [...prev, { ...downloadItem, status: 'completed' }]);
      }, 3000);

      setNotification({
        open: true,
        message: `"${file.name}" downloaded successfully`,
        severity: 'success'
      });

    } catch (error) {
      setDownloadQueue(prev => 
        prev.map(item => 
          item.id === downloadId 
            ? { ...item, status: 'error', error: error.message }
            : item
        )
      );

      setNotification({
        open: true,
        message: `Download failed: ${error.message}`,
        severity: 'error'
      });
    }
  };

  // Utility functions
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return '';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const getFileIcon = (name) => {
    const extension = name.split('.').pop()?.toLowerCase() || '';
    const iconMap = {
      pdf: '📄', jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️',
      mp4: '🎥', mov: '🎥', avi: '🎥', mp3: '🎵', wav: '🎵',
      zip: '📦', rar: '📦', doc: '📝', docx: '📝', txt: '📝',
      xlsx: '📊', csv: '📊', ppt: '📽️', pptx: '📽️'
    };
    return iconMap[extension] || '📁';
  };

const removeFromQueue = (transferId, queueType) => {
  if (queueType === 'upload') {
    setUploadQueue(prev => prev.filter(item => item.id !== transferId));
    setCompletedTransfers(prev =>
      prev.filter(item => !(item.type === 'upload' && item.id === transferId))
    );
  } else {
    setDownloadQueue(prev => prev.filter(item => item.id !== transferId));
    setCompletedTransfers(prev =>
      prev.filter(item => !(item.type === 'download' && item.id === transferId))
    );
  }
};

  const pauseTransfer = (transferId) => {
    setPausedTransfers(prev => new Set([...prev, transferId]));
    // Add actual pause logic here
  };

  const resumeTransfer = (transferId) => {
    setPausedTransfers(prev => {
      const newSet = new Set(prev);
      newSet.delete(transferId);
      return newSet;
    });
    // Add actual resume logic here
  };

  const getActiveTransferCount = () => {
    const activeUploads = uploadQueue.filter(item => 
      item.status === 'uploading' && !pausedTransfers.has(item.id)
    ).length;
    
    const activeDownloads = downloadQueue.filter(item => 
      item.status === 'downloading' && !pausedTransfers.has(item.id)
    ).length;
    
    return activeUploads + activeDownloads;
  };

const getStatusText = () => {
  const { total, done, active } = uploadBatch;

  if (total > 0) {
    // Exactly as you requested
    if (active || done < total) {
      return `${done} out of ${total} uploaded`;
    }
    return 'All uploads complete';
  }

  // Fallback (downloads / idle)
  const transfersActive = getActiveTransferCount();
  const pausedCount = pausedTransfers.size;
  if (transfersActive === 0 && pausedCount === 0) return 'All transfers complete';

  let text = '';
  if (transfersActive > 0) text += `${transfersActive} transferring`;
  if (pausedCount > 0) text += (text ? ', ' : '') + `${pausedCount} paused`;
  return text;
};



  // Global drag and drop integration
  useEffect(() => {
    const handleWindowDrag = (e) => {
      e.preventDefault();
      setDragActive(true);
    };

    const handleWindowDragLeave = (e) => {
      if (!e.relatedTarget) {
        setDragActive(false);
      }
    };

    const handleWindowDrop = (e) => {
      e.preventDefault();
      setDragActive(false);
      
      if (e.dataTransfer.files?.length > 0) {
        // setIsVisible(true);
        setActiveTab('uploads');
        // Your existing file upload logic will handle the files
      }
    };

    window.addEventListener('dragenter', handleWindowDrag);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('drop', handleWindowDrop);

    return () => {
      window.removeEventListener('dragenter', handleWindowDrag);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, []);

//   useEffect(() => {
//   if (!forceVisible) {
//     setCompletedTransfers([]);
//   }
// }, [forceVisible]);

const shouldShowPanel = isVisible && !isDismissed;

  // Don't render if no transfers are happening
  if (!shouldShowPanel) {
    return (
      <>
        {/* Global drag overlay
        {dragActive && (
          <div className="fixed inset-0 bg-blue-500 bg-opacity-10 border-4 border-dashed border-blue-500 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 shadow-2xl text-center">
              <Upload className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Drop files to upload</h3>
              <p className="text-gray-600">Release to start uploading to {currentFolderId ? 'current folder' : 'root'}</p>
            </div>
          </div>
        )} */}
      </>
    );
  }

  return (
    <>
      {/* OneDrive-style transfer panel */}
      <div className="file-transfer-panel">
        <div className="transfer-panel-container">
          {/* Header */}
          <div className="transfer-panel-header">
            <div className="transfer-status">
              <div className="status-indicator">
                {getActiveTransferCount() > 0 && (
                  <div className="pulse-dot"></div>
                )}
                <span className="status-text">{getStatusText()}</span>
              </div>
            </div>
            
            <div className="header-controls">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="expand-btn"
                aria-label={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </button>
              
              <button
                onClick={handleClose}
                className="close-btn"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Expanded content */}
          {isExpanded && (
            <div className="transfer-panel-content">
              {/* Tabs */}
              <div className="transfer-tabs">
                <button
                  onClick={() => setActiveTab('uploads')}
                  className={`tab-button ${activeTab === 'uploads' ? 'active' : ''}`}
                >
                  <Upload size={16} />
                  Uploads (
                     {uploadQueue.length + completedTransfers.filter(t => t.type === 'upload').length}
                     )
                </button>
                
                <button
                  onClick={() => setActiveTab('downloads')}
                  className={`tab-button ${activeTab === 'downloads' ? 'active' : ''}`}
                >
                  <Download size={16} />
                  Downloads ({downloadQueue.length})
                </button>
              </div>

              {/* Transfer list */}
           <div className="transfer-list">
            {activeTab === 'uploads' ? (
              uploadsToRender.length > 0 ? (
                uploadsToRender.map(transfer => (
                  <div key={transfer.id} className="transfer-item">
                    <div className="transfer-info">
                      <div className="file-panel-icon">
                        {getFileIcon(transfer.name)}
                      </div>
                      <div className="transfer-details">
                        <div className="transfer-header">
                          <span className="panel-file-name" title={transfer.name}>
                            {transfer.name}
                          </span>
                          <div className="transfer-actions">
                            {transfer.status === 'uploading' && (
                              <button
                                onClick={() =>
                                  pausedTransfers.has(transfer.id)
                                    ? resumeTransfer(transfer.id)
                                    : pauseTransfer(transfer.id)
                                }
                                className="action-btn"
                              >
                                {pausedTransfers.has(transfer.id) ? (
                                  <Play size={14} />
                                ) : (
                                  <Pause size={14} />
                                )}
                              </button>
                            )}
                            {transfer.status === 'completed' && (
                              <Check size={14} className="success-icon" />
                            )}
                            <button
                              onClick={() => removeFromQueue(transfer.id, 'upload')}
                              className="filepanel-action-btn"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                        {transfer.status === 'uploading' && (
                          <>
                            <div className="progress-bar">
                              <div
                                className="progress-fill upload"
                                style={{ width: `${transfer.progress}%` }}
                              />
                            </div>
                            <div className="transfer-meta">
                              <span>{transfer.progress}%</span>
                              {transfer.speed > 0 && (
                                <span>{transfer.speed} KB/s</span>
                              )}
                              {transfer.eta > 0 && (
                                <span>ETA: {formatTime(transfer.eta)}</span>
                              )}
                            </div>
                          </>
                        )}
                        {transfer.status === 'completed' && (
                          <div className="completion-message">
                            Upload completed successfully
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <Upload size={32} />
                  <p>No uploads in progress</p>
                </div>
              )
            ) : (
              <>
             {downloadQueue.length > 0 ? (
                  downloadQueue.map(transfer => (
                      <div key={transfer.id} className="transfer-item">
                        <div className="transfer-info">
                          <div className="file-panel-icon">
                            {getFileIcon(transfer.name)}
                          </div>
                          
                          <div className="transfer-details">
                            <div className="transfer-header">
                              <span className="panel-file-name" title={transfer.name}>
                                {transfer.name}
                              </span>
                              
                              <div className="transfer-actions">
                                {transfer.status === 'downloading' && (
                                  <button
                                    onClick={() => 
                                      pausedTransfers.has(transfer.id) 
                                        ? resumeTransfer(transfer.id)
                                        : pauseTransfer(transfer.id)
                                    }
                                    className="action-btn"
                                  >
                                    {pausedTransfers.has(transfer.id) ? (
                                      <Play size={14} />
                                    ) : (
                                      <Pause size={14} />
                                    )}
                                  </button>
                                )}
                                
                                {transfer.status === 'completed' && (
                                  <Check size={14} className="success-icon" />
                                )}
                                
                                {transfer.status === 'error' && (
                                  <X size={14} className="error-icon" />
                                )}
                                
                                <button
                                  onClick={() => removeFromQueue(transfer.id, 'download')}
                                  className="action-btn"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                            
                            {transfer.status === 'downloading' && (
                              <>
                                <div className="progress-bar">
                                  <div 
                                    className="progress-fill download"
                                    style={{ width: `${transfer.progress}%` }}
                                  />
                                </div>
                                
                                <div className="transfer-meta">
                                  <span>{transfer.progress}%</span>
                                  {transfer.speed > 0 && (
                                    <span>{transfer.speed} KB/s</span>
                                  )}
                                  {transfer.eta > 0 && (
                                    <span>ETA: {formatTime(transfer.eta)}</span>
                                  )}
                                </div>
                              </>
                            )}
                            
                            {transfer.status === 'completed' && (
                              <div className="completion-message">
                                Download completed successfully
                              </div>
                            )}
                            
                            {transfer.status === 'error' && (
                              <div className="error-message">
                                {transfer.error || 'Download failed'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      <Download size={32} />
                      <p>No downloads in progress</p>
                    </div>
                  )}
                    
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global drag overlay */}
   
    </>
  );
};

// Enhanced hook for easy integration
export const useFileTransfer = () => {
  const [transferPanel, setTransferPanel] = useState(null);
  
  const showTransferPanel = () => {
    setTransferPanel(<FileTransferPanel />);
  };
  
  const hideTransferPanel = () => {
    setTransferPanel(null);
  };
  
  const triggerDownload = (file) => {
    // This will be called from your FileToolbar or other components
    showTransferPanel();
    // The actual download will be handled by the panel
  };
  
  return {
    transferPanel,
    showTransferPanel,
    hideTransferPanel,
    triggerDownload
  };
};

export default FileTransferPanel;