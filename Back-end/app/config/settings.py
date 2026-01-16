from pydantic_settings import BaseSettings , SettingsConfigDict
from functools import lru_cache

class securitySettings(BaseSettings):

    model_config = SettingsConfigDict(env_file=".env",case_sensitive=False, extra="ignore")

    totp_valid_window: int = 1
    totp_issuer_name: str = "StormDrive"

    login_attempts_limit_per_min : int = 5
    signup_attempts_limit_per_min : int = 3
    password_reset_attempts_limit_per_min : int = 3

    max_login_attempts_per_min : int = 5

@lru_cache
def get_security_settings() -> securitySettings:
    return securitySettings()