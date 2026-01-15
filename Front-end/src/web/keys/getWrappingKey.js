import { getMAKKey } from "../keyring/makSessionStore.js";
import { unwrapKey } from "../../core/crypto/keyWrapping.js";
import { fromBase64 } from "../../core/crypto/base64.js";
import { buildAadWrapFoK } from "../../core/crypto/aad.js";
import { fetchWrappedFoK } from "../api/folderMetaApi.js";
import { ROOT_FOLDER_ID } from "../constants/rootFolder.js";

const fokCache = new Map(); // folderId -> CryptoKey (recommended)

export function createGetWrappingKey({ token, cryptoKit, signal }) {
  return async function getWrappingKey(folderId) {
    const fid = (folderId == null) ? ROOT_FOLDER_ID : folderId;

    const cached = fokCache.get(String(fid));
    if (cached) return cached;

    const makKey = getMAKKey(); // ✅ CryptoKey

    const { wrapped_fok_b64 } = await fetchWrappedFoK({ folderId: fid, token, signal });
    const env = fromBase64(wrapped_fok_b64);
    const aad = buildAadWrapFoK({ folderId: fid });

    const fokBytes = await unwrapKey({
      c: cryptoKit.c,
      wrappingKey: makKey,     // ✅ CryptoKey
      wrappedKeyEnvelope: env,
      aad,
    });

    // ✅ import FoK to CryptoKey once (big security + perf win)
    const fokKey = await cryptoKit.c.importAesGcmKey(fokBytes, ["encrypt", "decrypt"]);
    fokBytes.fill(0);

    fokCache.set(String(fid), fokKey);
    return fokKey;
  };
}
