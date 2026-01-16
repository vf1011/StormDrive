import logging
from datetime import datetime, timedelta
from typing import List , Dict, Optional, Any, Iterable, Set
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.persistance.models.dash_models import RecycleBin, Folder, File

logger = logging.getLogger(__name__)

class RecyclebinRepository:
    async def add_file(self, session:AsyncSession, user_id:str, file:File, parent_folder_id:Optional[int],deleted_by_action: Optional[str] = None) -> RecycleBin:
        item = RecycleBin(
            user_id=user_id,
            item_type="file",
            file_id=file.file_id,
            folder_id=None,
            parent_folder_id=parent_folder_id,
            item_name=file.file_name,
            item_path=file.file_path,
            file_size=file.file_size,
            file_type=file.file_type,
            integrity_hash=file.integrity_hash or "",
            tags=file.tags or [],
            deleted_at=datetime.utcnow(),
            deleted_by_action=deleted_by_action,
            scheduled_deletion_at=datetime.utcnow() + timedelta(days=30),
            search_vector=file.search_vector,
        )

        session.add(item)
        return item
    
    async def get_file(self, session:AsyncSession, user_id:str, file_id: UUID) -> Optional[RecycleBin]:
        stmt = (select(RecycleBin).where(RecycleBin.user_id == user_id)
                .where(RecycleBin.item_type == "file")
                .where(RecycleBin.file_id == file_id))
        res = await session.execute(stmt)
        return res.scalar_one_or_none()
    
    async def delete_item(self, session:AsyncSession, item:RecycleBin)->None:
        session.delete(item)

    async def list_file(self, session:AsyncSession, user_id:str, parent_folder_id: Optional[int] = None) -> List[Dict[str,Any]]:
        stmt = (
            select(RecycleBin.file_id,RecycleBin.item_name,RecycleBin.file_size,RecycleBin.file_type,
                   RecycleBin.deleted_at,RecycleBin.parent_folder_id,
                   Folder.folder_name.label("parent_name"),
            ).select_from(RecycleBin)
            .outerjoin(Folder, Folder.folder_id == RecycleBin.parent_folder_id)
            .where(RecycleBin.user_id == user_id)
            .where(RecycleBin.item_type == "file")
            .order_by(RecycleBin.deleted_at.desc())
        )

        if parent_folder_id is not None:
            stmt = stmt.where(RecycleBin.parent_folder_id == parent_folder_id)

        res = await session.execute(stmt)
        rows = res.all()

        return [
            {
                "file_id": str(r.file_id),
                "file_name": r.item_name,
                "file_size": int(r.file_size) if r.file_size is not None else 0,
                "file_type": r.file_type,
                "deleted_at": r.deleted_at.isoformat() if r.deleted_at else None,
                "parent_folder_id": r.parent_folder_id,
                "parent_name": r.parent_name,
            }   
            for r in rows
        ]
    
    async def list_existing_files_ids(self, session:AsyncSession, user_id:str, file_ids:Iterable[UUID]) -> Set[UUID]:
        ids = [i for i in file_ids if i is not None] 
        if not ids: 
            return set()
            
        stmt = (select(RecycleBin.file_id).where(RecycleBin.user_id == user_id).where(RecycleBin.item_type == "file")
                .where(RecycleBin.file_id.in_(ids)))
        
        result = await session.execute(stmt)
        return set([res[0] for res in result.all() if res and res[0] is not None])
        
    async def delete_file_item(self, session:AsyncSession, user_id:str,file_ids:Iterable[UUID]) -> Set[UUID]: 
        ids = [i for i in file_ids if i is not None]
        if not ids:
            return set()
            
        stmt = (select(RecycleBin).where(RecycleBin.user_id == user_id).where(RecycleBin.item_type == "file")
                .where(RecycleBin.file_id.in_(ids)))
        res = await session.execute(stmt)
        return int(res.rowcount or 0)
    
    async def aggregate(self, session: AsyncSession, user_id: str) -> tuple[int, int]:
        res = await session.execute(
            select(
                func.count(RecycleBin.id),
                func.coalesce(func.sum(RecycleBin.file_size), 0)
            ).where(RecycleBin.user_id == user_id)
        )
        count, total = res.first()
        return int(count or 0), int(total or 0)

    async def breakdown_by_type(self, session: AsyncSession, user_id: str):
        res = await session.execute(
            select(
                RecycleBin.file_type,
                func.count(RecycleBin.id),
                func.coalesce(func.sum(RecycleBin.file_size), 0)
            ).where(RecycleBin.user_id == user_id).group_by(RecycleBin.file_type)
        )
        return res.all()