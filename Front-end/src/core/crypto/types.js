/**
 * @typedef {string} B64
 *
 * @typedef {Object} EnvelopeV1
 * @property {1} v
 * @property {"AES-GCM"} alg
 * @property {B64} nonce_b64
 * @property {B64} ct_b64
 * @property {1} aad_v
 *
 * @typedef {Object} Keybundle
 * @property {string} user_id
 * @property {B64} user_salt_b64
 * @property {EnvelopeV1} wrapped_mak_password
 * @property {EnvelopeV1} wrapped_mak_recovery
 * @property {1} kdf_v
 *
 * @typedef {Object} FolderMeta
 * @property {string} folder_id
 * @property {string|null} parent_id
 * @property {number} key_version
 * @property {EnvelopeV1} wrapped_fok
 *
 * @typedef {Object} FileMeta
 * @property {string} file_id
 * @property {string} folder_id
 * @property {number} key_version
 * @property {number} head_version
 * @property {EnvelopeV1} wrapped_fmk
 *
 * @typedef {Object} FileVersionHeader
 * @property {1} v
 * @property {"AES-GCM"|"XCHACHA20-POLY1305"} alg
 * @property {number} chunk_size
 * @property {B64} nonce_seed_b64
 * @property {number} total_chunks
 *
 * @typedef {Object} UploadSession
 * @property {string} upload_id
 * @property {string} file_id
 * @property {string} folder_id
 * @property {number} version
 * @property {EnvelopeV1} wrapped_fmk
 * @property {FileVersionHeader} header
 * @property {number} bytes_received
 * @property {"active"|"finalizing"|"done"|"aborted"} status
 */

export {}; // keeps ESM happy; JSDoc types are for tooling only
