import logging
from typing import Optional , List, Tuple

from sqlalchemy import select, func, update, delete, Text, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import false
from datetime import datetime

from app.domain.persistance.models.dash_models import Folder , File

import uuid

logger = logging.getLogger(__name__)


class FolderRepository:
    async def get_by_uid(self, session: AsyncSession, user_id: str, folder_uid: uuid.UUID) -> Optional[Folder]:
        res = await session.execute(
            select(Folder)
            .where(Folder.user_id == user_id)
            .where(Folder.folder_uid == folder_uid)
            .where(Folder.is_deleted.is_(False))
            .limit(1)
        )
        return res.scalar_one_or_none()
    
    async def create_with_uid(self,session: AsyncSession,user_id: str,folder_uid: uuid.UUID,folder_name: str,parent_folder_id: Optional[int],depth: int,    heirarchy_path: Optional[str] = None,
                              ) -> Folder:
        new_folder = Folder(
            user_id=user_id,
            folder_uid=folder_uid,
            folder_name=folder_name,
            parent_folder_id=parent_folder_id,
            is_shared=False,
            is_deleted=False,
            depth_level=depth,
            heirarchy_path=heirarchy_path,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            deleted_at=None,
        )
        session.add(new_folder)
        await session.flush()  
        return new_folder
    
    async def get_active_folder(
        self, session: AsyncSession, user_id: str, folder_id: int
    ) -> Optional[Folder]:
        stmt = (
            select(Folder)
            .where(Folder.user_id == user_id)
            .where(Folder.folder_id == folder_id)
            .where(Folder.is_deleted.is_(False))
        )
        res = await session.execute(stmt)
        return res.scalar_one_or_none()

    async def name_exists_in_parent_folder(
        self,
        session: AsyncSession,
        user_id: str,
        parent_folder_id: Optional[int],
        folder_name: str,
        exclude_curr_folder_id: int,
    ) -> bool:
        stmt = select(Folder).where(Folder.user_id == user_id).where(Folder.is_deleted.is_(False))

        if parent_folder_id is None:
            stmt = stmt.where(Folder.parent_folder_id.is_(None))
        else:
            stmt = stmt.where(Folder.parent_folder_id == parent_folder_id)

        stmt = (
            stmt.where(func.lower(Folder.folder_name) == func.lower(folder_name))
            .where(Folder.folder_id != exclude_curr_folder_id)
            .limit(1)
        )

        res = await session.execute(stmt)
        return res.scalar_one_or_none() is not None

    
    async def get_active_folders_by_ids(
        self,
        session: AsyncSession,
        user_id: str,
        folder_ids: List[int],
    ) -> List[Folder]:
        folder_ids = list(dict.fromkeys([int(x) for x in (folder_ids or [])]))
        if not folder_ids:
            return []

        stmt = (select(Folder).where(Folder.user_id == user_id)
            .where(Folder.folder_id.in_(folder_ids))
            .where(Folder.is_deleted.is_(False))
        )
        res = await session.execute(stmt)
        return list(res.scalars().all())
    
    async def get_folder_any_state(self, session:AsyncSession, user_id: str, folder_id: int) -> Optional[Folder]:
        stmt = select(Folder).where(Folder.user_id == user_id, Folder.folder_id == folder_id)
        res = await session.execute(stmt)
        return res.scalar_one_or_none()

    async def rename(self, session: AsyncSession, folder: Folder, new_name: str) -> None:
        folder.folder_name = new_name
        folder.updated_at = datetime.utcnow()
        session.add(folder)

    async def move(self, session:AsyncSession, folder: Folder, new_parent_id: Optional[int]) -> None:
        folder.parent_folder_id= new_parent_id
        folder.updated_at = datetime.utcnow()
        session.add(folder)

    async def is_ancestor_of(self, session:AsyncSession, user_id:str, root_id: int, node_id:int) -> bool:
        t = Folder.__table__
        root = (
            select(t.c.folder_id, t.c.parent_folder_id)
            .where(t.c.folder_id == node_id)
            .where(t.c.user_id == user_id)
            .where(t.c.is_deleted.is_(False))
            .cte(name="root", recursive=True)
        )
        root = root.union_all(
            select(t.c.folder_id, t.c.parent_folder_id)
            .where(t.c.folder_id == root.c.parent_folder_id)
            .where(t.c.user_id == user_id)
            .where(t.c.is_deleted.is_(False))
        )
        stmt = select(root.c.folder_id).where(root.c.folder_id == root_id).limit(1)
        res = await session.execute(stmt)

        return res.scalar_one_or_none() is not None

    async def copy(self, session:AsyncSession, user_id:str, folder_name:str, parent_folder_id :Optional[int],
                    heirarchy_path: Optional[str] = None,
                    depth : int = 0, 
                    ) -> Folder :
        
        new_folder = Folder(
            user_id=user_id,
            folder_name=folder_name,
            parent_folder_id=parent_folder_id,
            is_shared=False,
            is_deleted=False,
            depth_level=depth,
            heirarchy_path=heirarchy_path,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            deleted_at=None,
        )

        session.add(new_folder)
        await session.flush()
        return new_folder
    
    async def list_child_folder(self,
                                session: AsyncSession,
                                user_id : str,
                                parent_folder_id: int
                                ) -> List[Folder] :
        stmt = (select(Folder).where(
            Folder.user_id == user_id,
            Folder.parent_folder_id == parent_folder_id)
            .where(Folder.is_deleted.is_(False)))
        
        result = await session.execute(stmt)
        return list(result.scalars().all())
    
    async def list_file_in_folder(self,
                                  session:AsyncSession,
                                  user_id:str,
                                  folder_id:int) -> List[File]:
        stmt = (select(File).where(File.user_id == user_id, File.folder_id == folder_id)
                .where(File.is_deleted.is_(False)))
        
        result = await session.execute(stmt)
        return list(result.scalars().all())
    
    async def delete_file(self,session:AsyncSession, user_id:str, folder_ids:List[int], is_deleted:bool) -> None:
        if not folder_ids:
            return
        stmt = (update(Folder).where(Folder.user_id == user_id)
                .where(Folder.folder_id.in_(folder_ids))
                .values(is_deleted=is_deleted,
                deleted_at=(datetime.utcnow() if is_deleted else None),
                updated_at=datetime.utcnow(),))
        
        result = await session.execute(stmt)

    async def soft_delete_folder(self, session:AsyncSession, user_id:str, folder_ids:List[int]) -> int:
        if not folder_ids:
            return 0
        stmt = (
            update(Folder)
            .where(Folder.user_id == user_id).where(Folder.folder_id.in_(folder_ids)).where(Folder.is_deleted.is_(False))
            .values(is_deleted=True, deleted_at=datetime.utcnow())
        )
        res = await session.execute(stmt)
        return int(res.rowcount or 0)
       
    async def restore_folders(self, session:AsyncSession, user_id:str, folder_ids:List[int]) -> int:
        if not folder_ids:
            return 0
        stmt = (
            update(Folder)
            .where(Folder.user_id == user_id).where(Folder.folder_id.in_(folder_ids)).where(Folder.is_deleted.is_(True))
            .values(is_deleted=False, deleted_at=None)
        )
        res = await session.execute(stmt)
        return int(res.rowcount or 0)
    
    async def list_deleted_folders(self, session: AsyncSession, user_id: str, parent_folder_id: Optional[int] = None):
        stmt = (select(Folder).where(Folder.user_id == user_id).where(Folder.is_deleted.is_(True))
                .order_by(Folder.deleted_at.desc(), Folder.folder_id.desc()))
        
        if parent_folder_id is None:
            stmt = stmt.where(Folder.parent_folder_id.is_(None))
        else:
            stmt = stmt.where(Folder.parent_folder_id == parent_folder_id)
        res = await session.execute(stmt)
        return list(res.scalars().all())

    async def delete_folders_hard(self, session: AsyncSession, user_id: str, folder_ids: List[int]) -> int:
        if not folder_ids:
            return 0
        stmt = delete(Folder).where(Folder.user_id == user_id).where(Folder.folder_id.in_(folder_ids))
        res = await session.execute(stmt)
        return int(res.rowcount or 0)
    
    async def list_subtree_folders_by_roots(
        self,
        session: AsyncSession,
        user_id: str,
        root_folder_ids: List[int],
        include_roots: bool = True,
    ) -> List[Tuple[int, int, Optional[int], str, int, Optional[str]]]:
        root_folder_ids = list(dict.fromkeys([int(x) for x in (root_folder_ids or [])]))
        if not root_folder_ids:
            return []

        t = Folder.__table__

        base = (
            select(
                t.c.folder_id.label("folder_id"),
                t.c.parent_folder_id.label("parent_folder_id"),
                t.c.folder_name.label("folder_name"),
                t.c.depth_level.label("depth_level"),
                t.c.heirarchy_path.label("heirarchy_path"),
                t.c.folder_id.label("root_id"),
            )
            .where(t.c.user_id == user_id)
            .where(t.c.is_deleted.is_(False))
            .where(t.c.folder_id.in_(root_folder_ids))
        )

        tree = base.cte(name="folder_tree", recursive=True)

        step = (
            select(
                t.c.folder_id.label("folder_id"),
                t.c.parent_folder_id.label("parent_folder_id"),
                t.c.folder_name.label("folder_name"),
                t.c.depth_level.label("depth_level"),
                t.c.heirarchy_path.label("heirarchy_path"),
                tree.c.root_id.label("root_id"),
            )
            .where(t.c.user_id == user_id)
            .where(t.c.is_deleted.is_(False))
            .where(t.c.parent_folder_id == tree.c.folder_id)
        )

        tree = tree.union_all(step)

        stmt = select(
            tree.c.root_id,
            tree.c.folder_id,
            tree.c.parent_folder_id,
            tree.c.folder_name,
            tree.c.depth_level,
            tree.c.heirarchy_path,
        )

        if not include_roots:
            stmt = stmt.where(tree.c.folder_id.notin_(root_folder_ids))

        res = await session.execute(stmt)
        return list(res.all())

    async def list_subtree_folder_ids(
        self,
        session: AsyncSession,
        user_id: str,
        root_id: int,
        include_deleted: bool,
        include_root: bool = True,
    ) -> List[int]:
        t = Folder.__table__

        base = (
            select(t.c.folder_id)
            .where(t.c.user_id == user_id)
            .where(t.c.folder_id == int(root_id))
        )
        if not include_deleted:
            base = base.where(t.c.is_deleted.is_(False))

        tree = base.cte(name="folder_tree", recursive=True)

        step = (
            select(t.c.folder_id)
            .where(t.c.user_id == user_id)
            .where(t.c.parent_folder_id == tree.c.folder_id)
        )
        if not include_deleted:
            step = step.where(t.c.is_deleted.is_(False))

        tree = tree.union_all(step)

        stmt = select(tree.c.folder_id)
        if not include_root:
            stmt = stmt.where(tree.c.folder_id != int(root_id))

        res = await session.execute(stmt)
        return [int(r[0]) for r in res.all()]
    
    async def get_folder(self,session:AsyncSession,user_id:str,folder_id:int) -> Folder | None:
        res = await session.execute(
            select(Folder).where(
                Folder.folder_id == folder_id,
                Folder.user_id == user_id,
                Folder.is_deleted == false()
            )
        )
        return res.scalar_one_or_none()
    
    async def folder_tree_size_bytes(self, session: AsyncSession, user_id: str, root_folder_id: int) -> int:
        stmt = Text("""
            WITH RECURSIVE subtree AS (
                    SELECT folder_id 
                    from folders
                    WHERE folder_id = :root_id
                        AND user_id = :user_id
                        AND is_deleted = false
                    UNION ALL
                    SELECT f.folder_id
                    FROM folders f
                    JOIN subtree s ON f.parent_folder_id = s.folder_id
                    WHERE f.user_id = :user_id
                        AND f.is_deleted = false
                    )
                    SELECT COALESCE(SUM(fl.file_size), 0) AS total_size
                    FROM files fl
                    JOIN subtree s ON fl.folder_id = s.folder_id
                    WHERE fl.user_id = :user_id
                        AND fl.is_deleted = false
            """)
        res = await session.execute(stmt, {"root_id": root_folder_id, "user_id": user_id})
        return int(res.scalar() or 0)

    async def search_name_ilike(self, session: AsyncSession, user_id: str, q: str, limit: int):
        pattern = f"%{q}%"
        stmt = (
            select(Folder)
            .where(
                Folder.user_id == user_id,
                Folder.is_deleted == false(),
                Folder.folder_name.ilike(pattern),
            )
            .order_by(Folder.created_at.desc())
            .limit(limit)
        )
        res = await session.execute(stmt)
        return res.scalars().all()