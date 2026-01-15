// src/web/auth/supabaseAuthProvider.js
import { supabase } from "../../supabase.jsx";

function toSession(supabaseSession) {
  if (!supabaseSession?.access_token || !supabaseSession?.user) return null;

  return {
    accessToken: supabaseSession.access_token,
    refreshToken: supabaseSession.refresh_token || null,
    user: {
      id: supabaseSession.user.id,
      email: supabaseSession.user.email,
    },
  };
}

export const supabaseAuthProvider = {
  // ✅ authManager.init() needs this
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return toSession(data?.session) || null;
  },

  // ✅ authManager listens for auth changes
  onAuthStateChange(callback) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(toSession(session));
    });
    return () => data?.subscription?.unsubscribe?.();
  },

  // Optional: used by authManager.refreshSession()
  async refreshSession() {
    // If you use refresh tokens, supabase will refresh automatically in most cases.
    // This is a safe explicit refresh call.
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return toSession(data?.session) || null;
  },

  // ✅ authManager.loginWithPassword expects session object directly
  async signInWithPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const session = toSession(data?.session);
    if (!session) throw new Error("No session returned");
    return session;
  },

  // ✅ authManager.register expects { session }
  async signUp(email, password, meta) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: meta || {} },
    });
    if (error) throw error;

    return { session: toSession(data?.session) || null };
  },

  // Used by LoginPage email magic link (backup)
  async signInWithOtp(email, options = {}) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options,
    });
    if (error) throw error;
  },

  // ✅ authManager.verifyEmailOtp expects session object
  async verifyEmailOtp(email, code) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    if (error) throw error;

    const session = toSession(data?.session);
    if (!session) throw new Error("No session returned");
    return session;
  },

  async requestPasswordReset(email, redirectTo) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  },

  async updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  async signOut() {
    await supabase.auth.signOut();
  },
};
