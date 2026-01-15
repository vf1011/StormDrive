
import { useEffect, useState } from 'react';
import './Styles/ConnectedDevices.css';
import { supabase } from '../../../supabase';

const ConnectedDevices = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sessionToRevoke, setSessionToRevoke] = useState(null);
  const [isRevoking, setIsRevoking] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('http://127.0.0.1:5000/user/sessions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to load sessions');
      }
      const { sessions } = await res.json();
      setSessions(sessions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (sessionId) => {
    setIsRevoking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`http://127.0.0.1:5000/user/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to revoke session');
      await loadSessions();
      setShowConfirmModal(false);
      setSessionToRevoke(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsRevoking(false);
    }
  };

  const revokeAll = async () => {
    setIsRevoking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('http://127.0.0.1:5000/user/sessions', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to revoke all sessions');
      await loadSessions();
      setShowConfirmModal(false);
      setSessionToRevoke(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsRevoking(false);
    }
  };

  const handleRevokeClick = (sessionId = null) => {
    setSessionToRevoke(sessionId);
    setShowConfirmModal(true);
  };

  const handleConfirmRevoke = () => {
    if (sessionToRevoke) {
      revokeSession(sessionToRevoke);
    } else {
      revokeAll();
    }
  };

  const parseUserAgent = (userAgent) => {
    if (!userAgent) return { device: 'Unknown Device', browser: 'Unknown Browser', os: 'Unknown OS' };
    
    // Simple user agent parsing
    let device = 'Desktop';
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';

    // Detect mobile/tablet
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      if (/iPad/.test(userAgent)) device = 'iPad';
      else if (/iPhone/.test(userAgent)) device = 'iPhone';
      else if (/Android/.test(userAgent)) device = 'Android Device';
      else device = 'Mobile Device';
    }

    // Detect browser
    if (/Chrome/.test(userAgent)) browser = 'Chrome';
    else if (/Firefox/.test(userAgent)) browser = 'Firefox';
    else if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) browser = 'Safari';
    else if (/Edge/.test(userAgent)) browser = 'Edge';

    // Detect OS
    if (/Windows/.test(userAgent)) os = 'Windows';
    else if (/Mac/.test(userAgent)) os = 'macOS';
    else if (/Linux/.test(userAgent)) os = 'Linux';
    else if (/iOS/.test(userAgent)) os = 'iOS';
    else if (/Android/.test(userAgent)) os = 'Android';

    return { device, browser, os };
  };

  const getDeviceIcon = (userAgent) => {
    const { device } = parseUserAgent(userAgent);
    if (device.includes('iPhone') || device.includes('Mobile')) return '📱';
    if (device.includes('iPad')) return '📱';
    if (device.includes('Android')) return '📱';
    return '💻';
  };

  const formatLastActive = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="connected-devices-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your connected devices...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="connected-devices-page">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3>Unable to load devices</h3>
          <p>{error}</p>
          <button className="btn-retry" onClick={loadSessions}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="connected-devices-page">
      <div className="devices-container">
        {/* Header */}
        <div className="devices-header">
          <div className="header-content">
            <h1>Connected Devices & Apps</h1>
            <p>Manage devices and applications that have access to your account</p>
          </div>
          {sessions.length > 0 && (
            <button 
              className="btn-revoke-all" 
              onClick={() => handleRevokeClick(null)}
              disabled={isRevoking}
            >
              {isRevoking ? 'Revoking...' : 'Revoke All Sessions'}
            </button>
          )}
        </div>

        {/* Security Info */}
        <div className="security-info-card">
          <div className="info-icon">🔒</div>
          <div className="info-content">
            <h3>Keep Your Account Secure</h3>
            <p>
              Review your connected devices regularly. If you see any unfamiliar devices or locations, 
              revoke their access immediately and consider changing your password.
            </p>
          </div>
        </div>

        {/* Sessions List */}
        {sessions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📱</div>
            <h3>No Active Sessions</h3>
            <p>There are currently no active sessions for your account.</p>
          </div>
        ) : (
          <div className="sessions-grid">
            {sessions.map((session, index) => {
              const { device, browser, os } = parseUserAgent(session.user_agent);
              const isCurrentSession = index === 0; // Assume first session is current
              
              return (
                <div key={session.session_id} className={`session-card ${isCurrentSession ? 'current-session' : ''}`}>
                  <div className="session-header">
                    <div className="device-info">
                      <span className="device-icon">{getDeviceIcon(session.user_agent)}</span>
                      <div className="device-details">
                        <h4>{device}</h4>
                        <p>{browser} on {os}</p>
                      </div>
                    </div>
                    {isCurrentSession && (
                      <span className="current-badge">Current Session</span>
                    )}
                  </div>

                  <div className="session-details">
                    <div className="detail-item">
                      <span className="detail-label">IP Address</span>
                      <span className="detail-value">{session.ip_address}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Last Active</span>
                      <span className="detail-value">{formatLastActive(session.last_active)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Session ID</span>
                      <span className="detail-value session-id">
                        {session.session_id.substring(0, 8)}...
                      </span>
                    </div>
                  </div>

                  <div className="session-actions">
                    {!isCurrentSession && (
                      <button 
                        className="btn-revoke" 
                        onClick={() => handleRevokeClick(session.session_id)}
                        disabled={isRevoking}
                      >
                        {isRevoking ? 'Revoking...' : 'Revoke Access'}
                      </button>
                    )}
                    {isCurrentSession && (
                      <span className="current-session-note">
                        This is your current session
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tips Section */}
        <div className="tips-section">
          <h3>Security Tips</h3>
          <div className="tips-grid">
            <div className="tip-item">
              <span className="tip-icon">🔍</span>
              <div>
                <h4>Regular Reviews</h4>
                <p>Check your connected devices monthly for any unauthorized access.</p>
              </div>
            </div>
            <div className="tip-item">
              <span className="tip-icon">🌍</span>
              <div>
                <h4>Monitor Locations</h4>
                <p>Be alert to sign-ins from unfamiliar IP addresses or locations.</p>
              </div>
            </div>
            <div className="tip-item">
              <span className="tip-icon">🔄</span>
              <div>
                <h4>Revoke Unused</h4>
                <p>Remove access for devices you no longer use or recognize.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="connected-devices-modal-overlay">
          <div className="modal-content confirm-modal">
            <div className="modal-header">
              <h3>
                {sessionToRevoke ? 'Revoke Device Access' : 'Revoke All Sessions'}
              </h3>
            </div>
            
            <div className="modal-body">
              <div className="warning-icon">⚠️</div>
              <p>
                {sessionToRevoke 
                  ? 'Are you sure you want to revoke access for this device? The user will need to sign in again.'
                  : 'Are you sure you want to revoke all sessions? You will need to sign in again on all devices except this one.'
                }
              </p>
            </div>

            <div className="modal-actions">
              <button 
                className="btn-cancel" 
                onClick={() => {
                  setShowConfirmModal(false);
                  setSessionToRevoke(null);
                }}
                disabled={isRevoking}
              >
                Cancel
              </button>
              <button 
                className="btn-confirm" 
                onClick={handleConfirmRevoke}
                disabled={isRevoking}
              >
                {isRevoking ? 'Revoking...' : 'Yes, Revoke Access'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectedDevices;