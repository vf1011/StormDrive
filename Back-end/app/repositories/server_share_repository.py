import base64, secrets
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.security.utils import Security
from app.domain.persistance.models.auth_models import UserServerShare

class ServerShareRepository:
    async def ensure_ss_master(self, db: AsyncSession, user_id: str) -> None:
        row = (await db.execute(select(UserServerShare).where(UserServerShare.user_id == user_id))).scalar_one_or_none()
        if row:
            return

        ss_master = secrets.token_bytes(32)
        ss_master_b64 = base64.b64encode(ss_master).decode()
        enc = Security.encrypt(ss_master_b64)

        db.add(UserServerShare(user_id=user_id, ss_master_enc=enc))

    async def get_ss_master(self, db: AsyncSession, user_id: str) -> bytes:
        row = (await db.execute(select(UserServerShare).where(UserServerShare.user_id == user_id))).scalar_one()
        ss_master_b64 = Security.decrypt(row.ss_master_enc)
        return base64.b64decode(ss_master_b64)
