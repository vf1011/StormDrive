from fastapi import APIRouter
from app.api.routers.files import router as files_router
from app.api.routers.folders import router as folders_router
from app.api.routers.search import router as search_router
from app.api.routers.storage import router as storage_router
from app.api.routers.key_bundle import router as key_router

dashboard_router = APIRouter()

dashboard_router.include_router(files_router)
dashboard_router.include_router(folders_router)
dashboard_router.include_router(search_router)
dashboard_router.include_router(storage_router)
dashboard_router.include_router(key_router)