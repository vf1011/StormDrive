// core/crypto/c1.js
import { hkdfSha256 } from "./hkdf.js";
import { utf8, u32be } from "./bytes.js";
import { encodeEnvelope, decodeEnvelope } from "./envelope/envelopeCodec.js";
import { C1_SCHEMA_VERSION } from "./aad.js";

// nonceBase = HKDF(FK, salt=encStreamId, info="SD:C1:nonceBase")
export async function deriveNonceBase(c, fk, encStreamId) {
  return hkdfSha256(c, fk, utf8.toBytes(encStreamId), utf8.toBytes("SD:C1:nonceBase"), c.aead.nonceLength);
}

// nonce_i = HKDF(nonceBase, salt=chunkIndex, info="SD:C1:nonce")
export async function deriveChunkNonce(c, nonceBase, chunkIndex) {
  return hkdfSha256(c, nonceBase, u32be(chunkIndex), utf8.toBytes("SD:C1:nonce"), c.aead.nonceLength);
}

export async function encryptEnvelope({ c, kind, key, plaintext, aad, nonce }) {
  const n = nonce ?? c.randomBytes(c.aead.nonceLength);
  const { ciphertext, tag } = await c.aead.encrypt(key, n, plaintext, aad);
  return encodeEnvelope({ kind, algo: c.aead.algo, nonce: n, tag, ciphertext });
}

export async function decryptEnvelope({ c, expectedKind, key, envelope, aad }) {
  const env = decodeEnvelope(envelope);
  if (expectedKind && env.kind !== expectedKind) throw new Error("Envelope kind mismatch");

  if (env.algo !== c.aead.algo) {
    throw new Error(`Algo mismatch: envelope=${env.algo}, provider=${c.aead.algo}`);
  }

  return c.aead.decrypt(key, env.nonce, env.ciphertext, env.tag, aad);
}



export function buildEncryptionMetadata({ aead, encStreamId, chunkSize, fileSize, fileType }) {
  return {
    c1: {
      schema: C1_SCHEMA_VERSION,
      enc_stream_id: encStreamId,
      aead,
      chunk_size: chunkSize,
      file_size: fileSize,
      file_type: fileType,
      nonce_mode: "hkdf-deterministic",
      aad_format: "SD:C1|v1|enc_stream_id|chunk_index|chunk_size|file_size|file_type",
      nonce_format:
        "nonceBase=HKDF(FK,salt=enc_stream_id,info=SD:C1:nonceBase); nonce_i=HKDF(nonceBase,salt=chunk_index,info=SD:C1:nonce)",
    },
    wrapped_fk: {
      schema: C1_SCHEMA_VERSION,
      aead,
      aad_format: "SD:WrapFK|v1|enc_stream_id|folder_id",
    },
  };
}
