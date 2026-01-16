from fastapi import APIRouter , Depends , HTTPException , status as http_status, Body , Request
from app.schemas.auth_schema import UserSignUp , UserLogin , ActivityType , User , updateUserProfile , changePassword , AuthResponse , Token,SSResponse,SSRequest
from app.config.auth.supabase_client import get_async_supabase
from supabase import AsyncClient
from app.api.dependencies import log_activity , get_current_user
from app.domain.persistance.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.security.rate_limit import limiter
from app.services.auth_services import auth_service
from app.services.auth_security_service import auth_security_service
import logging

log = logging.getLogger("auth")


router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup")
@limiter.limit("3/minute")
async def signup(request : Request,user: UserSignUp , supabase : AsyncClient = Depends(get_async_supabase)) -> AuthResponse:
    """
    Registers a new user with Supabase Auth.

    Args:
    - user: A UserSignUp object containing the new user's email, password, and name.

    Raises:
    - HTTPException: If the registration fails, either because of a server error or because the email is already taken.

    Returns:
    - AuthResponse: A response object with a message indicating whether the registration was successful or not.
    """
    try:
        result = await auth_service.signupUser(user,supabase)
        return result 
    except HTTPException as he:
        raise he
    except Exception as exc:   
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed."
        )

@router.post("/login")
@limiter.limit("5/minute")
async def login(request : Request,user:UserLogin, supabase:AsyncClient = Depends(get_async_supabase) , db_session : AsyncSession = Depends(get_db)) -> Token:
    """
    Logs in a user with Supabase Auth.

    Args:
    - user: A UserLogin object containing the user's email and password.

    Raises:
    - HTTPException: If the login fails, either because of a server error or because the email or password is invalid.

    Returns:
    - Token: A response object with the access token, refresh token, expires_in, and require_2fa status.
    """
    try:
        result = await auth_service.signinUser(user,supabase,db_session)
        return result

    except HTTPException as he:
        raise he                             
    except Exception as exc:
        raise HTTPException(
            status_code=http_status.HTTP_401_UNAUTHORIZED,
            detail="Invalid e-mail or password",
        )
@router.post("/sharekey")
async def server_key(
    body: SSRequest,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db),
) -> SSResponse:
    try:
        session_code = await auth_service.issue_ss(current_user, body, db_session)
        return session_code

    except HTTPException as he:
        raise he                             
    except Exception as exc:
        raise HTTPException(
            status_code=http_status.HTTP_401_UNAUTHORIZED,
            detail="Invalid e-mail or password",
        )

@router.post("/logout")
async def logout(current_user : User = Depends(get_current_user), supabase : AsyncClient = Depends(get_async_supabase)) -> AuthResponse:
    """
    Logs out a user with Supabase Auth.

    Args:
    - current_user: The authenticated user.
    - supabase: The Supabase client instance.

    Raises:
    - HTTPException: If the logout fails, either because of a server error or because the user is not authenticated.

    Returns:
    - AuthResponse: A response object with a success message.
    """
    try:
        await log_activity(
            current_user.user_id,
            ActivityType.LOGOUT,
            supabase
        )
        response = await supabase.auth.sign_out()

        return AuthResponse(message="Logged out successfully")
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed."
        )
    
@router.post("/delete")
async def delete_account(current_user : User = Depends(get_current_user), supabase : AsyncClient = Depends(get_async_supabase)) -> AuthResponse:
    """
    Deletes a user account with Supabase Auth.

    Args:
    - current_user: The authenticated user.
    - supabase: The Supabase client instance.

    Raises:
    - HTTPException: If the deletion fails, either because of a server error or because the user is not authenticated.

    Returns:
    - AuthResponse: A response object with a success message.
    """
    try:
        await log_activity(
            current_user.user_id,
            ActivityType.DELETE_ACCOUNT,
            supabase
        )

        response = await supabase.auth.admin.delete_user(current_user.user_id)
        if response.error:
            raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail="Failed to Delete Account")

        return AuthResponse(message="Account deleted successfully")
    except Exception as e:
        print(f"Error deleting account: {str(e)}")
        raise HTTPException(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR , detail="Failed to delete account")
    

# 2fa setup
@router.get("/2fa/setup")
async def setup_2FA(current_user : User = Depends(get_current_user) , db_session : AsyncSession = Depends(get_db)):
    """Set up 2FA authentication"""
    try:
        result = await auth_service.setup_2fa(current_user, db_session)
        return result
    except Exception as e:
        log.error("Error setting up 2FA", error=str(e))
        raise HTTPException(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Error setting up 2FA")
    

## after qr scan verification
@router.post("/2fa/verify")
async def verify_2fa(qr_code : str = Body(... , embed=True), current_user : User = Depends(get_current_user) , db_session : AsyncSession = Depends(get_db)):
    """Verify the 2FA code entered by the user and enable 2FA for the user.

    Args:
        qr_code (str): The 2FA code entered by the user.

    Raises:
        HTTPException: If the 2FA code is invalid, or if the user is not authenticated.

    Returns:
        AuthResponse: A response object with a success message.
    """
    try:
        if not qr_code.isdigit() or len(qr_code) != 6:
            raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST,detail="Invalid 2FA code format")
    
        result = await auth_service.verify_enable_2fa(current_user, qr_code, db_session)
        return result
    
    except HTTPException as he:
        log.error("Error verifying 2FA", error=str(he))
        raise he
    except Exception as e:
        print(f"Error verifying 2FA: {e}")
        raise HTTPException(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Error verifying 2FA")


## validatation during Login
@router.post("/2fa/validate")
async def validated_2fa(qr_code : str = Body(... , embed=True) , current_user : User = Depends(get_current_user) , db_session : AsyncSession = Depends(get_db)):
    """
    Validates the 2FA code entered by the user during login.

    Args:
        qr_code (str): The 2FA code entered by the user.

    Raises:
        HTTPException: If the 2FA code is invalid, or if the user is not authenticated.

    Returns:
        AuthResponse: A response object with a success message.
    """
    try:
        if not qr_code.isdigit() or len(qr_code) != 6:
            raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST,detail="Invalid 2FA code format")
        
        result = await auth_service.validate_2fa(current_user, qr_code, db_session)

        return result
    
    except HTTPException as he:
        print(f"Error validating 2FA: {he}")
        raise he
    except Exception as e:
        print(f"Error validating 2FA: {e}")
        raise HTTPException(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Error validating 2FA")
        
@router.post("/2fa/disable")
async def disable_2fa(qr_code : str = Body(... , embed=True) , current_user : User = Depends(get_current_user) , db_session : AsyncSession = Depends(get_db)):
    """
    Disables 2FA for the current user.

    Args:
        qr_code (str): The 2FA code entered by the user.

    Raises:
        HTTPException: If the 2FA code is invalid, or if the user is not authenticated.

    Returns:
        AuthResponse: A response object with a success message.
    """

    try:
        # fetch user
        if not qr_code.isdigit() or len(qr_code) != 6:
            raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST,detail="Invalid 2FA code format")
        
        result = await auth_service.disable_2fa(current_user, qr_code, db_session)
        return result
    
    except HTTPException as he:
        print(f"Error disabling 2FA: {he}")
        raise he
    except Exception as e:
        print(f"Error disabling 2FA: {e}")
        raise HTTPException(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Error disabling 2FA")

    
@router.post("/refresh-token")  
async def refresh_token(refresh_token : str, supabase : AsyncClient = Depends(get_async_supabase)) -> Token:
    """
    Refreshes an access token given a valid refresh token.

    Args:
    - refresh_token: The refresh token to be used for refreshing the access token.
    - supabase: The Supabase client instance.

    Raises:
    - HTTPException: If the refresh fails, either because of a server error or because the refresh token is invalid or expired.

    Returns:
    - Token: A response object with the refreshed access token, refresh token, and expires_in.
    """
    try:
        response = await supabase.auth.refresh_session(refresh_token)
        
        if response.error:
            raise HTTPException(status_code=http_status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token ")
        
        return Token(
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token,
            expires_in=response.session.expires_in,
            require_2fa=False
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Refresh token failed",
        )
    

@router.post("/reset-password")
@limiter.limit("3/hour")
async def reset_password(request : Request,email : str , supabase : AsyncClient = Depends(get_async_supabase)) -> AuthResponse:
    """
    Resets a user's password with Supabase Auth.

    Args:
    - email: The user's email address.
    - supabase: The Supabase client instance.

    Raises:
    - HTTPException: If the reset fails, either because of a server error or because the email address is invalid.

    Returns:
    - AuthResponse: A response object with a success message.
    """
    try:
        if not email or "@" not in email or len(email) > 255:
            raise HTTPException(
                status_code=400,
                detail="Invalid email format"
        )

        email = email.strip().lower()
        
        response = await supabase.auth.reset_password_for_email(email)
        if response.error:
            raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail=response.error.message)
        
        return AuthResponse(message="Password reset email sent successfully")
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Reset password failed",
        )
    
@router.post("/verify-email")
async def email_verification(token : str , type:str="email" , supabase: AsyncClient = Depends(get_async_supabase)) -> AuthResponse:
    """
    Verifies a user's email address with Supabase Auth.

    Args:
    - token: The email verification token sent to the user's email address.
    - type: The type of OTP to verify. Defaults to "email".
    - supabase: The Supabase client instance.

    Raises:
    - HTTPException: If the verification fails, either because of a server error or because the token is invalid.

    Returns:
    - AuthResponse: A response object with a success message.
    """
    try:
        response = await supabase.auth.verify_otp(token, type)
        if response.user:
            return AuthResponse(message="Email verified successfully")
        else:
            raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail="Invalid Email Verification Token")
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Email verification failed",
        )

# fetch user info
@router.get("/users/me")
async def me(current_user: User = Depends(get_current_user), supabase: AsyncClient = Depends(get_async_supabase) , db_session: AsyncSession = Depends(get_db)) -> dict:
    """Fetch the current user's profile information.

    Args:
    - current_user: The authenticated user.
    - supabase: The Supabase client instance.
    - db_session: The database session.

    Raises:
    - HTTPException: If the fetch fails, either because of a server error or because the user is not authenticated.

    Returns:
    - dict: A dictionary containing the user's profile information.
    """
    try:
        response = await supabase.auth.get_user(current_user.access_token)
        user = response.user

        metadata = user.user_metadata or {}

        totp_enabled = await auth_security_service.is_totp_enabled(
            db_session, current_user.user_id
        )

        data = {
            "user_id": user.id,
            "email": user.email,
            "full_name": metadata.get("full_name"),
            "avatar_url": metadata.get("avatar_url"),
            "phone": metadata.get("phone"),
            "location": metadata.get("location"),
            "birthday": metadata.get("birthday"),
            "country": metadata.get("country"),
            "city_state": metadata.get("city_state"),
            "postal_code": metadata.get("postal_code"),
            "org_id": metadata.get("org_id"),
            "last_sign_in_at": user.last_sign_in_at,
            "two_factor_enabled" : totp_enabled,
        }

        return data 
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch user profile")


# update user profile
@router.put("/users/me")
async def update_profile(data : updateUserProfile , current_user : User = Depends(get_current_user) , supabase : AsyncClient = Depends(get_async_supabase)) -> User:
    """
    Updates the current user's profile information.

    Args:
    - data: An updateUserProfile object containing the updated profile information.
    - current_user: The authenticated user.
    - supabase: The Supabase client instance.

    Raises:
    - HTTPException: If the update fails, either because of a server error or because the user is not authenticated.

    Returns:
    - User: The updated user object.
    """
    try:
        meta_data = data.dict(exclude_unset=True)

        if "avatar" in meta_data:
            meta_data["avatar_url"] = meta_data.pop("avatar")
        
        response = await supabase.auth.update_user({
            "token" : current_user.access_token,
            "data" : meta_data
        })
        if response.error:
            raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail=response.error.message)
        
        return User(
            user_id=current_user.user_id,
            email=current_user.email,
            name=meta_data.get("name",current_user.name),
            avatar_url=meta_data.get("avatar_url",current_user.avatar_url),
            created_at=current_user.created_at,
            last_login=current_user.last_login
        )
    
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Update user profile failed")
        
@router.put("/users/change-password")
@limiter.limit("5/hour")
async def change_password(data : changePassword , request : Request ,current_user : User = Depends(get_current_user),supabase : AsyncClient = Depends(get_async_supabase)) -> AuthResponse:
    """
    Change the user's password with Supabase Auth.

    Args:
    - data: A `changePassword` object containing the new password.
    - request: The incoming request object.
    - current_user: The authenticated user object.
    - supabase: The Supabase client instance.

    Raises:
    - HTTPException: If the change password fails, either because of a server error or because the user is not authenticated.

    Returns:
    - AuthResponse: A response object with a success message.
    """
    try:
        new_password = data.new_password

        if len(new_password) < 8:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters long"
            )
        
        # Check password complexity
        if not any(c.isupper() for c in new_password):
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Password must contain at least one uppercase letter"
            )
        
        if not any(c.islower() for c in new_password):
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Password must contain at least one lowercase letter"
            )
        
        if not any(c.isdigit() for c in new_password):
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Password must contain at least one digit"
            )
        
        await supabase.auth.set_session(
            current_user.access_token,
            current_user.access_token
        )
        response = await supabase.auth.update_user(
            {
                "password" : new_password
            }
        )
        if response.user is None:
            raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail=response.error.message)
        
        return AuthResponse(message="Password changed successfully")
    
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Change password failed")

@router.delete("/users/me", response_model=AuthResponse)
@limiter.limit("1/hour")
async def delete_user_account(request : Request,current_user: User = Depends(get_current_user),supabase: AsyncClient = Depends(get_async_supabase),db_session: AsyncSession = Depends(get_db)):
    """Delete user account with cleanup"""
    try:
        # Log the deletion attempt
        await log_activity(
            user_id=current_user.user_id,
            activity_type=ActivityType.DELETE_ACCOUNT,
            supabase=supabase
        )
        
        # Clean up 2FA data
        try:
            await auth_security_service.disable_totp(db_session, current_user.user_id)
        except Exception as e:
            log.warning("2FA cleanup failed during account deletion", 
                          user_id=current_user.user_id,
                          error=str(e))
        
        # Delete user account
        response = await supabase.auth.admin.delete_user(current_user.user_id)
        
        if response.error:
            log.error("Account deletion failed", 
                        user_id=current_user.user_id,
                        error=response.error.message)
            raise HTTPException(
                status_code=400,
                detail="Failed to delete account"
            )
        
        log.info("Account deleted successfully", 
                   user_id=current_user.user_id)
        
        return AuthResponse(message="Account deleted successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        log.error("Account deletion endpoint error", 
                    user_id=current_user.user_id,
                    error=str(e))
        raise HTTPException(
            status_code=500,
            detail="Account deletion failed"
        )