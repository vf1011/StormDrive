// core/crypto/CryptoKit.js
import { buildAadC1Chunk, buildAadWrapFK } from "./aad.js";
import { deriveNonceBase, deriveChunkNonce, encryptEnvelope, decryptEnvelope, buildEncryptionMetadata } from "./c1.js";
import { wrapKey, unwrapKey } from "./keyWrapping.js";
import { toBase64, fromBase64 } from "./base64.js";
import { ENVELOPE_KIND } from "./envelope/envelopeCodec.js";

export class CryptoKit {
  constructor(provider) {
    this.c = provider;
  }

  // --- keys ---
  generateFileKey() {
    return this.c.randomBytes(32);
  }

  // backend finalize expects wrapped_fk_b64
  async wrapFileKeyToB64({ wrappingKey, fk, encStreamId, folderId }) {
    const aad = buildAadWrapFK({ encStreamId, folderId });
    const wrapped = await wrapKey({ c: this.c, wrappingKey, rawKey: fk, aad });
    return toBase64(wrapped);
  }

  async unwrapFileKeyFromB64({ wrappingKey, wrappedFkB64, encStreamId, folderId }) {
    const aad = buildAadWrapFK({ encStreamId, folderId });
    const wrappedBytes = fromBase64(wrappedFkB64);
    return unwrapKey({ c: this.c, wrappingKey, wrappedKeyEnvelope: wrappedBytes, aad });
  }

  // --- generic encrypt/decrypt (any bytes) ---
  async encryptBytes({ key, plaintext, aad }) {
    return encryptEnvelope({ c: this.c, kind: ENVELOPE_KIND.DATA, key, plaintext, aad });
  }

  async decryptBytes({ key, envelope, aad }) {
    return decryptEnvelope({ c: this.c, expectedKind: ENVELOPE_KIND.DATA, key, envelope, aad });
  }

  // --- chunk helpers (used later by upload/download/preview/share) ---
  async encryptChunk({ fk, encStreamId, chunkIndex, chunkSize, fileSize, fileType, plaintextChunk }) {
    const aad = buildAadC1Chunk({ encStreamId, chunkIndex, chunkSize, fileSize, fileType });

    const nonceBase = await deriveNonceBase(this.c, fk, encStreamId);
    const nonce = await deriveChunkNonce(this.c, nonceBase, chunkIndex);

    return encryptEnvelope({
      c: this.c,
      kind: ENVELOPE_KIND.DATA,
      key: fk,
      plaintext: plaintextChunk,
      aad,
      nonce, // deterministic
    });
  }

  async decryptChunk({ fk, encStreamId, chunkIndex, chunkSize, fileSize, fileType, encryptedChunkEnvelope }) {
    const aad = buildAadC1Chunk({ encStreamId, chunkIndex, chunkSize, fileSize, fileType });

    return decryptEnvelope({
      c: this.c,
      expectedKind: ENVELOPE_KIND.DATA,
      key: fk,
      envelope: encryptedChunkEnvelope,
      aad,
    });
  }

  // --- for backend FinalizeUploadRequest.encryption_metadata ---
  buildMetadata({ encStreamId, chunkSize, fileSize, fileType }) {
    return buildEncryptionMetadata({
      aead: this.c.aead.algo,
      encStreamId,
      chunkSize,
      fileSize,
      fileType,
    });
  }
}
