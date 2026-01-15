import { useState, useEffect } from 'react';
import { X, Download, Loader, FileText, Play, AlertCircle , ArrowLeft, ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize, 
  Minimize,
RotateCcw , Trash2, } from 'lucide-react';
import { supabase } from '../../../supabase';
import ModalPortal from './Modalportal';
import './Styles/FilePreview.css';

const FilePreview = ({ fileId, versionId, fileName, onClose, isOpen ,onDelete=null, onRestore=null, isInTrash=false,  initialFullscreen = false}) => {
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [supported, setSupported] = useState(true); // default true
  const [showVideo, setShowVideo] = useState(false); 
   const [isFullscreen, setIsFullscreen] = useState(initialFullscreen);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [videoBlobUrl, setVideoBlobUrl] = useState(null);
  

  const handleFullscreenClick = () => {
  const fileIdParam = encodeURIComponent(fileId);
  const fileNameParam = encodeURIComponent(fileName);
  const fullscreenUrl = `${window.location.origin}/file-preview?fileId=${fileIdParam}&fileName=${fileNameParam}&fullscreen=true`;

  window.open(fullscreenUrl, '_blank');
};

  useEffect(() => {
  const fetchVideoBlob = async () => {
    if (showVideo) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error("Not logged in");
        const streamUrl = versionId != null
          ? `http://127.0.0.1:5000/files/stream/${fileId}?version_id=${versionId}`
          : `http://127.0.0.1:5000/files/stream/${fileId}`;
        const response = await fetch(streamUrl, { headers: { Authorization: `Bearer ${token}` }});

        if (!response.ok) {
          throw new Error(`Stream error: ${response.status}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setVideoBlobUrl(url);
      } catch (err) {
        console.error("Failed to fetch video stream:", err);
        setError("Video stream failed: " + err.message);
        setShowVideo(false);
      }
    } else {
      // Cleanup blob URL when modal closes
      if (videoBlobUrl) {
        URL.revokeObjectURL(videoBlobUrl);
        setVideoBlobUrl(null);
      }
    }
  };

  fetchVideoBlob();
}, [showVideo, fileId, versionId]);



  useEffect(() => {
    if (isOpen && fileId) {
      loadPreview();
    }
  }, [isOpen, fileId, versionId]);

   useEffect(() => {
    if (isOpen) {
      setZoomLevel(1);
      setRotation(0);
      setPanPosition({ x: 0, y: 0 });
      setIsFullscreen(initialFullscreen);
    }
  }, [isOpen , initialFullscreen]);

     useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      
      switch(e.key) {
        case 'Escape':
          if (isFullscreen) {
            setIsFullscreen(false);
          } else {
            onClose();
          }
          break;
        case 'f':
        case 'F':
          setIsFullscreen(!isFullscreen);
          break;
        case '=':
        case '+':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case 'r':
        case 'R':
          handleRotate();
          break;
        case '0':
          resetZoom();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFullscreen, zoomLevel]);


  const loadPreview = async () => {
    setLoading(true);
    setError(null);
    setPreviewData(null);

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error("Not logged in");
        const params = new URLSearchParams({ file_id: fileId });
        if (versionId != null) params.append('version_id', String(versionId));
        const response = await fetch(`http://127.0.0.1:5000/files/preview?${params.toString()}`, { 
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to generate preview');
      }

      const data = await response.json();
      if (data.success && data.preview) {
        setPreviewData(data.preview);
        setSupported(true);
      } else {
        throw new Error('No preview data returned');
      }
    } catch (err) {
      console.error('Preview error:', err);
      setError(err.message);
      setSupported(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error("Not logged in");
      const res = await fetch(`http://127.0.0.1:5000/files/download?file_id=${fileId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Download failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Download error:', err);
      setError('Download failed: ' + err.message);
    }
  };

 const handleZoomIn = () => {
  setZoomLevel(prev => {
    const newZoom = Math.min(prev + 0.25, 5);
    // Reset pan position when zooming to prevent content from going off-screen
    if (newZoom !== prev) {
      setPanPosition({ x: 0, y: 0 });
    }
    return newZoom;
  });
};

  const handleZoomOut = () => {
  setZoomLevel(prev => {
    const newZoom = Math.max(prev - 0.25, 0.25);
    // Reset pan position when zooming out significantly
    if (newZoom <= 1) {
      setPanPosition({ x: 0, y: 0 });
    }
    return newZoom;
  });
};

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const resetZoom = () => {
    setZoomLevel(1);
    setRotation(0);
    setPanPosition({ x: 0, y: 0 });
  };

  // Pan/drag functionality for zoomed content
  const handleMouseDown = (e) => {
   e.preventDefault(); 
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - panPosition.x,
        y: e.clientY - panPosition.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && zoomLevel > 1) {
      e.preventDefault();
      setPanPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Check if current content supports zoom
  const isZoomable = () => {
    if (!previewData) return false;
    return previewData.type === 'image' || previewData.type === 'pdf' || typeof previewData === 'string';
  };


  const renderPreview = () => {
    if (loading) {
      return (
        <div className="preview-loading">
          <Loader className="animate-spin" size={40} />
          <p>Generating preview...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="preview-error">
          <AlertCircle size={40} />
          <p>Preview error</p>
          <small>{error}</small>
          <button onClick={loadPreview}>Retry</button>
        </div>
      );
    }

    if (!supported) {
      return (
        <div className="preview-unsupported">
          <FileText size={40} />
          <p>Preview not supported</p>
        </div>
      );
    }

    if (!previewData) {
      return (
        <div className="preview-empty">
          <FileText size={40} />
          <p>No preview available</p>
        </div>
      );
    }

   const getTransformStyle = () => {
    if (!isZoomable()) return {};
    
    return {
        transform: `scale(${zoomLevel}) rotate(${rotation}deg) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
        transition: isDragging ? 'none' : 'transform 0.3s ease',
        cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
        transformOrigin: 'center center'
    };
    };

    // Auto fallback: assume base64 image if previewData is string
    if (typeof previewData === 'string') {
      return (
        <div className="image-preview">
          <img 
            src={`data:image/jpeg;base64,${previewData}`} 
            alt={fileName}
            style={getTransformStyle()}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            draggable={false}
            className="preview-image"
          />
        </div>
      );
    }

    // Handle preview type from backend
    switch (previewData.type) {
      case 'image':
        return (
          <div className="image-preview">
            <img 
            src={previewData.thumbnail || `data:image/jpeg;base64,${previewData.data}`} 
            alt={fileName}
            style={getTransformStyle()}
            onMouseDown={handleMouseDown}
            draggable={false}
            className='preview-image' />
            {previewData.original_width && (
              <div className="image-info">
                <p>Size: {previewData.original_width}×{previewData.original_height}</p>
                <p>Zoom: {Math.round(zoomLevel * 100)}%</p>
              </div>
            )}
          </div>
        );

        case 'video':
        return (
          <div className="video-preview">
            {showVideo ? (
              <div className="video-player-container">
                <video 
                controls 
                autoPlay
                poster={previewData.thumbnail}
                src={videoBlobUrl}
                onError={(e) => {
                  console.error('Video playback error:', e);
                  setError('Failed to load video for playback');
                  setShowVideo(false);
                }}
              >
                Your browser does not support the video tag.
              </video>
                <button
                  className="video-back-button"
                  onClick={() => setShowVideo(false)}
                >
                  <ArrowLeft size={14} />
                  Back
                </button>
              </div>
            ) : (
              <div className="video-container" onClick={() => setShowVideo(true)}>
                <img 
                  src={previewData.thumbnail} 
                  alt="Video thumbnail"
                />
                <div className="video-overlay">
                  <Play size={64} fill="white" />
                </div>
                {previewData.duration && (
                  <div className="video-duration-badge">
                    {Math.floor(previewData.duration / 60)}:{(previewData.duration % 60).toFixed(0).padStart(2, '0')}
                  </div>
                )}
                <div className="video-play-hint">
                  Click to play
                </div>
              </div>
            )}

            {previewData.duration && (
              <div className="video-info">
                <div>
                  <strong>Duration</strong>
                  <span>{Math.floor(previewData.duration / 60)}m {(previewData.duration % 60).toFixed(0)}s</span>
                </div>
                <div>
                  <strong>Resolution</strong>
                  <span>{previewData.original_width} × {previewData.original_height}</span>
                </div>
                {previewData.fps && (
                  <div>
                    <strong>Frame Rate</strong>
                    <span>{previewData.fps} FPS</span>
                  </div>
                )}
                <div>
                  <strong>File</strong>
                  <span>{fileName}</span>
                </div>
              </div>
            )}
          </div>
        );

   case 'pdf':
      return (
        <div className="pdf-preview">
          <div className="pdf-pages">
            {previewData.pages?.map((page) => (
              <img 
                key={page.page_number}
                src={page.thumbnail.startsWith('data:image') ? page.thumbnail : `data:image/png;base64,${page.thumbnail}`} 
                alt={`Page ${page.page_number}`}
                className="pdf-page-image-only"
                style={getTransformStyle()}
                onMouseDown={handleMouseDown}
                draggable={false}
              />
            ))}
          </div>

          {zoomLevel > 1 && (
            <div className="pdf-zoom-info">
              <small>Page {previewData.pages?.length ? `1-${previewData.pages.length}` : '1'} • Zoom: {Math.round(zoomLevel * 100)}%</small>
            </div>
          )}
        </div>
      );
        

 // Replace your document case with this improved version:

 case 'document':
        console.log('Rendering document preview with data:', previewData);
        return (
          <div className="document-preview">
            <div className="document-header">
              <div className="document-info">
                <h4>📄 Document Preview</h4>
                <div className="document-stats">
                </div>
                
              </div>
            </div>
            
            <div className="document-content-wrapper">
              <div className="document-content">
                <div 
                  className="document-text zoomable-text"
                  style={getTransformStyle()}
                  onMouseDown={handleMouseDown}
                  draggable={false}
                >
                  {previewData.text_preview ? (
                    <pre className="document-text-content">{previewData.text_preview}</pre>
                  ) : (
                    <p className="no-content">No text content available</p>
                  )}
                </div>
              </div>
            </div>
            
            {zoomLevel > 1 && (
              <div className="document-zoom-info">
                <small>Zoom: {Math.round(zoomLevel * 100)}%</small>
              </div>
            )}
            
            <div className="document-footer">
              <small>
                📝 Text preview of <strong>{previewData.file_name || fileName}</strong>
              </small>
              <small className="format-note">
                Original formatting and full content preserved in downloaded file
              </small>
            </div>
          </div>
        );
      default:
        console.log('Unknown preview type:', previewData.type);
        console.log('Full preview data:', previewData);
        return (
          <div className="preview-unsupported">
            <FileText size={40} />
            <p>Preview format not recognized</p>
            <small>Type: {previewData.type || 'undefined'}</small>
            <details style={{marginTop: '10px', fontSize: '12px'}}>
              <summary>Debug Info</summary>
              <pre>{JSON.stringify(previewData, null, 2)}</pre>
            </details>
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
     <div 
      className={`file-preview-overlay neuro-theme ${isFullscreen ? 'fullscreen' : ''}`}
      onClick={onClose}
    >
      <div 
        className={`file-preview-modal ${isFullscreen ? 'fullscreen-modal' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="preview-header">
          <div className="preview-title">
            <h3>{fileName}</h3>
            {isZoomable() && (
              <span className="zoom-indicator">
                Zoom: {Math.round(zoomLevel * 100)}%
              </span>
            )}
          </div>
          
          <div className="preview-actions">
            {/* Zoom controls - only show for zoomable content */}
            {isZoomable() && (
              <>
                <button 
                  className="preview-btn" 
                  onClick={handleZoomOut} 
                  title="Zoom Out (-)"
                  disabled={zoomLevel <= 0.25}
                >
                  <ZoomOut size={20} />
                </button>
                
                <button 
                  className="preview-btn" 
                  onClick={handleZoomIn} 
                  title="Zoom In (+)"
                  disabled={zoomLevel >= 5}
                >
                  <ZoomIn size={20} />
                </button>
                
                <button 
                  className="preview-btn" 
                  onClick={handleRotate} 
                  title="Rotate (R)"
                >
                  <RotateCw size={20} />
                </button>
                
                <button 
                  className="preview-btn" 
                  onClick={resetZoom} 
                  title="Reset Zoom (0)"
                >
                  ↺
                </button>
              </>
            )}
            
           <button
            className="preview-btn"
            onClick={handleFullscreenClick}
            title="Toggle Fullscreen (F)"
            >
            {isFullscreen ? (
                <Minimize size={20} />
            ) : (
                <Maximize size={20} />
            )}
            </button>
            
            {isInTrash ? (
    // Trash-specific actions
              <>
                <button 
                  className="preview-btn restore-btn" 
                  onClick={onRestore} 
                  title="Restore File"
                  style={{ color: '#10b981' }}
                >
                  <RotateCcw size={20} />
                </button>
                
                <button 
                  className="preview-btn delete-forever-btn" 
                  onClick={onDelete} 
                  title="Delete Forever"
                  style={{ color: '#ef4444' }}
                >
                  <Trash2 size={20} />
                </button>
              </>
            ) : (
              // Regular file browser actions
              <button 
                className="preview-btn download-btn" 
                onClick={handleDownload} 
                title="Download"
              >
                <Download size={20} />
              </button>
            )}
            
            <button 
              className="preview-btn close-Btn" 
              onClick={onClose} 
              title="Close (Esc)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div 
          className="preview-content"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {renderPreview()}
        </div>
        
        {/* Keyboard shortcuts hint */}
        {isFullscreen && (
          <div className="keyboard-hints">
            <small>
              <kbd>Esc</kbd> Exit fullscreen • 
              <kbd>F</kbd> Toggle fullscreen • 
              {!isInTrash && (
                <>
                  <kbd>+/-</kbd> Zoom • 
                  <kbd>R</kbd> Rotate • 
                  <kbd>0</kbd> Reset
                </>
              )}
              {isInTrash && (
                <>
                  <kbd>Ctrl+R</kbd> Restore • 
                  <kbd>Del</kbd> Delete Forever
                </>
              )}
            </small>
          </div>
        )}
      </div>
    </div>
    </ModalPortal>
  );
};

export default FilePreview;
