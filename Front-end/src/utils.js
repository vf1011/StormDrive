export  const guessType = (name) => {
    if (!name || typeof name !== "string") return "file";
    const ext = name.split(".").pop().toLowerCase();

    if (["png", "jpg", "jpeg", "gif", "heic", "tiff", "bmp", "icns", "webp"].includes(ext)) return "image";
    if (["mp4", "mov", "webm", "m4v", "avi"].includes(ext)) return "video";
    if (["pdf"].includes(ext)) return "pdf";
    if (["mp3", "aac", "m4a", "wav", "aiff", "caf"].includes(ext)) return "audio";
    if (["pages", "key", "numbers", "doc", "docx", "txt", "rtf", "odt", "md"].includes(ext)) return "document";
    if (["xls", "xlsx", "csv", "numbers"].includes(ext)) return "spreadsheet";
    if (["ppt", "pptx", "key"].includes(ext)) return "ppt";
    if (["zip", "tar", "gz", "rar", "7z", "dmg", "pkg"].includes(ext)) return "archive";

    return "file";
  };

  export const formatSize = (bytes, fileObject = null) => {
  let actualBytes = bytes;

  if ((!actualBytes || actualBytes === 0 || isNaN(actualBytes)) && fileObject) {
    const possibleSizeFields = [
      'file_size', 'size', 'fileSize', 'content_length',
      'contentLength', 'length', 'byte_size', 'file_length',
      'bytes', 'filesize', 'content_size', 'data_size'
    ];

    for (const field of possibleSizeFields) {
      if (fileObject[field] !== undefined && fileObject[field] !== null) {
        const fieldValue = Number(fileObject[field]);
        if (!isNaN(fieldValue) && fieldValue > 0) {
          actualBytes = fieldValue;
          break;
        }
      }
    }
  }

  const size = Number(actualBytes);
  if (!size || size === 0 || isNaN(size)) {
    return "Unknown size";
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;

  if (size < k) return `${size} B`;

  const i = Math.floor(Math.log(size) / Math.log(k));
  const unitIndex = Math.min(i, units.length - 1);
  const convertedSize = size / Math.pow(k, unitIndex);

  if (convertedSize >= 100) {
    return `${convertedSize.toFixed(0)} ${units[unitIndex]}`;
  } else if (convertedSize >= 10) {
    return `${convertedSize.toFixed(1)} ${units[unitIndex]}`;
  } else {
    return `${convertedSize.toFixed(2)} ${units[unitIndex]}`;
  }
};

export const formatDate = (dateValue) => {
    if (!dateValue) {
      return 'Unknown date';
    }

    try {
      // Handle different date formats
      let date;
      
      if (typeof dateValue === 'string') {
        // Try parsing as ISO string first
        date = new Date(dateValue);
        
        // If that fails and it looks like a timestamp, try parsing as number
        if (isNaN(date.getTime()) && /^\d+$/.test(dateValue)) {
          date = new Date(parseInt(dateValue));
        }
        
        // If still invalid, try other common formats
        if (isNaN(date.getTime())) {
          // Try common date formats
          const formats = [
            dateValue.replace(/-/g, '/'), // YYYY-MM-DD to YYYY/MM/DD
            dateValue.replace(/\./g, '/'), // YYYY.MM.DD to YYYY/MM/DD
          ];
          
          for (const format of formats) {
            date = new Date(format);
            if (!isNaN(date.getTime())) break;
          }
        }
      } else if (typeof dateValue === 'number') {
        // Handle timestamp (both seconds and milliseconds)
        date = new Date(dateValue > 1e10 ? dateValue : dateValue * 1000);
      } else {
        date = new Date(dateValue);
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date value:', dateValue);
        return 'Unknown date';
      }

      // Format the date
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
    } catch (error) {
      console.error('Date formatting error:', error, dateValue);
      return 'Unknown date';
    }
  };

  export const sortFiles = (fileArray) => {
  return [...fileArray].sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
};

export const formatToUserLocalTime = (isoString) => {
  if (!isoString) return 'N/A';

  // Convert string to Date assuming UTC
  const utcDate = new Date(isoString + 'Z'); // force UTC interpretation
  return utcDate.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

// Categorize by mime_type first, then by extension fallback.
const getExt = (name = "") => {
  const i = name.lastIndexOf('.');
  return i > -1 ? name.slice(i + 1).toLowerCase() : "";
};

export function categorizeFile(item) {
  if (item.type === 'folder' || item.isFolder) return 'folder';

  const mime = (item.mime_type || item.file_type || "").toLowerCase();
  const ext = getExt(item.name || item.file_name);

  // Quick MIME checks
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';

  // Common office docs
  const docExts = ['doc', 'docx', 'rtf', 'odt', 'txt', 'md'];
  const sheetExts = ['xls', 'xlsx', 'csv', 'ods'];
  const pptExts = ['ppt', 'pptx', 'odp'];
  const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz'];
  const codeExts = ['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'cpp', 'c', 'cs', 'rb', 'go', 'rs', 'php', 'sql', 'html', 'css', 'json', 'yml', 'yaml'];

  if (docExts.includes(ext)) return 'doc';
  if (sheetExts.includes(ext)) return 'sheet';
  if (pptExts.includes(ext)) return 'ppt';
  if (archiveExts.includes(ext)) return 'archive';
  if (codeExts.includes(ext)) return 'code';

  // Images by extension fallback
  const imgExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'heic', 'bmp', 'tiff'];
  if (imgExts.includes(ext)) return 'image';

  // Videos/audio by ext fallback
  const vidExts = ['mp4', 'mov', 'mkv', 'webm', 'avi'];
  const audExts = ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg'];
  if (vidExts.includes(ext)) return 'video';
  if (audExts.includes(ext)) return 'audio';

  return 'other';
}

