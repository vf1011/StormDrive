import React, { useState, useEffect } from "react";
import "./Styles/Security.css";
import { supabase } from "../../../supabase";
import ModalPortal from "../Dashboard/Modalportal";

const SecuritySection = () => {
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [step, setStep] = useState('view'); // 'view' | 'setup'
  const [qrCode, setQrCode]=useState(null)
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryPhone, setRecoveryPhone] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  // const [sessions, setSessions] = useState([]);
  const [loginHistory, setLoginHistory] = useState([]);

 const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };



  const fetchUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch("http://127.0.0.1:5000/auth/users/me", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setRecoveryEmail(data.recovery_email || "");
        setRecoveryPhone(data.recovery_phone || "");
        setEmailVerified(data.email_verified || false);
      }
    } catch (err) {
      console.error("Failed to fetch user data", err);
    }
  };

  // const fetch2FAStatus = async () => {
  //   try {
  //     const { data: { session } } = await supabase.auth.getSession();
  //     const token = session?.access_token;
  //     if (!token) return;

  //     const res = await fetch("http://127.0.0.1:5000/auth/2fa/setup", {
  //       headers: { Authorization: `Bearer ${token}` }
  //     });

  //     if (res.ok) {
  //       const data = await res.json();
  //       setTwoFAEnabled(data.enabled);
  //     }
  //   } catch (err) {
  //     console.error("Failed to fetch 2FA status", err);
  //   }
  // };


const fetch2FAStatus = async () => {
  try {
    const token = await getAuthToken();
    if (!token) return;

    const res = await fetch("http://127.0.0.1:5000/auth/users/me", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Could not load profile");

    const data = await res.json();
    const enabled =
      data.two_factor_enabled ??
      data.totp_enabled ??
      data.mfa_enabled ??
      false;

    setTwoFAEnabled(Boolean(enabled));
  } catch (err) {
    console.error("Failed to fetch 2FA status", err);
  }
};


useEffect(() => {
  // initial load
  fetchUserData();
  fetch2FAStatus(); // make sure we check status right away

  // subscribe to login/logout events
  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session) {
      // user just logged in
      fetchUserData();
      fetch2FAStatus(); // refresh status after login
    } else {
      // user logged out — clear the toggle
      setTwoFAEnabled(false);
    }
  });

  return () => listener.subscription.unsubscribe();
}, []);



  const startSetup = async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch("http://127.0.0.1:5000/auth/2fa/setup", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "image/png"  
        }
      });
      if (!res.ok) throw new Error('Failed to start 2FA setup');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setQrCode(url);
      setStep('setup');
    } catch (err) {
      console.error("2FA setup error:", err);
      alert("Failed to initialize 2FA setup.");
    } finally {
      setLoading(false);
    }
  };

const verifyCode = async () => {
  const code = (totpCode || "").replace(/\D/g, "").slice(0, 6);
  if (code.length !== 6) return;

  setLoading(true);
  try {
    const token = await getAuthToken();
    const res = await fetch("http://127.0.0.1:5000/auth/2fa/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ qr_code: code })   // ✅ matches your FastAPI signature
    });

    if (!res.ok) {
      // This will show FastAPI’s exact validation message (super helpful for 422).
      const detail = await res.text().catch(() => "");
      throw new Error(detail || "Invalid code");
    }

    setTwoFAEnabled(true);
    await fetch2FAStatus();
    setStep("view");
    alert("Two-factor authentication enabled");
  } catch (err) {
    console.error("2FA verify error:", err);
    alert("Failed to verify code.");
  } finally {
    setLoading(false);
  }
};



  const disable2FA = async () => {
    if (!window.confirm("Disable Two-factor Authentication?")) return;
    setLoading(true);
    try {
      const token = await getAuthToken();

      const code = (totpCode || prompt("Enter your 6-digit code") || "")
        .replace(/\D/g, "")
        .slice(0, 6);
      if (code.length !== 6) throw new Error("Invalid code");
      const res = await fetch("http://127.0.0.1:5000/auth/2fa/disable", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` },
          body : JSON.stringify({ qr_code: code })
      });
        if (!res.ok) {
      const errTxt = await res.text().catch(() => "");
      throw new Error(errTxt || "Invalid code");
    }
    setTwoFAEnabled(false);
    setStep('view');
    setQrCode(null);
    setTotpCode("");
      await fetch2FAStatus();
      alert('Two-factor authentication disabled');
    } catch (err) {
      console.error("2FA disable error:", err);
      alert("Failed to disable 2FA.");
    } finally {
      setLoading(false);
    }
  };

 const handleEnable2FA = async () => {
  await startSetup();       // GET /auth/2fa/setup + show QR
  // await verifyCode();       // POST /auth/2fa/verify
  // await fetch2FAStatus();   // re-check from backend to ensure persistence
};

const handleDisable2FA = async () => {
  await disable2FA();      // POST /auth/2fa/disable
  setTwoFAEnabled(false);
};



  // const fetchLoginActivity = async () => {
  //   try {
  //     const { data: { session } } = await supabase.auth.getSession();
  //     const token = session?.access_token;
  //     if (!token) throw new Error("Unauthorized");

  //     const res = await fetch("http://127.0.0.1:5000/settings/login-activity", {
  //       headers: { Authorization: `Bearer ${token}` }
  //     });

  //     if (!res.ok) throw new Error("Failed to fetch login history");
  //     const data = await res.json();
  //     setLoginHistory(data);
  //   } catch (err) {
  //     console.error("Login history fetch failed:", err);
  //   }
  // };

  // const fetchSessions = async () => {
  //   try {
  //     const { data: { session } } = await supabase.auth.getSession();
  //     const token = session?.access_token;
  //     if (!token) throw new Error("Unauthorized");

  //     const res = await fetch("http://127.0.0.1:5000/settings/sessions", {
  //       headers: { Authorization: `Bearer ${token}` }
  //     });

  //     if (!res.ok) throw new Error("Session fetch failed");
  //     const data = await res.json();
  //     setSessions(data);
  //   } catch (err) {
  //     console.error("Failed to load sessions:", err);
  //   }
  // };


  

 const handleChangePassword = async () => {
  if (!currentPassword || !newPassword || newPassword !== confirmPassword) {
    alert("Please fill all fields and ensure passwords match.");
    return;
  }

  setLoading(true);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("Unauthorized");

    // Call your backend (PUT), and DO NOT call supabase.auth.updateUser on the client
    const res = await fetch("http://127.0.0.1:5000/auth/users/change-password", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      // Make sure the keys match your backend schema
      body: JSON.stringify({
        current_password: currentPassword.trim(),
        new_password: newPassword,
      }),
    });

    // Avoid breaking on empty/invalid JSON
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(json?.detail || json?.message || "Failed to change password.");
      return;
    }

    alert(json?.message || "Password changed successfully.");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    closePasswordModal?.();
  } catch (err) {
    console.error("Password update error:", err);
    alert("Failed to update password.");
  } finally {
    setLoading(false);
  }
};


  const handleSaveRecovery = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Unauthorized");

      const res = await fetch("http://127.0.0.1:5000/auth/users/me", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          recovery_email: recoveryEmail,
          recovery_phone: recoveryPhone 
        })
      });

      if (!res.ok) throw new Error("Failed to save recovery settings");
      alert("Recovery settings saved successfully.");
    } catch (err) {
      console.error("Recovery save error:", err);
      alert("Failed to save recovery settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetupPhone = async () => {
    if (!recoveryPhone) {
      alert("Please enter a phone number first.");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Unauthorized");

      const res = await fetch("http://127.0.0.1:5000/settings/setup-phone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ phone: recoveryPhone })
      });

      if (!res.ok) throw new Error("Failed to setup phone");
      alert("Phone verification SMS sent.");
    } catch (err) {
      console.error("Phone setup error:", err);
      alert("Failed to setup phone.");
    } finally {
      setLoading(false);
    }
  };

  // const handleDeactivate = async () => {
  //   if (!window.confirm("Are you sure you want to deactivate your account? This action can be reversed by signing in again.")) {
  //     return;
  //   }

  //   setLoading(true);
  //   try {
  //     const { data: { session } } = await supabase.auth.getSession();
  //     const token = session?.access_token;
  //     if (!token) throw new Error("Unauthorized");

  //     const res = await fetch("http://127.0.0.1:5000/settings/deactivate", {
  //       method: "POST",
  //       headers: { Authorization: `Bearer ${token}` }
  //     });

  //     if (!res.ok) throw new Error("Failed to deactivate account");
      
  //     // Sign out after deactivation
  //     await supabase.auth.signOut();
  //     alert("Account deactivated successfully.");
  //   } catch (err) {
  //     console.error("Deactivation error:", err);
  //     alert("Failed to deactivate account.");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // const handleRevokeAllSessions = async () => {
  //   if (!window.confirm("This will sign you out from all other devices. Continue?")) {
  //     return;
  //   }

  //   setLoading(true);
  //   try {
  //     const { data: { session } } = await supabase.auth.getSession();
  //     const token = session?.access_token;
  //     if (!token) throw new Error("Unauthorized");

  //     const res = await fetch("http://127.0.0.1:5000/settings/revoke-sessions", {
  //       method: "POST",
  //       headers: { Authorization: `Bearer ${token}` }
  //     });

  //     if (!res.ok) throw new Error("Failed to revoke sessions");
  //     alert("All other sessions revoked successfully.");
  //     fetchSessions(); // Refresh sessions list
  //   } catch (err) {
  //     console.error("Session revoke error:", err);
  //     alert("Failed to revoke sessions.");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const openPasswordModal = () => {
    document.getElementById('passwordModal').classList.remove('hidden');
  };

  const closePasswordModal = () => {
    document.getElementById('passwordModal').classList.add('hidden');
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="security-page">
      <div className="security-container">
        {/* Header */}
        <div className="security-header">
          <div className="header-content">
            <h1>Security & Privacy</h1>
            <p>Manage Security & Privacy settings to protect your account</p>
          </div>
          <div className="header-actions-security">
          {/* <button
              className="security-btn-secondary"
              onClick={() => {
                // reset the 2FA setup if they hit cancel
                if (step === "setup") {
                  setStep("view");
                  setQrCode(null);
                  setTotpCode("");
                }
              }}
            >
              Cancel
            </button>
            <button
              className="security-btn-primary"
              onClick={handleSaveAll}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save"}
            </button> */}
          </div>
        </div>

        <div className="security-grid">
          {/* Left Column */}
          <div className="security-column">
            {/* Account Details */}
            <div className="security-card">
              <h2>Account Details</h2>
              
              {/* Email Verification */}
              <div className="setting-item">
                <h3>Verify Email Address</h3>
                <p>Verify Your email address to confirm the credentials</p>
                <div className="verification-status">
                  <span className={`status-badge ${emailVerified ? 'verified' : 'unverified'}`}>
                    {emailVerified ? "Verified" : "Unverified"}
                  </span>
                </div>
              </div>

              {/* Update Password */}
              <div className="setting-item">
                <h3>Update Password</h3>
                <p>Change your password to update & protect your Account</p>
                <button className="security-btn-secondary" onClick={openPasswordModal}>
                  Change Password
                </button>
              </div>
            </div>

            {/* Recovery Settings */}
            <div className="security-card">
              <h2>Recovery Settings</h2>
              
              {/* Recovery Email */}
              <div className="setting-item">
                <div className="setting-header">
                  <h3>Recovery Email Address</h3>
                  <button className="security-btn-primary-small" onClick={handleSaveRecovery} disabled={loading}>
                    {loading ? "Saving..." : "Save"}
                  </button>
                </div>
                <p>Setup Recovery Email to Secure your Account</p>
                
                <div className="input-group">
                  <label>Another Email Address</label>
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="info@pagedone.com"
                  />
                </div>
              </div>

              {/* Recovery Phone */}
              <div className="setting-item">
                <div className="setting-header">
                  <h3>Recovery Phone Number</h3>
                  <button className="security-btn-secondary" onClick={handleSetupPhone} disabled={loading}>
                    {loading ? "Setting up..." : "Setup"}
                  </button>
                </div>
                <p>Add Phone number to Setup SMS Recovery for your account</p>
                <div className="input-group">
                  <input
                    type="tel"
                    value={recoveryPhone}
                    onChange={(e) => setRecoveryPhone(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            </div>

            {/* Deactivate Account
            <div className="security-card">
              <div className="setting-item-horizontal">
                <div>
                  <h2>Deactivate Account</h2>
                  <p>This will shut down your account, And it will reactivate with Signing in</p>
                </div>
                <button className="btn-danger" onClick={handleDeactivate} disabled={loading}>
                  {loading ? "Deactivating..." : "Deactivate"}
                </button>
              </div>
            </div>*/}
          </div> 

          {/* Right Column */}
          <div className="security-column">
            {/* Two-factor Authentication */}
              <div className="security-card">
                      <h2>Two-factor Authentication</h2>

                      {step === 'view' && (
                        <div className="setting-item">
                          <div className="setting-header">
                            <h3>Status: <span className={twoFAEnabled ? 'enabled' : 'disabled'}>
                              {twoFAEnabled ? 'Enabled' : 'Disabled'}
                            </span></h3>
                            {twoFAEnabled
                            ? <button className="security-btn-secondary" onClick={handleDisable2FA}>Disable 2FA</button>
                            : <button className="security-btn-secondary" onClick={handleEnable2FA}>Enable 2FA</button>
                            }
                          </div>
                        </div>
                      )}

                      {/* {step === 'setup' && (
                        <div className="setup-section">
                          <p>Scan this QR code with your authenticator app:</p>
                          {qrCode && (
                            <img
                              src={qrCode}
                              alt="2FA QR Code"
                              style={{ maxWidth: 200, margin: "1rem 0" }}
                            />
                          )}
                          <p>Then enter the 6-digit code below to confirm:</p>
                          <input
                            type="text"
                            value={totpCode}
                            onChange={e => setTotpCode(e.target.value)}
                            maxLength={6}
                            placeholder="123456"
                          />
                          <button className="security-btn-primary" onClick={verifyCode} disabled={loading}></button>
                          <button className="security-btn-secondary" onClick={() => {setStep('view'); setQrCode(null); setTotpCode("");} } disabled={loading}>Verify and Enable</button>
                        </div>
                      )} */}

                      {step === 'setup' && (
                      <div className="setup-section">
                        <p>Scan this QR code with your authenticator app:</p>
                        {qrCode && (
                            <div className="qr-center">
                              <img src={qrCode} alt="2FA QR Code" />
                            </div>
                        )}
                        <p>Then enter the 6-digit code below to confirm:</p>
                        <input
                          type="text"
                          value={totpCode}
                          onChange={e => setTotpCode(e.target.value.replace(/\D/g,''))}
                          maxLength={6}
                          placeholder="123456"
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button
                            className="security-btn-secondary"
                            onClick={() => { setStep('view'); setQrCode(null); setTotpCode(""); }}
                            disabled={loading}
                          >
                            Cancel
                          </button>
                          <button
                            className="security-btn-primary"
                            onClick={verifyCode}
                            disabled={loading || totpCode.length !== 6}
                          >
                            Verify & Enable
                          </button>
                        </div>
                      </div>
                    )}


              </div>

            {/* Active Sessions */}
            {/* <div className="security-card">
              <h2>Active Sessions</h2>
              <div className="sessions-list">
                {sessions.map(session => (
                  <div key={session.id} className="session-item">
                    <div>
                      <strong>{session.device}</strong>
                      <p>IP: {session.ip}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="security-btn-secondary full-width" onClick={handleRevokeAllSessions} disabled={loading}>
                {loading ? "Revoking..." : "Revoke All Other Sessions"}
              </button>
            </div> */}

            {/* Login History */}
            <div className="security-card">
              <h2>Recent Login Activity</h2>
              <div className="login-history">
                {loginHistory.slice(0, 5).map((entry, index) => (
                  <div key={index} className="login-item">
                    <div>
                      <strong>{entry.time}</strong>
                      <p>{entry.device} - IP: {entry.ip}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Password Change Modal */}
        <ModalPortal>
        <div id="passwordModal" className="security-modal-overlay hidden">
          <div className="modal-content">
            <h3>Change Password</h3>
            <div className="modal-form">
              <input
                type="password"
                placeholder="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <input
                type="password"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button className="security-btn-secondary" onClick={closePasswordModal}>Cancel</button>
              <button className="security-btn-primary" onClick={handleChangePassword} disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      </div>
    </div>
  );
};

export default SecuritySection;  