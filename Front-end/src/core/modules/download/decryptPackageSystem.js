// core/download/decryptPackageStream.js
import { normalizeFileCryptoMeta } from "./cryptoMeta.js";
import { createExactByteReader } from "./exactByteReader.js";
import { buildAadC1Chunk } from "../crypto/aad.js";

function ceilDiv(a, b) {
  return Math.floor((a + b - 1) / b);
}

// package = nonce(12) + tag(16) + ciphertext(plainLen)
// => len = plainLen + 28
function pkgLenForPlainLen(plainLen) {
  return plainLen + 28;
}

/**
 * Yields plaintext chunks as they decrypt (best for mobile later).
 *
 * @param {object} args
 * @param {object} args.cryptoKit
 * @param {object} args.metaRaw
 * @param {Uint8Array} args.wrappingKey         // 32 bytes
 * @param {() => Promise<Uint8Array|null>} args.read // returns null=end
 * @param {(p:{doneBytes:number,totalBytes:number,doneChunks:number,totalChunks:number})=>void=} args.onProgress
 */
export async function* decryptPackageStream({ cryptoKit, metaRaw, wrappingKey, read, onProgress }) {
  const meta = normalizeFileCryptoMeta(metaRaw);

  const totalChunks = meta.fileSize === 0 ? 0 : ceilDiv(meta.fileSize, meta.chunkSize);

  // unwrap FK (your encryption core)
  const fk = await cryptoKit.unwrapFileKeyFromB64({
    wrappingKey,
    wrappedFkB64: meta.wrappedFkB64,
    encStreamId: meta.encStreamId,
    folderId: meta.folderId,
  });

  const exact = createExactByteReader(read);
  let doneBytes = 0;

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const isLast = chunkIndex === totalChunks - 1;
    const plainLen = isLast
      ? (meta.fileSize - meta.chunkSize * (totalChunks - 1))
      : meta.chunkSize;

    const pkg = await exact.readExact(pkgLenForPlainLen(plainLen));

    const nonce = pkg.slice(0, 12);
    const tag = pkg.slice(12, 28);
    const ciphertext = pkg.slice(28); // length == plainLen

    const aad = buildAadC1Chunk({
      encStreamId: meta.encStreamId,
      chunkIndex,
      chunkSize: meta.chunkSize,
      fileSize: meta.fileSize,
      fileType: meta.fileType,
    });

    // AES-GCM decrypt + tag verify (true integrity)
    const plain = await cryptoKit.c.aead.decrypt(fk, nonce, ciphertext, tag, aad);

    doneBytes += plain.byteLength;
    onProgress?.({ doneBytes, totalBytes: meta.fileSize, doneChunks: chunkIndex + 1, totalChunks });

    yield { chunkIndex, bytes: plain, meta };
  }
}
