// src/components/Register.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { bytesToB64 } from "../../../core/crypto/base64";
import { cryptoBootstrap } from "../../auth/cryptoBootstrap.js";

import Notification from "../Transitions/Notification";
import Modal from "./Modal";
import "./styles/Register.css";

// ✅ Manager-based auth (same approach as LoginPage)
import { ensureAuthStarted, getAppAuth } from "../../auth/appAuthClient";

const Register = ({ darkMode = false }) => {
  const navigate = useNavigate();

  // ---- form state ----
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ---- ui state ----
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);

  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const errorMessage = (err) =>
    err?.response?.data?.detail ?? err?.message ?? String(err);

  // start managers once
  useEffect(() => {
    ensureAuthStarted().catch(() => {});
  }, []);

  const validatePasswordPolicy = (pw) => {
    if (pw.length < 8) throw new Error("Password must be at least 8 characters long");
    if (!/[A-Z]/.test(pw)) throw new Error("Password must contain at least one uppercase letter");
    if (!/[0-9]/.test(pw)) throw new Error("Password must contain at least one number");
    if (!/[!@#$%^&*(),.?\":{}|<>]/.test(pw))
      throw new Error("Password must contain at least one special character");
  };

  function downloadRecoveryKeyFile(userEmail, rkB64) {
    const content =
`StormDrive Recovery Key

Email: ${userEmail}
RecoveryKey(Base64): ${rkB64}

Keep this safe. If you lose it and forget your password, your files cannot be recovered.
`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `stormdrive-recovery-key-${String(userEmail || "account").replace(/[^a-z0-9]/gi, "_")}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return; // ✅ prevent double submit
    setIsLoading(true);

    try {
      const cleanName = String(fullName || "").trim();
      const cleanEmail = String(email || "").trim().toLowerCase();

      if (!cleanName || cleanName.length < 2) throw new Error("Name is required");
      if (!cleanEmail) throw new Error("Email is required");
      if (!password) throw new Error("Password is required");
      if (!confirmPassword) throw new Error("Confirm Password is required");
      if (password !== confirmPassword) throw new Error("Passwords do not match");

      validatePasswordPolicy(password);

      await ensureAuthStarted();
      const { auth } = getAppAuth();

      // 1) Signup: backend creates user (your backend currently returns only a message)
      await auth.register({
        name: cleanName,
        email: cleanEmail,
        password,
        confirmPassword,
      });

      // 2) Login: required to obtain session/tokens so crypto bootstrap can call protected endpoints
      let loginRes;
      try {
        loginRes = await auth.login({email : cleanEmail, password });
      } catch (err) {
        // If email verification is enabled later, login can fail until verified
        setShowModal(true);
        setNotification({
          open: true,
          message: "Account created. Please verify your email (if required) and login.",
          severity: "info",
        });
        return;
      }

      // Optional: if your login flow indicates 2FA is required
      const require2fa =
        loginRes?.require_2fa ??
        loginRes?.require2fa ??
        loginRes?.data?.require_2fa ??
        false;

      if (require2fa) {
        setNotification({
          open: true,
          message: "2FA is enabled. Please login and complete 2FA to finish setup.",
          severity: "info",
        });
        navigate("/login", { replace: true });
        return;
      }

      // 3) Crypto bootstrap + unlock (creates keybundle if missing)
      const { session: sessionMgr } = getAppAuth();

      // Generate Recovery Key (client-side). Your backend should store wrapped_mak_rk (not the RK itself).
      const rkBytes = cryptoBootstrap.generateRecoveryKeyBytes();
      const rkB64 = bytesToB64(rkBytes);

      await sessionMgr.completeSignupCrypto({ password, recoveryKeyBytes: rkBytes });
      await sessionMgr.unlockVaultWithPassword(password);

      // 4) Save RK without blocking UI (auto-download file)
      downloadRecoveryKeyFile(cleanEmail, rkB64);

      setNotification({
        open: true,
        message: "Account created. Recovery key downloaded. Redirecting...",
        severity: "success",
      });

      // 5) Go to dashboard
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setNotification({
        open: true,
        message: errorMessage(err) || "Registration failed",
        severity: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setNotification({
      open: true,
      message: "Google sign-in is not wired in this flow yet.",
      severity: "info",
    });
  };

  return (
    <div className={`SignIn-page ${darkMode ? "dark-mode" : ""}`}>
      <div className="register-card">
        <div className="left-side">
          <div className="welcome-content">
            <h2>Hello,</h2>
            <p>
              Welcome to Stormdrive, your secure cloud storage solution. Register now to access
              unlimited storage, seamless file sharing, and advanced security features.
            </p>
            <p>Already a Stormdrive user? Login below to access your files!</p>
            <Link to="/login" className="login-button">
              Login
            </Link>
          </div>
          <div className="illustration">
            <img style={{ maxWidth: "100%" }} src="./images/register.svg" alt="Illustration" />
          </div>
        </div>

        <div className="right-side">
          <h2>Sign Up</h2>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <div className="input-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <input
                  type="text"
                  id="fullname"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="name"
                />
              </div>
            </div>

            <div className="form-group">
              <div className="input-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <input
                  type="email"
                  id="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <div className="input-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="form-group">
              <div className="input-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirm-password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button type="submit" className="register-btn" disabled={isLoading}>
              {isLoading ? "Creating Account..." : "Sign Up"}
            </button>

            <div className="social-login">
              <p>Quick login with</p>
              <div className="social-buttons">
                <button type="button" className="social-btn" disabled={isLoading}>
                  <img src="/images/apple-logo.svg" alt="Apple" />
                </button>

                <button
                  type="button"
                  className="social-btn"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                >
                  <img
                    src="https://img.icons8.com/?size=100&id=V5cGWnc9R4xj&format=png&color=000000"
                    alt="Google"
                  />
                </button>

                <button type="button" className="social-btn" disabled={isLoading}>
                  <img src="/images/microsoft.svg" alt="Microsoft" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {showModal && (
        <Modal
          email={email}
          onClose={() => {
            setShowModal(false);
            navigate("/login");
          }}
        />
      )}

      <Notification
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={() => setNotification({ ...notification, open: false })}
      />
    </div>
  );
};

export default Register;
