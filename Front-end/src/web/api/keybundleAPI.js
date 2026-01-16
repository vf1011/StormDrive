import { httpJson } from "./http.js";

export function keybundleInit(token, payload) {
  // payload should include:
  // user_salt_b64, wrapped_mak_password, wrapped_mak_recovery, kdf_v, (optional kdf_params)
  return httpJson("/keybundle/init", { token, method: "POST", body: payload });
}

export function getKeybundle(token) {
  return httpJson("/keybundle/get-bundle", { token });
}
