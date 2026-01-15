// core/crypto/envelopes/envelopeCodec.js
import { concatBytes } from "../bytes.js";

/**
 * Portable format:
 * [MAGIC4 "SDEN"][VER1][KIND1][ALGO1][nLen1][tLen1][nonce][tag][ciphertext]
 */
const MAGIC = new Uint8Array([0x53, 0x44, 0x45, 0x4e]); // SDEN
const VERSION = 0x01;

// kind: 1=data, 2=wrapped_key
export const ENVELOPE_KIND = {
  DATA: 1,
  WRAPPED_KEY: 2,
};

// AES-256-GCM only (locked)
export const ALG = {
  "AES-256-GCM": 1,
};

export const ALG_REV = {
  1: "AES-256-GCM",
};

export function encodeEnvelope({ kind, algo, nonce, tag, ciphertext }) {
  if (nonce.length > 255) throw new Error("nonce too long");
  if (tag.length > 255) throw new Error("tag too long");

  // IMPORTANT: prevent silent "0" algo in header if algo is unsupported
  const algoCode = ALG[algo];
  if (!algoCode) throw new Error(`Unsupported algo: ${algo} (AES-256-GCM only)`);

  const header = new Uint8Array(9);
  header.set(MAGIC, 0);
  header[4] = VERSION;
  header[5] = kind;
  header[6] = algoCode;
  header[7] = nonce.length;
  header[8] = tag.length;

  return concatBytes(header, nonce, tag, ciphertext);
}

export function decodeEnvelope(bytes) {
  if (bytes.length < 9) throw new Error("Envelope too small");
  for (let i = 0; i < 4; i++) if (bytes[i] !== MAGIC[i]) throw new Error("Bad envelope magic");

  const version = bytes[4];
  if (version !== VERSION) throw new Error(`Unsupported envelope version: ${version}`);

  const kind = bytes[5];
  const algoCode = bytes[6];
  const algo = ALG_REV[algoCode];
  if (!algo) throw new Error(`Unsupported algo code: ${algoCode} (AES-256-GCM only)`);

  const nLen = bytes[7];
  const tLen = bytes[8];

  const nonceStart = 9;
  const tagStart = nonceStart + nLen;
  const ctStart = tagStart + tLen;

  if (bytes.length < ctStart) throw new Error("Envelope truncated");

  return {
    version,
    kind,
    algo,
    nonce: bytes.slice(nonceStart, tagStart),
    tag: bytes.slice(tagStart, ctStart),
    ciphertext: bytes.slice(ctStart),
  };
}
