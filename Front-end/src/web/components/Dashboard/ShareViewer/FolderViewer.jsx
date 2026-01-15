

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Folder, File, Download, AlertCircle, Lock } from 'lucide-react';

const BASE_URL = 'http://127.0.0.1:5000';

const PublicFolderPage = () => {
  const { shareId } = useParams();

  const [folderData, setFolderData]   = useState(null);  // { folder_name, files[], download_url, expires_at, ... }
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');

  // Password flow
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword]                   = useState('');
  const [authError, setAuthError]                 = useState('');
  const [authLoading, setAuthLoading]             = useState(false);

  // Keep the last successful password so we can reuse it for download
  const [grantedPassword, setGrantedPassword]     = useState('');

  const isProtected = useMemo(
    () => Boolean(folderData?.is_protected_password) || false,
    [folderData]
  );

  const fetchFolder = async (pwd) => {
    setLoading(true);
    setError('');
    try {
      const headers = {};
      if (pwd) headers['X-share-password'] = pwd; // backend expects this exact header key

      const res = await fetch(`${BASE_URL}/folder/${shareId}`, { headers });

      if (res.status === 403) {
        // Password required or incorrect
        setShowPasswordModal(true);
        setGrantedPassword('');
        return;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Folder not found or link expired.');
      }

      const data = await res.json();
      // data shape (per your backend): { folder_name, files, download_url, expires_at, permission, ... }
      setFolderData(data);
      if (pwd) setGrantedPassword(pwd);
    } catch (e) {
      setError(e.message || 'Failed to load folder.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolder(); // first attempt without password; backend will return 403 if needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareId]);

  const handlePasswordSubmit = async () => {
    if (!password.trim()) {
      setAuthError('Please enter a password');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    try {
      await fetchFolder(password);
      // If fetch succeeded, modal will be hidden below
      setShowPasswordModal(false);
      setPassword('');
    } catch {
      setAuthError('Invalid password');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDownloadFolder = async () => {
    if (!folderData?.download_url) return;

    try {
      const headers = {};
      if (grantedPassword) headers['X-share-password'] = grantedPassword;

      // Use fetch->blob to include headers even for protected shares
      const res = await fetch(`${BASE_URL}${folderData.download_url}`, { headers });

      if (!res.ok) {
        // Try to extract server message
        let msg = 'Failed to download folder.';
        try {
          const t = await res.text();
          if (t) msg = t;
        } catch {}
        throw new Error(msg);
      }

      // Handle both file and accidental JSON responses safely
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.detail || JSON.stringify(j) || 'Download did not return a file.');
      }

      // Derive filename from Content-Disposition if present
      let filename = `${folderData.folder_name || 'folder'}.zip`;
      const cd = res.headers.get('content-disposition');
      if (cd) {
        const match = /filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i.exec(cd);
        const enc = match?.[1] ? decodeURIComponent(match[1]) : (match?.[2] || '').trim();
        if (enc) filename = enc;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message || 'Download failed.');
    }
  };

  // ── UI states ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading folder…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Folder Not Available</h2>
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  // Password modal when 403 was returned
  if (showPasswordModal) {
    return (
      <div className="min-h-screen bg-gray-50 relative">
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Lock className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Password required</h3>
                <p className="text-gray-500 text-sm">Enter the password to view this folder.</p>
              </div>
            </div>

            <div className="space-y-2">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full border rounded-md px-3 py-2"
                onKeyDown={(e) => e.key === 'Enter' && !authLoading && handlePasswordSubmit()}
              />
              {authError && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {authError}
                </div>
              )}
            </div>

            <button
              onClick={handlePasswordSubmit}
              disabled={authLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {authLoading ? 'Verifying…' : 'Access Folder'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main folder view ──────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Folder className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{folderData?.folder_name || 'Shared Folder'}</h1>
              <p className="text-gray-600 text-sm mt-1">
                Expires: {folderData?.expires_at ? new Date(folderData.expires_at).toLocaleString() : '—'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {folderData?.permission !== 'download' && (
              <div className="text-sm text-amber-700 bg-amber-50 px-3 py-1 rounded-full">View Only</div>
            )}
            {folderData?.permission === 'download' && (
              <button
                onClick={handleDownloadFolder}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download ZIP
              </button>
            )}
          </div>
        </div>

        {/* Files list */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Files in this folder ({folderData?.files?.length || 0})</h2>
          </div>

          <div className="divide-y divide-gray-100">
            {(folderData?.files || []).map((f, idx) => (
              <div key={idx} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                    <File className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="text-sm text-gray-800 truncate">{f.relative_path}</div>
                </div>
                {/* No per-file routes in backend; download is only for the whole folder */}
                <div className="text-xs text-gray-400">Included</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-xs text-gray-500 mt-4">
          Note: Individual file previews/downloads aren’t available for shared folders. Use “Download ZIP”.
        </p>
      </div>
    </div>
  );
};

export default PublicFolderPage;
