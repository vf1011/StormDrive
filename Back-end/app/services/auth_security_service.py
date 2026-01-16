from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select , update , and_ , insert
from app.domain.persistance.models.auth_models import userTotp
from app.security.utils import Security
from fastapi import HTTPException, status as http_status
from app.config.settings import securitySettings
from contextlib import asynccontextmanager
import structlog
import pyotp
from uuid import UUID
from typing import Dict 
import secrets
import hashlib 

log = structlog.get_logger(__name__)

class AuthSecurityService:
    def __init__(self):
        self.totp_total_attempts : Dict[str , int] = {}


    @asynccontextmanager
    async def secure_totp_verification(self , db_session : AsyncSession , user_id : UUID):
        request_id = secrets.token_urlsafe(16)
        totp_obj = None
        try:
            result = await db_session.execute(
                select(userTotp).where(userTotp.user_id == user_id)
            )
            totp_data = result.scalar_one_or_none()
            
            if not totp_data:
                raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="2FA not configured for this account")

            # Decrypt and create TOTP object
            secret_key = Security.decrypt(totp_data.secret_key)
            totp_obj = pyotp.TOTP(secret_key)
            
            log.info("TOTP verification context created", 
                       request_id=request_id, user_id=self._hash_identifier(user_id))
            
            yield totp_obj, totp_data
            
        except Exception as e:
            log.error("TOTP verification context error", 
                        request_id=request_id, 
                        user_id=self._hash_identifier(user_id),
                        error=str(e))
            raise
        finally:
            # Cleanup sensitive data
            if totp_obj:
                totp_obj = None
            if 'secret_key' in locals():
                secret_key = None
                
            log.debug("TOTP verification context cleaned up", 
                        request_id=request_id)

    async def verify_totp_code(
        self, 
        db_session: AsyncSession, 
        user_id: UUID, 
        code: str,
        require_enabled: bool = True
    ) -> bool:
        """Verify TOTP code with rate limiting and security checks"""
        
        # Rate limiting for TOTP attempts
        attempt_key = f"totp_{user_id}"
        current_attempts = self.totp_total_attempts.get(attempt_key, 0)
        
        if current_attempts >= 5:  # Max 5 attempts per hour
            log.warning("TOTP rate limit exceeded", 
                          user_id=self._hash_identifier(user_id))
            raise HTTPException(status_code=http_status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many 2FA attempts. Please try again later.")
        try:
            async with self.secure_totp_verification(db_session, user_id) as (totp, totp_data):
            
                if require_enabled and not totp_data.is_enabled:
                    raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="2FA is not enabled for this account")

                # Verify the code
                is_valid = totp.verify(
                    code, 
                    valid_window=securitySettings.totp_valid_window
                )
                
                if is_valid:
                    # Reset rate limiting on successful verification
                    self.totp_total_attempts.pop(attempt_key, None)
                    
                    log.info("TOTP verification successful", 
                               user_id=self._hash_identifier(user_id))
                    return True
                else:
                    
                    self.totp_total_attempts[attempt_key] = current_attempts + 1
                    
                    log.warning("TOTP verification failed", 
                                  user_id=self._hash_identifier(user_id),
                                  attempts=self.totp_total_attempts[attempt_key])
                    return False
                    
        except HTTPException as he:
            raise he
        except Exception as e:
            log.error("TOTP verification error", 
                        user_id=self._hash_identifier(user_id),
                        error=str(e))
            raise HTTPException(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR, detail="2FA verification failed")
    
    async def generate_totp_secret(self, db_session: AsyncSession, user_id: UUID, name: str) -> str:
        """Generate and store new TOTP secret"""
        request_id = secrets.token_urlsafe(16)
        
        try:
            secret = pyotp.random_base32()
            
            # Create TOTP object for URI generation
            totp = pyotp.TOTP(secret)
            otp_uri = totp.provisioning_uri(
                name=name,
                issuer_name=securitySettings.totp_issuer_name
            )
            
            # Encrypt and store secret
            secret_key = Security.encrypt(secret)
            
            await db_session.execute(insert(userTotp).values(user_id = user_id , secret_key = secret_key)
                                .on_conflict_do_update(index_elements=["user_id"] , set_ = {
                                    "secret_key" : secret_key
                                }))
        
            await db_session.commit()
            
            log.info("TOTP secret generated and stored", 
                       request_id=request_id,
                       user_id=self._hash_identifier(user_id))
            
            return otp_uri
            
        except Exception as e:
            await db_session.rollback()
            log.error("Failed to generate TOTP secret", 
                        request_id=request_id,
                        user_id=self._hash_identifier(user_id),
                        error=str(e))
            raise HTTPException(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate 2FA secret")
    
    async def enable_totp(self, db_session: AsyncSession, user_id: UUID) -> bool:
        """Enable TOTP after successful verification"""
        try:
            
            result = await db_session.execute(update(userTotp).where(userTotp.user_id == user_id).values(is_enabled=True))

            if result.rowcount == 0:
                log.warning("TOTP enable is Failed - No rows updated")
                return False
            elif result.rowcount == 1:
                await db_session.commit()
                log.info("TOTP enabled for user", 
                           user_id=self._hash_identifier(user_id))
                return True
            else:
                await db_session.rollback()
                log.warning("TOTP enable is Failed - Multiple rows updated")
                return False

        except Exception as e:
            await db_session.rollback()
            log.error("Failed to enable TOTP", 
                        user_id=self._hash_identifier(user_id),
                        error=str(e))
            raise HTTPException(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to enable 2FA")

    async def disable_totp(self, db_session: AsyncSession, user_id: UUID) -> bool:
        """Disable TOTP for user"""
        try:
            result = await db_session.execute(update(userTotp).where(
                userTotp.user_id == user_id
            ).values(is_enabled=False))
            await db_session.commit()
            
            if result.rowcount == 0:
                log.warning("TOTP disable is Failed - No rows updated")
                return False
            elif result.rowcount == 1:
                log.info("TOTP disabled for user", 
                           user_id=self._hash_identifier(user_id))
                return True
            else:
                await db_session.rollback()
                log.warning("TOTP disable is Failed - Multiple rows updated")
                return False
            
        except Exception as e:
            await db_session.rollback()
            log.error("Failed to disable TOTP", 
                        user_id=self._hash_identifier(user_id),
                        error=str(e))
            raise HTTPException(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to disable 2FA")

    async def is_totp_enabled(self, db_session: AsyncSession, user_id: UUID) -> bool:
        """Check if TOTP is enabled for user"""
        try:
            result = await db_session.execute(
                select(userTotp.is_enabled).where(
                    and_(userTotp.user_id == user_id, userTotp.is_enabled == True)
                )
            )
            return result.scalar() is not None
            
        except Exception as e:
            log.error("Failed to check TOTP status", 
                        user_id=self._hash_identifier(user_id),
                        error=str(e))
            return False
    
    def _hash_identifier(self, identifier: str | UUID) -> str:
        """Hash identifier for secure logging"""
        return hashlib.sha256(identifier.encode()).hexdigest()[:16]
    
auth_security_service = AuthSecurityService()