// src/web/auth/webAuthAdapter.js
import { supabase } from "../../supabase.jsx"; // your existing file

const toSession = (s) => ({
  accessToken: s.access_token,
  user: { id: s.user.id, email: s.user.email },
});

export const webAuthAdapter = {
  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data?.session ? toSession(data.session) : null;
  },

  onAuthStateChange(cb) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      cb(session ? toSession(session) : null);
    });
    return () => data.subscription.unsubscribe();
  },

  async signInWithPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data?.session) throw new Error("No session");
    return toSession(data.session);
  },

  async signUp(email, password, meta) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: meta || {} },
    });
    if (error) throw error;
    return { session: data?.session ? toSession(data.session) : null };
  },

  async verifyEmailOtp(email, otp) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });
    if (error) throw error;
    if (!data?.session) throw new Error("No session");
    return toSession(data.session);
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async refreshSession() {
    // Supabase auto-refreshes; reading session is enough.
    const { data } = await supabase.auth.getSession();
    return !!data?.session;
  },
};
