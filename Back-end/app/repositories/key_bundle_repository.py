from typing import Optional, Tuple, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.domain.persistance.models.auth_models import KeyBundle

class UserKeyBundleRepository:
    async def get_bundle(self,session:AsyncSession,user_id:str) -> Optional[KeyBundle]:
        stmt = (select(KeyBundle).where(KeyBundle.user_id == user_id))
        res = await session.execute(stmt)
        return res.scalar_one_or_none()
    
    async def check_bundle(self,session:AsyncSession,user_id:str) ->bool:
        stmt = (select(KeyBundle).where(KeyBundle.user_id == user_id)).limit(1)
        res = await session.execute(stmt)
        return res.scalar_one_or_none() is not None
    
    async def init_bundle(self,session:AsyncSession,user_id:str,payload:Dict[str,Any]) -> KeyBundle:
        bundle = KeyBundle(
            user_id = user_id,
            user_salt_b64 = payload["user_salt_b64"],
            wrapped_mak_b64 = payload["wrapped_mak_b64"],
            wrapp_algo=payload.get("wrapp_algo", "AES-256-GCM"),
            wrapp_nonce_b64=payload["wrapp_nonce_b64"],
            wrapp_tag_b64=payload.get("wrapp_tag_b64"),
            kdf_algo=payload.get("kdf_algo", "argon2id"),
            kdf_params=payload.get("kdf_params"),
            version=payload.get("version", 1),
        )

        try:
            async with session.begin_nested():
                session.add(bundle)
                await session.flush()
            return bundle
        except IntegrityError:
            raise

    async def init_if_missing(self, session: AsyncSession, user_id: str, payload: Dict[str, Any]) -> Tuple[KeyBundle, bool]:
        existing = await self.get_bundle(session, user_id)
        if existing:
            return existing, False

        try:
            created = await self.init_bundle(session, user_id, payload)
            return created, True
        except IntegrityError:
            existing = await self.get_bundle(session, user_id)
            if existing:
                return existing, False
            raise