from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.persistance.database import get_db
from app.api.dependencies import get_current_user
from app.schemas.auth_schema import User

from app.repositories.file_repository import FileRepository
from app.repositories.folder_repository import FolderRepository

from app.schemas.dash_schema import SearchResponse, FileSearchItem, FolderSearchItem
from app.services.search_services import SearchService

router = APIRouter(prefix="/files", tags=["search"])
service = SearchService(FileRepository(), FolderRepository())

@router.get("/search", response_model=SearchResponse)
async def search(
    query: str = Query(..., min_length=1, max_length=200),
    limit: int = Query(50, ge=1, le=200),
    include_files: bool = True,
    include_folders: bool = True,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        files, folders = await service.search(
            session, current_user.user_id, query,
            limit=limit,
            include_files=include_files,
            include_folders=include_folders,
        )

        return SearchResponse(
            success=True,
            message="Search completed",
            files=[
                FileSearchItem(
                    file_id=str(f.file_id),
                    file_name=f.file_name,
                    file_type=f.file_type,
                    folder_id=int(f.folder_id) if f.folder_id else None,
                    is_shared=bool(getattr(f, "is_shared", False)),
                    created_at=f.created_at,
                )
                for f in files
            ],
            folders=[
                FolderSearchItem(
                    folder_id=int(fd.folder_id),
                    folder_name=fd.folder_name,
                    parent_folder_id=int(fd.parent_folder_id) if fd.parent_folder_id else None,
                    is_shared=bool(getattr(fd, "is_shared", False)),
                    created_at=fd.created_at,
                )
                for fd in folders
            ],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
