from supabase import create_async_client, AsyncClient
from app.config.config import settings

class AsyncSupabaseManager:
    def __init__(self):
        self._client: AsyncClient = None
    
    async def get_client(self) -> AsyncClient:
        """Get or create async Supabase client"""
        if self._client is None:
            self._client = await create_async_client(
                settings.supabase_url,
                settings.supabase_service_key
            )
        return self._client
    
    async def close(self):
        """Close the client connection"""
        if self._client:
            await self._client.close()

# Global async Supabase manager
supabase_manager = AsyncSupabaseManager()

# FastAPI dependency
async def get_async_supabase() -> AsyncClient:
    """FastAPI dependency to get async Supabase client"""
    return await supabase_manager.get_client()