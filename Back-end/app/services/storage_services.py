from app.repositories.storage_repo import StorageRepository
from app.repositories.file_repository import FileRepository
from app.repositories.trash_repository import RecyclebinRepository
from app.repositories.folder_repository import FolderRepository

from sqlalchemy.ext.asyncio import AsyncSession

class StorageServices:
    def __init__(self,file_repo:FileRepository,folder_repo:FolderRepository,storage_repo:StorageRepository,trash_repo:RecyclebinRepository):
        self.file_repo = file_repo
        self.folder_repo = folder_repo
        self.storage_repo = storage_repo
        self.trash_repo = trash_repo

    async def get_stats(self,session:AsyncSession,user_id:str):
        storage = await self.storage_repo.get_or_create(session, user_id)

        active_count, active_size = await self.file_repo.aggregate_active(session, user_id)
        bin_count, bin_size = await self.trash_repo.aggregate(session, user_id)

        total_used = active_size + bin_size
        total_storage = int(storage.total_storage)
        available = max(0, total_storage - total_used)
        pct = (total_used / total_storage) * 100 if total_storage > 0 else 0.0

        return storage, active_count, active_size, bin_count, bin_size, total_used, available, pct

    async def get_breakdown(self, session, user_id: str):
        active_rows = await self.file_repo.breakdown_by_type(session, user_id)
        bin_rows = await self.trash_repo.breakdown_by_type(session, user_id)

        def normalize(rows):
            out = {}
            total = 0
            for ftype, cnt, size in rows:
                size = int(size or 0)
                out[ftype or "unknown"] = {
                    "count": int(cnt or 0),
                    "size_bytes": size,
                    "size_mb": round(size / (1024 * 1024), 2),
                    "size_gb": round(size / (1024 * 1024 * 1024), 3),
                }
                total += size
            return out, total

        active_map, active_total = normalize(active_rows)
        bin_map, bin_total = normalize(bin_rows)

        total_size = active_total + bin_total
        for m in (active_map, bin_map):
            for k in m:
                m[k]["percentage"] = round((m[k]["size_bytes"] / total_size) * 100, 2) if total_size > 0 else 0.0

        return active_map, bin_map, total_size

    async def check_upload(self, session, user_id: str, file_size: int):
        if file_size < 0:
            raise ValueError("file_size must be >= 0")

        storage, _, _, _, _, total_used, available, pct = await self.get_stats(session, user_id)

        new_total_used = total_used + file_size
        allow = new_total_used <= int(storage.total_storage)
        remaining = (available - file_size) if allow else 0
        new_pct = (new_total_used / int(storage.total_storage)) * 100 if int(storage.total_storage) > 0 else 0.0

        return storage, allow, remaining, new_pct, total_used, available
    
    async def folder_size(self, session, user_id: str, folder_id: int):
        folder = await self.folder_repo.get_folder(session, user_id, folder_id)
        if not folder:
            return None, 0
        size = await self.folder_repo.folder_tree_size_bytes(session, user_id, folder_id)
        return folder, size