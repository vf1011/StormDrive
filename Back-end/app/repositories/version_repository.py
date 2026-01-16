import logging
from typing import List, Optional
from uuid import UUID

from datetime import datetime
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.persistance.models.dash_models import FileVersioning

logger = logging.getLogger(__name__)

class VersionRepository:
    async def list_versions_of_file(self, session:AsyncSession, user_id:str, original_file_id:UUID) -> List[FileVersioning]:
        stmt = (select(FileVersioning).where(FileVersioning.user_id == user_id).where(FileVersioning.original_file_id == original_file_id)
                .order_by(FileVersioning.created_at.desc() , FileVersioning.version_id.desc()) )
        res = await session.execute(stmt)
        return list(res.scalars().all())

    async def get_version_of_file(self, session:AsyncSession, user_id:str,original_file_id:UUID, version_id:int) -> Optional[FileVersioning]:
        stmt = (select(FileVersioning).where(FileVersioning.user_id == user_id)
                .where(FileVersioning.original_file_id == original_file_id)
                .where(FileVersioning.version_id == version_id))
        res = await session.execute(stmt)
        return res.scalar_one_or_none()

    async def create_version(self,session:AsyncSession, user_id:str, original_file_id: UUID,file_name: str,file_path: str,
                             file_type :str,file_size:int, integrity_hash:str,
                             encryption_metadata: Optional[str] = None,version_number: Optional[int] = None,) -> FileVersioning:
        version = FileVersioning(
            original_file_id=original_file_id,
            file_name=file_name,
            file_path=file_path,
            file_size=file_size,
            file_type=file_type,
            integrity_hash=integrity_hash,
            encryption_metadata=encryption_metadata,
            version_number=version_number,
            created_at=datetime.utcnow()
        )
        session.add(version)
        await session.flush()
        return version
    
    async def delete_version(self,session:AsyncSession,user_id:str,original_file_id:UUID,version_id:int)->int:
        stmt = (delete(FileVersioning).where(FileVersioning.user_id == user_id)
                .where(FileVersioning.original_file_id == original_file_id).where(FileVersioning.version_id == version_id))
        res = await session.execute(stmt)
        return int(res.rowcount or 0)
    


        
        