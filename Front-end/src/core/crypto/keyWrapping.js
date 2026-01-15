// core/crypto/keyWrapping.js
import { encryptEnvelope, decryptEnvelope } from "./c1.js";
import { ENVELOPE_KIND } from "./envelopes/envelopeCodec.js";

export async function wrapKey({ c, wrappingKey, rawKey, aad }) {
  if (wrappingKey.length !== 32) throw new Error("wrappingKey must be 32 bytes");
  if (rawKey.length !== 32) throw new Error("rawKey must be 32 bytes");

  return encryptEnvelope({
    c,
    kind: ENVELOPE_KIND.WRAPPED_KEY,
    key: wrappingKey,
    plaintext: rawKey,
    aad,
  });
}

export async function unwrapKey({ c, wrappingKey, wrappedKeyEnvelope, aad }) {
  return decryptEnvelope({
    c,
    expectedKind: ENVELOPE_KIND.WRAPPED_KEY,
    key: wrappingKey,
    envelope: wrappedKeyEnvelope,
    aad,
  });
}
