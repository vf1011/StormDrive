import logging
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc


from app.domain.persistance.models.dash_models import undoRedoActions

logger = logging.getLogger(__name__)


class UndoRedoRepository:
    async def add_action(
        self,
        session: AsyncSession,
        user_id: str,
        action_type: str,
        action_data: Dict[str, Any],
        is_done: bool = True,
    ) -> int:
        item = undoRedoActions(
            user_id=user_id,
            action_type=action_type,
            action_data=action_data,
            is_done=is_done,
            created_at=datetime.utcnow(),
            change_at=datetime.utcnow(),
        )
        session.add(item)
        await session.flush()
        return item.action_id
    
    async def get_last_done(self, session:AsyncSession, user_id:str) -> Optional[undoRedoActions]:
        stmt = (select(undoRedoActions).where(undoRedoActions.user_id == user_id).where(undoRedoActions.is_done.is_(True))
                       .order_by(desc(undoRedoActions.created_at),(undoRedoActions.action_id)).limit(1))
        result = await session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_last_undone(self, session:AsyncSession, user_id:str) -> Optional[undoRedoActions]:
        stmt = (select(undoRedoActions).where(undoRedoActions.user_id==user_id).where(undoRedoActions.is_done.is_(False))
                .order_by(desc(undoRedoActions.created_at),(undoRedoActions.action_id)).limit(1))
        result = await session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def set_done(self, session: AsyncSession, action_id: int, is_done: bool) -> None:
        item = await session.get(undoRedoActions, action_id)
        if not item:
            raise LookupError("Action not found")
        item.is_done = is_done
        item.change_at = datetime.utcnow()
        session.add(item)