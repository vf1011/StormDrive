import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.domain.persistance.database import get_db_tx
from app.schemas.auth_schema import User

from app.schemas.dash_schema import ActionResponse

from app.repositories.undo_redo_repository import UndoRedoRepository
from app.repositories.file_repository import FileRepository
from app.repositories.folder_repository import FolderRepository
from app.services.undo_redo_service import UndoRedoService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/undo-redo", tags=["undo_redo"])

_undo_service = UndoRedoService(
    undo_repo=UndoRedoRepository(),
    file_repo=FileRepository(),
    folder_repo=FolderRepository(),
)


def _userid(user: User) -> str:
    uid = getattr(user, "user_id", None) or getattr(user, "id", None)
    if not uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user context")
    return str(uid)


@router.get("/undo", response_model=ActionResponse)
async def undo_operation(
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_tx),
):
    user_id = _userid(current_user)
    try:
        result = await _undo_service.undo_last(db_session, user_id=user_id)
        return ActionResponse(
            success=True,
            message="Action undone successfully",
            action=result["action_type"],
        )
    except LookupError as e:
        # nothing to undo
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except FileExistsError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception:
        logger.exception("Undo failed", extra={"user_id": user_id})
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Undo failed")


@router.get("/redo", response_model=ActionResponse)
async def redo_operation(
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_tx),
):
    user_id = _userid(current_user)
    try:
        result = await _undo_service.redo_last(db_session, user_id=user_id)
        return ActionResponse(
            success=True,
            message="Action redone successfully",
            action=result["action_type"],
        )
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except FileExistsError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception:
        logger.exception("Redo failed", extra={"user_id": user_id})
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Redo failed")
