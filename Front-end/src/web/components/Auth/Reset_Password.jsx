import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// ✅ keep your existing supabase import (you already use it)
import { supabase } from "../../../supabase.jsx";

// ✅ your app auth singleton
import { ensureAuthStarted, getAppAuth } from "../../auth/appAuthClient";

import { b64ToBytes } from "../../../core/crypto/base64.js";

import { makeWrappedMakPassword } from "../../../core/crypto/makOps.js";

export default function Reset_Password() {
  const navigate = useNavigate();

  const [recoveryReady, setRecoveryReady] = useState(false);
  const [loading, setLoading] = useState(false);

  const [recoveryKeyB64, setRecoveryKeyB64] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [msg, setMsg] = useState("");

  // your existing "recovery session ready" check
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setRecoveryReady(!!data?.session);
    })();
    return () => (mounted = false);
  }, []);

  const handleReset = async () => {
    setMsg("");

    if (!recoveryReady) {
      setMsg("Reset session not ready. Please open the reset link again.");
      return;
    }

    if (!recoveryKeyB64.trim()) {
      setMsg("Recovery Key is required to restore decryption access.");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setMsg("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      // 1) start auth stack
      await ensureAuthStarted();
      const { auth, session } = getAppAuth();

      // 2) unlock vault using Recovery Key (this fetches keybundle and unwraps MAK)
      const rkBytes = b64ToBytes(recoveryKeyB64.trim());
      await session.unlockVaultWithRecoveryKey(rkBytes);

      // 3) compute new wrapped_mak_password using NEW password
      // Need bundle salt + userId; easiest: fetch bundle again (or keep from unlock)
      const accessToken = auth.getState()?.session?.accessToken || (await supabase.auth.getSession()).data?.session?.access_token;
      if (!accessToken) throw new Error("Missing access token");

      // fetch bundle from backend via keyBundleApi (already wired inside your stack)
      // we’ll call keyBundleApi directly from appAuth.session dependencies is not exposed,
      // so simplest: call backend endpoint if you have it accessible OR add session.getKeybundle().
      // Minimal approach: call session.unlockVaultWithRecoveryKey already fetched bundle,
      // but we still need user_salt_b64 and user_id. We'll refetch via keyBundleApi on web.
      const bundle = await session._deps?.keyBundleApi?.getBundle(accessToken);
      // If you don't have session._deps, do it via a direct web keybundle API import instead.

      if (!bundle?.user_id || !bundle?.user_salt_b64) {
        throw new Error("Keybundle missing user_id or user_salt_b64");
      }

      const vaultKeyring = getAppAuth().vault.getKeyring();
      const makBytes = vaultKeyring.getMakBytes();

      const wrapped_mak_password_new = await makeWrappedMakPassword(
        vaultKeyring.cp || vaultKeyring.cryptoProvider || getAppAuth().vault.cryptoProvider,
        {
          userId: bundle.user_id,
          userSaltB64: bundle.user_salt_b64,
          password: newPassword,
          makBytes,
        }
      );

      // 4) update backend keybundle (so future logins can unwrap MAK using NEW password)
      await getAppAuth().auth.backendAuth.changePassword({
        // If backend wants current/new password too, include them here.
        wrapped_mak_password_new,
      });

      // 5) update Supabase password
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      // 6) logout + lock vault
      await session.logout();

      setMsg("Password updated. You can log in now.");
      navigate("/login", { replace: true });
    } catch (e) {
      setMsg(e?.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-page">
      <div className="reset-card">
        <h2>Reset Password</h2>

        {!recoveryReady && (
          <p style={{ color: "crimson" }}>
            Reset session not ready. Please open the reset link again.
          </p>
        )}

        <div className="form-group">
          <label>Recovery Key (base64)</label>
          <input
            type="text"
            value={recoveryKeyB64}
            onChange={(e) => setRecoveryKeyB64(e.target.value)}
            disabled={loading}
            placeholder="Paste your Recovery Key"
          />
        </div>

        <div className="form-group">
          <label>New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
          />
        </div>

        <button onClick={handleReset} disabled={loading || !recoveryReady}>
          {loading ? "Updating..." : "Update Password"}
        </button>

        {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
      </div>
    </div>
  );
}

