import { hkdfSha256 } from "../crypto/hkdf.js";
import { utf8 } from "../crypto/bytes.js";

export async function deriveUnlockKEK({ c, clientShare32, serverSessionShare32 }) {
  if (!(clientShare32 instanceof Uint8Array) || clientShare32.length !== 32) {
    throw new Error("clientShare32 must be Uint8Array(32)");
  }
  if (!(serverSessionShare32 instanceof Uint8Array) || serverSessionShare32.length !== 32) {
    throw new Error("serverSessionShare32 must be Uint8Array(32)");
  }

  return hkdfSha256(
    c,
    clientShare32,
    serverSessionShare32,
    utf8.toBytes("SD:KEK:unlock"),
    32
  );
}
