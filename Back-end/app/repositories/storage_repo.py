from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.persistance.models.dash_models import Storage

DEFAULT_TOTAL = 15 * 1024 * 1024 * 1024 

class StorageRepository:
    async def get_user(self,session:AsyncSession,user_id:str) -> Storage | None:
        stmt = await session.execute(select(Storage).where(Storage.user_id == user_id))
        return stmt.scalas().first()
    
    async def get_or_create(self, session: AsyncSession, user_id: str) -> Storage:
        st = await self.get_user(session, user_id)
        if st:
            return st

        st = Storage(
            user_id=user_id,
            total_storage=DEFAULT_TOTAL,
            storage_used=0,
            is_premium=False,
            plan_type="free",
        )
        session.add(st)
        await session.flush()     
        await session.refresh(st)
        return st