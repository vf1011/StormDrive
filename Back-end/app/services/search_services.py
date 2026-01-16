from app.repositories.file_repository import FileRepository
from app.repositories.folder_repository import FolderRepository

class SearchService:
    def __init__(self,file_repo:FileRepository, folder_repo:FolderRepository):
        self.file_repo = file_repo
        self.folder_repo = folder_repo

    async def search(self, session, user_id: str, query: str, limit: int, include_files: bool, include_folders: bool):
        query = (query or "").strip()
        if not query:
            return [], []

        limit = max(1, min(int(limit), 200))

        files = []
        folders = []

        if include_files:
            files = await self.file_repo.search_fts_prefix(session, user_id, query, limit)
            if not files:
                files = await self.file_repo.search_name_ilike(session, user_id, query, limit)

        if include_folders:
            folders = await self.folder_repo.search_name_ilike(session, user_id, query, limit)

        return files, folders