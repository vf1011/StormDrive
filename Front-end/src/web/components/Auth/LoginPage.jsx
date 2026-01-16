// src/components/LoginPage.js
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../../supabase";
import Notification from "../Transitions/Notification";

// ✅ NEW: use your managers (singleton client)
import { ensureAuthStarted, getAppAuth } from "../../auth/appAuthClient"; // adjust path if needed

import Modal from "./Modal";
import "./styles/LoginPage.css";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // stages: credentials | chooseMethod | mfaChallenge | emailLinkSent
  const [stage, setStage] = useState("credentials");

  const [methods, setMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [isTotpEnabled, setIsTotpEnabled] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // keep your existing message/error behavior
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [resendIn, setResendIn] = useState(0);

  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || "/dashboard";
  const logoutMessage = location.state?.message;
  const logoutReason = location.state?.reason;

  const errorMessage = (err) => err?.response?.data?.detail ?? err?.message ?? String(err);

  // ✅ Start auth/session managers once when page mounts
  useEffect(() => {
    ensureAuthStarted().catch((e) => console.error("Auth init failed:", e));
  }, []);

  // ✅ Clear session only if explicitly from logout
  useEffect(() => {
    const clearSessionOnLoad = async () => {
      try {
        if (location.state?.fromLogout === true) {
          await ensureAuthStarted();
          const { auth } = getAppAuth();
          await auth.logout();
        }

        if (logoutMessage) {
          setMessage(logoutMessage);
          setTimeout(() => setMessage(""), 5000);
        }
      } catch (e) {
        console.error("Error clearing session:", e);
      }
    };

    clearSessionOnLoad();
  }, [location.state, logoutMessage]);

  // Magic-link email backup (no OTP code)
  const chooseEmailLink = async () => {
    setIsLoading(true);
    setError("");
    try {
      const cleanEmail = String(email || "").trim().toLowerCase();
      if (!cleanEmail) throw new Error("Enter email");

      await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: { emailRedirectTo: `${window.location.origin}/login` },
      });

      setStage("emailLinkSent");
      setResendIn(30);
    } catch (e) {
      setNotification({ open: true, message: errorMessage(e), severity: "error" });
      setError(errorMessage(e));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (!email || !password) throw new Error("Please enter both email and password");

      const cleanEmail = String(email || "").trim().toLowerCase();
      const cleanPassword = password;

      await ensureAuthStarted();
      const { auth, session: sessionMgr } = getAppAuth();

      const result = await auth.loginWithPassword(cleanEmail, cleanPassword);

      if (result?.mfaRequired) {
        setIsTotpEnabled(true);

        const m = Array.isArray(result.methods) && result.methods.length
          ? result.methods
          : ["totp", "email_backup"];

        setMethods(m);

        if (m.length > 1) {
          setSelectedMethod("");
          setStage("chooseMethod");
        } else {
          const only = m[0] || "totp";
          setSelectedMethod(only);
          setStage("mfaChallenge");
        }

        setNotification({
          open: true,
          message: "Two-factor authentication required.",
          severity: "info",
        });
        return;
      }

      // ✅ Zero-knowledge step: unlock vault immediately after password login
      try {
          await sessionMgr.unlockVaultWithPassword(cleanPassword);
          } catch (e) {
            const msg = String(e?.message || e);
            // If bundle missing, create it now (first login after email verify)
            if (msg.toLowerCase().includes("bundle") || msg.includes("404")) {
              const rkBytes = cryptoBootstrap.generateRecoveryKeyBytes();
              const rkB64 = bytesToB64(rkBytes);

              await sessionMgr.completeSignupCrypto({ password: cleanPassword, recoveryKeyBytes: rkBytes });
              await sessionMgr.unlockVaultWithPassword(cleanPassword);

              setNotification({
                open: true,
                message: `Save your Recovery Key now (copy it): ${rkB64}`,
                severity: "warning",
              });
            } else {
              throw e;
            }
          }
          navigate(from, { replace: true });

      // ✅ Zero-knowledge step: unlock vault immediately after password login

      navigate(from, { replace: true });
    } catch (err) {
      const msg = errorMessage(err) || "Login failed";
      setNotification({ open: true, message: msg, severity: "error" });
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyMfa = async () => {
    setIsLoading(true);
    setError("");

    try {
      await ensureAuthStarted();
      const { auth, session: sessionMgr } = getAppAuth();

      if (selectedMethod === "email_backup") {
        // Email backup is magic-link only
        setStage("emailLinkSent");
        setResendIn(30);
        setNotification({
          open: true,
          message: "Check your email and open the link to continue.",
          severity: "info",
        });
        return;
      }

      // totp
      const code = String(mfaCode || "").replace(/\D/g, "");
      if (code.length !== 6) {
        setNotification({ open: true, message: "Enter a 6-digit code.", severity: "error" });
        setError("Enter a 6-digit code.");
        return;
      }

      await auth.verifyTotp(code);

      // ✅ Unlock vault (password still in state)
      await sessionMgr.unlockVaultWithPassword(password);

      navigate(from, { replace: true });
    } catch (err) {
      const msg = errorMessage(err) || "Verification failed";
      setNotification({ open: true, message: msg, severity: "error" });
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const resendMagicLink = async () => {
    if (resendIn > 0) return;
    await chooseEmailLink();
  };

  useEffect(() => {
    if (stage !== "emailLinkSent" || resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [stage, resendIn]);

  useEffect(() => {
    const preventBack = (e) => {
      if (logoutReason === "expired") {
        e.preventDefault();
        window.history.pushState(null, "", window.location.href);
      }
    };
    window.addEventListener("popstate", preventBack);
    return () => window.removeEventListener("popstate", preventBack);
  }, [logoutReason]);

  const modalView =
    stage === "chooseMethod" ? "chooseMethod" :
    stage === "emailLinkSent" ? "emailLinkSent" :
    stage === "mfaChallenge" ? "totp" : null;

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="left-side">
          <div className="welcome-content">
            <h2>Welcome Back!</h2>
            <p>Access your secure cloud storage with Stormdrive. Your files are just a login away.</p>
            <p>New to Stormdrive? Join us to experience unlimited storage!</p>
            <Link to="/register" className="register-button">Sign Up Now</Link>
          </div>
          <div className="illustration">
            <img src="/images/login.svg" alt="Login illustration" />
          </div>
        </div>

        <div className="right-side">
          <h2>Login</h2>


          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <div className="input-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address"
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
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

            <div className="remember-forgot">
              <div className="checkbox-container">
                <input type="checkbox" id="remember" disabled={isLoading} />
                <label htmlFor="remember">Remember me</label>
              </div>
              <Link to="/forget-password" className="forget-password">
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              className="login-btn"
              disabled={isLoading || !email.trim() || !password}
            >
              {isLoading ? "Signing in..." : "Login"}
            </button>

            <div className="social-login">
              <p>Quick login with</p>
              <div className="social-buttons">
                <button type="button" className="social-btn" disabled={isLoading}>
                  <img src="/images/apple-logo.svg" alt="Apple" />
                </button>
                <button type="button" className="social-btn" disabled={isLoading}>
                  <img src="/images/google-logo.svg" alt="Google" />
                </button>
                <button type="button" className="social-btn" disabled={isLoading}>
                  <img src="/images/microsoft.svg" alt="Microsoft" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <Modal
        open={!!modalView}
        view={modalView}
        onClose={() => {
          setStage("credentials");
          setSelectedMethod("");
          setMfaCode("");
          setMethods([]);
          setIsTotpEnabled(false);
          setResendIn(0);
        }}
        loading={isLoading}

        // chooseMethod
        isTotpEnabled={isTotpEnabled}
        onChooseEmail={() => {
          setSelectedMethod("email_backup");
          setMfaCode("");
          chooseEmailLink();
        }}
        onChooseTotp={() => {
          setSelectedMethod("totp");
          setMfaCode("");
          setStage("mfaChallenge");
        }}

        // emailLinkSent
        email={email}
        resendIn={resendIn}
        onResend={resendMagicLink}

        // totp
        title="Two-Factor Authentication"
        description="Enter the 6-digit code from your authenticator app."
        code={mfaCode}
        setCode={setMfaCode}
        error={error}
        onSubmit={handleVerifyMfa}
      />

      <Notification
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={() => setNotification((n) => ({ ...n, open: false }))}
      />
    </div>
  );
};

export default LoginPage;
