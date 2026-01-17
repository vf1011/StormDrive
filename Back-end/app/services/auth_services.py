from fastapi import HTTPException , status as http_status
from app.schemas.auth_schema import UserSignUp , AuthResponse  , UserLogin , ActivityType , Token , User, SSRequest, SSResponse
# from app.api.dependencies import log_activity
from supabase import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession 
from app.services.auth_security_service import auth_security_service
from fastapi.responses import StreamingResponse
from app.security.servershare import derive_servershare
from app.repositories.server_share_repository import ServerShareRepository
from app.security.utils import Security
from sqlalchemy import select
from app.domain.persistance.models.auth_models import UserServerShare
import base64, secrets
import structlog
import secrets
import hashlib
from io import BytesIO
import qrcode

log = structlog.get_logger(__name__)

server_share_repo = ServerShareRepository()

class AuthService:
    async def signupUser(self , user : UserSignUp , supabase : AsyncClient) -> AuthResponse:
        request_id = secrets.token_urlsafe(16)
        try:
            log.info("User signup attempt",
                     request_id = request_id,
                     email = self._hash_email(user.email)
                     )
            
            response = await supabase.auth.sign_up({
                "email": user.email,
                "password": user.password,
                "options": {
                    "data": {
                    "name": user.name
                    }
                }
            })

            if response.user is None:
                log.warning("Signup Failed.",
                            request_id=request_id,
                            email=self._hash_email(user.email),
                            error=response.error.message if response.error else "Unknown Error Found."
                            )
                raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail=response.error.message)

            # await log_activity(
            #     user_id = response.user.id,
            #     activity_type = ActivityType.SIGNUP,
            #     supabase = supabase
            # )
            
            log.info("User Signup Successful",
                    request_id=request_id,
                 user_id = response.user.id
                 )

            return AuthResponse(message="Account created successfully")
        except HTTPException as he:
            raise he
        except Exception as exc:
            log.error("Signup service error", 
                        request_id=request_id,
                        error=str(exc))   
            raise HTTPException(
                status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Registration failed."
            )
            

    async def signinUser(self ,user:UserLogin, supabase : AsyncClient , db_session : AsyncSession) -> Token:
        request_id = secrets.token_urlsafe(16)
        try:
            log.info("User signin attempt",
                     request_id=request_id,
                     email=self._hash_email(user.email)
                     )

            response = await supabase.auth.sign_in_with_password({
                "email": user.email,
                "password": user.password
            })

            if response.user is None:
                log.warning("Signin Failed.",
                            request_id=request_id,
                            email=self._hash_email(user.email),
                            error=response.error.message if response.error else "Unknown Error Found."
                            )
                raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail=response.error.message)

            # await log_activity(
            #     user_id=response.user.id,
            #     activity_type=ActivityType.LOGIN,
            #     supabase=supabase
            # )

            totp_enabled = await auth_security_service.is_totp_enabled(
                db_session, response.user.id
            )
            log.info("User Signin Successful",
                     request_id=request_id,
                     user_id=response.user.id
                     )

            return Token(
                access_token=response.session.access_token,
                refresh_token=response.session.refresh_token,
                expires_in=response.session.expires_in,
                require_2fa=totp_enabled
            )

        except HTTPException as he:
            raise he
        except Exception as exc:
            log.error("Signin service error",
                      request_id=request_id,
                      error=str(exc))
            raise HTTPException(
                status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Signin failed."
            )
        
    async def setup_2fa(self, user : User , db_session: AsyncSession) -> StreamingResponse:
        """Setup 2FA for user """
        request_id = secrets.token_urlsafe(16)
        try:
            log.info("2FA setup attempt", 
                       request_id=request_id,
                       user_id=user.user_id)
            
            otp_uri = await auth_security_service.generate_totp_secret(db_session, user.user_id, user.name)
            
            qr = qrcode.make(otp_uri)
            buffer  = BytesIO()
            qr.save(buffer , format="PNG")
            buffer.seek(0)

            log.info("2FA setup successful", 
                       request_id=request_id,
                       user_id=user.user_id)  

            return StreamingResponse(buffer,media_type = "image/png")
        except HTTPException as he:
            raise he
        except Exception as e:
            log.error("2FA setup error", 
                        user_id=user.user_id,
                        error=str(e))
            raise HTTPException(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR, detail="2FA setup failed")
        

    async def verify_enable_2fa(self, user:User , code:str , db_session: AsyncSession) -> AuthResponse:
        """Verify and enable 2FA for user"""
        request_id = secrets.token_urlsafe(16)
        try:
            log.info("2FA enable attempt", 
                       request_id=request_id,
                       user_id=user.user_id)
            
            is_valid = await auth_security_service.verify_totp_code(db_session, user.user_id, code, require_enabled=False)
            
            if not is_valid:
                log.warning("2FA enable failed - invalid code", 
                              request_id=request_id,
                              user_id=user.user_id)
                raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail="Invalid 2FA code")
            
            await auth_security_service.enable_totp(db_session, user.user_id)

            log.info("2FA enabled successfully", 
                       request_id=request_id,
                       user_id=user.user_id)  

            return AuthResponse(message="2FA enabled successfully")
        except HTTPException as he:
            raise he
        except Exception as e:
            log.error("2FA enable error", 
                        user_id=user.user_id,
                        error=str(e))
            raise HTTPException(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Enabling 2FA failed")
        

    async def validate_2fa(self, user:User , code:str , db_session: AsyncSession) -> AuthResponse:
        """Validate 2FA code during login"""
        request_id = secrets.token_urlsafe(16)
        try:
            log.info("2FA validation attempt", 
                       request_id=request_id,
                       user_id=user.user_id)
            
            is_valid = await auth_security_service.verify_totp_code(db_session, user.user_id, code, require_enabled=True)
            
            if not is_valid:
                log.warning("2FA validation failed - invalid code", 
                              request_id=request_id,
                              user_id=user.user_id)
                raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail="Invalid 2FA code")

            log.info("2FA validated successfully", 
                       request_id=request_id,
                       user_id=user.user_id)  

            return AuthResponse(message="2FA validated successfully")
        except HTTPException as he:
            raise he
        except Exception as e:
            log.error("2FA validation error", 
                        user_id=user.user_id,
                        error=str(e))
            raise HTTPException(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR, detail="2FA validation failed")
        

    async def disable_2fa(self, user:User , code:str, db_session: AsyncSession) -> AuthResponse:
        """Disable 2FA for user"""
        request_id = secrets.token_urlsafe(16)
        try:
            log.info("2FA disable attempt", 
                       request_id=request_id,
                       user_id=user.user_id)
            
            is_valid = await auth_security_service.verify_totp_code(db_session, user.user_id, code, require_enabled=True)
            
            if not is_valid:
                log.warning("2FA disable failed - invalid code", 
                              request_id=request_id,
                              user_id=user.user_id)
                raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail="Invalid 2FA code")
            
            await auth_security_service.disable_totp(db_session, user.user_id)

            log.info("2FA disabled successfully", 
                       request_id=request_id,
                       user_id=user.user_id)  

            return AuthResponse(message="2FA disabled successfully")
        except HTTPException as he:
            raise he
        except Exception as e:
            log.error("2FA disable error", 
                        user_id=user.user_id,
                        error=str(e))
            raise HTTPException(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Disabling 2FA failed")
    
    async def _ensure_ss_master(self, db_session: AsyncSession, user_id: str) -> None:
        row = (
            await db_session.execute(
                select(UserServerShare).where(UserServerShare.user_id == user_id)
            )
        ).scalar_one_or_none()

        if row:
            return

        ss_master = secrets.token_bytes(32)
        ss_master_b64 = base64.b64encode(ss_master).decode("utf-8")
        enc = Security.encrypt(ss_master_b64)

        db_session.add(UserServerShare(user_id=user_id, ss_master_enc=enc))
        await db_session.commit()

    async def _get_ss_master(self, db_session: AsyncSession, user_id: str) -> bytes:
        row = (
            await db_session.execute(
                select(UserServerShare).where(UserServerShare.user_id == user_id)
            )
        ).scalar_one()

        ss_master_b64 = Security.decrypt(row.ss_master_enc)
        return base64.b64decode(ss_master_b64)

    async def issue_ss(
                self,
                current_user: User,
                body: SSRequest,
                db_session: AsyncSession
            ) -> SSResponse:

        await self._ensure_ss_master(db_session, current_user.user_id)

        totp_enabled = await auth_security_service.is_totp_enabled(db_session, current_user.user_id)
        if totp_enabled:
            if not body.code:
                raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail="2FA code required")
            ok = await auth_security_service.verify_totp_code(
                db_session=db_session,
                user_id=current_user.user_id,
                code=body.code,
                require_enabled=True
            )
            if not ok:
                raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail="Invalid 2FA code")

        ss_master = await self._get_ss_master(db_session, current_user.user_id)
        ss= derive_servershare(ss_master)

        return SSResponse(ss=ss)

    def _hash_email(self, email: str) -> str:
        """Hash email for secure logging"""
        return hashlib.sha256(email.encode()).hexdigest()[:16]
    

auth_service = AuthService()