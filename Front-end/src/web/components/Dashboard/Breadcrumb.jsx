// Enhanced Breadcrumb Component with improved accessibility and features
import React from 'react';
import './Styles/Breadcrumb.css';

const Breadcrumb = ({ 
  folderPath = [], 
  currentFolderId,
  onHomeClick, 
  onFolderClick,
  showBreadcrumb = true,
  maxVisibleItems = 4,
  homeLabel = "Home"
}) => {
  
  // CRITICAL FIX: Don't show breadcrumb if we're actually at root
  const isAtRoot = currentFolderId === null || currentFolderId === undefined;
  
  console.log('🔍 BREADCRUMB STATE CHECK:', {
    currentFolderId,
    isAtRoot,
    folderPath,
    folderPathLength: folderPath.length,
    showBreadcrumb
  });

  // If we're at root, don't show breadcrumb at all OR only show if explicitly requested
  if (!showBreadcrumb || (isAtRoot && folderPath.length === 0)) {
    return null;
  }

  // Clean the folder path and validate against current state
  const cleanFolderPath = folderPath.filter(folder => {
    if (!folder) return false;
    const name = folder.name || folder.folder_name || folder.title;
    return name && typeof name === 'string' && name.trim().length > 0;
  });

  // ADDITIONAL CHECK: If currentFolderId is null but we have folderPath, 
  // it means state is inconsistent - clear it
  if (isAtRoot && cleanFolderPath.length > 0) {
    console.warn('⚠️ INCONSISTENT STATE: At root but folderPath exists, clearing...');
    return null;
  }

  // Enhanced: Handle long paths with ellipsis
  const shouldShowEllipsis = cleanFolderPath.length > maxVisibleItems;
  const visiblePath = shouldShowEllipsis 
    ? [
        ...cleanFolderPath.slice(0, 1), // Show first folder
        { isEllipsis: true }, // Ellipsis marker
        ...cleanFolderPath.slice(-Math.max(1, maxVisibleItems - 2)) // Show last items
      ]
    : cleanFolderPath;

  const handleKeyDown = (event, callback, ...args) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      callback(...args);
    }
  };

  const truncateText = (text, maxLength = 25) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };

  return (
    <nav 
      className="themed-breadcrumb" 
      role="navigation" 
      aria-label="Breadcrumb navigation"
    >
      <ol className="breadcrumb-list">
        {/* Home Button */}
        <li className="breadcrumb-list-item">
          <button 
            className="breadcrumb-item home-item"
            onClick={onHomeClick}
            onKeyDown={(e) => handleKeyDown(e, onHomeClick)}
            aria-label="Navigate to home"
            title="Go to home directory"
          >
            <svg className="home-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path 
                d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span className="breadcrumb-text">{homeLabel}</span>
          </button>
        </li>

        {/* Render visible path items */}
        {visiblePath.map((item, index) => {
          // Handle ellipsis
          if (item.isEllipsis) {
            return (
              <React.Fragment key="ellipsis">
                <li className="breadcrumb-separator-item" aria-hidden="true">
                  <svg className="separator-icon" viewBox="0 0 24 24" fill="none">
                    <polyline 
                      points="9,18 15,12 9,6" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                </li>
                <li className="breadcrumb-list-item">
                  <button 
                    className="breadcrumb-item ellipsis-item"
                    onClick={() => {
                      // Show dropdown or expand full path
                      console.log('Show full path options');
                    }}
                    title="Show full path"
                    aria-label="Show more folders in path"
                  >
                    <span className="ellipsis">...</span>
                  </button>
                </li>
              </React.Fragment>
            );
          }

          // Handle regular folder items
          const folder = item;
          const folderName = folder.name || folder.folder_name || folder.title;
          const isLast = index === visiblePath.length - 1;
          const originalIndex = shouldShowEllipsis && index > 1 
            ? cleanFolderPath.length - (visiblePath.length - index)
            : index;
          
          return (
            <React.Fragment key={folder.id || `folder-${originalIndex}`}>
              <li className="breadcrumb-separator-item" aria-hidden="true">
                <svg className="separator-icon" viewBox="0 0 24 24" fill="none">
                  <polyline 
                    points="9,18 15,12 9,6" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              </li>
              
              <li className="breadcrumb-list-item">
                <button 
                  className={`breadcrumb-item folder-item ${isLast ? 'active' : ''}`}
                  onClick={() => onFolderClick(originalIndex)}
                  onKeyDown={(e) => handleKeyDown(e, onFolderClick, originalIndex)}
                  aria-current={isLast ? 'page' : undefined}
                  title={folderName}
                  disabled={isLast} // Disable current folder
                >
                  <svg className="folder-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path 
                      d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="breadcrumb-text">
                    {truncateText(folderName)}
                  </span>
                </button>
              </li>
            </React.Fragment>
          );
        })}
      </ol>

      {/* Optional: Show full path tooltip on hover for long paths */}
      {shouldShowEllipsis && (
        <div className="breadcrumb-tooltip" role="tooltip">
          Full path: {cleanFolderPath.map(f => f.name || f.folder_name || f.title).join(' / ')}
        </div>
      )}
    </nav>
  );
};

export default Breadcrumb;