// src/core/auth/authManager.js

export function createAuthManager({ authAdapter, backendAuth }) {
  // Simple state
  let state = {
    status: "BOOTING", // BOOTING | UNAUTHENTICATED | MFA_REQUIRED | AUTHENTICATED
    session: null,     // { accessToken, user: { id, email } }
    user: null,
    mfa: { methods: [], email: null },
  };

  const listeners = new Set();
  const notify = () => listeners.forEach((l) => l());

  const setState = (patch) => {
    state = { ...state, ...patch };
    notify();
  };

  const subscribe = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };

  const getState = () => state;
  const getAccessToken = () => state.session?.accessToken || null;

  const init = async () => {
    const session = await authAdapter.getSession();
    if (session) setState({ status: "AUTHENTICATED", session, user: session.user });
    else setState({ status: "UNAUTHENTICATED", session: null, user: null });

    authAdapter.onAuthStateChange((nextSession) => {
      // don’t override MFA in progress
      if (state.status === "MFA_REQUIRED") return;

      if (nextSession) setState({ status: "AUTHENTICATED", session: nextSession, user: nextSession.user });
      else setState({ status: "UNAUTHENTICATED", session: null, user: null });
    });
  };

  // Needed for 401 retry
  const refreshSession = async () => {
    // If adapter supports it, call it; otherwise just re-read session
    if (authAdapter.refreshSession) await authAdapter.refreshSession();

    const session = await authAdapter.getSession();
    if (session) {
      setState({ status: "AUTHENTICATED", session, user: session.user });
      return true;
    }

    setState({ status: "UNAUTHENTICATED", session: null, user: null });
    return false;
  };

  const loginWithPassword = async (email, password) => {
    if (!email || !password) throw new Error("Enter email and password");
    const cleanEmail = email.trim().toLowerCase();

    // 1) Supabase session
    const session = await authAdapter.signInWithPassword(cleanEmail, password);

    // 2) Backend decides MFA (your current flow)
    let res;
    try {
      res = await backendAuth.login(cleanEmail, password);
    } catch (e) {
      // avoid ghost session if backend bootstrap fails
      await authAdapter.signOut().catch(() => {});
      throw new Error("Backend login failed. Try again.");
    }

    const require2fa = !!res?.require_2fa;

    if (require2fa) {
      const methods =
        Array.isArray(res?.methods) && res.methods.length
          ? res.methods
          : ["totp", "email_backup"];

      setState({
        status: "MFA_REQUIRED",
        session,
        user: session.user,
        mfa: { methods, email: cleanEmail },
      });

      return { mfaRequired: true, methods };
    }

    setState({
      status: "AUTHENTICATED",
      session,
      user: session.user,
      mfa: { methods: [], email: null },
    });

    return { mfaRequired: false };
  };

  const verifyTotp = async (code) => {
    const digits = (code || "").replace(/\D/g, "").slice(0, 6);
    if (digits.length !== 6) throw new Error("Enter 6 digits");

    await backendAuth.validateTotp(digits);
    setState({ status: "AUTHENTICATED", mfa: { methods: [], email: null } });
  };

  const verifyEmailOtp = async (otp) => {
    const email = state.mfa.email;
    if (!email) throw new Error("Email missing. Login again.");

    const session = await authAdapter.verifyEmailOtp(email, otp);
    setState({
      status: "AUTHENTICATED",
      session,
      user: session.user,
      mfa: { methods: [], email: null },
    });
  };

const register = async ({ name, email, password, confirmPassword }) => {
  const cleanName = (name || "").trim();
  const cleanEmail = (email || "").trim().toLowerCase();

  if (cleanName.length < 2) throw new Error("Enter name");
  if (!cleanEmail) throw new Error("Enter email");
  if (!password) throw new Error("Enter password");
  if (password !== confirmPassword) throw new Error("Passwords do not match");

  // 1) Create backend user record
  await backendAuth.signup({
    name: cleanName,
    email: cleanEmail,
    password,
    confirm_password: confirmPassword,
  });

  // 2) Supabase signup (may return null session if email confirmation is required)
  const { session } = await authAdapter.signUp(cleanEmail, password, { name: cleanName });

  // ✅ If we got a session, update manager state immediately
  if (session?.accessToken) {
    setState({
      status: "AUTHENTICATED",
      session,
      user: session.user,
      mfa: { methods: [], email: null },
    });
  }

  return { session: session || null };
};


  const logout = async () => {
    await authAdapter.signOut();
    setState({ status: "UNAUTHENTICATED", session: null, user: null, mfa: { methods: [], email: null } });
  };

  return {
    subscribe,
    getState,

    init,
    getAccessToken,
    refreshSession,

    loginWithPassword,
    verifyTotp,
    verifyEmailOtp,
    register,
    logout,
  };
}
