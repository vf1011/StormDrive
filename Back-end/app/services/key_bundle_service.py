import json
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.repositories.key_bundle_repository import UserKeyBundleRepository
from app.schemas.keybundle_schema import KeybundleInitRequest, KeybundleResponse

class KeybundleService:
    def __init__(self, bundle_repo: UserKeyBundleRepository):
        self.bundle_repo = bundle_repo

    async def get(self, session: AsyncSession, user_id: str) -> KeybundleResponse:
        kb = await self.bundle_repo.get_bundle(session, user_id)
        if not kb:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"code": "KEYBUNDLE_MISSING"})
        return KeybundleResponse(
            user_id=user_id,
            user_salt_b64=kb.user_salt_b64,
            wrapped_mak_b64=kb.wrapped_mak_b64,
            wrapp_algo=kb.wrapp_algo,
            wrapp_nonce_b64=kb.wrapp_nonce_b64,
            wrapp_tag_b64=kb.wrapp_tag_b64,
            kdf_algo=kb.kdf_algo,
            kdf_params=(json.loads(kb.kdf_params) if kb.kdf_params else None),
            version=kb.version,
        )

    async def init(self, session: AsyncSession, user_id: str, body: KeybundleInitRequest) -> KeybundleResponse:
        payload = {
            "user_salt_b64": body.user_salt_b64,
            "wrapped_mak_b64": body.wrapped_mak_b64,
            "wrapp_algo": body.wrapp_algo,
            "wrapp_nonce_b64": body.wrapp_nonce_b64,
            "wrapp_tag_b64": body.wrapp_tag_b64,
            "kdf_algo": body.kdf_algo,
            "kdf_params": json.dumps(body.kdf_params) if body.kdf_params else None,
            "version": body.version,
        }

        try:
            kb, created = await self.bundle_repo.init_if_missing(session, user_id, payload)
        except IntegrityError:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail={"code": "KEYBUNDLE_EXISTS"})

        return await self.get(session, user_id)
