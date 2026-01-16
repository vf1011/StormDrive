import logging
from typing import Any, Dict

from sqlalchemy.ext.asyncio import AsyncSession

from app.actions.renameCommand import RenameFileCommand, RenameFolderCommand
from app.actions.moveCommand import MoveFilesBulkCommand, MoveFolderBulkCommand, MoveFileCommand, MoveFolderCommand
from app.actions.copyCommand import CopyFileCommand, CopyFilesBulkCommand, CopyFolderCommand, CopyFoldersBulkCommand
from app.actions.foldertrashCommand import TrashFolderCommand, TrashFolderBulkCommand, RestoreFolderCommand, RestoreFolderBulkCommand
from app.actions.trashCommand import TrashFileCommand,TrashFilesBulkCommand,RestoreFileCommand,RestoreFilesBulkCommand

from app.repositories.file_repository import FileRepository
from app.repositories.folder_repository import FolderRepository
from app.repositories.undo_redo_repository import UndoRedoRepository
from app.repositories.trash_repository import RecyclebinRepository
from app.services.event.websocket_manager import websocket_manager

logger = logging.getLogger(__name__)


class UndoRedoService:
    def __init__(self, undo_repo: UndoRedoRepository, file_repo: FileRepository, folder_repo: FolderRepository,trash_repo: RecyclebinRepository,upload_root:str,recycle_root:str):
        self.undo_repo = undo_repo
        self.file_repo = file_repo
        self.folder_repo = folder_repo
        self.trash_repo = trash_repo
        self.upload_root = upload_root
        self.recycle_root = recycle_root

        move_file = MoveFileCommand(self.file_repo, self.folder_repo)
        move_folder = MoveFolderCommand(self.folder_repo)

        copy_file = CopyFileCommand(self.file_repo,self.folder_repo)
        copy_folder = CopyFolderCommand(self.folder_repo, self.file_repo)

        trash_file = TrashFileCommand(self.file_repo, self.folder_repo, self.trash_repo)
        restore_file = RestoreFileCommand(self.file_repo, self.folder_repo, self.trash_repo)

        trash_folder = TrashFolderCommand(self.folder_repo, self.file_repo, self.trash_repo, self.upload_root, self.recycle_root)
        restore_folder = RestoreFolderCommand(self.folder_repo, self.file_repo, self.trash_repo, self.upload_root, self.recycle_root)

        self._actions = {
            "rename_file": RenameFileCommand(self.file_repo),
            "rename_folder": RenameFolderCommand(self.folder_repo),
            "move_files": MoveFilesBulkCommand(move_file),
            "move_folders": MoveFolderBulkCommand(move_folder),
            "copy_files": CopyFilesBulkCommand(copy_file),
            "copy_folders":CopyFoldersBulkCommand(copy_folder),
            "trash_files":TrashFilesBulkCommand(trash_file),
            "trash_folders":TrashFolderBulkCommand(trash_folder),
            "restore_files":RestoreFileCommand(restore_file),
            "restore_folders":RestoreFolderBulkCommand(restore_folder)
        }


    def _get_action(self, action_type: str):
        action = self._actions.get(action_type)
        if not action:
            raise ValueError(f"Unsupported action_type: {action_type}")
        return action

    async def undo_last(self, session: AsyncSession, user_id: str) -> Dict[str, Any]:
        async with session.begin():
            row = await self.undo_repo.get_last_done(session, user_id=user_id)
            if not row:
                raise LookupError("Nothing to undo")

            action = self._get_action(row.action_type)
            await action.undo(session, user_id=user_id, data=row.action_data)
            await self.undo_repo.set_done(session, action_id=row.action_id, is_done=False)

        # try:
        #     if row.action_type == "rename_file":
        #         await websocket_manager.broadcast_to_user(
        #             user_id,
        #             {"event": "file-renamed", "data": {"file_id": row.action_data["file_id"], "new_name": row.action_data["old_name"]}},
        #         )
        #     elif row.action_type == "rename_folder":
        #         await websocket_manager.broadcast_to_user(
        #             user_id,
        #             {"event": "folder-renamed", "data": {"folder_id": row.action_data["folder_id"], "new_name": row.action_data["old_name"]}},
        #         )
        # except Exception:
        #     logger.exception("undo notify failed", extra={"user_id": user_id, "action_id": row.action_id})

        return {"action_id": row.action_id, "action_type": row.action_type, "status": "undone"}

    async def redo_last(self, session: AsyncSession, *, user_id: str) -> Dict[str, Any]:
        async with session.begin():
            row = await self.undo_repo.get_last_undone(session, user_id=user_id)
            if not row:
                raise LookupError("Nothing to redo")

            action = self._get_action(row.action_type)
            await action.redo(session, user_id=user_id, data=row.action_data)
            await self.undo_repo.set_done(session, action_id=row.action_id, is_done=True)

        # try:
        #     if row.action_type == "rename_file":
        #         await websocket_manager.broadcast_to_user(
        #             user_id,
        #             {"event": "file-renamed", "data": {"file_id": row.action_data["file_id"], "new_name": row.action_data["new_name"]}},
        #         )
        #     elif row.action_type == "rename_folder":
        #         await websocket_manager.broadcast_to_user(
        #             user_id,
        #             {"event": "folder-renamed", "data": {"folder_id": row.action_data["folder_id"], "new_name": row.action_data["new_name"]}},
        #         )
        # except Exception:
        #     logger.exception("redo notify failed", extra={"user_id": user_id, "action_id": row.action_id})

        return {"action_id": row.action_id, "action_type": row.action_type, "status": "redone"}
