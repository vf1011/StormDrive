// FileViewer.jsx - Backend-aligned public file view
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, Eye, AlertCircle, Lock, User } from 'lucide-react';

const PublicFilePage = () => {
  const { shareId } = useParams();
  const navigate = useNavigate();

  const [fileData, setFileData] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  // Password flow
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword]                   = useState('');
  const [authError, setAuthError]                 = useState('');
  const [authLoading, setAuthLoading]             = useState(false);
  const [isAuthenticated, setIsAuthenticated]     = useState(false);

  // Attempt to fetch public metadata (optionally with password)
  const fetchSharedFile = async (pwd) => {
    try {
      setLoading(true);
      setError('');
      const headers = {};
      if (pwd) headers['X-Share-Password'] = pwd;

      const res = await fetch(`http://127.0.0.1:5000/share/${shareId}`, { headers });
      if (res.status === 403) {
        // Backend signals password requirement via 403
        setShowPasswordModal(true);
        setIsAuthenticated(false);
        return;
      }
      if (!res.ok) throw new Error('File not found or link expired.');

      const data = await res.json();
      // Map to minimal UI state you already use:
      // { file_name, permission, download_url, expires_at }
      setFileData({
        ...data,
        allow_download: data.permission === 'download',
      });
      setIsAuthenticated(true);
    } catch (e) {
      setError(e.message || 'Failed to load file.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSharedFile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareId]);

  const isPreviewable = (filename) => /\.(jpg|jpeg|png|gif|pdf|txt)$/i.test(filename || '');

  const handlePasswordSubmit = async () => {
    if (!password.trim()) {
      setAuthError('Please enter a password');
      return;
    }
    try {
      setAuthLoading(true);
      setAuthError('');
      await fetchSharedFile(password);
      // if successful, close modal
      if (!error) {
        setShowPasswordModal(false);
        setPassword('');
      }
    } catch {
      setAuthError('Invalid password');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDownload = () => {
    // Download route per backend
    const url = `http://127.0.0.1:5000/share/download/${shareId}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // ── UI states ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading file…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">File Not Available</h2>
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  // Show auth required shell
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Lock className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Password required</h3>
                  <p className="text-gray-500 text-sm">Enter the password to view this file.</p>
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
                {authLoading ? 'Verifying…' : 'Access File'}
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-600">Authentication required to view this file</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Main view ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{fileData?.file_name}</h1>
            <p className="text-gray-600 text-sm mt-1">
              Expires: {fileData?.expires_at ? new Date(fileData.expires_at).toLocaleString() : '—'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {fileData?.allow_download === false && (
              <div className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full">View Only</div>
            )}
            {fileData?.allow_download !== false && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download File
              </button>
            )}
            <button
              className="text-sm underline text-gray-600 hover:text-gray-800 ml-1"
              onClick={() => navigate('/register')}
            >
              Sign in
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {isPreviewable(fileData?.file_name) ? (
            <div className="p-0">
              {/* NOTE: cannot attach headers from iframe if password-protected; open in new tab */}
              <div className="p-4">
                <a
                  href={`http://127.0.0.1:5000/share/${shareId}/view`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 underline"
                >
                  <Eye className="w-4 h-4" />
                  Open Preview
                </a>
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Eye className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Preview Not Available</h3>
              <p className="text-gray-600 mb-6">
                File preview is not supported for this type: {fileData?.file_name?.split('.').pop()?.toUpperCase()}
              </p>
              {fileData?.allow_download !== false && (
                <button
                  onClick={handleDownload}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Download to View
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicFilePage;
