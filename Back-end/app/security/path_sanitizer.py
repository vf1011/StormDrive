from pathlib import Path
from typing import Optional, Union, List
from uuid import UUID
from app.security.name_validator import _validate_name

MAX_DEPTH = 50
MAX_PATH_LEN = 2048

class UnsafePathError(ValueError):
    pass


def safe_path_join(base_dir: Union[str, Path], *parts: str) -> Path:
    """
    Build a path under base_dir safely.
    Use this when YOU are constructing a path (not validating DB paths).
    """
    base = Path(base_dir).resolve()
    current = base

    for part in parts:
        if part is None:
            raise UnsafePathError("Empty path part")

        segment = str(part).strip()
        if not segment:
            raise UnsafePathError("Empty path part")

        if "\x00" in segment:
            raise UnsafePathError("Null byte in path")

        seg_path = Path(segment)

        if seg_path.is_absolute() or seg_path.anchor:
            raise UnsafePathError("Absolute path segment not allowed")

        for p in seg_path.parts:
            if p in (".", ".."):
                raise UnsafePathError("Path traversal segment not allowed")

        current = current / seg_path

    resolved = current.resolve()

    try:
        resolved.relative_to(base)
    except Exception:
        raise UnsafePathError("Resolved path escapes base directory")

    return resolved


def resolve_under_root(root_dir: Union[str, Path], candidate: Union[str, Path]) -> Path:
    """
    Validate a candidate path (often from DB) is under root_dir.
    - If candidate is relative, it is interpreted relative to root_dir.
    - If candidate is absolute, it must still be under root_dir.
    """
    root = Path(root_dir).resolve()
    cand = Path(candidate)

    if not cand.is_absolute():
        cand = root / cand

    resolved = cand.resolve()

    try:
        resolved.relative_to(root)
    except Exception:
        raise UnsafePathError("Storage path is not valid for storage root")

    return resolved


def cipher_filename(file_id: Union[str, UUID]) -> str:
    """
    Standard ciphertext filename fallback.
    """
    return f"{str(file_id)}.enc"


def resolve_cipher_path(
    root_dir: Union[str, Path],
    *,
    file_id: Union[str, UUID],
    db_path: Optional[Union[str, Path]] = None,
) -> Path:
    """
    For file-bytes operations where:
    - You prefer a DB path if it's safe
    - Otherwise fallback to <uuid>.enc under root_dir
    """
    if db_path:
        try:
            return resolve_under_root(root_dir, db_path)
        except UnsafePathError:
            pass

    return safe_path_join(root_dir, cipher_filename(file_id))

def split_rel_path(self, p: str) -> List[str]:
        p = (p or "").strip()
        if not p or len(p) > MAX_PATH_LEN:
            raise ValueError("Invalid path length")
        if p.startswith("/") or p.startswith("\\"):
            raise ValueError("Absolute paths not allowed")
        if "\\" in p:
            raise ValueError("Backslashes not allowed")

        parts = [x for x in p.split("/") if x != ""]
        if not parts:
            raise ValueError("Invalid path")
        if len(parts) > MAX_DEPTH:
            raise ValueError("Path too deep")
        for seg in parts:
            if seg in (".", ".."):
                raise ValueError("Invalid path segment")
            _validate_name(seg)
        return parts
