import asyncio
import logging
import os
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.file_repository import FileRepository
from app.repositories.version_repository import VersionRepository
from app.security.path_sanitizer import safe_path_join, UnsafePathError
from app.services.preview_services import PreviewService

logger = logging.getLogger(__name__)

UPLOAD_ROOT = Path(os.getenv("UPLOAD_FOLDER", "uploads")).resolve()
VERSIONS_ROOT = Path(os.getenv("VERSIONS_FOLDER", str(UPLOAD_ROOT / "versions"))).resolve()

async def copy_atomic(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    tmp = dst.with_suffix(dst.suffix + ".tmp")
    await asyncio.to_thread(shutil.copy2, src, tmp)
    await asyncio.to_thread(os.replace, tmp, dst)

async def remove_file(path:Path) -> None:
    if path.exists() and path.is_file():
        await asyncio.to_thread(os.remove, path)

@dataclass(frozen=True)
class VersionItem:
    version_id: int
    original_file_id: UUID
    file_name: str
    file_path: str
    file_size: int
    file_type: str
    integrity_hash: str
    created_at: str

class VersionService:
    def __init__(self,file_repo : FileRepository, ver_repo:VersionRepository):
        self.file_repo = file_repo
        self.ver_repo = ver_repo

    def _version_blob_path(self, *, user_id: str, file_id: UUID, version_id: int) -> Path:
        # versions/<user_id>/<file_id>/<version_id>.enc
        return safe_path_join(VERSIONS_ROOT, user_id, str(file_id), f"{version_id}.enc")

    async def list_versionfile(self,session:AsyncSession,user_id:str,file_id:UUID) -> List[VersionItem]:
        res = await self.file_repo.get_file_any_state(session,user_id=user_id,file_id=file_id)
        if not res:
            raise LookupError("File Not Found.")
        
        stmt = await self.ver_repo.list_versions_of_file(session,user_id=user_id,original_file_id=file_id)
        files : List[VersionItem] = []
        for file in stmt:
            files.append(VersionItem(
                version_id=file.version_id,
                original_file_id=file.original_file_id,
                file_name=file.file_name,
                file_path=file.file_path,
                file_size=file.file_size,
                file_type=file.file_type,
                integrity_hash=file.integrity_hash,
                created_at=file.created_at.isoformat()
            ))

        return files
    
    async def snapshot_of_current_live_file(self,session:AsyncSession,user_id:str,file_id:UUID) -> int:
        file = await self.file_repo.get_file_any_state(session,user_id=user_id,file_id=file_id)
        if not file:
            raise LookupError("File not Found.")
        
        live_file_cipher_path = PreviewService.resolve_path(UPLOAD_ROOT,file.file_path)
        if not live_file_cipher_path:
            raise FileNotFoundError(f"Live ciphertext missing: {live_file_cipher_path}")
        
        fpath = str(self._version_blob_path(user_id=user_id,file_id=file_id,version_id=0))
        entry = self.ver_repo.create_version(
            session,
            user_id=user_id,
            original_file_id=file_id,
            file_name=file.file_name,
            file_path=fpath,
            file_type=file.file_type,
            file_size=int(file.file_size),
            integrity_hash=file.integrity_hash
        )
        
        await session.flush()
        version_id = int(entry.version_id)
        version_blob_path = self._version_blob_path(user_id=user_id, file_id=file_id, version_id=version_id)

        await copy_atomic(live_file_cipher_path, version_blob_path)

        entry.file_path = str(version_blob_path)
        session.add(entry)
        return version_id

    async def restore_version(self,session:AsyncSession,user_id:str,file_id:UUID,version_id:int) -> Dict:
        file = await self.file_repo.get_file_any_state(session,user_id=user_id,file_id=file_id)
        if not file:
            raise LookupError("File Not Found.")
        
        ver_file = await self.ver_repo.get_version_of_file(session,user_id=user_id,original_file_id=file_id,version_id=version_id)
        if not ver_file:
            raise LookupError("File Version is not Found.")
        
        snapshot_version_id = await self.snapshot_of_current_live_file(session, user_id=user_id, file_id=file_id)

        version_file_path = PreviewService.resolve_path(VERSIONS_ROOT,ver_file.file_path)
        if not version_file_path.exists():
            raise FileNotFoundError(f"Version of this file is not exist : {version_file_path}")
        
        live_file_cipher_path = PreviewService.resolve_path(UPLOAD_ROOT,file.file_path)
        if not live_file_cipher_path.parent.exists():
            live_file_cipher_path.parent.mkdir(parents=True, exist_ok=True)

        await copy_atomic(version_file_path,live_file_cipher_path)

        file.file_name = ver_file.file_name
        file.file_size = ver_file.file_size
        file.file_type = ver_file.file_type
        file.integrity_hash = ver_file.integrity_hash
        session.add(file)

        return {
            "restored": True,
            "file_id": str(file_id),
            "version_id": version_id,
            "snapshot_version_id": snapshot_version_id,
        }
    
    async def delete_version(self, session:AsyncSession,user_id:str,file_id:UUID,version_id:int)->int:
        file = await self.file_repo.get_file_any_state(session,user_id=user_id,file_id=file_id)
        if not file:
            raise LookupError("File not Found.")
        
        ver_file = await self.ver_repo.get_version_of_file(session,user_id=user_id,original_file_id=file_id,version_id=version_id)
        if not ver_file:
            raise LookupError("Version Of File not Found.")
        
        version_file_path = PreviewService.resolve_path(VERSIONS_ROOT,ver_file.file_path)
        try:
            await remove_file(version_file_path)
        except UnsafePathError:
            raise
        except Exception:
            logger.exception("Failed removing version blob", extra={"file_id": str(file_id), "version_id": version_id})

        deleted_rows = await self.ver_repo.delete_version(
            session, original_file_id=file_id, version_id=version_id
        )

        return {
            "deleted": deleted_rows > 0,
            "file_id": str(file_id),
            "version_id": version_id,
        }

