from fastapi import FastAPI, Request , status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import time
import asyncio

# Routers
from app.api.routers.auth import router
from app.api.routers.routes import dashboard_router

# DB & models (keep your existing SQLAlchemy for files/dashboard)
from app.domain.persistance.database import engine, Base , async_session 
from app.domain.persistance.models import dash_models

# Supabase integration
from app.config.auth.supabase_client import supabase_manager
from app.config.config import settings

# Async lifespan for proper Supabase initialization
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting StormdDrive API...")
    
    #  Initialize Supabase async client
    print("Initializing Supabase client...")
    try:
        client = await supabase_manager.get_client()
        print("Supabase client initialized successfully")
    except Exception as e:
        print(f"Failed to initialize Supabase: {e}")
        
    
    #  Create database tables (your existing SQLAlchemy)
    print("Creating local database tables if not exist...")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        print("Tables registered with Base:")
        for table in Base.metadata.tables:
            print("-", table)
        print("Local database tables checked/created")
    except Exception as e:
        print(f"Database table creation failed: {e}")
    
    # Start background tasks
    # print("Starting background tasks...")
    # try:
    #     # Start recycle bin cleanup
    #     cleanup_task = asyncio.create_task(start_recycle_bin_cleanup_loop())
    #     print("Recycle bin cleanup task started")
        
    #     # Start Supabase health monitoring
    #     health_task = asyncio.create_task(supabase_health_monitor())
    #     print("Supabase health monitor started")
        
    # except Exception as e:
    #     print(f"Background task startup failed: {e}")
    
    # List all routes
    await list_routes()
    
    print("Server is ready!")
    
    yield
    
    # Shutdown
    print("Shutting down StormdDrive API...")
    
    # Cancel background tasks
    # try:
    #     cleanup_task.cancel()
    #     health_task.cancel()
    #     print("Background tasks cancelled")
    # except:
    #     pass
    
    # Close Supabase connections
    try:
        await supabase_manager.close()
        print("Supabase connections closed")
    except Exception as e:
        print(f"Supabase shutdown error: {e}")
    
    print(" Shutdown complete")

# Create the FastAPI app with async lifespan
app = FastAPI(
    title="StormdDrive API",
    description="File storage and management API with Supabase authentication",
    version="1.0.0",
    lifespan=lifespan  
)

# CORS for frontend (React)
print("Setting Up CORS...")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173", 
        "http://localhost:5001",   
        "http://127.0.0.1:5001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
print(" CORS is set up.")

#  Request timing middleware for performance monitoring
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    response.headers["X-Supabase-Integration"] = "active"
    return response

# Global exception handler for better error handling
# @app.exception_handler(Exception)
# async def global_exception_handler(request: Request, exc: Exception):
#     if settings.is_production:  
#         return JSONResponse(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             content={
#                 "detail": "Internal server error",
#                 "supabase_integration": True
#             }
#         )
#     else:
#         return JSONResponse(
#             status_code=500,
#             content={
#                 "detail": str(exc),
#                 "type": type(exc).__name__,
#                 "supabase_integration": True
#             }
#         )

print("Registering Routers...")

# Register routers
app.include_router(router,  tags=["Auth"])
print("auth router loaded")

# app.include_router(test_router , tags=["Auth"] )

app.include_router(dashboard_router, tags=["Dashboard"])
print("dashboard router loaded")

# Root endpoint with Supabase status
@app.get("/")
async def root():
    try:
        supabase_status = await supabase_manager.health_check()
        return {
            "message": "StormdDrive API is running",
            "version": "1.0.0",
            "supabase_status": supabase_status,
            "database_integration": "hybrid",
            "auth_provider": "supabase",
            "file_storage": "local",
            "docs": "/docs"
        }
    except Exception as e:
        return {
            "message": "StormdDrive API is running",
            "version": "1.0.0",
            "supabase_status": "error",
            "supabase_error": str(e),
            "docs": "/docs"
        }

# Health check with both Supabase and local DB status
@app.get("/health")
async def health_check():
    try:
        # Check Supabase connection
        supabase_health = await supabase_manager.health_check()
        
        # Check local database connection
        try:
            async with async_session() as session:
                await session.execute("SELECT 1")
            local_db_health = "healthy"
        except Exception as e:
            local_db_health = f"error: {str(e)}"
        
        return {
            "status": "healthy",
            "timestamp": time.time(),
            "services": {
                "supabase": supabase_health,
                "local_database": local_db_health,
                "api": "healthy"
            },
            "integration_type": "hybrid"
        }
    except Exception as e:
        return {
            "status": "degraded",
            "timestamp": time.time(),
            "error": str(e),
            "services": {
                "supabase": "unknown",
                "local_database": "unknown", 
                "api": "degraded"
            }
        }

# Utility functions
async def list_routes():
    print("\n--- ROUTES REGISTERED ---")
    for route in app.routes:
        if hasattr(route, 'methods'):
            print(f"{route.path} [{', '.join(route.methods)}]")
        else:
            print(f"{route.path} [WebSocket]")
    print("--------------------------\n")

# async def start_recycle_bin_cleanup_loop():
#     """Background task for cleaning up recycle bin"""
#     while True:
#         try:
#             async with async_session() as session:
#                 # await cleanup_recycle_bin_task(session)
#             # print("Recycle bin cleanup completed")
#         except Exception as e:
#             print(f"[RECYCLER ERROR] {e}")
#         await asyncio.sleep(3600)  # Run every hour

# ASupabase health monitoring background task
async def supabase_health_monitor():
    """Background task to monitor Supabase connection health"""
    while True:
        try:
            await asyncio.sleep(300)  # Check every 5 minutes
            health = await supabase_manager.health_check()
            if health != "healthy":
                print(f"[WARNING] Supabase health warning: {health}")
        except Exception as e:
            print(f"[SUPABASE MONITOR ERROR] {e}")
        await asyncio.sleep(300)

 
# Development server runner
if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",  
        host="0.0.0.0",
        port=5000,
        reload=not settings.is_production if hasattr(settings, 'is_production') else True,
        workers=1,  # Use 1 worker for development
        loop="asyncio",
        access_log=True,
        log_level="info"
    )

# Configuration validation on import
print("Validating configuration...")
try:
    if hasattr(settings, 'supabase_url') and hasattr(settings, 'supabase_service_key'):
        print("Supabase configuration found")
    else:
        print("Supabase configuration missing - check your .env file")
        
    if hasattr(settings, 'database_postgres_url'):
        print("Local database configuration found")
    else:
        print("Local database configuration missing")
        
except Exception as e:
    print(f"Configuration validation failed: {e}")

print("Main module loaded successfully")