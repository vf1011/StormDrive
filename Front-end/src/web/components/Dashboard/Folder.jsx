import { Folder } from 'lucide-react';
import PropTypes from 'prop-types';
import DOMPurify from 'dompurify';
import './Styles/Folder.css';

const Folders = ({ viewMode, files , onFolderClick}) => {
  const folders = files.filter(file => file.type === 'folder');

  const FolderModifiedDate = (date) => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className={`files-container ${viewMode}`}>
      {folders.length > 0 ? (
        folders.map((folder) => (
          <div 
          key={folder.id} 
          className="file-item" 
          onClick={() => onFolderClick?.(folder.id)} 
          role='button' 
          tabIndex={0} 
          onKeyDown ={(e) => e.key === 'Enter' && onFolderClick?.(folder.id)}
          >
            <Folder className="file-icon folder" />
            <div className="file-details">
              <span className="file-name">{DOMPurify.sanitize(folder.name)}</span>
              <div className="file-meta">
                <span className="file-modified">{FolderModifiedDate(folder.modified)}</span>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="empty-files">
          <Folder size={48} />
          <p>No folders found</p>
        </div>
      )}
    </div>
  );
};

Folders.propTypes = {
  viewMode: PropTypes.oneOf(['grid', 'list']).isRequired,
  files: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    modified: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number
    ]).isRequired,
  })).isRequired,
  onFolderClick : PropTypes.func,

};

export default Folders;
