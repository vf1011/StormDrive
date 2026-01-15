// ShareLinkModel.jsx - Backend-aligned version (owner metadata + PATCH)
import React, { useState, useEffect } from 'react';
import { Share2, X, Copy, Check, Calendar, Settings, RotateCcw } from 'lucide-react';
import { supabase } from '../../../supabase.jsx';
import './ShareLinkModal.css';

const EnhancedShareModal = ({
  shareLink,
  setShareLink,
  currentSelectedFiles = [],
  copiedLink,
  copyToClipboard,
}) => {
  const [activeTab, setActiveTab] = useState('link');
  const shareId = shareLink?.split('/').pop() || null;

  const [settings, setSettings] = useState({
    requiresPassword: false,
    password: '',
    requiresLogin: false, // (not enforced by backend now, kept for UI)
    allowDownload: true,
    expiryType: 'days',   // 'days' | 'date' | 'never'
    expiryDays: 7,
    expiryDate: '',
    maxDownloads: 10,
    enableMaxDownloads: false,
  });

  const [saveAsDefault, setSaveAsDefault] = useState(false);

  const files = currentSelectedFiles || [];
  const count = files.length;
  const first = files[0] || {};
  const title = count === 1 ? 'Share File' : 'Share Files';
  const subtitle = count === 1 ? first.name || 'Selected item' : `${count} files selected`;
  const selected = currentSelectedFiles?.[0] || {};
  const isFolder = selected.type === 'folder';

  const getAuthToken = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error('Failed to get session');
    if (!data?.session?.access_token) throw new Error('No active session found. Please log in again.');
    return data.session.access_token;
  };

  // Load default settings from localStorage
  useEffect(() => {
    const savedDefaults = localStorage.getItem('shareDefaultSettings');
    if (savedDefaults) {
      try {
        const parsed = JSON.parse(savedDefaults);
        setSettings((prev) => ({ ...prev, ...parsed }));
      } catch { /* ignore */ }
    }
  }, []);

  // Hydrate from PUBLIC endpoints (best-effort)
  useEffect(() => {
    if (!shareLink) return;
    const isFolderShare = shareLink.includes('/folder/');
    const id = shareLink.split('/').pop();
    if (!id) return;

    const url = isFolderShare
      ? `http://127.0.0.1:5000/folder/${id}`
      : `http://127.0.0.1:5000/share/${id}`;

    (async () => {
      try {
        const r = await fetch(url);
        if (!r.ok) return; // likely password-protected; skip
        const meta = await r.json();
        const allowDownload = meta.permission === 'download';
        const expiresAt = meta.expires_at ? meta.expires_at.slice(0, 16) : '';

        setSettings((prev) => ({
          ...prev,
          allowDownload,
          enableMaxDownloads: !!meta.download_limit,
          maxDownloads: meta.download_limit || prev.maxDownloads,
          expiryType: expiresAt ? 'date' : 'never',
          expiryDate: expiresAt || '',
        }));
      } catch { /* ignore */ }
    })();
  }, [shareLink]);

  // Hydrate from OWNER metadata (authoritative; requires auth)
  useEffect(() => {
    if (!shareId || isFolder) return; // folder patch may differ
    (async () => {
      try {
        const token = await getAuthToken();
        const r = await fetch(`http://127.0.0.1:5000/share/${shareId}/metadata`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) return;
        const meta = await r.json();
        setSettings((prev) => ({
          ...prev,
          requiresPassword: !!meta.password_protected,
          allowDownload: !!meta.allow_download,
          enableMaxDownloads: meta.max_clicks != null,
          maxDownloads: meta.max_clicks ?? prev.maxDownloads,
          expiryType: meta.expires_at ? 'date' : 'never',
          expiryDate: meta.expires_at ? String(meta.expires_at).slice(0, 16) : '',
        }));
      } catch { /* ignore */ }
    })();
  }, [shareId, isFolder]);

  const handleSaveDefaults = () => {
    localStorage.setItem('shareDefaultSettings', JSON.stringify(settings));
    alert('Default settings saved successfully!');
  };

  const handleResetToDefaults = () => {
    const savedDefaults = localStorage.getItem('shareDefaultSettings');
    if (savedDefaults) {
      try {
        const parsed = JSON.parse(savedDefaults);
        setSettings(parsed);
        return;
      } catch { /* fall through */ }
    }
    setSettings({
      requiresPassword: false,
      password: '',
      requiresLogin: false,
      allowDownload: true,
      expiryType: 'days',
      expiryDays: 7,
      expiryDate: '',
      maxDownloads: 10,
      enableMaxDownloads: false,
    });
  };

  // Create or Update share according to backend
  const handleApplySettings = async () => {
    // UI validations
    if (settings.requiresPassword && !settings.password.trim()) {
      alert('Please enter a password');
      return;
    }
    if (settings.expiryType === 'date' && !settings.expiryDate) {
      alert('Please select an expiry date');
      return;
    }
    if (settings.enableMaxDownloads && (!settings.maxDownloads || settings.maxDownloads < 1)) {
      alert('Please enter a valid number of maximum downloads');
      return;
    }
    if (!selected?.id) {
      alert('No file/folder selected');
      return;
    }

    const permission = settings.allowDownload ? 'download' : 'view';
    // Create payload for create-share endpoints
    const createPayload = {
      ...(isFolder ? { folder_id: selected.id } : { file_id: selected.id }),
      permission,
      view_limit: null, // not wired in UI
      download_limit: settings.enableMaxDownloads ? settings.maxDownloads : null,
      password: settings.requiresPassword ? settings.password : null,
    };

    // Update payload for PATCH (owner metadata)
    const patchPayload = {
      allow_download: settings.allowDownload,
      password: settings.requiresPassword ? settings.password : '',
      max_downloads: settings.enableMaxDownloads ? settings.maxDownloads : null,
      ...(settings.expiryType === 'date' && settings.expiryDate
        ? { expires_at: new Date(settings.expiryDate).toISOString() }
        : settings.expiryType === 'days'
        ? { expires_in_days: Number(settings.expiryDays) || 7 }
        : {}),
    };

    try {
      const token = await getAuthToken();

      // If we already have a file shareId, PATCH it; else create
      if (!isFolder && shareId) {
        const res = await fetch(`http://127.0.0.1:5000/share/${shareId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(patchPayload),
        });
        if (!res.ok) {
          const t = await res.text().catch(() => '');
          throw new Error(t || 'Failed to update share');
        }
        // keep same link
      } else {
        if (isFolder) {
          // Your folder share create route (unchanged)
          const res = await fetch('http://127.0.0.1:5000/folder/share', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(createPayload),
          });
          if (!res.ok) throw new Error('Failed to create folder share');
          const data = await res.json();
          setShareLink(data.share_link);
        } else {
          // File share create
          const res = await fetch('http://127.0.0.1:5000/share/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(createPayload),
          });
          if (!res.ok) throw new Error('Failed to create share');
          const data = await res.json();
          setShareLink(data.share_link);
        }
      }

      if (saveAsDefault) handleSaveDefaults();
      setActiveTab('link');
      alert('Share settings saved!');
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const calculateExpiryDate = () => {
    if (settings.expiryType === 'never') return null;
    if (settings.expiryType === 'date' && settings.expiryDate) return new Date(settings.expiryDate);
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + settings.expiryDays);
    return expiry;
  };

  if (!shareLink) return null;

  return (
    <div className="enhanced-share-modal-backdrop" onClick={() => setShareLink(null)}>
      <div className="enhanced-share-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="enhanced-modal-header">
          <div className="enhanced-modal-title">
            <div className="share-icon-container">
              <Share2 size={20} />
            </div>
            <div>
              <h2>{title}</h2>
              <p className="modal-subtitle">{subtitle}</p>
            </div>
          </div>
          <button onClick={() => setShareLink(null)} className="close-button">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="tab-navigation">
          <button onClick={() => setActiveTab('link')} className={`tab-button ${activeTab === 'link' ? 'active' : ''}`}>
            Share Link
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          >
            <Settings size={16} />
            Settings
          </button>
        </div>

        {/* Content */}
        <div className="share-modal-content">
          {activeTab === 'link' ? (
            <div className="link-tab">
              {/* Link Input */}
              <div className="input-container">
                <label className="input-label">Shareable Link</label>
                <div className="link-input-wrapper">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    onClick={(e) => e.target.select()}
                    className="link-input"
                  />
                  <div className="copy-indicator">{copiedLink ? <Check size={16} /> : <Copy size={16} />}</div>
                </div>
              </div>

              {/* Current Settings Summary */}
              <div className="settings-summary-card">
                <h3>
                  <Settings size={16} />
                  Current Settings
                </h3>
                <div className="summary-item">
                  <span>Access Control:</span>
                  <span className="summary-badge">
                    {settings.requiresLogin
                      ? 'Login Required'
                      : settings.requiresPassword
                      ? 'Password Protected'
                      : 'Public Access'}
                  </span>
                </div>
                <div className="summary-item">
                  <span>Download:</span>
                  <span className="summary-badge">{settings.allowDownload ? 'Allowed' : 'View Only'}</span>
                </div>
                <div className="summary-item">
                  <span>Expires:</span>
                  <span className="summary-badge">
                    {settings.expiryType === 'never'
                      ? 'Never'
                      : settings.expiryType === 'date' && settings.expiryDate
                      ? new Date(settings.expiryDate).toLocaleDateString()
                      : `${settings.expiryDays} days`}
                  </span>
                </div>
                {settings.enableMaxDownloads && (
                  <div className="summary-item">
                    <span>Max Downloads:</span>
                    <span className="summary-badge">{settings.maxDownloads}</span>
                  </div>
                )}
                <button onClick={() => setActiveTab('settings')} className="modify-settings-link">
                  Modify Settings →
                </button>
              </div>

              {/* Actions */}
              <div className="modal-actions">
                <button
                  onClick={() => copyToClipboard(shareLink)}
                  className={`copy-button ${copiedLink ? 'copied' : 'default'}`}
                >
                  {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                  {copiedLink ? 'Copied!' : 'Copy Link'}
                </button>

                <button onClick={() => setShareLink(null)} className="cancel-button">
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div className="settings-tab">
              {/* Default Settings Banner */}
              <div className="default-settings-banner">
                <div className="default-settings-info">
                  <Settings size={16} />
                  <div>
                    <span>Default Settings</span>
                    <p>Save these settings for future shares</p>
                  </div>
                </div>
                <button onClick={handleResetToDefaults} className="reset-button">
                  <RotateCcw size={14} />
                  Reset
                </button>
              </div>

              {/* Access Control */}
              <div className="settings-section">
                <h3 className="section-title">Access Control</h3>
                <div className="share-setting-item">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.requiresPassword}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          requiresPassword: e.target.checked,
                          password: e.target.checked ? settings.password : '',
                        })
                      }
                    />
                    <div>
                      <span>Require password</span>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                        Users must enter password to access
                      </p>
                    </div>
                  </label>

                  {settings.requiresPassword && (
                    <input
                      type="password"
                      value={settings.password}
                      onChange={(e) => setSettings({ ...settings, password: e.target.value })}
                      placeholder="Enter password"
                      className="password-input"
                    />
                  )}
                </div>
              </div>

              {/* Download Permissions */}
              <div className="settings-section">
                <h3 className="section-title">Download Permissions</h3>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="downloadPerm"
                      checked={settings.allowDownload}
                      onChange={() => setSettings({ ...settings, allowDownload: true })}
                    />
                    <div>
                      <span>Allow download</span>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                        Users can download files
                      </p>
                    </div>
                  </label>

                  <label className="radio-label">
                    <input
                      type="radio"
                      name="downloadPerm"
                      checked={!settings.allowDownload}
                      onChange={() => setSettings({ ...settings, allowDownload: false })}
                    />
                    <div>
                      <span>View only</span>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                        Users can only preview
                      </p>
                    </div>
                  </label>
                </div>

                {/* Max Downloads */}
                {settings.allowDownload && (
                  <div className="setting-item">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={settings.enableMaxDownloads}
                        onChange={(e) => setSettings({ ...settings, enableMaxDownloads: e.target.checked })}
                      />
                      <span>Limit number of downloads</span>
                    </label>

                    {settings.enableMaxDownloads && (
                      <div className="number-input-group">
                        <span>Max downloads:</span>
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={settings.maxDownloads || ''}
                          onChange={(e) =>
                            setSettings({ ...settings, maxDownloads: parseInt(e.target.value) || null })
                          }
                          className="number-input"
                          placeholder="10"
                        />
                        <span>downloads</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Expiry */}
              <div className="settings-section">
                <h3 className="section-title">
                  <Calendar size={16} />
                  Link Expiry
                </h3>

                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="expiryType"
                      checked={settings.expiryType === 'days'}
                      onChange={() => setSettings({ ...settings, expiryType: 'days' })}
                    />
                    <span>Expire after number of days</span>
                  </label>
                  {settings.expiryType === 'days' && (
                    <div className="number-input-group">
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={settings.expiryDays}
                        onChange={(e) =>
                          setSettings({ ...settings, expiryDays: parseInt(e.target.value) || 7 })
                        }
                        className="number-input"
                      />
                      <span>days from now</span>
                    </div>
                  )}

                  <label className="radio-label">
                    <input
                      type="radio"
                      name="expiryType"
                      checked={settings.expiryType === 'date'}
                      onChange={() => setSettings({ ...settings, expiryType: 'date' })}
                    />
                    <span>Expire on specific date</span>
                  </label>
                  {settings.expiryType === 'date' && (
                    <input
                      type="datetime-local"
                      value={settings.expiryDate}
                      onChange={(e) => setSettings({ ...settings, expiryDate: e.target.value })}
                      min={new Date().toISOString().slice(0, 16)}
                      className="date-input"
                    />
                  )}

                  <label className="radio-label">
                    <input
                      type="radio"
                      name="expiryType"
                      checked={settings.expiryType === 'never'}
                      onChange={() => setSettings({ ...settings, expiryType: 'never' })}
                    />
                    <span>Never expires</span>
                  </label>
                </div>
              </div>

              {/* Save as default */}
              <div className="save-default-section">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={saveAsDefault}
                    onChange={(e) => setSaveAsDefault(e.target.checked)}
                  />
                  <div>
                    <span>Save as default settings</span>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                      Use these settings for future shares
                    </p>
                  </div>
                </label>
              </div>

              {/* Settings summary */}
              <div className="settings-summary-detailed">
                <h4>Settings Summary</h4>
                <div
                  style={{ fontSize: '13px', color: '#1e40af', display: 'flex', flexDirection: 'column', gap: '8px' }}
                >
                  <div>
                    Access:{' '}
                    {settings.requiresLogin
                      ? 'Login required'
                      : settings.requiresPassword
                      ? 'Password protected'
                      : 'Public access'}
                  </div>
                  <div>Download: {settings.allowDownload ? 'Allowed' : 'View only'}</div>
                  {settings.enableMaxDownloads && settings.allowDownload && (
                    <div>🔢 Max downloads: {settings.maxDownloads}</div>
                  )}
                  <div>
                    Expires:{' '}
                    {settings.expiryType === 'never'
                      ? 'Never'
                      : settings.expiryType === 'date' && settings.expiryDate
                      ? new Date(settings.expiryDate).toLocaleDateString()
                      : `${settings.expiryDays} days from now`}
                  </div>
                  {calculateExpiryDate() && (
                    <div style={{ color: '#0ea5e9', fontWeight: '600' }}>
                      Expiry: {calculateExpiryDate().toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="modal-actions">
                <button onClick={handleApplySettings} className="apply-button">
                  Apply Settings
                </button>
                <button onClick={() => setActiveTab('link')} className="cancel-button">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedShareModal;
