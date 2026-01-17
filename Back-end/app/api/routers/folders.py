import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.api.dependencies import get_current_user
from app.domain.persistance.database import get_db , get_db_tx
from uuid import UUID
import os
from pathlib import Path

from app.schemas.auth_schema import User
from app.schemas.dash_schema import (FolderRenameRequest, FolderRenameResponse, MultipleFolderMoveRequest, MultipleFolderMoveResponse
                                     , MultipleFolderCopyRequest, MultipleFolderCopyResponse, MultipleFolderDeleteRequest, MultipleFolderDeleteResponse
                                     ,MultipleFolderPermDeleteRequest,MultipleFolderPermDeleteResponse,MultipleFolderRestoreRequest,MultipleFolderRestoreResponse
                                     ,FolderUploadChildFile,FolderUploadChildStatus,FolderUploadRequest,FolderUploadResponse
                                     ,FolderUploadStatusResponse,FolderDownloadPlanRequest, FolderDownloadPlanResponse)

from app.repositories.folder_repository import FolderRepository
from app.repositories.undo_redo_repository import UndoRedoRepository
from app.repositories.folder_upload_repository import FolderTreeRepository , UploadFolderItemRepository , UploadFolderRepository
from app.repositories.upload_session_repository import UploadSessionRepository
from app.repositories.upload_chunk_repository import UploadChunkRepository
from app.repositories.file_repository import FileRepository
from app.repositories.trash_repository import RecyclebinRepository
from app.storage.chunk_storage import ChunkStorage

from app.services.folder_services import FolderService
from app.services.folder_upload_services import FolderUploadServices
from app.services.download_services import DownloadService

from app.security.server_wrapup import ServerCipherWrap


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/folder", tags=["folders"])

UPLOAD_ROOT = os.getenv("UPLOAD_ROOT", str(Path("storage/uploads").resolve()))
RECYCLE_ROOT = os.getenv("RECYCLE_ROOT", str(Path("storage/recyclebin").resolve()))

_folder_service = FolderService(FolderRepository(),UndoRedoRepository(),FileRepository(),RecyclebinRepository(),upload_root=UPLOAD_ROOT,recycle_root=RECYCLE_ROOT)

folder_repo = FolderRepository()
tree_repo = FolderTreeRepository(folder_repo)
upload_repo = UploadSessionRepository()
fu_session_repo = UploadFolderRepository()
fu_item_repo = UploadFolderItemRepository()
chunk_repo = UploadChunkRepository()

_folder_folder_service = FolderUploadServices(
    folder_repo=folder_repo,
    tree_repo=tree_repo,
    upload_repo=upload_repo,
    session_repo=fu_session_repo,
    item_repo=fu_item_repo,
    chunk_repo=chunk_repo,
    settings=None
)


_download_service = DownloadService(folder_repo=FolderRepository(), file_repo=FileRepository(),storage=ChunkStorage(),wrapper=ServerCipherWrap())

def _user_id(user: User) -> str:
    uid = getattr(user, "user_id", None) or getattr(user, "id", None)
    if not uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user context")
    return str(uid)

@router.get("/list")
async def list_root_folders(current_user=Depends(get_current_user), session=Depends(get_db)):
    try:
        uid = _user_id(current_user)
        roots = await _folder_service.list_root_folders(session, user_id=uid)

        return {
            "success": True,
            "needs_bootstrap": len(roots) == 0,
            "folders": [f.to_dict(include_sensitive_data=True) for f in roots],
        }
    except ValueError as e:
        logger.info("folder list validation failed", extra={"user_id": uid})
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(e))

    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    except FileExistsError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

@router.post("/rename", response_model=FolderRenameResponse)
async def rename_folder(
    request: FolderRenameRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_tx),
) -> FolderRenameResponse:
    uid = _user_id(current_user)

    try:
        result = await _folder_service.rename_folder(
            session,
            user_id=uid,
            folder_id=request.folder_id,
            new_folder_name=request.new_folder_name,
        )
        return FolderRenameResponse(
            success=True,
            message="Folder renamed successfully",
            folder_id=request.folder_id,
            new_folder_name=result["new_folder_name"],
        )

    except ValueError as e:
        logger.info("folder rename validation failed", extra={"user_id": uid, "folder_id": request.folder_id})
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(e))

    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    except FileExistsError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    except Exception:
        logger.exception("folder rename failed", extra={"user_id": uid, "folder_id": request.folder_id})
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Rename failed")

@router.post("/move", response_model=MultipleFolderMoveResponse)
async def move_folders(request: MultipleFolderMoveRequest,
                     current_user: User = Depends(get_current_user),
                     session: AsyncSession=Depends(get_db_tx),) -> MultipleFolderMoveResponse:
    uid = _user_id(current_user)
    try:
        result = await _folder_service.move_folder(
            session,
            user_id=uid,
            folder_ids=request.folder_ids,
            to_folderId=request.target_folder_id,
        )
        moved = result["moved_folders"]
        failed = result["failed_folders"]
        success = True
        return MultipleFolderMoveResponse(
            success = True,
            message = "Move Completed" if success else "no moved folders",
            moved_folders = moved,
            failed_folders = failed
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/copy", response_model=MultipleFolderCopyResponse)
async def copy_folders(request: MultipleFolderCopyRequest,
                       current_user : User = Depends(get_current_user),
                       session: AsyncSession = Depends(get_db_tx)) -> MultipleFolderCopyResponse:
    uid = _user_id(current_user)
    try:
        result = await _folder_service.copy_folder(
            session,
            user_id=uid,
            folder_ids=request.folder_ids,
            to_folderId=request.new_folder_id
        )
        copied = result["copied_folders"]
        failed = result["failed_folders"]
        success = True
        return MultipleFolderCopyResponse(
            success=True,
            message = "Copy Completed" if success else "no copied folders",
            copied_folders = copied,
            failed_folders = failed
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
@router.post("/delete", response_model=MultipleFolderDeleteResponse)
async def delete_folders(request:MultipleFolderDeleteRequest,
                         current_user:User=Depends(get_current_user),
                         session:AsyncSession=Depends(get_db_tx)) -> MultipleFolderDeleteResponse:
    uid = _user_id(current_user)
    try:
        result = await _folder_service.trash_folders(
            session,
            user_id=uid,
            folder_ids=request.folder_ids,
        )
        deleted = result["deleted_folders"]
        failed = result["failed_folders"]
        success = True
        return MultipleFolderDeleteResponse(
            success=True,
            message="Delete Completed" if success else "no deleted folders",
            deleted_folders = deleted,
            failed_to_delete_folders = failed
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
@router.post("/restore",response_model=MultipleFolderRestoreResponse)
async def restore_folder(request:MultipleFolderRestoreRequest,
                          current_user:User = Depends(get_current_user),
                          session: AsyncSession=Depends(get_db_tx)) ->MultipleFolderRestoreResponse:
    uid = _user_id(current_user)
    try:
        result = await _folder_service.restore_folders(
            session,
            user_id=uid,
            folder_ids=request.folder_ids,
        )
        restored = result["restored_folders"]
        failed = result["failed_folders"]
        success = True
        return MultipleFolderRestoreResponse(
            success=True,
            message="restore Completed" if success else "no restored folders",
            restored_folders = restored,
            failed_folders = failed
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
@router.post("/perm-delete",response_model=MultipleFolderPermDeleteResponse)
async def restore_folder(request:MultipleFolderPermDeleteRequest,
                          current_user:User = Depends(get_current_user),
                          session: AsyncSession=Depends(get_db_tx)) ->MultipleFolderPermDeleteResponse:
    uid = _user_id(current_user)
    try:
        result = await _folder_service.permanent_folders(
            session,
            user_id=uid,
            folder_ids=request.folder_ids,
        )
        perm_deleted = result["deleted_folders"]
        failed = result["failed_folders"]
        success = True
        return MultipleFolderPermDeleteResponse(
            success=True,
            message="perm delete Completed" if success else "no permdeleted folders",
            deleted_folders = perm_deleted,
            failed_folders = failed
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
@router.get("/recycle_bin")
async def get_recycle_bin_folders(
    parent_folder_id: Optional[int] = Query(default=None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    uid = _user_id(current_user)
    try:
        folders = await FolderRepository.list_deleted_folders(session, parent_folder_id=parent_folder_id,user_id=uid)
        if not folders:
            raise LookupError("Folder Not Found.")
        
        result = []
        for folder in folders:
            f = folder.to_dict(include_sensitive_data = True)
            f["parent_folder_id"] = folder.parent_folder_id
            result.append(f)
        
        return {"success": True, "folders": result}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("get_recycle_bin_folders failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
@router.post("/init-folder",response_model=FolderUploadResponse)
async def init_folder_upload(
    payload: FolderUploadRequest,
    session: AsyncSession = Depends(get_db_tx),
    user: User = Depends(get_current_user),
):
    try:
        fus, root_id, root_name, plans = await _folder_folder_service.init_folder_upload(
                session=session,
                user_id=user.user_id,
                root_folder_name=payload.root_folder_name,
                parent_folder_id=payload.parent_folder_id,
                entries=payload.entries,
                chunk_size=payload.chunk_size,
            )

        return FolderUploadResponse(
            folder_upload_id=fus.folder_upload_id,
            root_folder_id=root_id,
            root_folder_name=root_name,
            total_files=fus.total_files,
            expires_at=fus.expires_at.isoformat(),
            files=[
                FolderUploadChildFile(
                    rel_path=p.rel_path,
                    file_name=p.file_name,
                    folder_id=p.folder_id,
                    upload_id=p.upload_id,
                    chunk_size=p.chunk_size,
                    total_chunks=p.total_chunks,
                )
                for p in plans
            ],
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Folder upload init failed: {e}")
    

@router.get("/{folder_id}/status",response_model=FolderUploadStatusResponse)
async def folder_upload_status(folder_upload_id: UUID,
    limit: int = Query(default=200, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        folder_user_session = await fu_session_repo.get_folder(session, user_id=_user_id,folder_upload_id=folder_upload_id)
        if not folder_user_session:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Folder upload session not found")
        
        items = await fu_item_repo.list_items(session, user.user_id, folder_upload_id, limit=limit, offset=offset)
        upload_ids = [it.upload_id for it in items if it.upload_id]

        status_map = await upload_repo.get_status_bulk(session, user.user_id, upload_ids)
        count_map = await chunk_repo.count_bulk(session, upload_ids)

        completed = await fu_item_repo.complete(session, user.user_id, folder_upload_id)

        res_items = []
        for it in items:
            st, total = status_map.get(it.upload_id, ("UNKNOWN", 0))
            res_items.append(
                FolderUploadChildStatus(
                    rel_path=it.rel_path,
                    file_name=it.file_name,
                    upload_id=it.upload_id,
                    folder_id=int(it.folder_id),
                    total_chunks=int(total),
                    received_count=int(count_map.get(it.upload_id, 0)),
                    upload_status=st,
                )
            )

        return FolderUploadStatusResponse(
            folder_upload_id=folder_user_session.folder_upload_id,
            status=folder_user_session.status,
            root_folder_id=int(folder_user_session.root_folder_id),
            total_files=int(folder_user_session.total_files),
            completed_files=int(completed),
            expires_at=folder_user_session.expires_at.isoformat(),
            items=res_items,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Status failed: {e}")

@router.post("/folders/plan", response_model=FolderDownloadPlanResponse)
async def folder_download_plan(
    payload: FolderDownloadPlanRequest,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        return await _download_service.build_folder_path(
            session=session,
            user_id=user.user_id,
            root_folder_ids=payload.folder_ids,
            include_root=payload.include_root,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Folder download plan failed: {e}")
