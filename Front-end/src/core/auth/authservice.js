// src/core/auth/authService.js
import {
  normalizeEmail,
  normalizeName,
  requireNonEmpty,
  validatePasswordPolicy,
  requireMatch,
  onlyDigits,
  looksLikeUserAlreadyRegistered,
} from "./validators";

export function createAuthService({ auth, api, tokens }) {
  if (!auth || !api || !tokens) throw new Error("AuthService missing dependencies");

  return {
    // ---------- REGISTER ----------
    async register({ name, email, password, confirmPassword }) {
      const cleanName = normalizeName(name);
      const cleanEmail = normalizeEmail(email);

      requireNonEmpty(cleanName, "Name");
      requireNonEmpty(cleanEmail, "Email");
      requireNonEmpty(password, "Password");
      requireNonEmpty(confirmPassword, "Confirm Password");

      validatePasswordPolicy(password);
      requireMatch(password, confirmPassword, "Passwords");

      // 1) Backend signup first (your current flow)
      await api.signup({
        name: cleanName,
        email: cleanEmail,
        password,
        confirm_password: confirmPassword,
      });

      // 2) Supabase sign-up
      try {
        const { session } = await auth.signUp(cleanEmail, password, {
          full_name: cleanName,
          backend_registered: true,
        });

        // If session returned => logged in
        if (session?.accessToken) {
          await tokens.set(session.accessToken);
          return { status: "SIGNED_IN" };
        }

        // If no session => email confirmation flow
        await auth.signOut();
        return { status: "EMAIL_CONFIRM_REQUIRED" };
      } catch (e) {
        // If user already exists in Supabase, auto sign in (your current behavior)
        if (looksLikeUserAlreadyRegistered(e)) {
          const { session } = await auth.signInWithPassword(cleanEmail, password);
          await tokens.set(session.accessToken);
          return { status: "SIGNED_IN" };
        }
        throw e;
      }
    },

    // ---------- LOGIN ----------
  // ---------- LOGIN ----------
async loginWithPassword({ email, password }) {
  const cleanEmail = normalizeEmail(email);

  requireNonEmpty(cleanEmail, "Email");
  requireNonEmpty(password, "Password");

  // 1) Supabase sign-in
  const { session } = await auth.signInWithPassword(cleanEmail, password);
  await tokens.set(session.accessToken);

  // 2) Ask backend if 2FA required
  const tokenResp = await api.login({ email: cleanEmail, password });
  const require2fa = !!tokenResp?.require_2fa;

  // ✅ Match what LoginPage expects
  return {
    mfaRequired: require2fa,
    methods: require2fa ? ["totp", "email_backup"] : [],
  };
},


    // ---------- TOTP VERIFY ----------
    async verifyTotp(code) {
      const digits = onlyDigits(code, 6);
      if (digits.length !== 6) throw new Error("Enter 6 digits");
      await api.validateTotp({ qr_code: digits });
      return { status: "OK" };
    },

    // ---------- EMAIL OTP (backup) ----------
    async sendEmailOtp(email) {
      const cleanEmail = normalizeEmail(email);
      requireNonEmpty(cleanEmail, "Email");
      await auth.signInWithOtp(cleanEmail);
      return { status: "SENT" };
    },

    async verifyEmailOtp({ email, code }) {
      const cleanEmail = normalizeEmail(email);
      const cleanCode = onlyDigits(code, 6);

      if (cleanCode.length !== 6) throw new Error("Enter 6 digits");
      const { session } = await auth.verifyEmailOtp(cleanEmail, cleanCode);
      if (session?.accessToken) await tokens.set(session.accessToken);
      return { status: "OK" };
    },

    // ---------- FORGOT PASSWORD ----------
    async requestPasswordReset(email, redirectTo) {
      const cleanEmail = normalizeEmail(email);
      requireNonEmpty(cleanEmail, "Email");
      requireNonEmpty(redirectTo, "redirectTo");
      await auth.requestPasswordReset(cleanEmail, redirectTo);
      return { status: "SENT" };
    },

    // ---------- RESET PASSWORD ----------
    async updatePassword(newPassword, confirmPassword) {
      requireNonEmpty(newPassword, "New Password");
      requireNonEmpty(confirmPassword, "Confirm Password");

      requireMatch(newPassword, confirmPassword, "Passwords");
      validatePasswordPolicy(newPassword);

      await auth.updatePassword(newPassword);
      return { status: "OK" };
    },

    async logout() {
      await auth.signOut();
      await tokens.clear();
      return { status: "OK" };
    },
  };
}
