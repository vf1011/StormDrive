


// src/components/Modal.jsx
import React, { useEffect } from "react";
import "./styles/Modal.css"; // or "./Styles/Modal.css"

export default function Modal({
  open,                // boolean
  view,                // 'chooseMethod' | 'emailLinkSent' | 'totp'
  onClose,
  loading = false,

  // chooseMethod props
  isTotpEnabled = false,
  onChooseEmail,
  onChooseTotp,

  // emailLinkSent props
  email = "",
  resendIn = 0,
  onResend,

  // totp props
  title = "Two-Factor Authentication",
  description = "Enter the 6-digit code from your authenticator app.",
  code = "",
  setCode = () => {},
  error = "",
  onSubmit,           // verify TOTP handler
}) {
  // lock scroll while open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open || !view) return null;

  return (
    <div className="otp-modal-overlay" role="dialog" aria-modal="true">
      <div className="otp-modal">
        {view === "chooseMethod" && (
          <>
            <h2>Choose Verification Method</h2>
            <p>Pick how you want to verify this login.</p>

            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              <button className="btn-primary" onClick={onChooseEmail} disabled={loading}>
                Email Link
              </button>
              <button
                className="btn-secondary"
                onClick={onChooseTotp}
                disabled={loading || !isTotpEnabled}
                title={isTotpEnabled ? "" : "Authenticator app is not set up"}
              >
                Authenticator App (TOTP)
              </button>
            </div>

            <div className="otp-actions" style={{ marginTop: 16 }}>
              <button className="btn-secondary" onClick={onClose} disabled={loading}>
                Cancel
              </button>
            </div>
          </>
        )}

        {view === "emailLinkSent" && (
          <>
            <h2>Check your email</h2>
            <p>
              We sent a sign-in link to <strong>{email}</strong>. Click the link to finish logging in.
            </p>

            <div className="otp-actions" style={{ marginTop: 12 }}>
              <button className="btn-secondary" onClick={onClose} disabled={loading}>
                Close
              </button>
              <button
                className="btn-primary"
                onClick={onResend}
                disabled={loading || resendIn > 0}
                title={resendIn > 0 ? `You can resend in ${resendIn}s` : ""}
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend link"}
              </button>
            </div>

            <div style={{ marginTop: 12, fontSize: 12, opacity: 0.8 }}>
              Tip: check spam/promotions. Quick open:
              {" "}
              <a href="https://mail.google.com" target="_blank" rel="noreferrer">Gmail</a> ·{" "}
              <a href="https://outlook.live.com" target="_blank" rel="noreferrer">Outlook</a>
            </div>
          </>
        )}

        {view === "totp" && (
          <>
            <h2>{title}</h2>
            {description && <p>{description}</p>}

            <input
              type="text"
              className="otp-input"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
              disabled={loading}
              autoFocus
            />

            {error && <p className="otp-error">{error}</p>}

            <div className="otp-actions">
              <button className="btn-secondary" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={onSubmit}
                disabled={loading || code.length !== 6}
              >
                {loading ? "Verifying…" : "Verify"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
