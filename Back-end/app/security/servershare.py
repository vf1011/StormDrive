import base64
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes

def derive_servershare(ss_master: bytes) -> str:
    """
    Deterministic per-user SS_session derived from SS_master.
    Returned as urlsafe base64 string.
    """
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=b"STORMDRIVE_SS_SESSION_V1",
    )
    servershare = hkdf.derive(ss_master)
    return base64.urlsafe_b64encode(servershare).decode("utf-8")
