from uuid import UUID
from typing import List, Optional, Tuple, Dict

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.persistance.models.upload_models import UploadFolderSession, UploadItems
from app.domain.persistance.models.dash_models import Folder 

from app.repositories.folder_repository import FolderRepository

from app.services.file_services import _validate_name

class UploadFolderRepository:
    async def create(self, session:AsyncSession, folder_obj:UploadFolderSession) -> UploadFolderSession:
        session.add(folder_obj)
        await session.flush()
        return folder_obj
    
    async def set_status(self,session:AsyncSession, user_id:str, status:str, folder_upload_id:UUID) -> int:
        stmt = (select(UploadFolderSession).where(UploadFolderSession.user_id == user_id)
                .where(UploadFolderSession.folder_upload_id == folder_upload_id)
                .values(status = status))
        res = await session.execute(stmt)
        return int(res.rowcount or 0)
    
    async def get_folder(self, session:AsyncSession, user_id:str, folder_upload_id:UUID) -> Optional[UploadFolderSession]:
        stmt = (select(UploadFolderSession).where(UploadFolderSession.user_id == user_id)
                .where(UploadFolderSession.folder_upload_id == folder_upload_id))
        res = await session.execute(stmt)
        return res.scalar_one_or_none()
    
class UploadFolderItemRepository:
    async def add(self, session:AsyncSession, childs:List[UploadItems]) -> None:
        session.add_all(childs)
        await session.flush()

    async def complete(self,session:AsyncSession,user_id:str,folder_upload_id:UUID) -> int:
        stmt = stmt = (
            select(func.count())
            .select_from(UploadFolderSession)
            .join(UploadItems, UploadItems.upload_id == UploadFolderSession.upload_id)
            .where(UploadItems.user_id == user_id)
            .where(UploadItems.folder_upload_id == folder_upload_id)
            .where(UploadFolderSession.status == "COMPLETE")
        )
        res = await session.execute(stmt)
        return int(res.scalar_one() or 0)

    async def list_items(self, session: AsyncSession, user_id: str, folder_upload_id: UUID, limit: int, offset: int):
        stmt = (select(UploadItems).where(UploadItems.user_id == user_id)
            .where(UploadItems.folder_upload_id == folder_upload_id)
            .order_by(UploadItems.created_at.asc()).limit(limit).offset(offset))
        res = await session.execute(stmt)
        return list(res.scalars().all())

class FolderTreeRepository:
    def __init__(self, folder_repo:FolderRepository):
        self.folder_repo = folder_repo

    async def generate_unq_name(self,session:AsyncSession,user_id:str,parent_folder_id:Optional[int],name:str) -> str:
        folder_name = _validate_name(name)
        if not await self.folder_repo.name_exists_in_parent_folder(session,user_id=user_id,parent_folder_id=parent_folder_id,folder_name=folder_name,exclude_curr_folder_id=-1):
            return folder_name
        
        for i in range(1,50):
            fname = f"{folder_name} ({i})"
            if not await self.folder_repo.name_exists_in_parent_folder(session,user_id=user_id,parent_folder_id=parent_folder_id,folder_name=fname,exclude_curr_folder_id=-1):
                return fname
        raise ValueError("Same Name Folder is Already Uploaded.")
    
    def compute_path(self, parent: Optional[Folder], folder_id: int) -> str:
        if parent and parent.heirarchy_path:
            return f"{parent.heirarchy_path}/{folder_id}"
        return str(folder_id)
    
    async def create_folder(self, session:AsyncSession,user_id:str,parent_folder:Optional[Folder],fname:str) -> Folder:
        parent_folder_id = parent_folder.folder_id if parent_folder else None
        depth = int(parent_folder.depth_level) + 1 if parent_folder else 0

        unique_name = await self.generate_unq_name(session, user_id, parent_folder_id, fname)

        root_folder = await self.folder_repo.copy(
                            session=session,
                            user_id=user_id,
                            folder_name=unique_name,
                            parent_folder_id=parent_folder_id,
                            heirarchy_path=None,
                            depth=depth,
            )

        root_folder.heirarchy_path = self.compute_path(parent_folder,int(root_folder.folder_id))
        return root_folder
    
    async def create_subfolders(self,session:AsyncSession,user_id: str,root_folder: Folder,dir_paths:List[Tuple[str, ... ]]) -> Dict[Tuple[str, ...] , Folder]:
        mapping: Dict[Tuple[str, ...], Folder] = {tuple(): root_folder}
        children_by_parent: Dict[Tuple[str, ...], Dict[str, Folder]] = {tuple(): {}}

        for parts in sorted(set(dir_paths), key=len):
            if not parts:
                continue
            parent_parts = parts[:-1]
            seg = _validate_name(parts[-1])
            parent_folder = mapping[parent_parts]

            map = children_by_parent.setdefault(parent_parts, {})
            key = seg.lower()
            if key in map:
                mapping[parts] = map[key]
                continue

            depth = int(parent_folder.depth_level) + 1
            created = await self.folder_repo.copy(
                session=session,
                user_id=user_id,
                folder_name=seg,
                parent_folder_id=int(parent_folder.folder_id),
                heirarchy_path=None,
                depth=depth,
            )
            created.heirarchy_path = f"{parent_folder.heirarchy_path}/{int(created.folder_id)}"
            mapping[parts] = created
            map[key] = created
            children_by_parent[parts] = {}

        return mapping
       

     