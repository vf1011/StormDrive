import os , uuid ,anyio
from pathlib import Path
from typing import Optional
from app.security.path_sanitizer import safe_path_join

class ChunkStorage:
    def __init__(self, root_dir: Optional[str] = None):
        self.root_dir = root_dir or os.getenv("UPLOAD_FOLDER", "./uploads")
        self._root = Path(self.root_dir).resolve()
    
    def chunk_dir(self, user_id: str, upload_id: str) -> Path:
        return safe_path_join(self.root_dir,"chunks", user_id, upload_id)
    
    def dummy_dir(self,user_id:str)->Path:
        return safe_path_join(self.root_dir, "blueprint", user_id)
    
    def save_chunk_c2(self, user_id: str, upload_id: str, chunk_index: int, sha256_hex: str, cipher2_bytes: bytes) -> str:
        chunk_dir = self.chunk_dir(user_id, upload_id)
        chunk_dir.mkdir(parents=True, exist_ok=True)

        filename = f"{chunk_index:08d}-{sha256_hex}.c2"
        final_path = safe_path_join(chunk_dir, filename)

        tmp_path = safe_path_join(chunk_dir, f".{filename}.{uuid.uuid4().hex}.tmp")
        with open(tmp_path, "wb") as f:
            f.write(cipher2_bytes)

        os.replace(tmp_path, final_path) 

        return str(Path(final_path).relative_to(Path(self.root_dir).resolve()))
    
    def save_blueprint(self, user_id: str, file_id: str, manifest_json: str) -> str:
        mdir = self.dummy_dir(user_id)
        mdir.mkdir(parents=True, exist_ok=True)

        final_path = safe_path_join(mdir, f"{file_id}.json")
        tmp_path = safe_path_join(mdir, f".{file_id}.{uuid.uuid4().hex}.tmp")

        with open(tmp_path, "w", encoding="utf-8") as f:
            f.write(manifest_json)

        os.replace(tmp_path, final_path)

        return str(Path(final_path).relative_to(Path(self.root_dir).resolve()))
    
    def resolve_key(self, storage_key: str) -> Path:
        """
        Resolve a DB-stored storage_key safely under root.
        """
        if not storage_key:
            raise ValueError("Empty storage key")

        # storage_key should be relative like: "chunks/<user>/<upload>/<idx>-<sha>.c2"
        p = (self._root / storage_key).resolve()
        if self._root != p and self._root not in p.parents:
            raise ValueError("Unsafe storage key path")
        return p

    async def read_bytes(self, storage_key: str) -> bytes:
        path = self.resolve_key(storage_key)
        async with await anyio.open_file(path, "rb") as f:
            return await f.read()

    async def read_text(self, storage_key: str) -> str:
        path = self.resolve_key(storage_key)
        async with await anyio.open_file(path, "r", encoding="utf-8") as f:
            return await f.read()
