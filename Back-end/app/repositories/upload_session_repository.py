from typing import Optional, List, Dict
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.persistance.models.upload_models import UploadSession

class UploadSessionRepository:
    async def create_session(self, session:AsyncSession, obj:UploadSession) -> UploadSession:
        session.add(obj)
        await session.flush()
        return obj
    
    async def get_session(self, session:AsyncSession, user_id:str, upload_id:UUID) -> Optional[UploadSession]:
        stmt = select(UploadSession).where(UploadSession.user_id == user_id).where(UploadSession.upload_id == upload_id)
        res = await session.execute(stmt)
        return res.scalar_one_or_none()
    
    async def set_status(self, session: AsyncSession, user_id: str, upload_id: UUID, status: str) -> int:
        stmt = (update(UploadSession).where(UploadSession.user_id == user_id)
                .where(UploadSession.upload_id == upload_id)
                .values(status=status)
                )
        res = await session.execute(stmt)
        return int(res.rowcount or 0)
    
    async def get_status_bulk(self, session: AsyncSession, user_id: str, upload_ids: List[UUID]) -> Dict[UUID, tuple[str, int]]:
        if not upload_ids:
            return {}
        stmt = (select(UploadSession.upload_id, UploadSession.status, UploadSession.total_chunks)
                .where(UploadSession.user_id == user_id)
                .where(UploadSession.upload_id.in_(upload_ids))
            )
        res = await session.execute(stmt)
        return {row[0]: (row[1], int(row[2])) for row in res.all()}