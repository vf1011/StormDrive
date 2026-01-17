
import logging
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.persistance.models.dash_models import Folder, File
from app.domain.persistance.models.upload_models import UploadSession,UploadFolderSession,UploadItems

from app.repositories.folder_upload_repository import UploadFolderItemRepository , UploadFolderRepository, FolderTreeRepository
from app.repositories.upload_chunk_repository import UploadChunkRepository
from app.repositories.upload_session_repository import UploadSessionRepository
from app.repositories.folder_repository import FolderRepository

from app.security.name_validator import _validate_name

from app.schemas.dash_schema import FolderUploadChildFile
from app.security.path_sanitizer import split_rel_path

from app.config.config import get_settings

logger = logging.getLogger(__name__)


class FolderUploadError(RuntimeError):
    pass

class FolderUploadServices:

    def __init__(self, item_repo:UploadFolderItemRepository, session_repo:UploadFolderRepository,chunk_repo:UploadChunkRepository,
                 folder_repo:FolderRepository, tree_repo:FolderTreeRepository, upload_repo:UploadSessionRepository,settings:None):
        self.session_repo = session_repo
        self.chunk_repo = chunk_repo
        self.item_reppo = item_repo
        self.folder_repo = folder_repo
        self.tree_repo = tree_repo
        self.upload_repo = upload_repo

        cfg = settings or get_settings()
        self.min_chunk = cfg.folder_min_chunk_bytes
        self.max_chunk = cfg.folder_max_chunk_bytes
        self.default_chunk = cfg.folder_default_chunk_bytes
        self.session_ttl_hours = cfg.folder_session_ttl_hours
        self.max_entries = cfg.folder_max_entries

    def chunk_size(self, requested: Optional[int]) -> int:
        if requested is None:
            return self.default_chunk
        return max(self.min_chunk, min(self.max_chunk, int(requested)))
    
    def total_chunk_size(self, file_size:int , chunk_size:int) -> int:
        if file_size == 0 :
            return 1
        return (file_size + chunk_size - 1) // chunk_size
    

    def _rename_file_in_folder(self, base: str, counter: int) -> str:
        base = _validate_name(base)
        if counter <= 0:
            return base
        if "." in base:
            stem, ext = base.rsplit(".", 1)
            return f"{stem} ({counter}).{ext}"
        return f"{base} ({counter})"
    
    async def init_folder_upload(self, session:AsyncSession, user_id:str, parent_folder_id:int, folder_name:str, entries:list,chunk_size: Optional[int]) -> Tuple[UploadSession, int, str, List[FolderUploadChildFile]]:
        if len(entries) > self.max_entries:
            raise ValueError("Too many entries in one folder upload")

        chunk_s =  self.chunk_size(chunk_size)

        parent_folder: Optional[Folder] = None
        if parent_folder is not (None,0):
            parent_folder = await self.folder_repo.get_active_folder(session, user_id=user_id,folder_id=parent_folder_id)
            if not parent_folder:
                raise FileNotFoundError("Parent folder not found.")
            
        file_entries: List[Tuple[Tuple[str, ...], str, int, str, str]] = []
        dir_paths: List[Tuple[str, ...]] = [] 

        for entry in entries:
            start = (entry.start or "").lower()
            parts = split_rel_path(entry.path)

            if start == "dir":
                continue

            if start != "file":
                raise ValueError("Invalid entry kind.")

            if entry.file_size is None or entry.file_type is None:
                raise ValueError("file_size and file_type required for file entries.")

            rel_dir = Tuple(parts[:-1])
            fname = parts[-1]
            rel_path = "/".join(parts)
            file_entries.append((rel_dir, fname, int(entry.file_size), str(entry.file_type), rel_path))   

            for i in range(1, len(rel_dir) + 1):
                dir_paths.append(rel_dir[:i])

        root = await self.tree_repo.create_folder(session, user_id, parent_folder, folder_name)
        folder_map = await self.tree_repo.create_subfolders(session, user_id, root, dir_paths)

        name_used : Dict[Tuple[int,str],int] = {}
        fileplan = List[FolderUploadChildFile] = []
        items: List[UploadItems] = []

        folder_session = UploadFolderSession(
            user_id=user_id,
            parent_folder_id=parent_folder_id,
            root_folder_id=int(root.folder_id),
            root_folder_name=str(root.folder_name),
            status="UPLOADING",
            total_files=len(file_entries),
            expires_at=UploadFolderSession.default_expiry(self.session_ttl_hours),
        )
        await self.session_repo.create(session, folder_session)

        for rel_dir, base_name, fsize, ftype, rel_path in file_entries:
            target_folder = folder_map.get(rel_dir) or root
            folder_id = int(target_folder.folder_id)

            key = (folder_id, base_name.lower())
            name_used[key] = name_used.get(key, -1) + 1
            resolved_name = self._rename_file_in_folder(base_name, name_used[key])

            total_chunks = self.total_chunk_size(fsize, chunk_s)

            upload = UploadSession(
                user_id=user_id,
                folder_id=folder_id,
                file_name=resolved_name,
                file_type=ftype,
                file_size=fsize,
                chunk_size=chunk_s,
                total_chunks=total_chunks,
                status="UPLOADING",
                expires_at=folder_session.expires_at,
            )
            await self.upload_repo.create_session(session, upload)

            fileplan.append(FolderUploadChildFile(rel_path=rel_path,file_name=resolved_name, folder_id=folder_id, upload_id=upload.upload_id, chunk_size=chunk_s, total_chunks=total_chunks))

            items.append(
                UploadItems(
                    folder_upload_id=folder_session.folder_upload_id,
                    user_id=user_id,
                    rel_path=rel_path,
                    folder_id=folder_id,
                    file_name=resolved_name,
                    file_type=ftype,
                    file_size=fsize,
                    upload_id=upload.upload_id,
                )
            )

        await self.item_reppo.add(session, items)

        return folder_session, int(root.folder_id), str(root.folder_name), fileplan

