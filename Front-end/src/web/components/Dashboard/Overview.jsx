import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StorageUsage from './Storage/StorageUsage';
import FilePreview from './FilePreview';
import './Styles/Overview.css';
import { supabase } from '../../../supabase';
import { useFileContext } from '../Hooks/FileContext';
import DOMPurify from 'dompurify';
import { guessType, formatSize } from '../../../utils';

const Overview = () => {
  const [quickAccessItems, setQuickAccessItems] = useState([]);
  const [recentActivityItems, setRecentActivityItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewOperation, setPreviewOperation] = useState(false);
  const [user, setUser] = useState('');
  const {  setMultipleFiles, setSelectedFile } = useFileContext();
  const [folderPath , setFolderPath] = useState([]);
  const [currentFolderId , setCurrentFolderId] = useState(null);
  const [username , setUsername] = useState('');
  const navigate = useNavigate();



   const getFileIcon = (type, file = null, enhanced = false) => {
  if (enhanced && type === 'folder') {
    return (
      <div className="enhanced-folder-icon">
        <div className="enhanced-folder-tab"></div>
        <div className="enhanced-folder-body"></div>
      </div>
    );
  }

  const iconMap = {
    folder: '/images/folder-svg.svg',
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

  // Load user full name or email prefix
useEffect(() => {
  let isMounted = true;

  (async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user || !isMounted) return;

    // 1) Try profiles (preferred source if it exists)
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, full_name')
      .eq('id', user.id)
      .single();

    // 2) Fallbacks: user_metadata / identity data / email prefix
    const meta = user.user_metadata || {};
    const identities = Array.isArray(user.identities) ? user.identities : [];
    const idData = identities[0]?.identity_data || {};

    const name =
      (profile?.display_name || profile?.full_name ||
       meta.full_name || meta.name ||
       idData.full_name || idData.name ||
       (user.email ? user.email.split('@')[0] : '')
      )?.toString().trim();

    if (isMounted) setUsername(name || '');

    // Live update if profiles row changes later
    const channel = supabase
      .channel(`profiles-name-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => {
          const { display_name, full_name } = payload.new || {};
          const newName = (display_name || full_name || '').toString().trim();
          setUsername(newName);
        }
      )
      .subscribe();

    // Reset if user logs out
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) setUsername('');
    });

    return () => {
      isMounted = false;
      try { supabase.removeChannel?.(channel); } catch {}
      try { authSub?.subscription?.unsubscribe(); } catch {}
    };
  })();
}, []);

  // Fetch Quick Access (folders) and Recent Activity (files)
  useEffect(() => {
    const loadOverview = async () => {
      setLoading(true);
      const token = (await supabase.auth.getSession())?.data?.session?.access_token;
      if (!token) { setLoading(false); return; }

      // Quick Access: folders
      try {
        const folderRes = await fetch('http://127.0.0.1:5000/folder/list', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (folderRes.ok) {
          const { folders } = await folderRes.json();
          const items = folders
            .map(f => ({
              id:        f.folder_id,
              name:      f.folder_name,
              type:      'folder',
              size:      '—',
              time:      new Date(f.updated_at || f.created_at).toLocaleString(),
              uploadDate:new Date(f.updated_at || f.created_at)
            }))
            .slice(0, 6);
          setQuickAccessItems(items);
        }
      } catch (err) {
        console.error('Quick Access fetch error:', err);
      }

      // Recent Activity: files
      try {
        const fileRes = await fetch('http://127.0.0.1:5000/files/file', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (fileRes.ok) {
          const { files } = await fileRes.json();
          const items = files
            .map(f => {
              const name = f.file_name || f.filename || `file_${f.file_id}`;
              const date = new Date(f.uploaded_at || f.upload_date);
              return {
                id:         f.file_id,
                name,
                type:       guessType(name),
                size:       formatSize(f.file_size || f.size || 0),
                time:       date.toLocaleString(),
                uploadDate: date
              };
            })
            .sort((a, b) => b.uploadDate - a.uploadDate)
            .slice(0, 4);
          setRecentActivityItems(items);
        }
      } catch (err) {
        console.error('Recent Activity fetch error:', err);
      }

      setLoading(false);
    };
    loadOverview();
  }, []);

  const openFolderInFiles = (folder) => {
    // Set FileContext to navigate into this folder
    setCurrentFolderId(folder.id);
    setFolderPath([{ id: folder.id, name: folder.name, folder_name: folder.name }]);
    navigate('/dashboard/myfiles');
  };


const handleFolderClick = (folder) => {
  
  // 1) Navigate
  setCurrentFolderId(folder.id);
  
  setFolderPath(prev => {
    
    const existingIndex = prev.findIndex(f => f.id === folder.id);
    if (existingIndex >= 0) {
    
      return prev.slice(0, existingIndex + 1);
    } else {
      const newFolder = { 
        id:          folder.id, 
        name:        folder.name,
        folder_name: folder.name  // breadcrumb compatibility
      };
      return [...prev, newFolder];
    }
  });

  // 2) Clear any selection so toolbar stays hidden
  setMultipleFiles([]);
  setSelectedFile(null);
};


  const handleClosePreview = () => {
    setPreviewOperation(false);
    setPreviewFile(null);
  };

  return (
    <div className="overview-container">
      <div className="overview-header">
        <h1>Hello {DOMPurify.sanitize(username || 'there')}!</h1>
        {/* <p className="welcome-text">Hello, {DOMPurify.sanitize(user)}!</p> */}
      </div>

      <div className="dashboard-grid">
        <div className="upload-section">
          <StorageUsage collapsed={false} />
        </div>

        <div className="main-section">
          <div className="quick-access">
            <div className="section-header"><h2>Quick Access</h2></div>
            <div className="files-container grid">
              {loading ? (
                <div className="empty-state"><p>Loading Quick Access...</p></div>
              ) : quickAccessItems.length === 0 ? (
                <div className="empty-state">
                  <FileText className="empty-icon" />
                  <p>No Quick Access items found</p>
                </div>
              ) : (
                quickAccessItems.map(item => (
                  <div
                    key={item.id}
                    className="enhanced-file-item"
                     onClick={e => {
                      e.stopPropagation();
                      openFolderInFiles(item);
                    }}
                  >
                    <div className="enhanced-file-icon">
                      {getFileIcon(item.type, item, true)}
                    </div>
                    <div className="enhanced-file-name">{item.name}</div>
                    <div className="enhanced-file-date">{item.time}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="recent-activity">
            <div className="section-header"><h2>Recent Activity</h2></div>
            <div className="recent-files list">
              {loading ? (
                <p>Loading activity...</p>
              ) : recentActivityItems.length === 0 ? (
                <div>
                  <FileText className="file-icon" />
                  <p>No recent activity</p>
                </div>
              ) : (
                recentActivityItems.map(item => (
                  <div
                    key={item.id}
                    className="recent-file-item list-item"
                    onClick={e => handleFileClick(item, e)}
                  >
                    {getFileIcon(item.type)}
                    <div className="file-details">
                      <h4 className="file-name">{item.name}</h4>
                      <p>Uploaded {item.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {previewFile && (
        <FilePreview
          isOpen={previewOperation}
          fileId={previewFile.id}
          fileName={previewFile.name}
          onClose={handleClosePreview}
        />
      )}
    </div>
  );
};

export default Overview;
