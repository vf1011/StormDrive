

// export default FileSharingPreferences;
import React, { useState, useEffect } from "react";
import "./Styles/FileSharing.css";
import { supabase } from "../../../supabase";

const FileSharingPreferences = () => {
  // Set premium as default for showcasing secured share link features
  const [userPlan, setUserPlan] = useState('premium'); // Changed from 'free' to 'premium'
  const [preferences, setPreferences] = useState({
    publicSharing: false,
    requireLogin: true,
    temporaryLink: false,
    expiryDays: 7,
    defaultAccess: 'view-only', // 'view-only' or 'downloadable'
    watermark: true,
    passwordProtection: false,
    defaultPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    // Comment out plan fetching to use premium by default
    // fetchUserPlan();
    if (userPlan === 'premium') {
      fetchPreferences();
    }
  }, [userPlan]);

  // Commented out to showcase premium features
  // const fetchUserPlan = async () => {
  //   try {
  //     const { data: { session } } = await supabase.auth.getSession();
  //     const token = session?.access_token;
      
  //     if (!token) return;

  //     const res = await fetch('http://127.0.0.1:5000/user/plan', {
  //       headers: { Authorization: `Bearer ${token}` }
  //     });

  //     if (res.ok) {
  //       const data = await res.json();
  //       setUserPlan(data.plan_type || 'free');
  //     }
  //   } catch (error) {
  //     console.error('Error fetching user plan:', error);
  //   }
  // };

  const fetchPreferences = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) return;

      const res = await fetch('http://127.0.0.1:5000/sharing/preferences', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setPreferences(data.preferences || preferences);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const savePreferences = async () => {
    if (userPlan === 'free') return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) return;

      const res = await fetch('http://127.0.0.1:5000/sharing/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ preferences })
      });

      if (res.ok) {
        alert('Preferences saved successfully!');
      } else {
        alert('Failed to save preferences. Please try again.');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    setShowUpgradeModal(true);
  };

  const closeUpgradeModal = () => {
    setShowUpgradeModal(false);
  };

  const handlePreferenceChange = (key, value) => {
    if (userPlan === 'free') {
      handleUpgrade();
      return;
    }
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const renderFreeUserView = () => (
    <div className="preferences-container">
      {/* Header */}
      <div className="preferences-header">
        <div className="header-content">
          <h1>File Sharing Preferences</h1>
          <p>Customize your default sharing settings</p>
        </div>
        <div className="plan-badge free-badge">
          Free Plan
        </div>
      </div>

      {/* Premium Feature Notice */}
      <div className="premium-notice">
        <div className="notice-icon">🔒</div>
        <div className="notice-content">
          <h3>This feature is available for premium users only</h3>
          <p>Upgrade to Premium to set custom sharing defaults and unlock advanced sharing controls.</p>
          <button className="btn-upgrade" onClick={handleUpgrade}>
            Upgrade Now
          </button>
        </div>
      </div>

      {/* Current Global Settings (Read-only) */}
      <div className="global-settings-card">
        <h2>Current Global Settings</h2>
        <p className="settings-note">All your shared files use these system defaults:</p>
        
        <div className="setting-display">
          <div className="setting-item">
            <span className="setting-label">Default Access Level</span>
            <span className="setting-value">View-only</span>
          </div>
          <div className="setting-item">
            <span className="setting-label">Link Type</span>
            <span className="setting-value">Permanent</span>
          </div>
          <div className="setting-item">
            <span className="setting-label">Login Required</span>
            <span className="setting-value">Yes</span>
          </div>
          <div className="setting-item">
            <span className="setting-label">Watermark</span>
            <span className="setting-value">Enabled</span>
          </div>
          <div className="setting-item">
            <span className="setting-label">Password Protection</span>
            <span className="setting-value">Disabled</span>
          </div>
        </div>

        <div className="upgrade-prompt">
          <p>Want to customize these settings?</p>
          <button className="btn-upgrade-small" onClick={handleUpgrade}>
            Upgrade to Premium
          </button>
        </div>
      </div>

      {/* Share Dialog Preview */}
      <div className="share-preview-card">
        <h2>Share Dialog Preview</h2>
        <p>This is what you see when sharing files:</p>
        
        <div className="share-dialog-preview">
          <div className="preview-header">
            <h4>Share File</h4>
          </div>
          <div className="preview-content">
            <div className="upgrade-note">
              <span className="note-icon">💡</span>
              <span>Upgrade to Premium to set custom sharing defaults.</span>
            </div>
            <button className="btn-create-link">Create Link</button>
            <p className="preview-note">Creates link with default settings: view-only, permanent, login required, no password</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPremiumUserView = () => (
    <div className="preferences-container">
      {/* Header */}
      <div className="preferences-header">
        <div className="header-content">
          <h1>File Sharing Preferences</h1>
          <p>Customize your default sharing settings</p>
        </div>
        <div className="plan-badge premium-badge">
          Premium Plan
        </div>
      </div>

      {/* Preferences Grid */}
      <div className="preferences-grid">
        {/* Left Column */}
       
          {/* Public Sharing */}
          <div className="preference-card">
            <h3>Public Sharing</h3>
            <p>Allow files to be accessed without login</p>
            <div className="toggle-container">
              <button
                className={`toggle-switch ${preferences.publicSharing ? 'enabled' : 'disabled'}`}
                onClick={() => handlePreferenceChange('publicSharing', !preferences.publicSharing)}
              >
                <span className="toggle-slider"></span>
              </button>
              <span className="toggle-label">
                {preferences.publicSharing ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          {/* Require Login */}
          <div className="preference-card">
            <h3>Require Login</h3>
            <p>Users must sign in to access shared files</p>
            <div className="toggle-container">
              <button
                className={`toggle-switch ${preferences.requireLogin ? 'enabled' : 'disabled'}`}
                onClick={() => handlePreferenceChange('requireLogin', !preferences.requireLogin)}
                disabled={preferences.publicSharing}
              >
                <span className="toggle-slider"></span>
              </button>
              <span className="toggle-label">
                {preferences.requireLogin ? 'Required' : 'Not Required'}
              </span>
              {/* {preferences.publicSharing && (
                <p className="setting-note">Disabled when public sharing is enabled</p>
              )} */}
            </div>
          </div>

          {/* Temporary Links */}
          <div className="preference-card">
            <h3>Temporary Links</h3>
            <p>Create links that expire automatically</p>
            <div className="toggle-container">
              <button
                className={`toggle-switch ${preferences.temporaryLink ? 'enabled' : 'disabled'}`}
                onClick={() => handlePreferenceChange('temporaryLink', !preferences.temporaryLink)}
              >
                <span className="toggle-slider"></span>
              </button>
              <span className="toggle-label">
                {preferences.temporaryLink ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            
            {preferences.temporaryLink && (
              <div className="expiry-setting">
                <label>Default Expiry Days</label>
                <select
                  value={preferences.expiryDays}
                  onChange={(e) => handlePreferenceChange('expiryDays', parseInt(e.target.value))}
                  className="expiry-select"
                >
                  <option value={1}>1 day</option>
                  <option value={3}>3 days</option>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>
            )}
          </div>

          {/* Password Protection */}
          <div className="preference-card">
            <h3>Password Protection</h3>
            <p>Require a password to access shared files</p>
            <div className="toggle-container">
              <button
                className={`toggle-switch ${preferences.passwordProtection ? 'enabled' : 'disabled'}`}
                onClick={() => handlePreferenceChange('passwordProtection', !preferences.passwordProtection)}
              >
                <span className="toggle-slider"></span>
              </button>
              <span className="toggle-label">
                {preferences.passwordProtection ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            
            {preferences.passwordProtection && (
              <div className="expiry-setting">
                <label>Default Password (optional)</label>
                <input
                  type="password"
                  value={preferences.defaultPassword}
                  onChange={(e) => handlePreferenceChange('defaultPassword', e.target.value)}
                  placeholder="Leave empty to set password for each link"
                  className="password-input"
                />
                <p className="setting-note">If no default password is set, you'll be prompted to create one for each shared link</p>
              </div>
            )}
          </div>
        

        {/* Right Column */}
     
          {/* Default Access Level */}
          <div className="preference-card">
            <h3>Default Access Level</h3>
            <p>Choose the default permission level for shared links</p>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="defaultAccess"
                  value="view-only"
                  checked={preferences.defaultAccess === 'view-only'}
                  onChange={(e) => handlePreferenceChange('defaultAccess', e.target.value)}
                />
                <div className="radio-content">
                <span className="radio-label">View-only</span>
                <p className="radio-description">Users can view but cannot download</p>
                </div>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="defaultAccess"
                  value="downloadable"
                  checked={preferences.defaultAccess === 'downloadable'}
                  onChange={(e) => handlePreferenceChange('defaultAccess', e.target.value)}
                />
                <div className="radio-content">
                <span className="radio-label">Downloadable</span>
                <p className="radio-description">Users can view and download</p>
                </div>
              </label>
            </div>
          </div>

          {/* Watermark */}
          <div className="preference-card">
            <h3>Watermark</h3>
            <p>Add watermark to shared documents</p>
            <div className="toggle-container">
              <button
                className={`toggle-switch ${preferences.watermark ? 'enabled' : 'disabled'}`}
                onClick={() => handlePreferenceChange('watermark', !preferences.watermark)}
              >
                <span className="toggle-slider"></span>
              </button>
              <span className="toggle-label">
                {preferences.watermark ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        
      </div>

      {/* Save Button */}
      <div className="save-section">
        <button 
          className="btn-save" 
          onClick={savePreferences}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="file-sharing-page">
      {userPlan === 'free' ? renderFreeUserView() : renderPremiumUserView()}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="file-sharing-modal-overlay">
          <div className="modal-content upgrade-modal">
            <div className="modal-header">
              <h3>Upgrade to Premium</h3>
              <button className="modal-close" onClick={closeUpgradeModal}>×</button>
            </div>
            
            <div className="upgrade-benefits">
              <h4>Unlock File Sharing Preferences:</h4>
              <ul>
                <li>✓ Customize sharing defaults</li>
                <li>✓ Set temporary link expiry</li>
                <li>✓ Choose access levels (view-only vs downloadable)</li>
                <li>✓ Control watermark settings</li>
                <li>✓ Enable/disable public sharing</li>
                <li>✓ Set password protection for links</li>
                <li>✓ Advanced sharing controls</li>
              </ul>
            </div>

            <div className="pricing-options">
              <div className="price-option">
                <h4>Premium Monthly</h4>
                <div className="price">₹149<span>/month</span></div>
                <button className="btn-upgrade">Choose Monthly</button>
              </div>
              <div className="price-option recommended">
                <div className="recommended-badge">Recommended</div>
                <h4>Premium Annual</h4>
                <div className="price">₹1,490<span>/year</span></div>
                <div className="savings">Save 17%</div>
                <button className="btn-upgrade">Choose Annual</button>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={closeUpgradeModal}>
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileSharingPreferences;