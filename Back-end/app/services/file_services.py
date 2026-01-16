import logging,os
from uuid import UUID
from typing import List , Optional, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.repositories.file_repository import FileRepository
from app.repositories.undo_redo_repository import UndoRedoRepository
from app.repositories.folder_repository import FolderRepository
from app.repositories.trash_repository import RecyclebinRepository

from app.services.event.websocket_manager import websocket_manager 

from app.actions.renameCommand import RenameFileCommand 
from app.actions.moveCommand import MoveFilesBulkCommand, MoveFileCommand
from app.actions.copyCommand import CopyFileCommand, CopyFilesBulkCommand
from app.actions.trashCommand import (
    TrashFileCommand, TrashFilesBulkCommand,
    RestoreFileCommand, RestoreFilesBulkCommand,
    PermanentDeleteFileCommand,
)

from app.storage.local_cipherblob import cipherCloneStorage

from app.security.name_validator import _validate_name


logger = logging.getLogger(__name__)


class FileService:
    def __init__(self, file_repo: FileRepository, undo_repo: UndoRedoRepository, folder_repo: FolderRepository, recycle_repo: RecyclebinRepository, storage_root: str | None = None):
        self.file_repo = file_repo
        self.undo_repo = undo_repo 
        self.folder_repo = folder_repo
        self.recycle_repo = recycle_repo
        self.storage_root = storage_root or os.getenv("UPLOAD_FOLDER", "./uploads")

    async def rename_file(
        self,
        session: AsyncSession,
        user_id: str,
        file_id: UUID,
        new_file_name: str,
    ) -> str:
        new_file_name = _validate_name(new_file_name)
        action = RenameFileCommand(self.file_repo)

        try:
            async with session.begin():
                data = await action.execute(session, user_id=user_id, file_id=file_id, new_file_name=new_file_name)
                if data is None:
                    logger.info("rename_file: no-op", extra={"user_id": user_id, "file_id": str(file_id)})
                    return new_file_name
                
                await self.undo_repo.add_action(
                    session,user_id=user_id,action_type=action.action_type, action_data=data, is_done=True
                )   

        except IntegrityError:
            logger.info("rename_file: integrity conflict", extra={"user_id": user_id, "file_id": str(file_id)})
            raise FileExistsError("A file with the same name already exists in this folder")

        try:
            await websocket_manager.broadcast_to_user(
                user_id,
                {"event": "file-renamed", "data": {"file_id": str(file_id), "new_name": new_file_name}},
            )
        except Exception:
            logger.exception("rename_file: websocket notify failed", extra={"user_id": user_id, "file_id": str(file_id)})

        logger.info("rename_file: success", extra={"user_id": user_id, "file_id": str(file_id)})
        return new_file_name

    async def move_file(self, session:AsyncSession, user_id:str, file_ids: List[UUID], to_folderId: Optional[int]) -> Dict[str, List[dict]] :
        if not file_ids:
            raise ValueError("File ids List is empty.")
        
        file_ids = list(dict.fromkeys(file_ids))

        moved_ids : List[dict] = []
        failed_ids : List[dict] = []
        action_items : List[dict] = []

        if self.folder_repo is None:
            raise RuntimeError("self.folder_repo is required for move files.")
        
        single_move = MoveFileCommand(self.file_repo, self.folder_repo)

        async with session.begin():
            for file_id in file_ids:
                try:
                    async with session.begin_nested(): 
                        res = await single_move.execute(session, user_id=user_id, file_id=file_id, to_folderId=to_folderId)
                        if res is None:
                            moved_ids.append({"file_ids" : str(file_id), "success": True, "message":"No Change"})
                        else:
                            moved_ids.append({"file_ids": str(file_id), "success":True, **res})

                        action_items.append(res)
                except Exception as e:
                    failed_ids.append({"file_ids": str(file_id), "success":True, "error":str(e)})

            if action_items:
                bulk_files = MoveFilesBulkCommand(single_move)
                await self.undo_repo.add_action(
                    session,
                    user_id=user_id,
                    action_type=bulk_files.action_type,
                    action_data={"items": action_items},
                    is_done=True,
                )

        try:
            await websocket_manager.broadcast_to_user(
                user_id,
                {"event" : "files moved" , "data" : {"file_ids": [mid["file_id"] for mid in moved_ids if mid.get("success")], "to_folderId": to_folderId}}
            )
        except Exception as e:
            logger.exception("files move websocket failed", extra={"user_id": user_id}, error = str(e))

        return {"moved_files": moved_ids, "failed_files": failed_ids}
    
    async def copy_file(self, session:AsyncSession, user_id:str, file_ids:List[UUID], to_folderId:Optional[int]) -> Dict[str,List[dict]] :   
        if not file_ids:
            raise ValueError("File ids List is empty.")

        file_ids = list(dict.fromkeys(file_ids))

        copied_ids: List[dict] = []
        failed_ids: List[dict] = []
        action_items: List[dict] = []

        if self.folder_repo is None:
            raise RuntimeError("self.folder_repo is required for copy files.")

        upload_root = os.getenv("UPLOAD_FOLDER", "./uploads")

        single_file = CopyFileCommand(
            filerepo=self.file_repo,
            folderrepo=self.folder_repo,
            local_storage=cipherCloneStorage(),
            upload_root=upload_root,
        )
        bulk_files = CopyFilesBulkCommand(single_file=single_file)

        try:
            async with session.begin():
                for fid in file_ids:
                    try:
                        async with session.begin_nested():
                            data = await single_file.execute(session, user_id, file_id=fid, to_folderId=to_folderId)
                            copied_ids.append({"success": True, **data})
                            action_items.append(data)
                    except Exception as e:
                        failed_ids.append({"success": False, "file_id": str(fid), "error": str(e)})

                if action_items:
                    await self.undo_repo.add_action(
                        session,
                        user_id=user_id,
                        action_type=bulk_files.action_type,
                        action_data={"items": action_items, "to_folderId": to_folderId},
                        is_done=True,
                    )
        except Exception as e:
            logger.exception("copy_files failed", extra={"user_id": user_id}, error=str(e))
            raise

        try:
            await websocket_manager.broadcast_to_user(
                user_id,
                {"event": "files copied", "data": {"file_ids": [x["new_file_id"] for x in copied_ids if x.get("success")], "to_folderId": to_folderId}},
            )
        except Exception:
            logger.exception("files copy websocket failed", extra={"user_id": user_id})

        return {"copied_files": copied_ids, "failed_files": failed_ids}
    

    async def delete_files(self, session:AsyncSession, user_id:str, file_ids:List[UUID]) -> Dict[str,List[dict]]:
        if not file_ids:
            raise ValueError("File ids List is empty.")

        file_ids = list(dict.fromkeys(file_ids))

        deleted_ids: List[dict] = []
        failed_ids: List[dict] = []
        action_items: List[dict] = []

        single_file = TrashFileCommand(self.file_repo, self.folder_repo, self.recycle_repo)
        bulk_file = TrashFilesBulkCommand(single_file)

        async with session.begin():
            for file_id in file_ids:
                try:
                    async with session.begin_nested():
                        data = await single_file.execute(session, user_id=user_id,file_id=file_id)
                        deleted_ids.append({"file_id": str(file_id), "success": True})
                        action_items.append(data)
                except Exception as e:
                    failed_ids.append({"file_id": str(file_id), "success": False, "error": str(e)})

            if action_items:
                await self.undo_repo.add_action(
                    session,
                    user_id=user_id,
                    action_type=bulk_file.action_type,
                    action_data={"items": action_items},
                    is_done=True,
                )

        folders = {item.get("from_folderId") for item in action_items if item.get("from_folderId") is not None}
        try:
            await websocket_manager.broadcast_to_user(user_id,
                                                      message={"event": "files-trashed", "data": {"file_ids": [item["file_id"] for item in action_items], "affected_folder_ids": list(folders)}},
            )
        except Exception:
            logger.exception("trash_files websocket failed", extra={"user_id": user_id})

        return {"deleted_files": deleted_ids, "failed_files": failed_ids}
    
    async def restore_files(self, session:AsyncSession, user_id:str, file_ids: List[UUID]) -> Dict[str,List[dict]]:
        if not file_ids:
                raise ValueError("File ids List is empty.")

        file_ids = list(dict.fromkeys(file_ids))

        restored_ids: List[dict] = []
        failed_ids: List[dict] = []
        action_items: List[dict] = []

        single_file = RestoreFileCommand(self.file_repo, self.folder_repo, self.recycle_repo)
        bulk_file = RestoreFilesBulkCommand(single_file)

        async with session.begin():
            for file_id in file_ids:
                try:
                    async with session.begin_nested():
                        data = await single_file.execute(session, user_id=user_id,file_id=file_id)
                        restored_ids.append({"file_id": str(file_id), "success": True, **data})
                        action_items.append({"file_id": str(file_id)})
                except Exception as e:
                    failed_ids.append({"file_id": str(file_id), "success": False, "error": str(e)})

            if action_items:
                await self.undo_repo.add_action(
                    session,
                    user_id=user_id,
                    action_type=bulk_file.action_type,
                    action_data={"items": action_items},
                    is_done=True,
                )

        folders = {item.get("to_folderId") for item in action_items if item.get("to_folderId") is not None}
        try:
            await websocket_manager.broadcast_to_user(user_id,
                                                      message={"event": "files-restored", "data": {"file_ids": [item["file_id"] for item in action_items], "affected_folder_ids": list(folders)}},
            )
        except Exception:
            logger.exception("trash_files websocket failed", extra={"user_id": user_id})

        return {"restored_files": restored_ids, "failed_files": failed_ids}
    
    async def permanent_delete_file(self, session:AsyncSession, user_id:str, file_ids:List[UUID]) -> Dict[str,List[dict]]:
        if not file_ids:
            raise LookupError("File not Found.")
        
        file_ids = list(dict.fromkeys(file_ids))

        deleted_ids = List[dict] = []
        failed_ids = List[dict] = []

        item = PermanentDeleteFileCommand(self.file_repo, self.recycle_repo, self.storage_root)

        async with session.begin():
            for fileid in file_ids:
                try:
                    async with session.begin_nested():
                        data = await item.execute(session, user_id=user_id, file_id=fileid)
                        deleted_ids.append({"file_id": str(fileid), "success": True, **data})
                except Exception as e:
                    failed_ids.append({"file_id": str(fileid), "success": False, "error": str(e)})

        try:
            await websocket_manager.broadcast_to_user(
                user_id,
                {"event": "files-permanently-deleted", "data": {"file_ids": [d["file_id"] for d in deleted_ids]}},
            )
        except Exception:
            logger.exception("permanent delete websocket failed", extra={"user_id": user_id})
        
        return {"deleted_files": deleted_ids, "failed_files": failed_ids}
