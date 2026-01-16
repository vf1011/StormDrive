from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from pydantic import field_validator, Field
from typing import List
import secrets
import logging
import re

logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    # Database Configuration
    database_postgres_url: str = Field(..., description="PostgreSQL database URL" , alias="DATABASE_POSTGRES_URL")
    
    # Supabase Configuration
    supabase_url: str = Field(..., description="Supabase project URL" , alias="SUPABASE_URL")
    supabase_service_key: str = Field(..., description="Supabase service key for server-side" , alias="SUPABASE_SERVICE_KEY")

    # JWT Configuration
    jwt_secret_key: str = Field(default_factory=lambda: secrets.token_urlsafe(32), alias="SECURITY_JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", description="JWT signing algorithm", alias="SECURITY_JWT_ALGORITHM")
    # jwt_expiration_hours: int = Field(default=24, ge=1, le=168)  # 1 hour to 1 week
    
    # File Upload Configuration    
    upload_folder: str = Field(default="uploads", description="Upload directory path", alias="FILE_UPLOAD_FOLDER")

    # Security Configuration
    # allowed_origins: List[str] = Field(default=["http://localhost:5173"], description="CORS allowed origins")
    email_allowed_domains: List[str] = Field(default=["gmail.com"], description="Allowed email domains",alias="EMAIL_ALLOWED_DOMAINS")

    folder_min_chunk_bytes: int = Field(default=256 * 1024, ge=64 * 1024, le=4 * 1024 * 1024,alias="SD_FOLDER_MIN_CHUNK_BYTES")
    folder_max_chunk_bytes: int = Field(default=16 * 1024 * 1024, ge=1024 * 1024, le=128 * 1024 * 1024,alias="SD_FOLDER_MAX_CHUNK_BYTES")
    folder_default_chunk_bytes: int = Field(default=4 * 1024 * 1024, ge=64 * 1024, le=128 * 1024 * 1024,alias="SD_FOLDER_DEFAULT_CHUNK_BYTES")
    folder_session_ttl_hours: int = Field(default=24, ge=1, le=168,alias="SD_FOLDER_SESSION_TTL_HOURS")
    folder_max_entries: int = Field(default=10_000, ge=100, le=1_000_000,alias="SD_FOLDER_MAX_ENTRIES")

    # Application Configuration
    debug: bool = Field(default=False, description="Debug mode")
    log_level: str = Field(default="INFO", pattern="^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$")
    environment: str = Field(default="development", pattern="^(development|staging|production)$")
    
    # Rate Limiting
    rate_limit_per_minute: int = Field(default=60, ge=1, le=1000)

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore",
        validate_assignment=True
    )
    
    @field_validator('supabase_url')
    def validate_supabase_url(cls, v):
        if not v.startswith('https://'):
            raise ValueError('Supabase URL must start with https://')
        return v
    
    @field_validator('database_postgres_url')
    def validate_database_url(cls, v):
        # if not v.startswith(('postgresql://', 'postgres://')):
        if not re.match(r'^postgres(ql)?(\+[a-z0-9_]+)?://', v, flags=re.IGNORECASE):
            raise ValueError('Database URL must be a valid PostgreSQL connection string')
        return v
    
    @field_validator('jwt_secret_key')
    def validate_jwt_secret(cls, v):
        if len(v) < 32:
            logger.warning("JWT secret key should be at least 32 characters for production")
        return v
    
    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.environment == "production"
    
    @property
    def is_debug(self) -> bool:
        """Check if debug mode is enabled."""
        return self.debug and not self.is_production
    
    @field_validator("folder_default_chunk_bytes")
    def validate_folder_chunk_bounds(cls, v, info):
        data = info.data
        min = data.get("folder_min_chunk_bytes", 256 * 1024)
        max = data.get("folder_max_chunk_bytes", 16 * 1024 * 1024)
        if min > max:
            raise ValueError("SD_FOLDER_MIN_CHUNK_BYTES must be <= SD_FOLDER_MAX_CHUNK_BYTES")
        if not (min <= v <= max):
            raise ValueError("SD_FOLDER_DEFAULT_CHUNK_BYTES must be between MIN and MAX")
        return v
    
    # def get_cors_origins(self) -> List[str]:
    #     """Get CORS origins based on environment."""
    #     if self.is_production:
    #         return [origin for origin in self.ALLOWED_ORIGINS if not origin.startswith('http://localhost')]
    #     return self.ALLOWED_ORIGINS

# Global settings instance
settings = Settings()

# Validate critical settings on startup
def validate_production_settings(settings: Settings):
    """Validate settings for production deployment."""
    if settings.is_production:
        issues = []
        
        if settings.debug:
            issues.append("DEBUG should be False in production")
        
        if settings.jwt_secret_key == "your-secret-key-here":
            issues.append("JWT_SECRET_KEY must be changed from default value")
        
        if len(settings.jwt_secret_key) < 32:
            issues.append("JWT_SECRET_KEY should be at least 32 characters")
        
        if issues:
            raise ValueError(f"Production validation failed: {', '.join(issues)}")
    
    logger.info(f"Configuration loaded for {settings.environment} environment")

# Call validation on import
@lru_cache
def get_settings() -> Settings:
    s = Settings()
    # call validation here if you want:
    validate_production_settings(s)  # modify your validate fn to accept settings
    return s