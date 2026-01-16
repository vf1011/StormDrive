import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query, Header
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from fastapi.responses import StreamingResponse
from app.api.dependencies import require_keybundle
import urllib.parse

from app.api.dependencies import get_current_user  
from app.domain.persistance.database import get_db , get_db_tx   

from app.schemas.auth_schema import User
from app.schemas.dash_schema import (FileRenameRequest, FileRenameResponse, MultipleFileMoveRequest, MultipleFileMoveResponse,
                                     MultipleFileCopyRequest,MultipleFileCopyResponse, MultipleFileDeleteRequest,MultipleFileDeleteResponse,
                                     MultipleFileRestoreRequest,MultipleFileRestoreResponse,MultipleFilePermDeleteRequest,MultipleFilePermDeleteResponse,
                                     FileVersionResponse,UploadResponse,UploadRequest,UploadStatusResponse,FolderDownloadPlanResponse,
                                     FinalUploadResponse, FileDownloadRequest,MultiFilePlanRequest,)

from app.repositories.file_repository import FileRepository
from app.repositories.folder_repository import FolderRepository
from app.repositories.undo_redo_repository import UndoRedoRepository
from app.repositories.trash_repository import RecyclebinRepository
from app.repositories.version_repository import VersionRepository
from app.repositories.upload_session_repository import UploadSessionRepository
from app.repositories.upload_chunk_repository import UploadChunkRepository

from app.security.server_wrapup import ServerCipherWrap

from app.services.file_services import FileService
from app.services.preview_services import PreviewService
from app.services.version_service import VersionService
from app.services.upload_service import UploadServices, UploadConflictError
from app.services.download_services import DownloadService,DownloadNotFoundError,DownloadCorruptionError

from app.storage.chunk_storage import ChunkStorage
from app.security.server_wrapup import ServerCipherWrap



logger = logging.getLogger(__name__)

router = APIRouter(prefix="/file", tags=["files"])

_file_service = FileService(FileRepository(), UndoRedoRepository(),FolderRepository(),RecyclebinRepository())
_preview_service = PreviewService(FileRepository(),RecyclebinRepository())
_version_service = VersionService(FileRepository(), VersionRepository())
_download_service = DownloadService(storage=ChunkStorage(), wrapper=ServerCipherWrap(),file_repo=FileRepository(),folder_repo=FolderRepository())
_upload_service = UploadServices(
    session_repo=UploadSessionRepository(),
    chunk_repo=UploadChunkRepository(),
    ver_repo=VersionRepository(),
    storage=ChunkStorage(),
    serverwrap=ServerCipherWrap(),
    folder_repo=FolderRepository(),
    file_repo=FileRepository(),
    settings=None,
)

def _user_id(user: User) -> str:
    uid = getattr(user, "user_id", None) or getattr(user, "id", None)
    if not uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user context")
    return str(uid)


@router.post("/rename", response_model=FileRenameResponse)
async def rename_file(
    request: FileRenameRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_tx),
) -> FileRenameResponse:
    uid = _user_id(current_user)

    try:
        result = await _file_service.rename_file(
            session,
            user_id=uid,
            file_id=request.file_id,
            new_file_name=request.new_file_name,
        )
        return FileRenameResponse(
            success=True,
            message="File renamed successfully",
            file_id=str(request.file_id),
            new_file_name=result["new_file_name"],
        )

    except ValueError as e:
        logger.info("file rename validation failed", extra={"user_id": uid, "file_id": str(request.file_id)})
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(e))

    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    except FileExistsError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    except Exception:
        logger.exception("file rename failed", extra={"user_id": uid, "file_id": str(request.file_id)})
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Rename failed")


@router.post("/move", response_model=MultipleFileMoveResponse)
async def move_files(request: MultipleFileMoveRequest,
                     current_user: User = Depends(get_current_user),
                     session: AsyncSession=Depends(get_db_tx),) -> MultipleFileMoveResponse:
    uid = _user_id(current_user)
    try:
        result = await _file_service.move_file(
            session,
            user_id=uid,
            file_ids=request.file_ids,
            to_folderId=request.new_folder_id,
        )
        moved = result["moved_files"]
        failed = result["failed_files"]
        success = True
        return MultipleFileMoveResponse(
            success = True,
            message = "Move Completed" if success else "no moved files",
            moved_files = moved,
            failed_files = failed
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/copy", response_model=MultipleFileCopyResponse)
async def copy_files(request: MultipleFileCopyRequest,
                     current_user: User = Depends(get_current_user),
                     session: AsyncSession=Depends(get_db_tx)) -> MultipleFileCopyResponse:
    uid = _user_id(current_user)
    try:
        result = await _file_service.copy_file(
            session,
            user_id=uid,
            file_ids=request.file_ids,
            to_folderId=request.new_folder_id,
        )
        copied = result["copy_files"]
        failed = result["failed_files"]
        success = True
        return MultipleFileCopyResponse(
            success=True,
            message = "Copy Completed" if success else "no copy files",
            copied_files = copied,
            failed_files = failed
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
@router.post("/delete", response_model=MultipleFileDeleteResponse)
async def trash_files(request:MultipleFileDeleteRequest,
                       current_user: User = Depends(get_current_user),
                       session : AsyncSession = Depends(get_db_tx)) -> MultipleFileDeleteResponse:
    uid = _user_id(current_user)
    try:
        result = await _file_service.delete_files(
            session,
            user_id=uid,
            file_ids=request.file_ids,
        )
        return MultipleFileDeleteResponse(
            success=True,
            message="Trash completed",
            deleted_files=result["deleted_files"],
            failed_files=result["failed_files"],  
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/restore", response_model = MultipleFileRestoreResponse)
async def restore_file(request:MultipleFileRestoreRequest,
                        current_user: User = Depends(get_current_user),
                        session : AsyncSession = Depends(get_db_tx)) -> MultipleFileRestoreResponse:
    uid = _user_id(current_user)
    try:
        result = await _file_service.restore_files(
            session,
            user_id=uid,
            file_ids=request.file_ids,
        )
        return MultipleFileRestoreResponse(
            success=True,
            message="Trash completed",
            restored_files=result["restore_files"],
            failed_files=result["failed_files"],  
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
@router.post("/permanent-delete", response_model=MultipleFilePermDeleteResponse)
async def permanently_delete_files(
    request: MultipleFilePermDeleteRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_tx),
):
    uid = _user_id(current_user)
    try:
        result = await _file_service.permanent_delete_file(
            session,
            user_id=uid,
            file_ids=request.file_ids
        )
        return MultipleFilePermDeleteResponse(
            success=len(result["deleted_files"]) > 0,
            message="Permanent delete completed",
            deleted_files=result["deleted_files"],
            failed_files=result["failed_files"],
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
@router.get("/recycle-bin")
async def list_recycle_bin(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    uid = _user_id(current_user)
    try:
        items = await RecyclebinRepository().list_file(session, user_id=uid)
        return items
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
@router.get("/{file_id}/enc-meta")
async def get_enc_meta(
    file_id: UUID,
    is_deleted: bool = Query(default=False),
    version_id: int | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    uid = _user_id(current_user)
    try:
        meta , path = await _preview_service.resolve_metadata(
            session,
            user_id=uid,
            file_id=file_id,
            is_deleted=is_deleted,
            version_id=version_id,
        )
        return {
            "success": True,
            "file_id": str(meta.file_id),
            "file_name": meta.file_name,
            "mime": meta.mime,
            "plain_size": meta.plain_size,
            "cipher_size": meta.cipher_size,
            "integrity_hash": meta.integrity_hash,
            "encryption_metadata": meta.encryption_metadata,
            "src": meta.src,
            "version_id": meta.version_id,
            "is_deleted": meta.is_deleted,
        }
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except Exception:
        logger.exception("enc-meta failed", extra={"user_id": uid, "file_id": str(file_id)})
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="enc-meta failed")


@router.get("/{file_id}/cipher")
async def stream_cipher(
    request: Request,
    file_id: UUID,
    is_deleted: bool = Query(default=False),
    version_id: int | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    uid = _user_id(current_user)

    try:
        meta, cipher_path = await _preview_service.resolve_metadata(
            session,
            user_id=uid,
            file_id=file_id,
            is_deleted=is_deleted,
            version_id=version_id,
        )
        file_size = meta.cipher_size

        range_header = request.headers.get("range") or request.headers.get("Range")
        headers = {
            "Accept-Ranges": "bytes",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        }

        if not range_header:
            return StreamingResponse(
                _preview_service.iterate_range(cipher_path, 0, file_size - 1),
                media_type="application/octet-stream",
                headers={**headers, "Content-Length": str(file_size)},
                status_code=status.HTTP_200_OK,
            )

        start, end = _preview_service.parse_range(range_header, file_size)
        content_length = end - start + 1

        headers.update({
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Content-Length": str(content_length),
        })

        return StreamingResponse(
            _preview_service.iterate_range(cipher_path, start, end),
            media_type="application/octet-stream",
            headers=headers,
            status_code=status.HTTP_206_PARTIAL_CONTENT,
        )

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_416_RANGE_NOT_SATISFIABLE, detail=str(e))
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception:
        logger.exception("cipher stream failed", extra={"user_id": uid, "file_id": str(file_id)})
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="cipher stream failed")

@router.get("/list-version", response_model=FileVersionResponse)
async def list_versions(
    file_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uid = _user_id(current_user)
    try:
        versions = await _version_service.list_versionfile(session, user_id=uid, file_id=file_id)
        return {
            "success": True,
            "message": "File versions fetched",
            "file_versions": [v.__dict__ for v in versions],
            "file_id": file_id,
        }
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception:
        logger.exception("list_versions failed", extra={"user_id": uid, "file_id": str(file_id)})
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="list_versions failed")

@router.post("/{version_id}/restore")
async def restore_version(
    file_id: UUID,
    version_id: int,
    session: AsyncSession = Depends(get_db_tx),
    current_user: User = Depends(get_current_user),
):
    uid = _user_id(current_user)
    try:
        result = await _version_service.restore_version(
                session, user_id=uid, file_id=file_id, version_id=version_id
        )
        return {"success": True, "message": "Version restored", "result": result}
    except (LookupError, FileNotFoundError) as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception:
        logger.exception("restore_version failed", extra={"user_id": uid, "file_id": str(file_id), "version_id": version_id})
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="restore_version failed")
    
@router.delete("/{version_id}")
async def delete_version(
    file_id: UUID,
    version_id: int,
    session: AsyncSession = Depends(get_db_tx),
    current_user: User = Depends(get_current_user),
):
    uid = _user_id(current_user)
    try:
        result = await _version_service.delete_version(
                session, user_id=uid, file_id=file_id, version_id=version_id
            )
        return {"success": True, "message": "Version deleted", "result": result}
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception:
        logger.exception("delete_version failed", extra={"user_id": uid, "file_id": str(file_id), "version_id": version_id})
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="delete_version failed")
    
@router.post("/init",response_model=UploadResponse)
async def init_upload(payload:UploadRequest,
                      current_user: User = Depends(get_current_user),
                      session: AsyncSession = Depends(get_db_tx),
                      _kb_required: bool = Depends(require_keybundle)):
    uid = _user_id(current_user)
    try:
        
        up = await _upload_service.init_session(
            session=session,
            user_id=uid,
            file_name=payload.file_name,
            file_type=payload.file_type,
            file_size=payload.file_size,
            folder_id=payload.folder_id,
            chunk_size=payload.chunk_size,
        )
        return UploadResponse(
            upload_id=up.upload_id,
            chunk_size=up.chunk_size,
            total_chunks=up.total_chunks,
            expires_at=up.expires_at.isoformat(),
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    
@router.put("/{upload_id}/chunks/{chunk_index}")
async def upload_chunk(upload_id: UUID,
    chunk_index: int,
    request: Request,
    x_chunk_nonce: str = Header(..., alias="X-Chunk-Nonce"),
    x_chunk_tag: str = Header(..., alias="X-Chunk-Tag"),
    session: AsyncSession = Depends(get_db_tx),
    current_user: User = Depends(get_current_user),
    _kb_required: bool = Depends(require_keybundle),
):
    uid = _user_id(current_user)
    try:
        body = await request.body()
        res = await _upload_service.put_chunk(
            session=session,
            user_id=uid,
            upload_id=upload_id,
            chunk_idx=chunk_index,
            ciphertext=body,
            nonce_b64=x_chunk_nonce,
            tag_b64=x_chunk_tag,
        )
        return {"ok": True, **res}
    except UploadConflictError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Chunk upload failed: {e}")

@router.get("/{upload_id}/status", response_model=UploadStatusResponse)
async def upload_status(
    upload_id: UUID,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        data = await _upload_service.status(session=session, user_id=user.user_id, upload_id=upload_id)
        return UploadStatusResponse(**data)
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/{upload_id}/finalize", response_model=FinalUploadResponse)
async def finalize_upload(
    upload_id: UUID,
    payload: UploadRequest,
    session: AsyncSession = Depends(get_db_tx),
    user: User = Depends(get_current_user),
    kb_required: bool = Depends(require_keybundle),
):
    try:
        file_id, version_id, version_number, integrity_hash = await _upload_service.finalize(
            session=session,
            user_id=user.user_id,
            upload_id=upload_id,
            wrapped_fk_b64=payload.wrapped_fk_b64,
            replace_of_file_id=payload.replace_of_file_id,
            file_name=payload.file_name,
            file_type=payload.file_type,
            folder_id=payload.folder_id,
            encryption_metadata=payload.encryption_metadata,
        )
        return FinalUploadResponse(
            file_id=file_id,
            version_id=version_id,
            version_number=version_number,
            integrity_hash=integrity_hash,
        )
    
    except UploadConflictError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Finalize failed: {e}")

@router.get("/download/{file_id}")
async def download_file(
    request:FileDownloadRequest,
    file_id:UUID,
    session:AsyncSession = Depends(get_db),
    current_user : User = Depends(get_current_user)
):
    uid = _user_id(current_user)
    try:
        target, headers, iterator = await _download_service.get_download_file(
        session=session,
        user_id=uid,
        file_id=file_id,
        version_id=request.version_id,
        verify_sha256=request.verify_sha,
    )
        return StreamingResponse(iterator, headers=headers, media_type="application/octet-stream")
    except DownloadNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except DownloadCorruptionError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Stored file is corrupted")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Download failed: {e}")
    
@router.post("/download/plan/files", response_model=FolderDownloadPlanResponse)
async def plan_files_download(
    payload: MultiFilePlanRequest,
    session: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    uid = _user_id(current_user)
    try :
        target = await _download_service.build_files_path(
            session=session,
            user_id=uid,
            file_ids=payload.file_ids,
            include_parent_paths=payload.include_parent_paths,
            include_virtual_root=payload.include_virtual_root,
        )

        return target
    except DownloadNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except DownloadCorruptionError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Stored file is corrupted")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Download failed: {e}")
    