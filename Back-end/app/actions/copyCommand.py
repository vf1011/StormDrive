import logging
from dataclasses import dataclass
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.file_repository import FileRepository
from app.repositories.folder_repository import FolderRepository
from app.security.copy_name import copy_name
from app.security.path_sanitizer import safe_path_join, resolve_under_root
from app.storage.local_cipherblob import cipherCloneStorage

logger = logging.getLogger(__name__)

@dataclass(frozen=True)
class CopyFileCommand:
    filerepo : FileRepository
    folderrepo : FolderRepository
    local_storage : cipherCloneStorage
    upload_root : str

    action_type : str = "copy_file"

    async def execute(self, session:AsyncSession, user_id:str, file_id: UUID , to_folderId: Optional[int]) -> Dict[str,Any]:
        res = await self.filerepo.get_active_file(session, user_id=user_id, file_id=file_id)
        if not res:
            raise LookupError("File Not Found.")
        
        target_folder_id = to_folderId if to_folderId is not None else res.folder_id

        if target_folder_id is not None:
            target = await self.folderrepo.get_active_folder(session, user_id=user_id, folder_id=int(target_folder_id))
            if not target:
                raise LookupError("Folder Not Found.")
            
        num = 1
        new_file = copy_name(res.file_name,num)
        while await self.filerepo.name_exist_or_not_in_folder(session, user_id=user_id, file_name=new_file, exclude_curr_file_id=file_id, folder_id=target_folder_id):
            num += 1
            new_file = copy_name(res.file_name,num)

        new_id = uuid4()
        dest_path = safe_path_join(self.upload_root, f"{new_id}.enc")
        src_path = resolve_under_root(self.upload_root, res.file_path)

        await self.local_storage.clone_ciphertext(src_path, dest_path)

        try:
            create_new_file = self.filerepo.copy(
                session, user_id=user_id, file=res , 
                new_file_id=new_id, new_file_name=new_file, new_folder_id=target_folder_id,
                new_file_path=str(dest_path),
            )            
        except Exception:
            try:
                dest_path.unlink(missing_ok=True)
            except Exception:
                logger.exception("copy cleanup failed", extra={"user_id": user_id, "dest": str(dest_path)})
            raise 

        return {
            "source_file_id": str(file_id),
            "new_file_id": str(create_new_file.new_file_id),
            "new_name": create_new_file.new_file_name,
            "to_folderId": target_folder_id,
            "file_path": create_new_file.new_file_path,
        }
        

    async def undo(self, session: AsyncSession, user_id: str, data: Dict[str, Any]) -> None:
        new_id = UUID(data["new_file_id"])
        await self.filerepo.soft_delete(session, user_id=user_id, file=data)

    async def redo(self, session:AsyncSession, user_id:str, data: Dict[str,Any]) -> None:
        new_id = UUID(data["new_file_id"])
        await self.filerepo.soft_delete(session, user_id=user_id, file=data)

        target_folder_id = data.get("to_folderId")
        desire_name = data.get("new_name")

        if desire_name and await self.filerepo.name_exist_or_not_in_folder(
            session,
            user_id=user_id,
            folder_id=target_folder_id,
            file_name=desire_name,
            exclude_file_id=new_id,
        ):
            num = 1
            new_name = copy_name(desire_name, num)
            while await self.filerepo.name_exist_or_not_in_folder(
                session,
                user_id=user_id,
                folder_id=target_folder_id,
                file_name=new_name,
                exclude_file_id=new_id,
            ):
                num += 1
                new_name = copy_name(desire_name, num)

            file = await self.filerepo.get_file_any_state(session,user_id=user_id, file_id=new_id)
            if file:
                    await self.filerepo.rename(session, file=file, new_file_name=new_name)

@dataclass(frozen=True)
class CopyFilesBulkCommand:
    single_file: CopyFileCommand
    action_type: str = "copy_bulk_files"

    async def execute(self, session: AsyncSession, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        file_ids: List[UUID] = data["file_ids"]
        to_folderId: Optional[int] = data.get("to_folderId")

        results: List[Dict[str, Any]] = []
        for fid in file_ids:
            res = await self.single_file.execute(session, user_id, file_id=fid, to_folderId=to_folderId)
            results.append(res)

        return {"items": results, "to_folderId": to_folderId}

    async def undo(self, session: AsyncSession, user_id: str, data: Dict[str, Any]) -> None:
        for item in reversed(data.get("items", [])):
            await self.single_file.undo(session, user_id, item)

    async def redo(self, session: AsyncSession, user_id: str, data: Dict[str, Any]) -> None:
        for item in data.get("items", []):
            await self.single_file.redo(session, user_id, item)

                

@dataclass(frozen=True)
class CopyFolderCommand:
    folderrepo: FolderRepository
    filerepo: FileRepository
    local_storage: cipherCloneStorage
    upload_root: str

    action_type : str = "copy_folder"

    async def execute(self, session:AsyncSession, user_id:str, folder_id:int, to_folderId:Optional[int]) -> Dict[str, Any]:
        root_folder = await self.folderrepo.get_active_folder(session, user_id=user_id, folder_id=int(folder_id))
        if not root_folder:
            raise LookupError("Folder not found.")
        
        target_folder_id = to_folderId if to_folderId is not None else root_folder.parent_folder_id

        if target_folder_id is not None:
            target_folder = await self.folderrepo.get_active_folder(session, user_id=user_id, folder_id=target_folder_id)
            if not target_folder:
                raise LookupError("Target Folder not Found.")
            
            if await self.folderrepo.is_ancestor_of(session, user_id=user_id, root_id=int(folder_id), node_id=int(target_folder_id)):
                raise ValueError("Folder cannot copy into it's own subtree.")
        num = 1
        new_name = f"{root_folder.folder_name} (copy)"
        while await self.folderrepo.name_exists_in_parent_folder(session,
                                                                 user_id=user_id,
                                                                 parent_folder_id=target_folder_id,
                                                                 folder_name=new_name):
            num += 1 
            new_name = f"{root_folder.folder_name} (copy {num})"

        depth = 0
        if target_folder_id is not None:
            parent = await self.folderrepo.get_active_folder(session, user_id=user_id, folder_id=int(target_folder_id))
            depth = (parent.depth_level + 1) if parent else 0

        new_root_folder = self.folderrepo.copy(
            session,
            user_id=user_id,
            folder_name=new_name,
            parent_folder_id=target_folder_id,
            depth=depth,
        )

        created_folder_ids : List[int] = [int(new_root_folder.folder_id)]
        created_file_ids : List[UUID] = []

        queue : List[tuple[int,int]] = [(int(root_folder.folder_id),int(new_root_folder.folder_id))]

        while queue:
            curr_id , target_id = queue.pop(0)
            children = await self.folderrepo.list_child_folder(session,
                                                            user_id=user_id,
                                                            parent_folder_id=curr_id)
            for child in children:
                new_child = await self.folderrepo.copy(
                    session,user_id=user_id,folder_name=child.folder_name,
                    parent_folder_id=target_id,
                    depth=depth+1
                )
                created_folder_ids.append(int(new_child.folder_id))
                queue.append(int(child.folder_id),int(new_child.folder_id))

            files = await self.folderrepo.list_file_in_folder(session,
                                                              user_id=user_id,
                                                              folder_id=curr_id)
            for file in files:
                if await self.filerepo.name_exist_or_not_in_folder(session, user_id=user_id, folder_id=target_id, file_name=file.file_name):
                    num = 1
                    new_name = copy_name(file.file_name,num)
                    while await self.filerepo.name_exist_or_not_in_folder(session, user_id=user_id, folder_id=target_id,file_name=new_name):
                        num =+ 1 
                        new_name = copy_name(file.file_name,num)


                new_file_id = uuid4()
                dest_path = safe_path_join(self.upload_root, f"{new_file_id}.enc")
                src_path = resolve_under_root(self.upload_root, file.file_path)

                await self.local_storage.clone_ciphertext(src_path,dest_path)

                try:
                    created = await self.filerepo.copy(
                        session,
                        user_id=user_id,
                        file=file,
                        new_file_id=new_file_id,
                        new_file_name=new_name,
                        new_folder_id=target_id,
                        new_file_path=str(dest_path),
                    )
                except Exception:
                    try:
                        dest_path.unlink(missing_ok=True)
                    except Exception:
                        logger.exception("folder copy cleanup failed", extra={"user_id": user_id})
                    raise

                created_file_ids.append(str(created.file_id))

        return {
            "source_folder_id": int(folder_id),
            "new_folder_id": int(new_root_folder.folder_id),
            "new_name": new_root_folder.folder_name,
            "to_parentId": target_folder_id,
            "created_folder_ids": created_folder_ids,
            "created_file_ids": created_file_ids,
        }
        
    async def undo(self, session:AsyncSession, user_id:str, data:Dict[str,Any]) -> None:
        folder_ids = [int(f) for f in data.get("created_folder_ids", [])]
        file_ids = [UUID(f) for f in data.get("created_file_ids", [])]
            
        await self.filerepo.soft_delete(session,user_id=user_id,file=data)
        await self.folderrepo.delete_file(session,user_id=user_id,folder_ids=folder_ids,is_deleted=True)

    async def redo(self,session:AsyncSession, user_id:str, data:Dict[str,Any]) -> None:
        folder_ids = [int(f) for f in data.get("created_folder_ids", [])]
        file_ids = [UUID(f) for f in data.get("created_file_ids", [])]

        await self.filerepo.soft_delete(session,user_id=user_id,file=data)
        await self.folderrepo.delete_file(session,user_id=user_id,folder_ids=folder_ids,is_deleted=False)

        new_root_id = int(data["new_folder_id"])
        target_folder_id = int(data["to_folderId"])
        desire_name = data.get("new_name")

        if desire_name and await self.folderrepo.name_exists_in_parent_folder(
            session,
            user_id=user_id, parent_folder_id=target_folder_id,
            folder_name=desire_name,
            exclude_curr_folder_id=new_root_id
        ):
            num = 1
            candidate = f"{desire_name} {num}"  

            if desire_name.lower().endswith("(copy)"):
                stem = desire_name[:-6].rstrip()
                candidate = f"{stem} (copy 2)"
                num = 2
                while await self.folderrepo.name_exists_in_parent_folder(
                    session,
                    user_id=user_id,
                    parent_folder_id=target_folder_id,
                    folder_name=candidate,
                    exclude_folder_id=new_root_id,
                ):
                    num += 1
                    candidate = f"{stem} (copy {num})"
            else:
                candidate = f"{desire_name} (copy 2)"

            root = await self.folderrepo.get_active_folder(session, user_id=user_id, folder_id=new_root_id)
            if root:
                await self.folderrepo.rename(session, folder=root, new_name=candidate)

@dataclass(frozen=True)
class CopyFoldersBulkCommand:
    single_folder: CopyFolderCommand
    action_type: str = "copy_bulk_folders"

    async def execute(self, session: AsyncSession, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        folder_ids: List[UUID] = data["folder_ids"]
        to_folderId: Optional[int] = data.get("to_folderId")

        results: List[Dict[str, Any]] = []
        for fid in folder_ids:
            res = await self.single_folder.execute(session, user_id, folder_id=fid, to_folderId=to_folderId)
            results.append(res)

        return {"items": results, "to_folderId": to_folderId}

    async def undo(self, session: AsyncSession, user_id: str, data: Dict[str, Any]) -> None:
        for item in reversed(data.get("items", [])):
            await self.single_folder.undo(session, user_id, item)

    async def redo(self, session: AsyncSession, user_id: str, data: Dict[str, Any]) -> None:
        for item in data.get("items", []):
            await self.single_folder.redo(session, user_id, item)
