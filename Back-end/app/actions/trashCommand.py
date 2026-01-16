import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.file_repository import FileRepository
from app.repositories.folder_repository import FolderRepository
from app.repositories.trash_repository import RecyclebinRepository
from app.security.path_sanitizer import resolve_under_root, UnsafePathError

logger = logging.getLogger(__name__)

def split_name_ext(name:str) -> tuple[str,str]:
    name = (name or "").strip()
    if "." in name and not name.startswith("."):
        base, dot, ext = name.rpartition(".")
        return base, f".{ext}"
    return name, ""

async def auto_rename_when_restore(session:AsyncSession, user_id:str, file_repo:FileRepository, file_id : UUID, folder_id:Optional[int], original_name:str) -> str:
    base ,ext = split_name_ext(original_name)

    conflict = await file_repo.name_exist_or_not_in_folder(
        session, user_id=user_id, file_name=original_name,exclude_curr_file_id=file_id,folder_id=folder_id,
    )
    if not conflict:
        return original_name
    
    for i in range(1,50):
        if i == 1:
            name = f"{base} (restored) {ext}"
        else:
            name = f"{base} (restored {i}) {ext}"

    conflict = await file_repo.name_exist_or_not_in_folder(
            session,
            user_id=user_id,
            file_name=name,
            folder_id=folder_id,
            exclude_curr_file_id=file_id,
        )
    if not conflict:
        return name

    raise FileExistsError("Too many name conflicts while restoring")

@dataclass(frozen=True)
class TrashFileCommand:
    filerepo : FileRepository
    folderrepo : FolderRepository
    recyclerepo : RecyclebinRepository

    action_type: str = "delete_file"

    async def execute(self, session:AsyncSession, user_id:str , file_id:UUID) -> Dict[str, Any]:
        file = await self.filerepo.get_active_file(session, user_id=user_id, file_id=file_id)
        if not file:
            raise LookupError("File not Found.")
        
        from_folderId = file.folder_id
        await self.filerepo.soft_delete(session, file, user_id=user_id)
        await self.recyclerepo.add_file(session, user_id=user_id,file=file,parent_folder_id=from_folderId,deleted_by_action="api")

        return {
            "file_id": str(file.file_id),
            "from_folderId": from_folderId,
            "original_name": file.file_name,
        }
    
    async def undo(self, session:AsyncSession, user_id:str, data:Dict[str,Any]) -> None:
        file_id = UUID(data["file_id"])
        parent_folder_id = data.get("from_folderId")

        file = await self.filerepo.get_file_any_state(session, user_id=user_id, file_id=file_id)
        if not file:
            raise LookupError("File not found")
        
        to_folderId : Optional[int] = None
        if parent_folder_id is not None:
            folder = await self.folderrepo.get_active_folder(session, user_id=user_id, folder_id=int(parent_folder_id))
            to_folderId = folder.folder_id if folder else None

        restore_name = await auto_rename_when_restore(
            session, user_id=user_id, file_repo=self.filerepo, file_id=file_id,
            folder_id=to_folderId,original_name=file.file_name
        )

        recycle = await self.recyclerepo.get_file(session, user_id=user_id, file_id=file_id)
        if recycle:
            await self.recyclerepo.delete_item(session, item=recycle)

        await self.filerepo.restore(session, file=file, folder_id=to_folderId, file_name=restore_name)

    async def redo(self, session: AsyncSession, user_id: str, data: Dict[str, Any]) -> None:
        file_id = UUID(data["file_id"])
        file = await self.filerepo.get_active_file(session, user_id=user_id, file_id=file_id)
        if not file:
            raise LookupError("File not found")

        from_folderId = file.folder_id
        await self.filerepo.soft_delete(session, file=file, user_id=user_id)
        await self.recyclerepo.add_file(
            session,
            user_id=user_id,
            file=file,
            parent_folder_id=from_folderId,
            deleted_by_action="redo",
        )

@dataclass(frozen=True)
class RestoreFileCommand:
    filerepo : FileRepository
    folderrepo : FolderRepository
    recyclerepo : RecyclebinRepository

    action_type : str = "restore_file"

    async def execute(self, session:AsyncSession, user_id:str, file_id:UUID) -> Dict[str,Any]:
        recycle = await self.recyclerepo.get_file(session,user_id=user_id,file_id=file_id)
        if not recycle:
            raise LookupError("File Not Found in recycle bin.")
        
        file = await self.filerepo.get_file_any_state(session, user_id=user_id, file_id=file_id)
        if not file:
            raise LookupError("File missing (cannot restore)")
        
        to_folderId : Optional[int] = None
        if recycle.parent_folder_id is not None:
            folder = await self.folderrepo.get_active_folder(session, user_id=user_id, folder_id=to_folderId)
            to_folderId = folder.folder_id if folder else None

        restored_name = await auto_rename_when_restore(
            session=session,
            file_repo=self.filerepo,
            user_id=user_id,
            file_id=file_id,
            folder_id=to_folderId,
            original_name=file.file_name,
        )

        await self.filerepo.restore(session, file=file, folder_id=to_folderId, file_name=restored_name)
        await self.recyclerepo.delete_item(session, item=recycle)

        return {
            "file_id": str(file.file_id),
            "to_folderId": to_folderId,
            "file_name": restored_name,
        }
    
    async def undo(self, session:AsyncSession, user_id:str, data:Dict[str,Any]) -> None:
        file_id = UUID(data["file_id"])
        file = await self.filerepo.get_active_file(session, user_id=user_id, file_id=file_id)
        if not file:
            raise LookupError("File not found")       

        from_folderId = file.folder_id     
        await self.filerepo.soft_delete(session, file=file, user_id=user_id)
        await self.recyclerepo.add_file(
            session,
            user_id=user_id,
            file=file,
            parent_folder_id=from_folderId,
            deleted_by_action="undo",
        )

    async def redo(self, session:AsyncSession, user_id:str , data:Dict[str,Any]) -> None:
        file_id = UUID(data["file_id"])
        recycle = await self.recyclerepo.get_file(session, user_id=user_id, file_id=file_id)
        if not recycle:
            raise LookupError("File not found.")
        
        file = await self.filerepo.get_file_any_state(session, user_id=user_id, file_id=file_id)
        if not file:
            raise LookupError("File row missing (cannot redo restore)")

        to_folderId: Optional[int] = None
        if recycle.parent_folder_id is not None:
            folder = await self.folderrepo.get_active_folder(session, user_id=user_id, folder_id=int(recycle.parent_folder_id))
            to_folderId = folder.folder_id if folder else None

        restored_name = await auto_rename_when_restore(
            session=session,
            file_repo=self.filerepo,
            user_id=user_id,
            file_id=file_id,
            folder_id=to_folderId,
            original_name=file.file_name,
        )

        await self.filerepo.restore(session, file=file, folder_id=to_folderId, file_name=restored_name)
        await self.recyclerepo.delete_item(session, item=recycle)

@dataclass(frozen=True)
class PermanentDeleteFileCommand:
    filerepo : FileRepository
    recyclerepo : RecyclebinRepository
    storage_root : str

    action_type : str = "permanent_delete_file"

    async def execute(self, session: AsyncSession, user_id: str, file_id: UUID) -> Dict[str, Any]:
        recycle = await self.recyclerepo.get_file(session, user_id=user_id, file_id=file_id)
        if not recycle:
            raise LookupError("File not found in recycle bin")

        try:
            path = resolve_under_root(self.storage_root, recycle.item_path)
        except UnsafePathError as e:
            logger.warning("perm delete blocked unsafe path", extra={"user_id": user_id, "file_id": str(file_id)})
            raise ValueError(str(e))

        try:
            path.unlink(missing_ok=True)
        except Exception as e:
            raise RuntimeError(f"Failed to delete file bytes: {e}")

        file = await self.filerepo.get_file_any_state(session, user_id=user_id, file_id=file_id)
        if file:
            await self.filerepo.hard_delete(session, file=file)

        await self.recyclerepo.delete_item(session, item=recycle)

        return {"file_id": str(file_id)}
    
@dataclass(frozen=True)
class TrashFilesBulkCommand:
    single_file: TrashFileCommand
    action_type: str = "delete_multiple_files"

    async def undo(self, session: AsyncSession, user_id: str, data: Dict[str, Any]) -> None:
        items: List[Dict[str, Any]] = data["items"]
        for item in reversed(items):
            await self.single_file.undo(session, user_id=user_id, data=item)

    async def redo(self, session: AsyncSession, user_id: str, data: Dict[str, Any]) -> None:
        items: List[Dict[str, Any]] = data["items"]
        for item in items:
            await self.single_file.redo(session, user_id=user_id, data=item)


@dataclass(frozen=True)
class RestoreFilesBulkCommand:
    single_file: RestoreFileCommand
    action_type: str = "restore_multiple_files"

    async def undo(self, session: AsyncSession, user_id: str, data: Dict[str, Any]) -> None:
        items: List[Dict[str, Any]] = data["items"]
        for item in reversed(items):
            await self.single_file.undo(session, user_id=user_id, data=item)

    async def redo(self, session: AsyncSession, user_id: str, data: Dict[str, Any]) -> None:
        items: List[Dict[str, Any]] = data["items"]
        for item in items:
            await self.single_file.redo(session, user_id=user_id, data=item)