// src/core/auth/validators.js
export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}
export function normalizeName(name) {
  return String(name || "").trim().replace(/\s+/g, " ");
}
export function requireNonEmpty(value, label = "Value") {
  if (!String(value || "").trim()) throw new Error(`${label} is required`);
}
export function validatePasswordPolicy(pw) {
  const password = String(pw || "");
  if (password.length < 8) throw new Error("Password must be at least 8 characters long");
  if (!/[A-Z]/.test(password)) throw new Error("Password must contain at least one uppercase letter");
  if (!/[0-9]/.test(password)) throw new Error("Password must contain at least one number");
  if (!/[!@#$%^&*(),.?\":{}|<>]/.test(password))
    throw new Error("Password must contain at least one special character");
}
export function requireMatch(a, b, label = "Values") {
  if (String(a || "") !== String(b || "")) throw new Error(`${label} do not match`);
}
export function onlyDigits(input, maxLen = 6) {
  return String(input || "").replace(/\D/g, "").slice(0, maxLen);
}

// ✅ add this (required by authService.js)
export function looksLikeUserAlreadyRegistered(err) {
  const msg =
    err?.message ||
    err?.error_description ||
    err?.error ||
    (typeof err === "string" ? err : "") ||
    "";
  return /already registered|already exists|user already/i.test(msg);
}
