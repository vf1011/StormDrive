import logging
from sqlalchemy.ext.asyncio import AsyncSession
from dataclasses import dataclass
from typing import Any, Dict, Optional
from app.repositories.file_repository import FileRepository 
from app.repositories.folder_repository import FolderRepository
from uuid import UUID
logger = logging.getLogger(__name__)

@dataclass(frozen=True)
class RenameFileCommand:
    filerepo : FileRepository
    action_type : str = "rename_file"

    async def execute(self, session:AsyncSession, user_id:str , file_id:UUID ,new_file_name:str) -> Optional[Dict[str,Any]]:
        file = await self.filerepo.get_active_file(session,user_id=user_id,file_id=file_id)
        if not file:
            raise LookupError("File not Found.")

        old_file_name = file.file_name
        if old_file_name == new_file_name:
            return None
        
        conflict = await self.filerepo.name_exist_or_not_in_folder(
            session,user_id=user_id,folder_id=file.folder_id,file_name=new_file_name,exclude_curr_file_id=file_id
        )
        if conflict:
            raise FileExistsError("A file with the same name already exists in this folder.")
        
        await self.filerepo.rename(session,file=file,new_file_name=new_file_name)
        return {
            "file_id": str(file.file_id),
            "old_file_name": old_file_name,
            "new_name": new_file_name,
            "folder_id": file.folder_id,
        }
    
    async def undo(self, session:AsyncSession, user_id:str, data: dict[str,any]) -> None:
        file_id = UUID(data["file_id"])
        old_file_name = data["old_file_name"]

        file = await self.filerepo.get_active_file(session,user_id=user_id,file_id=file_id)
        if not file:
            raise LookupError("File not Found.")
        
        conflict = await self.filerepo.name_exist_or_not_in_folder(
            session,user_id=user_id,folder_id=file.folder_id,file_name=old_file_name,exclude_curr_file_id=file.file_id
        )
        if conflict:
            raise FileExistsError("A file with the same name already exists in this folder.")

        await self.filerepo.rename(session,file=file,new_file_name=old_file_name)

    async def redo(self, session:AsyncSession, user_id:str, data: dict[str,any])->None:
        file_id = UUID(data["file_id"])
        new_file_name = data["new_file_name"]

        file = await self.filerepo.get_active_file(session,user_id=user_id,file_id=file_id)
        if not file:
            raise LookupError("File not Found.")
        
        conflict = await self.filerepo.name_exist_or_not_in_folder(
            session,user_id=user_id,folder_id=file.folder_id,file_name=new_file_name,exclude_curr_file_id=file.file_id
        )
        if conflict:
            raise FileExistsError("A file with the same name already exists in this folder.")

        await self.filerepo.rename(session,file=file,new_file_name=new_file_name)

@dataclass(frozen=True)
class RenameFolderCommand:
    folderrepo : FolderRepository
    action_type : str = "rename_folder"

    async def execute(self,session:AsyncSession, user_id:str, folder_id:int, new_folder_name:str) -> Optional[Dict[str,Any]]:
        folder = await self.folderrepo.get_active_folder(session,user_id=user_id,folder_id=folder_id)
        if not folder:
            raise LookupError("Folder not Found.")
        
        old_folder_name = folder.folder_name
        if old_folder_name == new_folder_name:
            return None
        
        conflict = await self.folderrepo.name_exists_in_parent_folder(session,user_id=user_id,parent_folder_id=folder.parent_folder_id, folder_name=new_folder_name, exclude_curr_folder_id=folder.folder_id)
        if conflict:
            raise FileExistsError("A folder with the same name already exists in this location")

        await self.folderrepo.rename(session, folder=folder, new_folder_name=new_folder_name)

        return {
            "folder_id": folder.folder_id,
            "old_name": old_folder_name,
            "new_name": new_folder_name,
            "parent_folder_id": folder.parent_folder_id,
        }
    
    async def undo(self, session:AsyncSession, user_id:str, data: dict[str,any]) -> None:
        folder_id = int(data["fodler_id"])
        old_folder_name = data["old_folder_name"]

        folder = await self.folderrepo.get_active_folder(session,user_id=user_id,folder_id=folder_id)
        if not folder:
            raise LookupError("Folder not Found.")
        
        conflict = await self.folderrepo.name_exists_in_parent_folder(
            session,user_id=user_id,parent_folder_id=folder.parent_folder_id,folder_name=old_folder_name,exclude_curr_folder_id=folder.folder_id
        )
        if conflict:
            raise FileExistsError("A folder with the same name already exists in this folder.")

        await self.folderrepo.rename(session,folder=folder,new_folder_name=old_folder_name)

    async def redo(self, session:AsyncSession, user_id:str, data: dict[str,any])->None:
        folder_id = int(data["folder_id"])
        new_folder_name = data["new_folder_name"]

        folder = await self.folderrepo.get_active_folder(session,user_id=user_id,folder_id=folder_id)
        if not folder:
            raise LookupError("Folder not Found.")
        
        conflict = await self.folderrepo.name_exists_in_parent_folder(
            session,user_id=user_id,parent_folder_id=folder.parent_folder_id,folder_name=new_folder_name,exclude_curr_folder_id=folder.folder_id
        )
        if conflict:
            raise FileExistsError("A file with the same name already exists in this folder.")

        await self.folderrepo.rename(session,folder,new_folder_name=new_folder_name)
