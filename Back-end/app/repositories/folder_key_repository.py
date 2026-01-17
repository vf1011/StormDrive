from __future__ import annotations
from typing import Optional
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.persistance.models.dash_models import FolderKeys

class FolderKeysRepository:
    async def get(self, session: AsyncSession, user_id: str, folder_id: int) -> Optional[FolderKeys]:
        res = await session.execute(
            select(FolderKeys).where(
                FolderKeys.user_id == user_id,
                FolderKeys.folder_id == folder_id,
            )
        )
        return res.scalar_one_or_none()

    async def ensure(
        self,
        session: AsyncSession,
        user_id: str,
        folder_id: int,
        wrapped_fk: bytes,
        nonce_fk: bytes,
        wrapped_fok: bytes,
        nonce_fok: bytes,
        wrap_alg: str,
        wrapped_by_folder_id: Optional[int],
    ) -> FolderKeys:
        """
        Idempotent:
        - if no row exists -> insert
        - if exists and matches -> do nothing
        - if exists but differs -> raise ValueError (conflict)
        """
        row = await self.get(session, user_id, folder_id)
        if row:
            same = (
                row.wrapped_fk == wrapped_fk and row.nonce_fk == nonce_fk and
                row.wrapped_fok == wrapped_fok and row.nonce_fok == nonce_fok and
                row.wrap_alg == wrap_alg and row.wrapped_by_folder_id == wrapped_by_folder_id
            )
            if not same:
                raise ValueError("Folder keys already exist but payload differs (possible mismatch).")
            return row

        row = FolderKeys(
            user_id=user_id,
            folder_id=folder_id,
            wrapped_fk=wrapped_fk,
            nonce_fk=nonce_fk,
            wrapped_fok=wrapped_fok,
            nonce_fok=nonce_fok,
            wrap_alg=wrap_alg,
            wrapped_by_folder_id=wrapped_by_folder_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(row)
        await session.flush()
        return row
