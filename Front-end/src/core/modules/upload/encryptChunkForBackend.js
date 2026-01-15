// core/upload/encryptChunkForBackend.js
import { buildAadC1Chunk } from "../crypto/aad.js";
import { deriveNonceBase, deriveChunkNonce } from "../crypto/c1.js";
import { toBase64 } from "../crypto/base64.js";

/**
 * Backend expects:
 * - PUT body: ciphertext bytes (NOT envelope)
 * - headers: X-Chunk-Nonce (b64), X-Chunk-Tag (b64)
 */
export async function encryptChunkForBackend({
  provider,       // e.g. new WebCryptoAesGcmProvider()
  fk,             // Uint8Array(32)
  encStreamId,    // upload_id as string
  chunkIndex,
  chunkSize,
  fileSize,
  fileType,
  plaintextChunk, // Uint8Array
}) {
  const aad = buildAadC1Chunk({
    encStreamId,
    chunkIndex,
    chunkSize,
    fileSize,
    fileType: fileType || "application/octet-stream",
  });

  // deterministic nonces (stable for retries)
  const nonceBase = await deriveNonceBase(provider, fk, encStreamId);
  const nonce = await deriveChunkNonce(provider, nonceBase, chunkIndex);

  const { ciphertext, tag } = await provider.aead.encrypt(fk, nonce, plaintextChunk, aad);

  return {
    ciphertext,
    nonce_b64: toBase64(nonce),
    tag_b64: toBase64(tag),
  };
}
