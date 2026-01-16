from fastapi import APIRouter, Depends,  HTTPException , status as http_status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies import get_current_user
from app.domain.persistance.database import get_db , get_db_tx
from app.schemas.auth_schema import User
from app.schemas.keybundle_schema import KeybundleInitRequest, KeybundleResponse

from app.repositories.key_bundle_repository import UserKeyBundleRepository
from app.services.key_bundle_service import KeybundleService
import logging

router = APIRouter(prefix="/keybundle", tags=["keybundle"])

_kb_service = KeybundleService(UserKeyBundleRepository())

log = logging.getLogger("auth")

@router.get("/get-bundle", response_model=KeybundleResponse)
async def get_keybundle(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    uid = current_user.user_id
    try:
        async with session.begin():
            return await _kb_service.get(session, uid)
    except HTTPException as he:
        log.error("Error in getting key bundle", error=str(he))
        raise he
    except Exception as e:
        print(f"Error in getting key bundle: {e}")
        raise HTTPException(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Error in getting key bundle")



@router.post("/init", response_model=KeybundleResponse)
async def init_keybundle(
    payload: KeybundleInitRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_tx),
):
    uid = current_user.user_id
    try:
        return await _kb_service.init(session, uid, payload)
    except HTTPException as he:
        log.error("Error in storing key bundle", error=str(he))
        raise he
    except Exception as e:
        print(f"Error in storing key bundle: {e}")
        raise HTTPException(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Error in storing key bundle.")

