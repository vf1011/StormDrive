from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.persistance.database import get_db
from app.api.dependencies import get_current_user
from app.schemas.auth_schema import User

from app.schemas.dash_schema import (
    FileStorageStatsResponse, FileStorageBreakdownResponse,
    CheckStorageRequest, CheckStorageResponse,
    FolderStorageRequest, FolderStorageResponse
)
from app.services.storage_services import StorageServices

from app.repositories.file_repository import FileRepository
from app.repositories.folder_repository import FolderRepository
from app.repositories.storage_repo import StorageRepository
from app.repositories.trash_repository import RecyclebinRepository

router = APIRouter(prefix="/storage", tags=["storage"])
service = StorageServices(FileRepository(),FolderRepository(),StorageRepository(),RecyclebinRepository())

@router.get("/stats", response_model=FileStorageStatsResponse)
async def stats(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        storage, active_count, active_size, bin_count, bin_size, used, available, pct = \
            await service.get_stats(session, current_user.user_id)

        return FileStorageStatsResponse(
            success=True,
            message="Successfully fetched storage stats",
            total_storage=int(storage.total_storage),
            total_used_storage=int(used),
            available_storage=int(available),
            used_storage_percentage=round(pct, 2),
            active_files={
                "count": active_count,
                "size_bytes": active_size,
                "size_mb": round(active_size / (1024 * 1024), 2),
                "size_gb": round(active_size / (1024 * 1024 * 1024), 3),
            },
            recycle_bin={
                "count": bin_count,
                "size_bytes": bin_size,
                "size_mb": round(bin_size / (1024 * 1024), 2),
                "size_gb": round(bin_size / (1024 * 1024 * 1024), 3),
            },
            storage_info={
                "total_gb": round(int(storage.total_storage) / (1024 * 1024 * 1024), 2),
                "available_gb": round(int(available) / (1024 * 1024 * 1024), 2),
                "is_near_limit": pct > 90,
                "is_over_limit": pct > 100,
                "plan_type": storage.plan_type,
                "is_premium": storage.is_premium,
            }
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/breakdown", response_model=FileStorageBreakdownResponse)
async def breakdown(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        active_map, bin_map, total_size = await service.get_breakdown(session, current_user.user_id)
        return FileStorageBreakdownResponse(
            success=True,
            message="Successfully fetched storage breakdown",
            active_files_breakdown=active_map,
            recycle_bin_breakdown=bin_map,
            total_size_bytes=int(total_size),
            total_size_gb=round(total_size / (1024 * 1024 * 1024), 3),
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/check-storage", response_model=CheckStorageResponse)
async def check_storage(
    payload: CheckStorageRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        storage, allow, remaining, new_pct, used, available = await service.check_upload(
            session, current_user.user_id, payload.file_size
        )

        return CheckStorageResponse(
            success=True,
            message="Successfully checked storage",
            allow_upload=allow,
            storage_info={
                "allow_upload": allow,
                "current_used_gb": round(used / (1024 * 1024 * 1024), 2),
                "total_gb": round(int(storage.total_storage) / (1024 * 1024 * 1024), 2),
                "available_gb": round(available / (1024 * 1024 * 1024), 2),
                "file_size_mb": round(payload.file_size / (1024 * 1024), 2),
                "new_usage_percentage": round(new_pct, 2),
                "is_near_limit": new_pct > 90,
                "is_over_limit": new_pct > 100,
                "remaining_space_bytes": max(0, int(remaining)),
                "remaining_space_mb": round(max(0, int(remaining)) / (1024 * 1024), 2),
            }
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/folder-level-storage", response_model=FolderStorageResponse)
async def folder_level_storage(
    payload: FolderStorageRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        folder, size = await service.folder_size(session, current_user.user_id, payload.folder_id)
        if not folder:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder Not Found")

        return FolderStorageResponse(
            success=True,
            message="Successfully fetched folder storage",
            folder_id=payload.folder_id,
            folder_name=folder.folder_name,
            total_size_bytes=int(size),
            total_size_mb=round(size / (1024 * 1024), 3),
            total_size_gb=round(size / (1024 * 1024 * 1024), 3),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
