def _validate_name(name: str) -> str:
    cleaned = (name or "").strip()
    if not cleaned:
        raise ValueError("Name cannot be empty")
    if len(cleaned) > 255:
        raise ValueError("Name too long")
    if any(ch in cleaned for ch in ("/", "\\", "\x00")):
        raise ValueError("Invalid characters in name")
    return cleaned