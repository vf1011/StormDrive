import React, { useState } from 'react';
import { getAuth } from 'firebase/auth';

const SmartUploader = ({ fileId }) => {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  // STEP 1: Get existing version info (if any)
  const getLocalFileInfo = (fileId) => {
    const data = localStorage.getItem(`stormdrive-file-${fileId}`);
    return data ? JSON.parse(data) : null;
  };

  // STEP 2: Save new version info locally
  const saveLocalFileInfo = (fileId, file) => {
    localStorage.setItem(`stormdrive-file-${fileId}`, JSON.stringify({
      fileName: file.name,
      lastModified: file.lastModified
    }));
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const previous = getLocalFileInfo(fileId);

    // STEP 3: Compare file state (basic)
    if (previous && previous.fileName === file.name && previous.lastModified === file.lastModified) {
      setMessage("No changes detected — skipping upload.");
      return;
    }

    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return alert("Not logged in.");

    const token = await user.getIdToken();

    setUploading(true);
    setMessage("Uploading new version...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("metadata", JSON.stringify({
        fileName: file.name,
        lastModified: file.lastModified,
      }));

      const res = await fetch(`${process.env.REACT_APP_API_URL}/upload/${fileId}/version`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        saveLocalFileInfo(fileId, file);
        setMessage("New version uploaded!");
      } else {
        const err = await res.json();
        console.error(err);
        setMessage("Upload failed.");
      }
    } catch (error) {
      console.error(error);
      setMessage("An error occurred.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileSelect} disabled={uploading} />
      {uploading && <p>Uploading...</p>}
      {message && <p>{message}</p>}
    </div>
  );
};

export default SmartUploader;
