import logging , os
import base64
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from typing import List, Dict , Optional,Any
from app.repositories.folder_repository import FolderRepository
from app.repositories.undo_redo_repository import UndoRedoRepository
from app.repositories.file_repository import FileRepository
from app.repositories.trash_repository import RecyclebinRepository
from app.repositories.folder_key_repository import FolderKeysRepository
from app.services.event.websocket_manager import websocket_manager  

from app.actions.renameCommand import RenameFolderCommand
from app.actions.moveCommand import MoveFolderBulkCommand , MoveFolderCommand
from app.actions.copyCommand import CopyFolderCommand, CopyFoldersBulkCommand
from app.actions.foldertrashCommand import TrashFolderCommand, TrashFolderBulkCommand, RestoreFolderCommand, RestoreFolderBulkCommand, PermanentDeleteFolderCommand

from app.storage.local_cipherblob import cipherCloneStorage

from app.security.name_validator import _validate_name

logger = logging.getLogger(__name__)


class FolderService:
    def __init__(self, folder_repo: FolderRepository, undo_repo: UndoRedoRepository, file_repo: FileRepository, trash_repo:RecyclebinRepository, 
                 key_repo : FolderKeysRepository,upload_root:str, recycle_root:str):
        self.folder_repo = folder_repo
        self.undo_repo = undo_repo
        self.file_repo = file_repo
        self.trash_repo = trash_repo
        self.upload_root = upload_root
        self.recycle_root = recycle_root
        self.key_repo = key_repo

    def _b64(s: str) -> bytes:
        try:
            return base64.b64decode(s, validate=True)
        except Exception:
            raise ValueError("Invalid base64 in enc payload")

    async def bootstrap_defaults_with_keys(
        self,
        session: AsyncSession,
        user_id: str,
        root: dict,
        children: list[dict],
    ) -> dict:
        """
        root/children dicts are BootstrapFolderNode.model_dump()
        Idempotent:
        - folders are created if missing (by folder_uid, fallback by name for root)
        - keys are inserted if missing; conflict if different payload already exists
        """
        created: list[str] = []
        existing: list[str] = []

        async with session.begin():
            # ---- 1) Root ----
            root_uid = root["folder_uid"]
            root_name = _validate_name(root["name"])

            root_folder = await self.folder_repo.get_by_uid(session, user_id, root_uid)

            if not root_folder:
                # Optional: also allow "root by name at parent None" to avoid duplicate roots
                by_name = await self.folder_repo.name_exists_in_parent_folder(session, user_id, None, root_name)
                if by_name:
                    root_folder = by_name
                    existing.append(str(root_uid))
                    # IMPORTANT: if existing folder has no folder_uid set (old rows), you should set it:
                    root_folder.folder_uid = root_uid
                    session.add(root_folder)
                    await session.flush()
                else:
                    root_folder = await self.folder_repo.create_with_uid(
                        session,
                        user_id=user_id,
                        folder_uid=root_uid,
                        folder_name=root_name,
                        parent_folder_id=None,
                        depth=0,
                        heirarchy_path=None,
                    )
                    root_folder.heirarchy_path = str(int(root_folder.folder_id))
                    session.add(root_folder)
                    created.append(str(root_uid))

            else:
                existing.append(str(root_uid))

            # store root keys (wrapped by MAK => wrapped_by_folder_id=None)
            renc = root["enc"]
            await self.key_repo.ensure(
                session,
                user_id=user_id,
                folder_id=int(root_folder.folder_id),
                wrapped_fk=self._b64(renc["wrapped_fk_b64"]),
                nonce_fk=self._b64(renc["nonce_fk_b64"]),
                wrapped_fok=self._b64(renc["wrapped_fok_b64"]),
                nonce_fok=self._b64(renc["nonce_fok_b64"]),
                wrap_alg=renc.get("wrap_alg", "XCHACHA20POLY1305"),
                wrapped_by_folder_id=None,
            )

            # Map uid -> folder row for parent resolution
            uid_to_folder = {str(root_uid): root_folder}

            # ---- 2) Children (supports nested if parents appear earlier or already exist) ----
            for ch in children:
                ch_uid = ch["folder_uid"]
                ch_name = _validate_name(ch["name"])
                parent_uid = ch.get("parent_folder_uid") or root_uid

                # resolve parent folder row
                parent = uid_to_folder.get(str(parent_uid))
                if not parent:
                    parent = await self.folder_repo.get_by_uid(session, user_id, parent_uid)
                    if not parent:
                        raise ValueError(f"Parent folder_uid not found: {parent_uid}")
                    uid_to_folder[str(parent_uid)] = parent

                # ensure folder exists by uid
                ch_folder = await self.folder_repo.get_by_uid(session, user_id, ch_uid)
                if not ch_folder:
                    # also prevent duplicates by name under the same parent
                    dup = await self.folder_repo.name_exists_in_parent_folder(session, user_id, int(parent.folder_id), ch_name)
                    if dup:
                        ch_folder = dup
                        ch_folder.folder_uid = ch_uid  # bind legacy row to uid
                        session.add(ch_folder)
                        await session.flush()
                        existing.append(str(ch_uid))
                    else:
                        ch_folder = await self.folder_repo.create_with_uid(
                            session,
                            user_id=user_id,
                            folder_uid=ch_uid,
                            folder_name=ch_name,
                            parent_folder_id=int(parent.folder_id),
                            depth=int(parent.depth_level or 0) + 1,
                            heirarchy_path=None,
                        )
                        # update hierarchy path after we have folder_id
                        parent_path = parent.heirarchy_path or str(int(parent.folder_id))
                        ch_folder.heirarchy_path = f"{parent_path}/{int(ch_folder.folder_id)}"
                        session.add(ch_folder)
                        created.append(str(ch_uid))

                else:
                    existing.append(str(ch_uid))

                uid_to_folder[str(ch_uid)] = ch_folder

                # store child keys (wrapped by PARENT_FOK => wrapped_by_folder_id = parent.folder_id)
                cenc = ch["enc"]
                await self.key_repo.ensure(
                    session,
                    user_id=user_id,
                    folder_id=int(ch_folder.folder_id),
                    wrapped_fk=self._b64(cenc["wrapped_fk_b64"]),
                    nonce_fk=self._b64(cenc["nonce_fk_b64"]),
                    wrapped_fok=self._b64(cenc["wrapped_fok_b64"]),
                    nonce_fok=self._b64(cenc["nonce_fok_b64"]),
                    wrap_alg=cenc.get("wrap_alg", "AESGCM"),
                    wrapped_by_folder_id=int(parent.folder_id),
                )

        return {
            "root_folder_uid": str(root_uid),
            "created_folder_uids": created,
            "existing_folder_uids": existing,
        }


    async def rename_folder(
        self,
        session: AsyncSession,
        user_id: str,
        folder_id: int,
        new_folder_name: str,
    ) -> str:
        new_folder_name = _validate_name(new_folder_name)
        action = RenameFolderCommand(self.folder_repo)

        try:
            async with session.begin():
                data = await action.execute(session, user_id=user_id, folder_id=folder_id, new_folder_name=new_folder_name)
                if data is None:
                    logger.info("rename_folder: no-op", extra={"user_id": user_id, "folder_id": folder_id})
                    return new_folder_name
                
                await self.undo_repo.add_action(
                    session,
                    user_id=user_id,
                    action_type=action.action_type,
                    action_data=data,
                    is_done=True
                )
        except IntegrityError:
            logger.info("rename_folder: integrity conflict", extra={"user_id": user_id, "folder_id": folder_id})
            raise FileExistsError("A folder with the same name already exists in this location")

        try:
            await websocket_manager.broadcast_to_user(
                user_id,
                {"event": "folder-renamed", "data": {"folder_id": folder_id, "new_name": new_folder_name}},
            )
        except Exception:
            logger.exception("rename_folder: websocket notify failed", extra={"user_id": user_id, "folder_id": folder_id})

        logger.info("rename_folder: success", extra={"user_id": user_id, "folder_id": folder_id})
        return new_folder_name
    
    async def move_folder(self, session:AsyncSession, user_id:str, folder_ids:List[int], to_folderId:Optional[int]) -> Dict[str, List[dict]] :
        if not folder_ids:
            raise ValueError("Folder List doesnot contains any Folder Ids")

        # de-duplication for preserving order
        folder_ids = list(dict.fromkeys(folder_ids))

        moved_ids : List[dict] = []
        failed_ids : List[dict] = []
        action_items : List[dict] = []

        if self.folder_repo is None:
            raise RuntimeError("self.folder_repo is required for move files.")
        
        single_move = MoveFolderCommand(self.folder_repo)

        async with session.begin():
            for folder_id in folder_ids:
                try:
                    async with session.begin_nested(): # nested session for saving single item
                        res = await single_move.execute(session, user_id=user_id, folder_id=folder_id, to_parentId=to_folderId)
                        if res is None:
                            moved_ids.append({"fodler_ids" : str(folder_id), "success": True, "message":"No Change"})
                        else:
                            moved_ids.append({"folder_ids": str(folder_id), "success":True, **res})

                        action_items.append(res)
                except Exception as e:
                    failed_ids.append({"folder_ids": str(folder_id), "success":True, "error":str(e)})

            if action_items:
                bulk_folders = MoveFolderBulkCommand(single_move)
                await self.undo_repo.add_action(
                    session,
                    user_id=user_id,
                    action_type=bulk_folders.action_type,
                    action_data={"items": action_items},
                    is_done=True,
                )

        try:
            await websocket_manager.broadcast_to_user(
                user_id,
                {"event" : "folders moved" , "data" : {"folder_ids": [mid["folder_id"] for mid in moved_ids if mid.get("success")], "to_parentId": to_folderId}}
            )
        except Exception as e:
            logger.exception("folders move websocket failed", extra={"user_id": user_id}, error = str(e))
            
        return {"moved_folders": moved_ids, "failed_folders": failed_ids}

    async def copy_folder(self, session:AsyncSession, user_id:str, folder_ids:List[int], to_folderId: Optional[int]) -> Dict[str,List[dict]]:
        if not folder_ids:
            raise ValueError("File ids List is empty.")

        folder_ids = list(dict.fromkeys(folder_ids))

        copied_ids: List[dict] = []
        failed_ids: List[dict] = []
        action_items: List[dict] = []

        if self.folder_repo is None:
            raise RuntimeError("self.folder_repo is required for copy files.")

        upload_root = os.getenv("UPLOAD_FOLDER", "./uploads")

        single_folder = CopyFolderCommand(
            filerepo=self.file_repo,
            folderrepo=self.folder_repo,
            local_storage=cipherCloneStorage(),
            upload_root=upload_root,
        )
        bulk_folder = CopyFoldersBulkCommand(single_folder=single_folder)

        try:
            async with session.begin():
                for fid in folder_ids:
                    try:
                        async with session.begin_nested():
                            data = await single_folder.execute(session, user_id, folder_id=int(fid), to_folderId=to_folderId)
                            copied_ids.append({"success": True, **data})
                            action_items.append(data)
                    except Exception as e:
                        failed_ids.append({"success": False, "folder_id": str(fid), "error": str(e)})

                if action_items:
                    await self.undo_repo.add_action(
                        session,
                        user_id=user_id,
                        action_type=bulk_folder.action_type,
                        action_data={"items": action_items, "to_folderId": to_folderId},
                        is_done=True,
                    )
        except Exception as e:
            logger.exception("copy_folders failed", extra={"user_id": user_id}, error=str(e))
            raise

        try:
            await websocket_manager.broadcast_to_user(
                user_id,
                {"event": "folder copied", "data": {"folder_ids": [x["new_folder_id"] for x in copied_ids if x.get("success")], "to_folderId": to_folderId}},
            )
        except Exception:
            logger.exception("folder copy websocket failed", extra={"user_id": user_id})

        return {"copied_folders": copied_ids, "failed_folders": failed_ids}

    async def trash_folders(self, session:AsyncSession, user_id:str, folder_ids:List[int]) -> Dict[str,List[dict]]:
        if not folder_ids:
            raise ValueError("Folder ids not Found.")
        
        folder_ids = list(dict.fromkeys(folder_ids))

        deleted_ids: List[dict] = []
        failed_ids: List[dict] = []
        action_items: List[dict] = []

        single_folder = TrashFolderCommand(self.folder_repo, self.file_repo, self.trash_repo,self.upload_root,self.recycle_root)
        bulk_folder = TrashFolderBulkCommand(single_folder)

        try:
            async with session.begin():
                for folderid in folder_ids:
                    try:
                        async with session.begin_nested():
                            data = await single_folder.execute(session, user_id=user_id, folder_id=folderid)
                            if data is not None:
                                deleted_ids.append({"folder_id": int(folderid), "success": True})
                                action_items.append(data)
                            else:
                                deleted_ids.append({"folder_id": int(folderid), "success": True})

                    except Exception as e:
                        failed_ids.append({"folder_id":int(folderid), "success": False, "error": str(e)})

                if action_items:
                    await self.undo_repo.add_action(
                    session,
                    user_id=user_id,
                    action_type=bulk_folder.action_type,
                    action_data={"items": action_items},
                    is_done=True,
                )    
        except Exception as e:
            logger.exception("trash_folders failed", extra={"user_id": user_id}, error=str(e))
            raise 
        
        try:
            await websocket_manager.broadcast_to_user(
                user_id,
                {"event": "folder trash", "data": {"folder_ids": [x["folder_id"] for x in deleted_ids if x.get("success")]}},
            )
        except Exception:
            logger.exception("folder soft delete websocket failed", extra={"user_id": user_id})

        return {"deleted_folders": deleted_ids, "failed_folders": failed_ids}
    
    async def restore_folders(self, session:AsyncSession, user_id:str, folder_ids:List[int]) -> Dict[str, List[Dict[str, Any]]]:
        if not folder_ids:
            raise ValueError("Folder ids not Found.")
        
        folder_ids = list(dict.fromkeys(folder_ids))

        restore_ids: List[dict] = []
        failed_ids: List[dict] = []
        action_items: List[dict] = []

        single_folder = RestoreFolderCommand(self.folder_repo, self.file_repo, self.trash_repo,self.upload_root,self.recycle_root)
        bulk_folder = RestoreFolderBulkCommand(single_folder)

        try:
            async with session.begin():
                for folderid in folder_ids:
                    try:
                        async with session.begin_nested():
                            data = await single_folder.execute(session, user_id=user_id, folder_id=folderid)
                            if data is not None:
                                restore_ids.append({"folder_id": int(folderid), "success": True, **data})
                                action_items.append(data)
                            else:
                                restore_ids.append({"folder_id": int(folderid), "success": True})

                    except Exception as e:
                        failed_ids.append({"folder_id":int(folderid), "success": False, "error": str(e)})

                if action_items:
                    await self.undo_repo.add_action(
                    session,
                    user_id=user_id,
                    action_type=bulk_folder.action_type,
                    action_data={"items": action_items},
                    is_done=True,
                )    
        except Exception as e:
            logger.exception("restore_folders failed", extra={"user_id": user_id}, error=str(e))
            raise 
        
        try:
            await websocket_manager.broadcast_to_user(
                user_id,
                {"event": "folder restore", "data": {"folder_ids": [x["folder_id"] for x in restore_ids if x.get("success")]}},
            )
        except Exception:
            logger.exception("folder restore websocket failed", extra={"user_id": user_id})

        return {"deleted_folders": restore_ids, "failed_folders": failed_ids}
    
    async def permanent_folders(self, session:AsyncSession, user_id:str, folder_ids:List[int]) ->Dict[str, List[Dict[str, Any]]] :
        if not folder_ids:
            raise ValueError("Folder ids not Found.")
        
        folder_ids = list(dict.fromkeys(folder_ids))

        deleted_ids: List[dict] = []
        failed_ids: List[dict] = []
        
        single_folder = PermanentDeleteFolderCommand(self.folder_repo, self.file_repo, self.trash_repo, self.upload_root, self.recycle_root)

        try:
            async with session.begin():
                for folderid in folder_ids:
                    try:
                        async with session.begin_nested():
                            data = await single_folder.execute(session, user_id=user_id, folder_id=folderid)
                            if data is not None:
                                deleted_ids.append({"folder_id": int(folderid), "success": True, **data})
                            else:
                                deleted_ids.append({"folder_id": int(folderid), "success": True})

                    except Exception as e:
                        failed_ids.append({"folder_id":int(folderid), "success": False, "error": str(e)})
    
        except Exception as e:
            logger.exception("delete_folders failed", extra={"user_id": user_id}, error=str(e))
            raise 
        
        try:
            await websocket_manager.broadcast_to_user(
                user_id,
                {"event": "folder delete", "data": {"folder_ids": [x["folder_id"] for x in deleted_ids if x.get("success")]}},
            )
        except Exception:
            logger.exception("folder delete websocket failed", extra={"user_id": user_id})

        return {"deleted_folders": deleted_ids, "failed_folders": failed_ids}

