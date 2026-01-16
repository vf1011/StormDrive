import asyncio
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.folder_repository import FolderRepository
from app.repositories.file_repository import FileRepository
from app.repositories.trash_repository import RecyclebinRepository
from app.actions.trashCommand import auto_rename_when_restore
from app.security.path_sanitizer import resolve_cipher_path

logger = logging.getLogger(__name__)


def validate_folder_name(name: str) -> str:
    cleaned = (name or "").strip()
    if not cleaned:
        raise ValueError("Name cannot be empty")
    if len(cleaned) > 255:
        raise ValueError("Name too long")
    if any(ch in cleaned for ch in ("/", "\\", "\x00")):
        raise ValueError("Invalid characters in name")
    return cleaned


def auto_folder_name(base: str, n: int) -> str:
    return f"{base} (restored)" if n == 1 else f"{base} (restored {n})"


# def _auto_file_name(base: str, n: int) -> str:
#     return f"{base} (restored)" if n == 1 else f"{base} (restored {n})"


async def move_path(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    await asyncio.to_thread(src.replace, dest)


async def unlink_path(p: Path) -> None:
    await asyncio.to_thread(p.unlink, True)


async def auto_resolve_folder_name(
    session: AsyncSession,
    *,
    folder_repo: FolderRepository,
    user_id: str,
    parent_folder_id: Optional[int],
    folder_id: int,
    desired_name: str,
) -> str:
    desired_name = validate_folder_name(desired_name)
    name = desired_name
    for i in range(1, 200):
        conflict = await folder_repo.name_exists_in_parent_folder(
            session,
            user_id=user_id,
            parent_folder_id=parent_folder_id,
            folder_name=name,
            exclude_curr_folder_id=folder_id,
        )
        if not conflict:
            return name
        name = auto_folder_name(desired_name, i)
    raise FileExistsError("Too many folder name conflicts while restoring")


@dataclass(frozen=True)
class TrashFolderCommand:
    folderrepo: FolderRepository
    filerepo: FileRepository
    trashrepo: RecyclebinRepository
    upload_root: str
    recycle_root: str

    action_type: str = "trash_folder"

    async def execute(self, session: AsyncSession,user_id: str, folder_id: int) -> Optional[Dict[str, Any]]:
        folder = await self.folderrepo.get_folder_any_state(session, user_id=user_id, folder_id=folder_id)
        if not folder:
            raise LookupError("Folder not found")
        if folder.is_deleted:
            return None

        folder_ids = await self.folderrepo.list_subtree_folder_ids(
            session, user_id=user_id, root_id=folder_id,include_deleted=True,include_root=True
        )

        await self.folderrepo.soft_delete_folder(session, user_id=user_id, folder_ids=folder_ids)

        files = await self.filerepo.list_files_in_folder(session, user_id=user_id, folder_ids=folder_ids, include_deleted=False)
        file_ids = [f.file_id for f in files]

        existing_rb = await self.trashrepo.list_existing_files_ids(session, user_id=user_id, file_ids=file_ids)

        for file in files:
            if file.file_id in existing_rb:
                continue

            try:
                src = resolve_cipher_path(self.upload_root, file.file_path, file_id=file.file_id)
                dest = resolve_cipher_path(self.recycle_root, None, file_id=file.file_id)
                if src.exists():
                    await move_path(src, dest)
            except Exception:
                logger.exception("trash folder: move ciphertext failed", extra={"user_id": user_id, "file_id": str(file.file_id)})

            await self.trashrepo.add_file(
                session,
                user_id=user_id,
                file=file,
                parent_folder_id=file.folder_id,
                deleted_by_action="trash_folder",
                recycle_item_path=str(resolve_cipher_path(self.recycle_root, None, file_id=file.file_id)),
            )

        await self.filerepo.soft_delete(session, user_id=user_id, file_ids=file_ids)

        return {
            "folder_id": folder_id,
            "old_parent_folder_id": folder.parent_folder_id,
            "old_name": folder.folder_name,
        }

    async def undo(self, session: AsyncSession,user_id: str, data: Dict[str, Any]) -> None:
        restore = RestoreFolderCommand(self.folderrepo, self.filerepo, self.trashrepo, self.upload_root, self.recycle_root)
        await restore.execute(session, user_id=user_id, folder_id=int(data["folder_id"]), preferred_parent_id=data.get("old_parent_folder_id"))

    async def redo(self, session: AsyncSession,user_id: str, data: Dict[str, Any]) -> None:
        await self.execute(session, user_id=user_id, folder_id=int(data["folder_id"]))


@dataclass(frozen=True)
class RestoreFolderCommand:
    folderrepo: FolderRepository
    filerepo: FileRepository
    trashrepo: RecyclebinRepository
    upload_root: str
    recycle_root: str

    action_type: str = "restore_folder"

    async def execute(
        self,
        session: AsyncSession,
        user_id: str,
        folder_id: int,
        preferred_parent_id: Optional[int] = None,
    ) -> Optional[Dict[str, Any]]:
        folder = await self.folderrepo.get_folder_any_state(session, user_id=user_id, folder_id=folder_id)
        if not folder:
            raise LookupError("Folder not found")
        if not folder.is_deleted:
            return None

        restore_parent: Optional[int] = None
        if preferred_parent_id is not None:
            parent = await self.folderrepo.get_active_folder(session, user_id=user_id, folder_id=int(preferred_parent_id))
            if parent:
                restore_parent = int(preferred_parent_id)

        new_root_name = await auto_resolve_folder_name(
            session,
            folder_repo=self.folderrepo,
            user_id=user_id,
            parent_folder_id=restore_parent,
            folder_id=folder_id,
            desired_name=folder.folder_name,
        )

        folder_ids = await self.folderrepo.list_subtree_folder_ids(
            session, user_id=user_id, root_id=folder_id, include_deleted=True, include_root=True
        )

        await self.folderrepo.restore_folders(session, user_id=user_id, folder_ids=folder_ids)

        folder.parent_folder_id = restore_parent
        folder.folder_name = new_root_name
        folder.is_deleted = False
        folder.deleted_at = None
        session.add(folder)

        files = await self.filerepo.list_files_in_folder(session, user_id=user_id, folder_ids=folder_ids, include_deleted=True)
        deleted_files = [f for f in files if f.is_deleted]

        restored_ids: List[UUID] = []
        for file in deleted_files:
            safe_name = await auto_rename_when_restore(
                session,
                file_repo=self.filerepo,
                user_id=user_id,
                folder_id=file.folder_id,
                file_id=file.file_id,
                desired_name=file.file_name,
            )
            if safe_name != file.file_name:
                await self.filerepo.rename(session, file, safe_name)

            try:
                src = resolve_cipher_path(self.recycle_root, None, file_id=file.file_id)
                dst = resolve_cipher_path(self.upload_root, file.file_path, file_id=file.file_id)
                if src.exists():
                    await move_path(src, dst)
            except Exception:
                logger.exception("restore folder: move ciphertext failed", extra={"user_id": user_id, "file_id": str(file.file_id)})
                continue

            restored_ids.append(file.file_id)

        if restored_ids:
            await self.filerepo.restore(session, user_id=user_id, file_ids=restored_ids)
            await self.trashrepo.delete_file_item(session, user_id=user_id, file_ids=restored_ids)

        return {"folder_id": folder_id, "new_name": new_root_name, "restored_parent_id": restore_parent}

    async def undo(self, session: AsyncSession,user_id: str, data: Dict[str, Any]) -> None:
        trash = TrashFolderCommand(self.folderrepo, self.filerepo, self.trashrepo, self.upload_root, self.recycle_root)
        await trash.execute(session, user_id=user_id, folder_id=int(data["folder_id"]))

    async def redo(self, session: AsyncSession,user_id: str, data: Dict[str, Any]) -> None:
        await self.execute(session, user_id=user_id, folder_id=int(data["folder_id"]), preferred_parent_id=None)


@dataclass(frozen=True)
class TrashFolderBulkCommand:
    single: TrashFolderCommand
    action_type: str = "trash_bulk_folders"

    async def undo(self, session: AsyncSession, user_id: str, data: Dict[str, Any]) -> None:
        items: List[Dict[str, Any]] = data.get("items", [])
        for item in reversed(items):
            await self.single.undo(session, user_id=user_id, data=item)

    async def redo(self, session: AsyncSession,user_id: str, data: Dict[str, Any]) -> None:
        items: List[Dict[str, Any]] = data.get("items", [])
        for item in items:
            await self.single.redo(session, user_id=user_id, data=item)


@dataclass(frozen=True)
class RestoreFolderBulkCommand:
    single: RestoreFolderCommand
    action_type: str = "restore_bulk_folders"

    async def undo(self, session: AsyncSession,user_id: str, data: Dict[str, Any]) -> None:
        items: List[Dict[str, Any]] = data.get("items", [])
        for item in reversed(items):
            await self.single.undo(session, user_id=user_id, data=item)

    async def redo(self, session: AsyncSession,user_id: str, data: Dict[str, Any]) -> None:
        items: List[Dict[str, Any]] = data.get("items", [])
        for item in items:
            await self.single.redo(session, user_id=user_id, data=item)


@dataclass(frozen=True)
class PermanentDeleteFolderCommand:
    folderrepo: FolderRepository
    filerepo: FileRepository
    trashrepo: RecyclebinRepository
    upload_root: str
    recycle_root: str
    action_type: str = "perm_delete_folder"

    async def execute(self, session: AsyncSession, user_id: str, folder_id: int) -> Dict[str, Any]:
        folder = await self.folderrepo.get_folder_any_state(session, user_id=user_id, folder_id=folder_id)
        if not folder:
            raise LookupError("Folder not found")
        if not folder.is_deleted:
            raise ValueError("Folder must be in trash before permanent delete")

        folder_ids = await self.folderrepo.list_subtree_folder_ids(
            session, user_id=user_id, root_folder_id=folder_id, include_deleted=True,include_root=True
        )

        files = await self.filerepo.list_files_in_folder(session, user_id=user_id, folder_ids=folder_ids, include_deleted=True)
        file_ids = [f.file_id for f in files]

        # delete ciphertext from both locations (safe + tolerant)
        for file in files:
            try:
                up = resolve_cipher_path(self.upload_root, file.file_path, file_id=file.file_id)
                if up.exists():
                    await unlink_path(up)
            except Exception:
                logger.exception("perm delete: upload unlink failed", extra={"user_id": user_id, "file_id": str(file.file_id)})
            try:
                rb = resolve_cipher_path(self.recycle_root, None, file_id=file.file_id)
                if rb.exists():
                    await unlink_path(rb)
            except Exception:
                logger.exception("perm delete: recycle unlink failed", extra={"user_id": user_id, "file_id": str(file.file_id)})

        await self.trashrepo.delete_file_item(session, user_id=user_id, file_ids=file_ids)
        await self.filerepo.hard_delete(session, user_id=user_id, file_ids=file_ids)
        await self.folderrepo.delete_folders_hard(session, user_id=user_id, folder_ids=folder_ids)

        return {"folder_id": folder_id, "deleted_files": len(file_ids), "deleted_folders": len(folder_ids)}
