import os
import tempfile
from pathlib import Path

import aiofiles


class cipherCloneStorage:
    def __init__(self, chunk_size: int = 8 * 1024 * 1024):
        self.chunk_size = chunk_size

    async def clone_ciphertext(self, src: Path, dst: Path) -> None:
        dst.parent.mkdir(parents=True, exist_ok=True)

        # Atomic write: write to temp and replace
        tmp = Path(dst.parent) / f".tmp-{dst.name}"
        if tmp.exists():
            try:
                tmp.unlink()
            except Exception:
                pass

        async with aiofiles.open(src, "rb") as r, aiofiles.open(tmp, "wb") as w:
            while True:
                chunk = await r.read(self.chunk_size)
                if not chunk:
                    break
                await w.write(chunk)

        os.replace(tmp, dst)
