// import React, { useState } from "react";
// import "./Styles/DangerZone.css";

// const DangerZone = () => {
//   const [message, setMessage] = useState("");

//   const handleDeleteAccount = () => {
//     fetch("/api/delete-account", {
//       method: "DELETE",
//       credentials: "include",
//     })
//       .then((res) => res.json())
//       .then((data) => setMessage(data.message || "Account deleted"))
//       .catch(() => setMessage("Failed to delete account"));
//   };

//   const handleResetSettings = () => {
//     fetch("/api/reset-settings", {
//       method: "POST",
//       credentials: "include",
//     })
//       .then((res) => res.json())
//       .then((data) => setMessage(data.message || "Settings reset"))
//       .catch(() => setMessage("Failed to reset settings"));
//   };

//   const handleClearStorage = () => {
//     fetch("/api/clear-storage", {
//       method: "DELETE",
//       credentials: "include",
//     })
//       .then((res) => res.json())
//       .then((data) => setMessage(data.message || "Storage cleared"))
//       .catch(() => setMessage("Failed to clear storage"));
//   };

//   return (
//     <div className="danger-wrapper">
//       <div className="danger-card">
//         <h2 className="danger-title">Danger Zone</h2>
//         <p className="danger-description">
//           These actions are irreversible. Please proceed with caution.
//         </p>

//         <div className="danger-actions">
//           <div className="danger-item">
//             <div>
//               <p className="danger-action-title">Delete Account</p>
//               <p className="danger-action-description">
//                 Permanently delete your Stormdrive account and all data.
//               </p>
//             </div>
//             <button className="danger-btn delete" onClick={handleDeleteAccount}>
//               Delete
//             </button>
//           </div>

//           <div className="danger-item">
//             <div>
//               <p className="danger-action-title">Reset Settings</p>
//               <p className="danger-action-description">
//                 Restore all settings to default.
//               </p>
//             </div>
//             <button className="danger-btn reset" onClick={handleResetSettings}>
//               Reset
//             </button>
//           </div>

//           <div className="danger-item">
//             <div>
//               <p className="danger-action-title">Clear Storage</p>
//               <p className="danger-action-description">
//                 Remove all uploaded files and documents.
//               </p>
//             </div>
//             <button className="danger-btn clear" onClick={handleClearStorage}>
//               Clear
//             </button>
//           </div>
//         </div>

//         {message && <div className="danger-toast">{message}</div>}
//       </div>
//     </div>
//   );
// };

// export default DangerZone;
import React, { useState, useEffect } from 'react';
import './Styles/DangerZone.css';
import { supabase } from '../../../supabase';

/**
 * DangerZone Component
 * - Simple, clean design matching Security & Privacy page
 * - High-risk account management actions
 * - Backend integration with confirmation modals
 */
const DangerZone = () => {
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [totpInput, setTotpInput] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [actionInProgress, setActionInProgress] = useState(false);

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const dangerActions = [
    {
      id: 'export-data',
      title: 'Export Your Data',
      description: 'Download a complete archive of all your files, metadata, sharing links, and activity logs.',
      buttonText: 'Export Data',
      buttonClass: 'btn-export',
      severity: 'low',
      confirmationType: 'simple'
    },
    {
      id: 'empty-trash',
      title: 'Empty Trash',
      description: 'Permanently delete all items in your recycle bin. This bypasses the 30-day restore window.',
      buttonText: 'Empty Trash',
      buttonClass: 'btn-warning',
      severity: 'medium',
      confirmationType: 'simple'
    },
    {
      id: 'revoke-tokens',
      title: 'Revoke All API Tokens',
      description: 'Invalidate all personal API keys and third-party OAuth integrations. Connected apps will lose access.',
      buttonText: 'Revoke All Tokens',
      buttonClass: 'btn-warning',
      severity: 'medium',
      confirmationType: 'simple'
    },
    {
      id: 'reset-settings',
      title: 'Reset All Settings',
      description: 'Restore all preferences to factory defaults including 2FA, quotas, sharing settings, and themes.',
      buttonText: 'Reset Settings',
      buttonClass: 'btn-warning',
      severity: 'medium',
      confirmationType: 'type-confirm'
    },
    {
      id: 'delete-versions',
      title: 'Delete All File Versions',
      description: 'Permanently remove version history for all files to reclaim storage space. Only current versions remain.',
      buttonText: 'Delete Versions',
      buttonClass: 'btn-danger',
      severity: 'high',
      confirmationType: 'type-confirm'
    },
    {
      id: 'delete-account',
      title: 'Delete Account',
      description: 'Permanently delete your account, all files, folders, shares, and associated data. This cannot be undone.',
      buttonText: 'Delete Account',
      buttonClass: 'btn-danger',
      severity: 'critical',
      confirmationType: 'full-verification'
    }
  ];

  const handleActionClick = (action) => {
    setActiveModal(action.id);
    setCurrentStep(1);
    setConfirmationInput('');
    setPasswordInput('');
    setTotpInput('');
  };

  const closeModal = () => {
    setActiveModal(null);
    setCurrentStep(1);
    setConfirmationInput('');
    setPasswordInput('');
    setTotpInput('');
    setActionInProgress(false);
  };

  const handleConfirmAction = async () => {
    const action = dangerActions.find(a => a.id === activeModal);
    if (!action) return;

    setActionInProgress(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) throw new Error('Not authenticated');

      // Prepare request payload based on verification level
      const payload = {
        action: action.id,
        confirmation: confirmationInput
      };

      // Add password for full verification actions
      if (action.confirmationType === 'full-verification') {
        payload.password = passwordInput;
        if (totpInput) payload.totp = totpInput;
      }

      // Make API call to specific endpoint based on action
      let endpoint;
      let method = 'POST';
      
      switch (action.id) {
        case 'export-data':
          endpoint = 'http://127.0.0.1:5000/user/export';
          method = 'GET';
          break;
        case 'empty-trash':
          endpoint = 'http://127.0.0.1:5000/trash/empty';
          method = 'DELETE';
          break;
        case 'revoke-tokens':
          endpoint = 'http://127.0.0.1:5000/user/tokens/revoke-all';
          method = 'POST';
          break;
        case 'reset-settings':
          endpoint = 'http://127.0.0.1:5000/user/settings/reset';
          method = 'POST';
          break;
        case 'delete-versions':
          endpoint = 'http://127.0.0.1:5000/files/versions/delete-all';
          method = 'DELETE';
          break;
        case 'delete-account':
          endpoint = 'http://127.0.0.1:5000/user/account/delete';
          method = 'DELETE';
          break;
        default:
          throw new Error('Unknown action');
      }

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: method !== 'GET' ? JSON.stringify(payload) : undefined
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error || errorData?.message || `Failed to ${action.title.toLowerCase()}`;
        throw new Error(errorMessage);
      }

      // Handle different response types
      if (action.id === 'export-data') {
        // Handle file download
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/zip')) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `data-export-${new Date().toISOString().split('T')[0]}.zip`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        } else {
          throw new Error('Invalid export file received');
        }
      } else if (action.id === 'delete-account') {
        // Sign out user and redirect after successful account deletion
        await supabase.auth.signOut();
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/';
        return;
      } else {
        // For other actions, show success message with any returned data
        const responseData = await response.json().catch(() => null);
        let successMessage = `${action.title} completed successfully.`;
        
        if (responseData?.message) {
          successMessage = responseData.message;
        } else if (responseData?.deleted_count !== undefined) {
          successMessage = `${action.title} completed. ${responseData.deleted_count} items affected.`;
        } else if (responseData?.revoked_count !== undefined) {
          successMessage = `${action.title} completed. ${responseData.revoked_count} tokens revoked.`;
        }
        
        alert(successMessage);
      }

      closeModal();
      
      // Refresh page data if needed for certain actions
      if (['empty-trash', 'reset-settings', 'delete-versions'].includes(action.id)) {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
      
    } catch (error) {
      console.error(`Error performing ${action.title}:`, error);
      alert(error.message || `Failed to ${action.title.toLowerCase()}. Please try again.`);
    } finally {
      setActionInProgress(false);
    }
  };

  const canProceedToNextStep = () => {
    const action = dangerActions.find(a => a.id === activeModal);
    if (!action) return false;

    if (action.confirmationType === 'simple') return true;
    
    if (currentStep === 1) {
      if (action.confirmationType === 'type-confirm') {
        return confirmationInput.toUpperCase() === 'DELETE';
      }
      if (action.confirmationType === 'full-verification') {
        return confirmationInput === userEmail;
      }
    }
    
    if (currentStep === 2 && action.confirmationType === 'full-verification') {
      return passwordInput.length > 0;
    }

    return true;
  };

  const renderConfirmationModal = () => {
    const action = dangerActions.find(a => a.id === activeModal);
    if (!action) return null;

    const isSimple = action.confirmationType === 'simple';
    const isTypeConfirm = action.confirmationType === 'type-confirm';
    const isFullVerification = action.confirmationType === 'full-verification';

    return (
      <div className="confirm-modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h3>{action.title}</h3>
            <button className="modal-close" onClick={closeModal}>×</button>
          </div>

          <div className="modal-body">
            <p className="modal-description">{action.description}</p>
            
            {action.severity === 'critical' && (
              <div className="warning-message">
                <strong>⚠️ THIS CANNOT BE UNDONE</strong>
              </div>
            )}

            {/* Step 1: Basic Confirmation */}
            {currentStep === 1 && (
              <div className="confirmation-step">
                {isSimple && (
                  <p>Are you sure you want to {action.title.toLowerCase()}?</p>
                )}
                
                {isTypeConfirm && (
                  <div className="input-group">
                    <label>Type <strong>DELETE</strong> to continue:</label>
                    <input
                      type="text"
                      value={confirmationInput}
                      onChange={(e) => setConfirmationInput(e.target.value)}
                      placeholder="Type DELETE"
                      className="confirmation-input"
                    />
                  </div>
                )}
                
                {isFullVerification && (
                  <div className="input-group">
                    <label>Type your email address to continue:</label>
                    <input
                      type="email"
                      value={confirmationInput}
                      onChange={(e) => setConfirmationInput(e.target.value)}
                      placeholder={userEmail}
                      className="confirmation-input"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Password Verification */}
            {currentStep === 2 && isFullVerification && (
              <div className="confirmation-step">
                <h4>Enter your password to continue</h4>
                <div className="input-group">
                  <label>Password:</label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter your password"
                    className="confirmation-input"
                  />
                </div>
              </div>
            )}

            {/* Step 3: 2FA Verification */}
            {currentStep === 3 && isFullVerification && (
              <div className="confirmation-step">
                <h4>Two-Factor Authentication</h4>
                <div className="input-group">
                  <label>Enter your 6-digit TOTP code:</label>
                  <input
                    type="text"
                    value={totpInput}
                    onChange={(e) => setTotpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="confirmation-input totp-input"
                    maxLength="6"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button 
              className="btn-cancel" 
              onClick={closeModal}
              disabled={actionInProgress}
            >
              Cancel
            </button>
            
            {/* Show different buttons based on step and confirmation type */}
            {(isSimple || currentStep === (isFullVerification ? 3 : 1)) ? (
              <button 
                className={`btn-confirm ${action.severity}`}
                onClick={handleConfirmAction}
                disabled={!canProceedToNextStep() || actionInProgress}
              >
                {actionInProgress ? 'Processing...' : `${action.buttonText}`}
              </button>
            ) : (
              <button 
                className="btn-next"
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceedToNextStep()}
              >
                Continue
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="danger-zone-page">
      <div className="danger-container">
        {/* Header */}
        <div className="danger-header">
          <div className="header-content">
            <h1>Danger Zone</h1>
            <p>Irreversible actions that permanently affect your account and data</p>
          </div>
        </div>

        {/* Content Grid */}
        <div className="delete-content-grid">
          {/* Left Column */}
            {dangerActions.slice(0, 3).map((action) => (
              <div key={action.id} className="section-card">
                <div className="setting-row">
                  <div className="setting-info">
                    <h4>{action.title}</h4>
                    <p>{action.description}</p>
                  </div>
                  <div className="setting-controls">
                    <button 
                      className={`${action.buttonClass}`}
                      onClick={() => handleActionClick(action)}
                      disabled={loading}
                    >
                      {action.buttonText}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          

          {/* Right Column */}
        
            {dangerActions.slice(3).map((action) => (
              <div key={action.id} className="section-card">
                <div className="setting-row">
                  <div className="setting-info">
                    <h4>{action.title}</h4>
                    <p>{action.description}</p>
                    {action.severity === 'critical' && (
                      <p className="critical-note">
                        Requires email + password + 2FA verification
                      </p>
                    )}
                    {action.severity === 'high' && (
                      <p className="high-note">
                        Requires typing "DELETE" to confirm
                      </p>
                    )}
                  </div>
                  <div className="setting-controls">
                    <button 
                      className={`${action.buttonClass}`}
                      onClick={() => handleActionClick(action)}
                      disabled={loading}
                    >
                      {action.buttonText}
                    </button>
                  </div>
                </div>
              </div>
            ))}
         
        </div>
      </div>

      {/* Confirmation Modal */}
      {activeModal && renderConfirmationModal()}
    </div>
  );
};

export default DangerZone;