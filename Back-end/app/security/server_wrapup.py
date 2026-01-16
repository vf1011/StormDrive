import base64
import os
from dataclasses import dataclass

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

class ServerWrapError(RuntimeError):
    pass

@dataclass(frozen=True)
class ServerCipherWrap:

    # re-encrypt the the client ciphertext 
    key_b64_env: str = "SD_SERVER_STORAGE_KEY_B64"
    AAD_WRAP: bytes = b"sd:chunkwrap:v1" # must match upload

    def get_key(self) -> bytes:
        b64 = os.getenv(self.key_b64_env)
        if not b64:
            raise ServerWrapError(f"Missing {self.key_b64_env}. Set a base64-encoded 32-byte AESGCM key for Production.")
        
        try:
            key = base64.b64decode(b64)
        except Exception as e:
            raise ServerWrapError(f"Invalid base64 in {self.key_b64_env}: {e}")
        
        if len(key) != 32:
            raise ServerWrapError(f"{self.key_b64_env} must decode to 32 bytes, got {len(key)}")
        
        return key

    def wrapper(self, plaintext:bytes, aad:bytes | None = None) -> bytes:
        key = self.get_key()
        aes = AESGCM(key)
        nonce = os.urandom(12)
        ciphertext = aes.encrypt(nonce, plaintext, aad if aad is not None else self.AAD_WRAP)
        return nonce + ciphertext

    def unwrapper(self,cipher2:bytes, aad:bytes | None = None) -> bytes:
        if not cipher2 or len(cipher2) < 12 + 16:
            raise ServerWrapError("Invalid C2 blob")
        key = self.get_key()
        aesgcm = AESGCM(key)
        nonce, ct = cipher2[:12], cipher2[12:]
        return aesgcm.decrypt(nonce, ct, aad if aad is not None else self.AAD_WRAP) 