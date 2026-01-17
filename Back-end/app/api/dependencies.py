from fastapi.security import HTTPBearer , HTTPAuthorizationCredentials
from fastapi import Depends , status , HTTPException
from app.config.auth.supabase_client import get_async_supabase
from app.domain.persistance.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.auth_schema import User , ActivityType
from supabase import AsyncClient
from typing import Dict , Optional
from app.repositories.key_bundle_repository import UserKeyBundleRepository

security = HTTPBearer()

_keybundle_repo = UserKeyBundleRepository()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security) , supabase :AsyncClient = Depends(get_async_supabase)) -> User:
    """
    Get Current Authenticated User

    This dependency is used to get the current user from the bearer token
    provided in the Authorization header.

    Args:
        credentials (HTTPAuthorizationCredentials): The Bearer token provided in the Authorization header.
        supabase (AsyncClient): The Supabase client instance.

    Raises:
        HTTPException: If the token is invalid or the user is not found.

    Returns:
        User: The current authenticated user.
    """
    try:
        if not credentials:
            raise HTTPException(status_code = status.HTTP_401_UNAUTHORIZED, detail = "Invalid authentication",
                                headers={"WWW-Authenticate": "Bearer"})
        
        try:
            response = await supabase.auth.get_user(credentials.credentials)

            if not response.user:
                raise HTTPException(status_code = status.HTTP_401_UNAUTHORIZED, detail = "Invalid token or user not found")
            
            auth_user = response.user

            user = User(
                user_id=auth_user.id,
                email = auth_user.email,
                name=auth_user.user_metadata.get("name") if auth_user.user_metadata else None,
                created_at = auth_user.created_at,
                last_login = auth_user.last_sign_in_at,
                access_token = credentials.credentials
            )

            return user
        except HTTPException as e:
            raise e
    except Exception as e:
        print(f"Authentication Error: {str(e)} ")
        raise HTTPException(status_code = status.HTTP_401_UNAUTHORIZED, detail = "Could Not Validated Your Credentials")

# async def log_activity(user_id:str , activity_type:ActivityType , supabase : Optional[AsyncClient] = None, activity_data :Dict = None):
#     """Logs user activity in the database

#     Args:
#         user_id (str): The ID of the user performing the activity.
#         activity_type (ActivityType): The type of activity being logged.
#         supabase (Optional[AsyncClient], optional): The Supabase client instance. Defaults to None.
#         activity_data (Dict, optional): Additional data to store with the activity. Defaults to None.

#     Returns:
#         bool: True if the activity was successfully logged, False otherwise.
#     """
#     try:
#         if supabase is None:
#             supabase = await get_async_supabase()

#         activity = {
#             "user_id":user_id,
#             "activity_type":activity_type.value,
#             "activity_data":activity_data or {},
#         }
        
#         await supabase.table("user_activity").insert(activity).execute()
#         return True
#     except Exception as e:
#         print(f"Error logging activity: {str(e)}")
#         return False
    

async def require_keybundle(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    async with session.begin():
        exists = await _keybundle_repo.check_bundle(session, current_user.user_id)
    if not exists:
            # 428 is ideal for precondition-required
        raise HTTPException(status_code=428, detail={"code": "KEYBUNDLE_MISSING"})
    return True