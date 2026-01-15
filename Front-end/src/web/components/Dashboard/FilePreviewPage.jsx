import React from 'react';
import { useLocation } from 'react-router-dom';
import FilePreview from './FilePreview';

const FilePreviewPage = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  const fileId = queryParams.get('fileId');
  const fileName = queryParams.get('fileName');
  const isFullscreen = queryParams.get('fullscreen') === 'true';

  if (!fileId || !fileName) return <div>Invalid preview link</div>;

  return (
    <FilePreview
      fileId={fileId}
      fileName={fileName}
      isOpen={true}
      onClose={() => window.close()}
      initialFullscreen={isFullscreen}  // Pass this prop to open in fullscreen directly
    />
  );
};

export default FilePreviewPage;
