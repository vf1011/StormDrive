// src/components/Forgot_Password.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../supabase";
import "./styles/Forgot_password.css";

const Forgot_Password = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail) {
      setMessage("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      // IMPORTANT:
      // 1) This URL must exist in your app routes.
      // 2) This URL must be allowed in Supabase Auth -> URL Configuration (Redirect URLs).
      const redirectTo = `${window.location.origin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });

      if (error) {
        setMessage("An error occurred: " + error.message);
      } else {
        setMessage("Password reset instructions have been sent to your email.");
      }
    } catch (err) {
      setMessage("An unexpected error occurred. Please try again.");
      // console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forget-password-page">
      <div className="forget-password-card">
        <div className="lock-icon">🔒</div>
        <h2>Forgot Password?</h2>
        <p>Enter your registered email to reset your password.</p>

        {message && <p style={{ marginTop: 10 }}>{message}</p>}

        <form onSubmit={handleSubmit}>
          <div className="input-icon">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="reset-btn" disabled={loading}>
            {loading ? "Sending..." : "Reset Password"}
          </button>

          <div className="links">
            <Link to="/login" className="back-to-login">
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Forgot_Password;
