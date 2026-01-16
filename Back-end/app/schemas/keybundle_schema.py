from pydantic import BaseModel, validator
from typing import Optional, Dict, Any
import base64

def _is_b64(s: str) -> bool:
    try:
        base64.urlsafe_b64decode(s + "===") 
        return True
    except Exception:
        return False

class KeybundleInitRequest(BaseModel):
    user_salt_b64: str
    wrapped_mak_b64: str

    wrapp_algo: str = "AES-256-GCM"
    wrapp_nonce_b64: str
    wrapp_tag_b64: Optional[str] = None

    kdf_algo: str = "argon2id"
    kdf_params: Optional[Dict[str, Any]] = None
    version: int = 1

    @validator("user_salt_b64", "wrapped_mak_b64", "wrapp_nonce_b64", "wrapp_tag_b64", pre=True)
    def validate_b64(cls, v):
        if v is None:
            return v
        if not isinstance(v, str) or not _is_b64(v):
            raise ValueError("invalid base64")
        return v

class KeybundleResponse(BaseModel):
    user_id: str
    user_salt_b64: str
    wrapped_mak_b64: str
    wrapp_algo: str
    wrapp_nonce_b64: str
    wrapp_tag_b64: Optional[str] = None
    kdf_algo: str
    kdf_params: Optional[Dict[str, Any]] = None
    version: int
