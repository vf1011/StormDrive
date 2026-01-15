import { Share2, FileText, Image } from 'lucide-react';
import DOMPurify from 'dompurify';
import PropTypes from 'prop-types';
import "./Styles/Shared.css";
import { useState , useEffect } from 'react';

const Shared = ({ viewMode}) => {
  const [sharedFile, setSharedFile] = useState([]);

useEffect(() => {
  const fetchSharedFile = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('${import.meta.env.VITE_API_BASE_URL}/api/shared-files',{
        headers:{
          Authorization : `Bearer ${token}`,
        }
      });

    if (response.ok) {
      const Data = await response.json();
      setSharedFile(Data);
    }else{
      console.error("Failed to fetch shared files");
    }
   }catch(error){
      console.error("Error fetching shared files:",error);
    }
  };
  fetchSharedFile();
}, []);
  const getFileIcon = (type) => {
    switch (type) {
      case 'image': return <Image className="file-icon image" />;
      default: return <FileText className="file-icon file" />;
    }
  };

  const sanitizeFile = (value) => DOMPurify.sanitize(value);

  return (
    <div className={`files-container ${viewMode}`}>
      {sharedFile.length > 0 ? (
        sharedFile.map((file) => (
          <div key={file.id} className={`file-item ${file.type}`}>
            {getFileIcon(file.type)}
            <div className="file-details">
              <span className="file-name">{sanitizeFile(file.name)}</span>
              <div className="file-meta">
                <span className="file-size">{sanitizeFile(file.size)}</span>
                <span className="file-modified">{sanitizeFile(file.modified)}</span>
                <Share2 className="shared-icon" size={16} />
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="empty-files">
          <Share2 size={48} />
          <p>No shared files found</p>
        </div>
      )}
    </div>
  );
};

Shared.propTypes = {
  viewMode: PropTypes.oneOf(['grid', 'list']).isRequired,
  files: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    size: PropTypes.string.isRequired,
    modified: PropTypes.string.isRequired,
  })).isRequired,
};

export default Shared;
