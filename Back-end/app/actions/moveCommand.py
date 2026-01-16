import logging
from dataclasses import dataclass
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any, Dict, Optional, List
from app.repositories.file_repository import FileRepository 
from app.repositories.folder_repository import FolderRepository
from uuid import UUID

logger = logging.getLogger(__name__)

@dataclass(frozen=True)
class MoveFileCommand:
    filerepo : FileRepository
    folderrepo : FolderRepository

    action_type : str = "move_file"

    async def execute(self, session:AsyncSession, user_id:str, file_id:UUID, to_folderId: Optional[int]) -> Optional[Dict[str,Any]]:
        file = await self.filerepo.get_active_file(session, user_id=user_id, file_id=file_id)
        if not file:
            raise LookupError("File Not Found.")
        
        from_folderId = file.folder_id
        if from_folderId == to_folderId:
            return None
        
        if to_folderId is not None:
            result = await self.folderrepo.get_active_folder(session, user_id=user_id, folder_id=to_folderId)
            if not result:
                raise LookupError("Folder is not Found.")
            
        conflict = await self.filerepo.name_exist_or_not_in_folder(
            session,user_id=user_id, file_name=file.file_name, folder_id=from_folderId,exclude_curr_file_id=file.file_id
        )
        if conflict:
            raise FileExistsError("Cannot undo move: name already exists in the original folder")

        await self.filerepo.move(session, file=file, new_folder_id=from_folderId)

        return {
            "file_id": str(file.file_id),
            "from_folder_id": from_folderId,
            "to_folder_id": to_folderId,
        }
    
    async def undo(self, session:AsyncSession, user_id:str, data:Dict[str,Any]) -> None :
        file_id = UUID(data["file_id"])
        from_folderId = data.get("from_folderId")

        file = await self.filerepo.get_active_file(session, user_id=user_id, file_id=file_id)
        if not file:
            raise LookupError("File Not Found.")
        
        if from_folderId is not None:
            result = await self.folderrepo.get_active_folder(session, user_id=user_id, folder_id=from_folderId)
            if not result:
                raise LookupError("Original folder not found.")
            
        conflict = await self.filerepo.name_exist_or_not_in_folder(
            session, user_id=user_id, file_name=file.file_name, folder_id=from_folderId, exclude_curr_file_id=file_id
        )
        if conflict:
            raise FileExistsError("Cannot undo move: name already exists in the original folder")

        await self.filerepo.move(session, file=file, new_folder_id=from_folderId)

    async def redo(self, session:AsyncSession, user_id:str, data:Dict[str,Any]) -> None:
        file_id = UUID(data["file_id"])
        to_folderId = data.get("to_folderId")

        file = await self.filerepo.get_active_file(session, user_id=user_id, file_id=file_id)
        if not file:
            raise LookupError("File Not Found.")
        
        if to_folderId is not None:
            result = await self.folderrepo.get_active_folder(session, user_id=user_id, folder_id=to_folderId)
            if not result:
                raise LookupError("Original folder not found.")
            
        conflict = await self.filerepo.name_exist_or_not_in_folder(
            session, user_id=user_id, file_name=file.file_name, folder_id=to_folderId, exclude_curr_file_id=file.file_id
        )
        if conflict:
            raise FileExistsError("Cannot undo move: name already exists in the original folder")

        await self.filerepo.move(session, file=file, new_folder_id=to_folderId)


@dataclass(frozen=True)
class MoveFolderCommand:
    folderrepo = FolderRepository
    action_type: str = "move_folder"

    async def execute(self, session:AsyncSession, user_id:str, folder_id:int, to_parentId: Optional[int]) -> Optional[Dict[str, Any]]:
        folder = await self.folderrepo.get_active_folder(session, user_id=user_id, folder_id=folder_id)
        if not folder:
            raise LookupError("File Not Found.")
        
        from_folderId = folder.parent_folder_id
        if from_folderId == to_parentId:
            return None
        
        # cannot move into itself
        if to_parentId is not None and to_parentId == folder_id:
            raise ValueError("Cannot move a folder into itself")
        
        #dest must exist
        if to_parentId is not None:
            result = await self.folderrepo.get_active_folder(session, user_id=user_id, folder_id=to_parentId)
            if not result:
                raise LookupError("Folder is not Found.")
            
        # canmot move into it's own descentant
        if to_parentId is not None:
            res = await self.folderrepo.is_ancestor_of(session, user_id=user_id, ancestor_id=folder_id, node_id=to_parentId)
            if res:
                raise ValueError("Cannot move into it's own subfolder.")
            

        conflict = await self.folderrepo.name_exists_in_parent_folder(
            session,user_id=user_id, fodler_name=folder.folder_name, folder_id=to_parentId, exclude_curr_folder_id=folder.folder_id
        )
        if conflict:
            raise FileExistsError("Cannot undo move: name already exists in the original folder")

        await self.folderrepo.move(session, folder=folder, new_folder_id=to_parentId)

        return {
            "folder_id": str(folder.folder_id),
            "from_folder_id": from_folderId,
            "to_folder_id": to_parentId,
        }

    async def undo(self, session:AsyncSession, user_id:str, data:Dict[str,Any]) -> None:
        folder_id = int(data["folder_id"])
        from_parentId = data.get("from_parentId")

        folder = await self.folderrepo.get_active_folder(session, user_id=user_id, folder_id=folder_id)
        if not folder:
            raise LookupError("Folder not found")

        if from_parentId is not None:
            res = await self.folderrepo.get_active_folder(session, user_id=user_id, folder_id=int(from_parentId))
            if not res:
                raise LookupError("Original parent folder not found")

        # conflict in original parent
        conflict = await self.folderrepo.name_exists_in_parent_folder(
            session,
            user_id=user_id,
            parent_folder_id=from_parentId,
            folder_name=folder.folder_name,
            exclude_folder_id=folder.folder_id,
        )
        if conflict:
            raise FileExistsError("Cannot undo move: name already exists in the original location")

        await self.folderrepo.move(session, folder=folder, new_parent_id=from_parentId)

    async def redo(self, session:AsyncSession, user_id:str, data:Dict[str,Any]) -> None:
        folder_id = int(data["folder_id"])
        to_parentId = data.get("to_parentId")

        folder = await self.folderrepo.get_active_folder(session, user_id=user_id, folder_id=folder_id)
        if not folder:
            raise LookupError("Folder not found")

        if to_parentId is not None:
            res = await self.folderrepo.get_active_folder(session, user_id=user_id, folder_id=int(to_parentId))
            if not res:
                raise LookupError("Original parent folder not found")
            
            res = await self.folderrepo.is_ancestor_of(session, user_id=user_id, ancestor_id=folder_id, node_id=int(to_parentId))
            if res:
                raise ValueError("Cannot redo move: would create a cycle")

        # conflict in original parent
        conflict = await self.folderrepo.name_exists_in_parent_folder(
            session,
            user_id=user_id,
            parent_folder_id=to_parentId,
            folder_name=folder.folder_name,
            exclude_folder_id=folder.folder_id,
        )
        if conflict:
            raise FileExistsError("Cannot undo move: name already exists in the original location")

        await self.folderrepo.move(session, folder=folder, new_parent_id=to_parentId)


@dataclass(frozen=True)
class MoveFilesBulkCommand():
    single_file : MoveFileCommand
    action_type : str = "move_bulk_files"

    async def undo(self, session:AsyncSession, user_id:str, data:Dict[str,Any]) -> None:
        files : List[Dict[str,Any]] = data["files"]
        for file in reversed(files):
            await self.single_file.undo(session, user_id=user_id, data=file)

    async def redo(self, session:AsyncSession, user_id:str, data:Dict[str,Any]) -> None:
        files : List[Dict[str,Any]] = data["files"]
        for file in files:
            await self.single_file.redo(session, user_id=user_id, data=file)

@dataclass(frozen=True)
class MoveFolderBulkCommand():
    single_folder : MoveFolderCommand
    action_type : str = "move_bulk_folders"

    async def undo(self, session:AsyncSession, user_id:str, data:Dict[str,Any]) -> None:
        folders : List[Dict[str,Any]] = data["folders"]
        for folder in reversed(folders):
            await self.single_folder.undo(session, user_id=user_id, data=folder)

    async def redo(self, session:AsyncSession, user_id:str, data:Dict[str,Any]) -> None:
        folders : List[Dict[str,Any]] = data["folders"]
        for folder in folders:
            await self.single_folder.redo(session, user_id=user_id, data=folder)