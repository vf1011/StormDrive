import json
import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional, Tuple
from uuid import UUID

import aiofiles
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.file_repository import FileRepository
from app.repositories.trash_repository import RecyclebinRepository

from app.security.path_sanitizer import safe_path_join , resolve_under_root, UnsafePathError

logger = logging.getLogger(__name__)


DEFAULT_UPLOAD_ROOT = os.getenv("UPLOAD_FOLDER", "uploads")
DEFAULT_RECYCLE_ROOT = os.getenv("RECYCLE_BIN_FOLDER", "recycle_bin")
DEFAULT_VERSIONS_ROOT = os.getenv("VERSIONS_FOLDER", "versions")

MAX_RANGE_BYTES = int(os.getenv("MAX_PREVIEW_RANGE_BYTES", str(16 * 1024 * 1024)))  # 16 MB
READ_CHUNK = int(os.getenv("PREVIEW_READ_CHUNK", str(1024 * 1024)))  # 1 MB

@dataclass(frozen=True)
class PreviewMetaData:
    file_id : UUID
    file_name: str
    mime: str
    plain_size: int
    cipher_size: int
    integrity_hash: str
    encryption_metadata: Dict[str, Any]
    src: str  # "active" | "recycle" | "version"
    version_id: Optional[int]
    is_deleted: bool


class PreviewService:
    def __init__(self, file_repo:FileRepository, trash_repo:RecyclebinRepository, upload_root: str = DEFAULT_UPLOAD_ROOT, recycle_root: str = DEFAULT_RECYCLE_ROOT,
        versions_root: str = DEFAULT_VERSIONS_ROOT):
        self.file_repo = file_repo
        self.trash_repo = trash_repo
        self.upload_root = Path(upload_root).resolve()
        self.recycle_root = Path(recycle_root).resolve()
        self.version_root = Path(versions_root).resolve()

    def parse_metadata(self, raw: Optional[str]) -> Dict[str,Any]:
        if not raw:
            return {}
        raw = raw.strip()
        if not raw:
            return {}
        try:
            return json.loads(raw)
        except Exception:
            return {"raw" : raw}
        

    def resolve_path(self, root_path : Path , segment:str)->Path:
        try:
            return resolve_under_root(root_path, segment)
        except UnsafePathError:
            p = Path(segment)
            if len(p.parts) == 1 and p.name == segment:
                return safe_path_join(root_path, segment)
            raise
    
    def resolve_ciphertext_path(self, src:str, segmnet_path:str)->Path:
        roots = []
        if src == "recycle":
            roots = [self.recycle_root, self.upload_root, self.version_root] 
        elif src == "version":
            roots = [self.version_root, self.upload_root, self.recycle_root]
        else:
            roots = [self.upload_root, self.recycle_root, self.version_root]

        err = None
        for r in roots:
            try:
                path = self.resolve_path(r, segmnet_path)
                if path.exists() and path.is_file():
                    return path
                err = FileNotFoundError(str(path))
            except Exception as e:
                err = e

        raise FileNotFoundError(f"Ciphertext not found for segment '{segmnet_path}': {err}")

    async def resolve_metadata(self, session:AsyncSession, user_id: str,file_id: UUID,is_deleted: bool = False,version_id: Optional[int] = None) -> Tuple[PreviewMetaData,Path]:
        file = await self.file_repo.get_file_any_state(session, user_id=user_id, file_id=file_id)
        if not file:
            raise LookupError("File Not Found.")
        
        if version_id is not None:
            ver_file = await self.file_repo.get_file_version(session, user_id=user_id, version_id=version_id, file_id=file_id)
            if not ver_file:
                raise LookupError("File Version Not Found.")
            
            enc_metadata = self.parse_metadata(getattr(ver_file,"encryption_metadata",None)) or self.parse_metadata(file.encryption_metadata)

            if not enc_metadata:
                raise RuntimeError("File Encryption metadata missing for version preview.")
            
            cipher_path = self.resolve_ciphertext_path(src="version",segmnet_path=ver_file.file_path)
            cipher_size = cipher_path.stat().st_size
            meta = PreviewMetaData(
                file_id=file_id,
                file_name=ver_file.file_name,
                mime=ver_file.file_type,
                plain_size=int(ver_file.file_size),
                cipher_size=int(cipher_size),
                integrity_hash=ver_file.integrity_hash,
                encryption_metadata=enc_metadata,
                src="version",
                version_id=version_id,
                is_deleted=bool(file.is_deleted),
            )
            return meta, cipher_path
        
        is_deleted = bool(is_deleted or file.is_deleted)
        src = "recycle" if is_deleted else "active"

        obj_path = file.file_path
        if is_deleted:
            recycle = await self.trash_repo.get_file(session, user_id=user_id, file_id=file_id)
            if recycle and recycle.item_path:
                obj_path = recycle.item_path

        enc_metadata = self.parse_metadata(file.encryption_metadata)
        if not enc_metadata:
            raise RuntimeError("File Encryption metadata missing for trash preview.")
        
        cipher_path = self.resolve_ciphertext_path(src=src, segmnet_path=obj_path)
        cipher_size = cipher_path.stat().st_size
        meta = PreviewMetaData(
            file_id=file_id,
            file_name=file.file_name,
            mime=file.file_type,
            plain_size=int(file.file_size),
            cipher_size=int(cipher_size),
            integrity_hash=file.integrity_hash,
            encryption_metadata=enc_metadata,
            src=src,
            version_id=version_id,
            is_deleted=bool(file.is_deleted),
        )
        return meta, cipher_path
    
    @staticmethod
    def parse_range(file_size:int , range_header:str) ->  Tuple[int, int]:
        if not range_header:
            raise ValueError("Range Header is Empty.")
        
        if not range_header.startswith("bytes="):
            raise ValueError("Range Header is Invalid")
        
        rh = range_header.replace("bytes=" , "" ,1).strip()
        if "," in rh:
            raise ValueError("Multiple ranges are not supported.")
        
        if "-" in rh:
            raise ValueError("Invalid range format")
        
        start , end = rh.split("-",1)
        if start == "":
            raise ValueError("Suffix ranges not supported")
        
        s = int(start)
        e = int(end) if end else file_size - 1

        if s < 0 or e < 0 or s > e:
            raise ValueError("Invalid Range bounds.")
        
        if s >= file_size:
            raise ValueError("range starts beyond end of file size.")
        
        e = min(e,file_size-1)
        return s , e
    
    async def iterate_range(self, start:int, end:int, path: Path):
        rem = start - end + 1
        if rem > MAX_RANGE_BYTES:
            raise ValueError(f"Range too large (max {MAX_RANGE_BYTES} bytes)")
        
        async with aiofiles.open(path, "rb") as f:
            await f.seek(start)
            while rem > 0:
                read = min(READ_CHUNK, rem)
                data = await f.read(read)
                if not data:
                    break
                rem -= len(data)
                yield data


        


        