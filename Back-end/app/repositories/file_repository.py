from typing import Optional , List
from uuid import UUID
import logging , re

from sqlalchemy import select, func , update , delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.expression import false

from datetime import datetime

from app.domain.persistance.models.dash_models import File, FileVersioning, Storage

logger = logging.getLogger(__name__)

_word = re.compile(r"[A-Za-z0-9_]+")

def build_prefix_tsquery(q: str) -> str:
    # "hello world" -> "hello:* & world:*"
    terms = _word.findall(q.lower())
    if not terms:
        return ""
    return " & ".join(f"{t}:*" for t in terms[:8])

class FileRepository:
    async def create_file(self,session: AsyncSession,user_id: str,file_name: str,
                          file_path: str,file_size: int,file_type: str,folder_id: Optional[int],
                          integrity_hash: str,encryption_metadata: str,is_encrypted: bool = True,
                          version_number: int = 1
    ) -> File:
        file = File(
            user_id=user_id,
            file_name=file_name,
            file_path=file_path,
            file_size=file_size,
            file_type=file_type,
            folder_id=folder_id,
            is_shared=False,
            is_deleted=False,
            is_encrypted=is_encrypted,
            integrity_hash=integrity_hash,
            encryption_metadata=encryption_metadata,
            version_number=version_number,
        )
        if hasattr(file, "uploaded_at"):
            file.uploaded_at = datetime.utcnow()
        if hasattr(file, "updated_at"):
            file.updated_at = datetime.utcnow()

        session.add(file)
        await session.flush()
        return file
    
    async def update_file_after_upload_complete(self,session: AsyncSession,file_obj: File,
                                                file_name: str,file_type: str,folder_id: Optional[int],
                                                file_size: int,file_path: str,integrity_hash: str,
                                                encryption_metadata: str,is_encrypted: bool,
                                                version_number: int,
    ) -> None:
        file_obj.file_name = file_name
        file_obj.file_type = file_type
        file_obj.folder_id = folder_id
        file_obj.file_size = file_size
        file_obj.file_path = file_path
        file_obj.integrity_hash = integrity_hash
        file_obj.encryption_metadata = encryption_metadata
        if hasattr(file_obj, "is_encrypted"):
            file_obj.is_encrypted = is_encrypted
        if hasattr(file_obj, "version_number"):
            file_obj.version_number = version_number
        if hasattr(file_obj, "updated_at"):
            file_obj.updated_at = datetime.utcnow()

        session.add(file_obj)
    
    async def set_head_version(self, session: AsyncSession, file_obj: File, version_id: int) -> None:
        if hasattr(file_obj, "parent_file_version_id"):
            file_obj.parent_file_version_id = version_id
        session.add(file_obj)

    async def set_file_path(self, session: AsyncSession, file_obj: File,file_path: str) -> None:
        file_obj.file_path = file_path
        if hasattr(file_obj, "updated_at"):
            file_obj.updated_at = datetime.utcnow()
        session.add(file_obj)

    async def get_active_file(self , session:AsyncSession, user_id : str , file_id:UUID) -> Optional[File]:
        stmt = (
            select(File)
            .where(File.user_id == user_id)
            .where(File.file_id == file_id)
            .where(File.is_deleted.is_(False))
        )
        res = await session.execute(stmt)
        return res.scalar_one_or_none()
    
    async def get_file_any_state(self, session: AsyncSession, user_id: str, file_id: UUID) -> Optional[File]:
        stmt = (
            select(File)
            .where(File.user_id == user_id)
            .where(File.file_id == file_id)
        )
        res = await session.execute(stmt)
        return res.scalar_one_or_none()
    
    async def get_file_by_active_ids(self, session:AsyncSession, user_id:str, file_ids:List[UUID],include_deleted:bool = False) -> List[File]:
        if not file_ids:
            raise ValueError("File ids not Found.")
        
        stmt = (select(File).where(File.user_id == user_id).where(File.file_id.in_(file_ids)))
        if not include_deleted:
            stmt = stmt.where(File.is_deletedc == False)

        res = await session.execute(stmt)
        result = res.scalars().all()

        # call order
        by_id = {f.file_id: f for f in result}
        ordered = [by_id[i] for i in file_ids if i in by_id]
        return ordered
    
    async def name_exist_or_not_in_folder(self , session:AsyncSession, user_id : str , file_name: str , exclude_curr_file_id : UUID ,folder_id = Optional[int]) -> bool:
        stmt = select(File.file_id).where(File.user_id==user_id).where(File.is_deleted.is_(False))
        if folder_id is None:
            stmt = stmt.where(File.folder_id.is_(None))
        else:
            stmt = stmt.where(File.folder_id == folder_id)

        stmt = (
            stmt.where(func.lower(File.file_name) == func.lower(file_name))
            .where(File.file_id != exclude_curr_file_id)
            .limit(1)
        )

        res = await session.execute(stmt)
        return res.scalar_one_or_none() is not None
    
    async def list_files_in_folder(self, session:AsyncSession, user_id:str, folder_ids: List[int], include_deleted : bool = True) -> List[File]:
        if not folder_ids:
            return []
        
        stmt = select(File).where(File.user_id == user_id).where(File.folder_id.in_(folder_ids))
        if not include_deleted:
            stmt = stmt.where(File.is_deleted.is_(False))
        res = await session.execute(stmt)
        return list(res.scalars().all())
    
    async def get_file_version(self, session:AsyncSession, user_id:str, version_id:int, file_id:UUID) -> Optional[FileVersioning]:
        stmt = (select(FileVersioning).join(File, File.file_id == FileVersioning.original_file_id).where(FileVersioning.user_id== user_id)
                .where(FileVersioning.original_file_id == file_id).where(FileVersioning.version_id == version_id))
        res = await session.execute(stmt)
        return res.scalar_one_or_none()

    #rename
    async def rename(self, session: AsyncSession, file: File, new_file_name: str) -> None:
        file.file_name = new_file_name
        file.updated_at = datetime.utcnow()
        session.add(file)

    #move
    async def move(self, session: AsyncSession, file: File, new_folder_id: Optional[int]) -> None:
        file.folder_id = new_folder_id
        file.updated_at = datetime.utcnow()
        session.add(file)

    #copy
    async def copy(self, session:AsyncSession,
                   user_id : str,file : File,
                   new_file_id : UUID, new_file_name : str,
                   new_folder_id : Optional[int],
                   new_file_path : str
                   ) -> File:
        
        new_file = File(
            user_id=user_id,
            file_id=new_file_id,
            file_name=new_file_name,
            file_path=new_file_path,
            file_size=file.file_size,
            file_type=file.file_type,
            folder_id=new_folder_id,
            is_shared=False,
            is_deleted=False,
            is_encrypted=getattr(file, "is_encrypted", True),
            uploaded_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            deleted_at=None,
            integrity_hash=file.integrity_hash,
            encryption_metadata=getattr(file, "encryption_metadata", None),
            tags=(file.tags.copy() if getattr(file, "tags", None) else []),
            search_vector=getattr(file, "search_vector", ""),
            version_number=1,
            parent_file_version_id=None,
        )

        session.add(new_file)
        await session.flush()
        return new_file
    
    # soft delete
    async def soft_delete(self, session:AsyncSession, user_id:str, file : File) -> None:
        file_ids = UUID(file["file_ids"])
        if not file_ids:
            return 0
        stmt = (update(File).where(File.user_id == user_id).where(File.file_id.in_(file_ids)).where(File.is_deleted.is_(False))
                .values(is_deleted = True,
                        deleted_at = datetime.utcnow(),
                        updated_at = datetime.utcnow(),))
        
        res = await session.execute(stmt)
        return int(res.rowcount or 0)

    #restore
    async def restore(self, session:AsyncSession, user_id:str, file_ids: List[UUID], file_name:str) -> None:
        if not file_ids:
            return 0
        stmt = (
            update(File)
            .where(File.user_id == user_id)
            .where(File.file_id.in_(file_ids))
            .where(File.is_deleted.is_(True))
            .values(is_deleted=False, delete_at=None)
        )
        res = await session.execute(stmt)
        return int(res.rowcount or 0)

    #hard-delete
    async def hard_delete(self, session:AsyncSession, user_id : str,file_ids:List[UUID]) -> None:
        if not file_ids:
            return 0
        stmt = delete(File).where(File.user_id == user_id).where(File.file_id.in_(file_ids))
        res = await session.execute(stmt)
        return int(res.rowcount or 0)

    async def aggregate_active(self,session:AsyncSession,user_id:str) -> tuple[int,int]:
        res = await session.execute(select(func.count(File.file_id),
                func.coalesce(func.sum(File.file_size), 0)).where(
                    File.user_id == user_id,
                    File.is_deleted == false()
                ))
        count, total = res.first()
        return int(count or 0), int(total or 0)
    
    async def breakdown_by_type(self, session: AsyncSession, user_id: str):
        res = await session.execute(
            select(
                File.file_type,
                func.count(File.file_id),
                func.coalesce(func.sum(File.file_size), 0)
            ).where(
                File.user_id == user_id,
                File.is_deleted == false()
            ).group_by(File.file_type)
        )
        return res.all()

        
    async def search_fts_prefix(self, session: AsyncSession, user_id: str, q: str, limit: int):
        ts = build_prefix_tsquery(q)
        if not ts:
            return []
        stmt = (
            select(File)
            .where(
                File.user_id == user_id,
                File.is_deleted == false(),
                File.search_vector.op("@@")(func.to_tsquery("english", ts)),
            )
            .order_by(File.created_at.desc())
            .limit(limit)
        )
        res = await session.execute(stmt)
        return res.scalars().all()

    async def search_name_ilike(self, session: AsyncSession, user_id: str, q: str, limit: int):
        pattern = f"%{q}%"
        stmt = (
            select(File)
            .where(
                File.user_id == user_id,
                File.is_deleted == false(),
                File.file_name.ilike(pattern),
            )
            .order_by(File.created_at.desc())
            .limit(limit)
        )
        res = await session.execute(stmt)
        return res.scalars().all()
