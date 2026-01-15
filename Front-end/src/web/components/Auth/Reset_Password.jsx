// src/components/Reset_password.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../../supabase";
import "./styles/Reset_password.css";

const Reset_Password = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [recoveryReady, setRecoveryReady] = useState(false);

  const navigate = useNavigate();

  // Helper: parse tokens from the URL hash (Supabase recovery links)
  const parseHash = () => {
    const hash = window.location.hash || "";
    const get = (key) => {
      const m = hash.match(new RegExp(`${key}=([^&]+)`));
      return m ? decodeURIComponent(m[1]) : null;
    };
    return {
      type: get("type"), // usually 'recovery'
      access_token: get("access_token"),
      refresh_token: get("refresh_token"),
    };
  };

  useEffect(() => {
    const initRecovery = async () => {
      try {
        setMessage("");

        // Case A: tokens are present in URL hash
        const { type, access_token, refresh_token } = parseHash();

        if (type === "recovery" && access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          // Remove tokens from URL for safety
          window.history.replaceState(null, "", window.location.pathname);

          if (error) {
            setMessage("Recovery link invalid or expired. Please request a new one.");
            setRecoveryReady(false);
            return;
          }

          setRecoveryReady(true);
          return;
        }

        // Case B: in some setups supabase may already have a session
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          setMessage("Unable to validate recovery session. Please request a new link.");
          setRecoveryReady(false);
          return;
        }

        if (data?.session?.access_token) {
          setRecoveryReady(true);
        } else {
          setMessage("Recovery link invalid or expired. Please request a new one.");
          setRecoveryReady(false);
        }
      } catch (e) {
        setMessage("Something went wrong. Please request a new password reset link.");
        setRecoveryReady(false);
      }
    };

    initRecovery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validatePasswordPolicy = (pw) => {
    if (pw.length < 8) throw new Error("Password must be at least 8 characters long");
    if (!/[A-Z]/.test(pw)) throw new Error("Password must contain at least one uppercase letter");
    if (!/[0-9]/.test(pw)) throw new Error("Password must contain at least one number");
    if (!/[!@#$%^&*(),.?\":{}|<>]/.test(pw))
      throw new Error("Password must contain at least one special character");
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      if (!recoveryReady) {
        setMessage("Recovery session not ready. Please request a new reset link.");
        return;
      }

      if (!newPassword || !confirmPassword) {
        setMessage("Please fill both password fields.");
        return;
      }

      if (newPassword !== confirmPassword) {
        setMessage("Passwords do not match.");
        return;
      }

      validatePasswordPolicy(newPassword);

      setLoading(true);

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setMessage("Failed to update password: " + error.message);
        return;
      }

      setMessage("Password updated successfully. Redirecting to login...");

      // Optional: sign out after password reset to force fresh login
      await supabase.auth.signOut().catch(() => {});

      setTimeout(() => {
        navigate("/login", {
          replace: true,
          state: { message: "Password updated. Please login with your new password." },
        });
      }, 1200);
    } catch (err) {
      setMessage(err?.message || "Failed to reset password. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-password-page">
      <div className="reset-password-card">
        <div className="lock">🔒</div>
        <h2>Reset Password</h2>
        <p>Enter a new password for your account.</p>

        {message && <p style={{ marginTop: 10 }}>{message}</p>}

        <form onSubmit={handleReset}>
          <div className="input-icon">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
              disabled={!recoveryReady || loading}
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword((s) => !s)}
              disabled={loading}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <div className="input-icon">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              disabled={!recoveryReady || loading}
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowConfirmPassword((s) => !s)}
              disabled={loading}
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>

          <button type="submit" className="Reset-btn" disabled={loading || !recoveryReady}>
            {loading ? "Updating..." : "Update Password"}
          </button>

          <div className="back-link">
            <Link className="back-to-login" to="/login">
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Reset_Password;
