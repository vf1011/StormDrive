// core/download/cryptoMeta.js

function must(cond, msg) {
  if (!cond) throw new Error(msg);
}

export function normalizeFileCryptoMeta(meta) {
  must(meta, "Missing meta object");

  // required for decrypt
  must(meta.wrapped_fk_b64, "Missing wrapped_fk_b64");
  must(meta.encryption_metadata && meta.encryption_metadata.c1, "Missing encryption_metadata.c1");

  const c1 = meta.encryption_metadata.c1;

  must(c1.aead === "AES-256-GCM", `Unsupported aead: ${c1.aead}`);
  must(c1.enc_stream_id, "Missing c1.enc_stream_id");
  must(typeof c1.chunk_size === "number" && c1.chunk_size > 0, "Invalid c1.chunk_size");
  must(typeof c1.file_size === "number" && c1.file_size >= 0, "Invalid c1.file_size");
  must(c1.file_type, "Missing c1.file_type");

  return {
    // optional for UI / saving
    fileName: meta.file_name || meta.name || null,
    folderId: meta.folder_id ?? null,

    // decrypt essentials
    wrappedFkB64: meta.wrapped_fk_b64,
    encStreamId: c1.enc_stream_id,
    chunkSize: c1.chunk_size,
    fileSize: c1.file_size,
    fileType: c1.file_type,
  };
}
