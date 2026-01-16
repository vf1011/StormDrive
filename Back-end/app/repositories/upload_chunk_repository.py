from typing import Optional, List, Dict
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.persistance.models.upload_models import UploadChunk

class UploadChunkRepository:
    async def get_chunk(self, session:AsyncSession, upload_id:UUID, chunk_idx:int) -> Optional[UploadChunk]:
        stmt = (select(UploadChunk).where(UploadChunk.upload_id == upload_id).where(UploadChunk.chunk_index == chunk_idx))
        res = await session.execute(stmt)
        return res.scalar_one_or_none()
    
    async def last_indices(self, session:AsyncSession, upload_id:UUID) -> List[int]:
        stmt = (select(UploadChunk).where(UploadChunk.upload_id == upload_id).order_by(UploadChunk.chunk_index.asc()))
        res = await session.execute(stmt)
        return [int(i) for i in res.scalars().all()]
    
    async def count(self, session: AsyncSession, upload_id: UUID) -> int:
        stmt = select(func.count()).select_from(UploadChunk).where(UploadChunk.upload_id == upload_id)
        res = await session.execute(stmt)
        return int(res.scalar_one() or 0)

    async def insert(self, session: AsyncSession, obj: UploadChunk) -> UploadChunk:
        session.add(obj)
        try:
            await session.flush()
            return obj
        except IntegrityError:
            raise 

    async def list_receipts_ordered(self, session: AsyncSession, upload_id: UUID) -> List[UploadChunk]:
        ## Returns all chunk receipts for this upload, sorted by chunk_index (needed for finalize + download ordering).
        stmt = (select(UploadChunk).where(UploadChunk.upload_id == upload_id).order_by(UploadChunk.chunk_index.asc()))
        res = await session.execute(stmt)
        return list(res.scalars().all())
    
    async def count_bulk(self, session: AsyncSession, upload_ids: List[UUID]) -> Dict[UUID, int]:
        if not upload_ids:
            return {}
        stmt = (
            select(UploadChunk.upload_id, func.count().label("cnt"))
            .where(UploadChunk.upload_id.in_(upload_ids))
            .group_by(UploadChunk.upload_id)
        )
        res = await session.execute(stmt)
        return {row[0]: int(row[1]) for row in res.all()}
