import { Upload as UploadIcon } from 'lucide-react';
import PropTypes from 'prop-types';
import DOMPurify from 'dompurify';
import "./Styles/Upload.css";

const Upload = ({ viewMode, files }) => {
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

  const sanitize = (value) => DOMPurify.sanitize(value);

  return (
    <div className={`files-container ${viewMode}`}>
     {Array.isArray(files) && files.filter(file => file.type !== 'folder').length > 0 ? (
  files
    .filter(file => file.type !== 'folder')
    .map((file) => (
      <div key={file.id} className={`file-item ${file.type} ${viewMode === 'grid' ? 'enhanced-file-card' : ''}`}>
        {getFileIcon(file.type, file, viewMode === 'grid')}
        <div className="file-details">
          <span className="file-name">{sanitize(file.name) || 'Untitled'}</span>
          <div className="file-meta">
            {viewMode === 'list' && (
              <span className="file-size">{sanitize(file.size) || 'Unknown Size'}</span>
            )}
            <span className="file-modified">{sanitize(file.modified) || 'Unknown Date'}</span>
          </div>
        </div>
      </div>
    ))
) : (
  <div className="empty-files">
    <UploadIcon size={48} />
    <p>No files uploaded yet</p>
  </div>
)}


    </div>
  );
};

Upload.propTypes = {
  viewMode: PropTypes.oneOf(['grid', 'list']).isRequired,
  files: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    size: PropTypes.string.isRequired,
    modified: PropTypes.string.isRequired,
  })).isRequired,
};

export default Upload;

